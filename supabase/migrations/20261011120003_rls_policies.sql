-- Row level security. Membership, invite and token changes happen only through the
-- RPCs in the next migration, so those tables get no direct write policies.

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;
alter table public.sleep_nights enable row level security;
alter table public.ingest_tokens enable row level security;

-- Table privileges: anon gets nothing; authenticated gets only what the app needs.
revoke all on public.profiles, public.groups, public.group_members,
  public.group_invites, public.sleep_nights, public.ingest_tokens
  from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, avatar_url, timezone, blackout_enabled, blackout_start, blackout_end)
  on public.profiles to authenticated;

grant select, delete on public.groups to authenticated;
grant update (name, settings) on public.groups to authenticated;

grant select on public.group_members to authenticated;
grant select on public.group_invites to authenticated;
grant select, insert, update, delete on public.sleep_nights to authenticated;

-- token_hash is never readable from the client; select explicit columns, not *
grant select (id, user_id, label, token_prefix, created_at, last_used_at, revoked_at)
  on public.ingest_tokens to authenticated;

-- profiles: see yourself and anyone you share a group with
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (private.shares_group_with(id));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- groups: members read; owner/admin edit name+settings; owner deletes
drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups
  for select to authenticated
  using (private.is_group_member(id));

drop policy if exists groups_update on public.groups;
create policy groups_update on public.groups
  for update to authenticated
  using (private.group_role_of(id) in ('owner', 'admin'))
  with check (private.group_role_of(id) in ('owner', 'admin'));

drop policy if exists groups_delete on public.groups;
create policy groups_delete on public.groups
  for delete to authenticated
  using (private.group_role_of(id) = 'owner');

-- group_members: any member can see the roster
drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members
  for select to authenticated
  using (private.is_group_member(group_id));

-- group_invites: only owner/admin can see them
drop policy if exists group_invites_select on public.group_invites;
create policy group_invites_select on public.group_invites
  for select to authenticated
  using (private.group_role_of(group_id) in ('owner', 'admin'));

-- sleep_nights: read yours + groupmates'; write only your own manual entries.
-- Device-sourced rows arrive through ingest_sleep_night().
drop policy if exists sleep_nights_select on public.sleep_nights;
create policy sleep_nights_select on public.sleep_nights
  for select to authenticated
  using (private.shares_group_with(user_id));

drop policy if exists sleep_nights_insert_own on public.sleep_nights;
create policy sleep_nights_insert_own on public.sleep_nights
  for insert to authenticated
  with check (user_id = (select auth.uid()) and source = 'manual');

drop policy if exists sleep_nights_update_own on public.sleep_nights;
create policy sleep_nights_update_own on public.sleep_nights
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and source = 'manual');

drop policy if exists sleep_nights_delete_own on public.sleep_nights;
create policy sleep_nights_delete_own on public.sleep_nights
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ingest_tokens: see your own (minus the hash, via column grants)
drop policy if exists ingest_tokens_select_own on public.ingest_tokens;
create policy ingest_tokens_select_own on public.ingest_tokens
  for select to authenticated
  using (user_id = (select auth.uid()));
