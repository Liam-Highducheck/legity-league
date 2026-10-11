-- Helpers used by RLS policies and RPCs. They live in `private` (not exposed by the
-- Data API) and are security definer so policies on group_members don't recurse.

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = (select auth.uid())
  );
$$;

create or replace function private.group_role_of(p_group_id uuid)
returns public.group_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.group_members
  where group_id = p_group_id and user_id = (select auth.uid());
$$;

-- true for yourself, or anyone you share at least one group with
create or replace function private.shares_group_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id = (select auth.uid())
    or exists (
      select 1
      from public.group_members me
      join public.group_members them on them.group_id = me.group_id
      where me.user_id = (select auth.uid()) and them.user_id = p_user_id
    );
$$;

revoke execute on function private.is_group_member(uuid) from public, anon;
revoke execute on function private.group_role_of(uuid) from public, anon;
revoke execute on function private.shares_group_with(uuid) from public, anon;
grant execute on function private.is_group_member(uuid) to authenticated;
grant execute on function private.group_role_of(uuid) to authenticated;
grant execute on function private.shares_group_with(uuid) to authenticated;
