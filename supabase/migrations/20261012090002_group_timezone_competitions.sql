-- Per-group timezone (when a period "ends" and when Discord posts go out) and championship competitions.

-- ---- group timezone ---------------------------------------------------------------------------------
alter table public.groups add column if not exists timezone text not null default 'Australia/Sydney';

create or replace function private.validate_group_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Unknown timezone: %', new.timezone;
  end if;
  return new;
end;
$$;

drop trigger if exists groups_validate_timezone on public.groups;
create trigger groups_validate_timezone
  before insert or update of timezone on public.groups
  for each row execute function private.validate_group_timezone();

-- groups_update (owner/admin only) already gates who can write these columns.
grant update (name, settings, timezone) on public.groups to authenticated;

-- ---- competitions -----------------------------------------------------------------------------------
-- An owner/admin picks a date range; whoever ranks top 3 over it gets a championship podium.
create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  starts_on date not null,
  ends_on date not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on and ends_on - starts_on <= 366)
);

create index if not exists competitions_group_idx on public.competitions (group_id, ends_on desc);

drop trigger if exists competitions_set_updated_at on public.competitions;
create trigger competitions_set_updated_at
  before update on public.competitions
  for each row execute function private.set_updated_at();

alter table public.competitions enable row level security;
revoke all on public.competitions from anon, authenticated;
grant select on public.competitions to authenticated;
grant all on public.competitions to service_role;

drop policy if exists competitions_select on public.competitions;
create policy competitions_select on public.competitions
  for select to authenticated
  using (private.is_group_member(group_id));

create or replace function public.create_competition(
  p_group_id uuid,
  p_name text,
  p_starts_on date,
  p_ends_on date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.group_role := private.group_role_of(p_group_id);
  v_id uuid;
begin
  if v_role is null or v_role not in ('owner', 'admin') then
    raise exception 'Only owners and admins can create competitions';
  end if;
  insert into public.competitions (group_id, name, starts_on, ends_on, created_by)
  values (p_group_id, btrim(p_name), p_starts_on, p_ends_on, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

-- Dates can only change until the competition has finished (a finished one may already have been announced).
create or replace function public.update_competition(
  p_id uuid,
  p_name text,
  p_starts_on date,
  p_ends_on date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
  v_ends date;
  v_starts date;
  v_tz text;
  v_role public.group_role;
begin
  select c.group_id, c.ends_on, c.starts_on, g.timezone
  into v_group_id, v_ends, v_starts, v_tz
  from public.competitions c join public.groups g on g.id = c.group_id
  where c.id = p_id;
  v_role := private.group_role_of(v_group_id);
  if v_role is null or v_role not in ('owner', 'admin') then
    raise exception 'Only owners and admins can edit competitions';
  end if;
  if (p_starts_on <> v_starts or p_ends_on <> v_ends) and v_ends < (now() at time zone v_tz)::date then
    raise exception 'A finished competition''s dates can''t be changed';
  end if;
  update public.competitions
  set name = btrim(p_name), starts_on = p_starts_on, ends_on = p_ends_on
  where id = p_id;
end;
$$;

create or replace function public.delete_competition(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
  v_role public.group_role;
begin
  select group_id into v_group_id from public.competitions where id = p_id;
  v_role := private.group_role_of(v_group_id);
  if v_role is null or v_role not in ('owner', 'admin') then
    raise exception 'Only owners and admins can delete competitions';
  end if;
  delete from public.competitions where id = p_id;
end;
$$;

revoke execute on function
  public.create_competition(uuid, text, date, date),
  public.update_competition(uuid, text, date, date),
  public.delete_competition(uuid)
  from public, anon, authenticated;
grant execute on function
  public.create_competition(uuid, text, date, date),
  public.update_competition(uuid, text, date, date),
  public.delete_competition(uuid)
  to authenticated;
