-- Discord integration: one webhook per group, plus bookkeeping so nothing is posted twice.
--
-- The webhook URL is effectively a posting key, so it must never be readable from the client. groups.settings is
-- readable by every member, hence a separate table whose column grants leave webhook_url out (same technique as
-- ingest_tokens.token_hash). NEVER `grant select on public.group_discord` for the whole table, and always select
-- explicit columns from the app. Owners/admins change it only through the RPCs below.

create table if not exists public.group_discord (
  group_id uuid primary key references public.groups (id) on delete cascade,
  webhook_url text check (
    webhook_url is null
    or webhook_url ~ '^https://(canary\.|ptb\.)?(discord|discordapp)\.com/api(/v[0-9]+)?/webhooks/[0-9]+/[A-Za-z0-9_-]+$'
  ),
  webhook_configured boolean generated always as (webhook_url is not null) stored,
  -- last 4 characters of the webhook token, so admins can tell which one is saved without seeing it
  webhook_hint text,
  webhook_status text not null default 'ok' check (webhook_status in ('ok', 'invalid')),
  enabled boolean not null default false,
  -- local hour in groups.timezone at which a finished period is posted (the day after it ends)
  post_hour smallint not null default 9 check (post_hour between 0 and 23),
  period_kinds text[] not null default array['week', 'fortnight', 'month', 'season']
    check (period_kinds <@ array['week', 'fortnight', 'month', 'season', 'half', 'year']),
  post_records boolean not null default true,
  post_championships boolean not null default true,
  enabled_at timestamptz,
  -- null = the next run records the current records silently instead of announcing them all
  records_baselined_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  last_post_at timestamptz,
  last_test_at timestamptz,
  -- internal bookkeeping for the Edge Function
  last_nights_seen_at timestamptz,
  processing_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists group_discord_set_updated_at on public.group_discord;
create trigger group_discord_set_updated_at
  before update on public.group_discord
  for each row execute function private.set_updated_at();

alter table public.group_discord enable row level security;
revoke all on public.group_discord from anon, authenticated;
grant select (
  group_id, webhook_configured, webhook_hint, webhook_status, enabled, post_hour, period_kinds,
  post_records, post_championships, enabled_at, records_baselined_at,
  last_error, last_error_at, last_post_at, last_test_at, created_at, updated_at
) on public.group_discord to authenticated;
grant all on public.group_discord to service_role;

drop policy if exists group_discord_select on public.group_discord;
create policy group_discord_select on public.group_discord
  for select to authenticated
  using (private.group_role_of(group_id) in ('owner', 'admin'));

-- What has been posted (service role only; no policies = nobody else can read or write).
create table if not exists public.discord_posted (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  kind text not null check (kind in ('period', 'championship', 'test')),
  -- period: "period:week:2026-10-05"; championship: "championship:<competition id>"
  key text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  attempts smallint not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (group_id, kind, key)
);

-- The record values already announced per category, so re-syncs and backfills can't re-announce.
create table if not exists public.discord_record_state (
  group_id uuid not null references public.groups (id) on delete cascade,
  category_key text not null,
  value numeric,
  holder_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (group_id, category_key)
);

alter table public.discord_posted enable row level security;
alter table public.discord_record_state enable row level security;
revoke all on public.discord_posted, public.discord_record_state from anon, authenticated;
grant all on public.discord_posted, public.discord_record_state to service_role;

-- ---- RPCs (owner/admin only) -----------------------------------------------------------------------

create or replace function private.require_group_admin(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.group_role := private.group_role_of(p_group_id);
begin
  if v_role is null or v_role not in ('owner', 'admin') then
    raise exception 'Only owners and admins can change Discord settings';
  end if;
end;
$$;

revoke execute on function private.require_group_admin(uuid) from public, anon;
grant execute on function private.require_group_admin(uuid) to authenticated;

-- Saves the webhook. Errors never echo the URL. Saving a webhook re-baselines records (no announcement spam).
create or replace function public.set_group_discord_webhook(p_group_id uuid, p_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text := btrim(p_url);
begin
  perform private.require_group_admin(p_group_id);
  if v_url !~ '^https://(canary\.|ptb\.)?(discord|discordapp)\.com/api(/v[0-9]+)?/webhooks/[0-9]+/[A-Za-z0-9_-]+$' then
    raise exception 'That doesn''t look like a Discord webhook URL (it should start with https://discord.com/api/webhooks/)';
  end if;
  insert into public.group_discord (group_id, webhook_url, webhook_hint, webhook_status, records_baselined_at, last_error, last_error_at)
  values (p_group_id, v_url, right(v_url, 4), 'ok', null, null, null)
  on conflict (group_id) do update set
    webhook_url = excluded.webhook_url,
    webhook_hint = excluded.webhook_hint,
    webhook_status = 'ok',
    records_baselined_at = null,
    last_error = null,
    last_error_at = null;
  delete from public.discord_record_state where group_id = p_group_id;
end;
$$;

create or replace function public.clear_group_discord_webhook(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_group_admin(p_group_id);
  update public.group_discord
  set webhook_url = null, webhook_hint = null, enabled = false
  where group_id = p_group_id;
end;
$$;

-- Null arguments mean "leave unchanged". Turning posting on needs a webhook and starts a silent re-baseline.
create or replace function public.update_group_discord(
  p_group_id uuid,
  p_enabled boolean default null,
  p_post_hour integer default null,
  p_period_kinds text[] default null,
  p_post_records boolean default null,
  p_post_championships boolean default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.group_discord;
begin
  perform private.require_group_admin(p_group_id);
  select * into v_row from public.group_discord where group_id = p_group_id;
  if not found then
    insert into public.group_discord (group_id) values (p_group_id) returning * into v_row;
  end if;
  if p_enabled is true and v_row.webhook_url is null then
    raise exception 'Add a webhook URL before turning Discord posting on';
  end if;
  if p_enabled is true and not v_row.enabled then
    update public.group_discord set enabled_at = now(), records_baselined_at = null where group_id = p_group_id;
    delete from public.discord_record_state where group_id = p_group_id;
  end if;
  update public.group_discord set
    enabled = coalesce(p_enabled, enabled),
    post_hour = coalesce(p_post_hour, post_hour),
    period_kinds = coalesce(p_period_kinds, period_kinds),
    post_records = coalesce(p_post_records, post_records),
    post_championships = coalesce(p_post_championships, post_championships)
  where group_id = p_group_id;
end;
$$;

revoke execute on function
  public.set_group_discord_webhook(uuid, text),
  public.clear_group_discord_webhook(uuid),
  public.update_group_discord(uuid, boolean, integer, text[], boolean, boolean)
  from public, anon, authenticated;
grant execute on function
  public.set_group_discord_webhook(uuid, text),
  public.clear_group_discord_webhook(uuid),
  public.update_group_discord(uuid, boolean, integer, text[], boolean, boolean)
  to authenticated;
