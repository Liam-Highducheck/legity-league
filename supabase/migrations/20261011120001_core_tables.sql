-- Core tables for Legity League.
-- Sleep data belongs to the user; groups only control who may read it (see RLS migration).

create schema if not exists private;

do $$ begin
  create type public.group_role as enum ('owner', 'admin', 'member');
exception when duplicate_object then null;
end $$;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- profiles: one per auth user, created by the signup trigger
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_url text,
  timezone text not null default 'Australia/Sydney',
  blackout_enabled boolean not null default true,
  blackout_start time not null default '19:00',
  blackout_end time not null default '07:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- groups
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists groups_set_updated_at on public.groups;
create trigger groups_set_updated_at
  before update on public.groups
  for each row execute function private.set_updated_at();

-- group_members: exactly one owner per group
create table if not exists public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.group_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create unique index if not exists group_members_one_owner
  on public.group_members (group_id) where role = 'owner';
create index if not exists group_members_user_id_idx
  on public.group_members (user_id);

-- group_invites: shareable codes that always grant 'member'
create table if not exists public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  code text not null unique
    default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  created_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  max_uses integer not null default 25 check (max_uses between 1 and 500),
  uses integer not null default 0,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (uses <= max_uses)
);

create index if not exists group_invites_group_id_idx
  on public.group_invites (group_id);

-- sleep_nights: one summary row per user per night.
-- night_date is the local calendar date the user woke up on.
-- Metrics beyond duration are nullable because devices differ; `raw` keeps the
-- payload as received so we can backfill if the shape changes.
create table if not exists public.sleep_nights (
  user_id uuid not null references public.profiles (id) on delete cascade,
  night_date date not null,
  source text not null check (char_length(source) between 1 and 40),
  sleep_start timestamptz,
  sleep_end timestamptz,
  duration_min integer not null check (duration_min between 1 and 1440),
  score smallint check (score between 0 and 100),
  restorative_min integer check (restorative_min between 0 and 1440),
  deep_min integer check (deep_min between 0 and 1440),
  rem_min integer check (rem_min between 0 and 1440),
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, night_date),
  check (sleep_start is null or sleep_end is null or sleep_end > sleep_start)
);

create index if not exists sleep_nights_night_date_idx
  on public.sleep_nights (night_date);

drop trigger if exists sleep_nights_set_updated_at on public.sleep_nights;
create trigger sleep_nights_set_updated_at
  before update on public.sleep_nights
  for each row execute function private.set_updated_at();

-- ingest_tokens: per-device secrets for Shortcuts. Only the sha256 hash is stored.
create table if not exists public.ingest_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 60),
  token_prefix text not null,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists ingest_tokens_user_id_idx
  on public.ingest_tokens (user_id);
