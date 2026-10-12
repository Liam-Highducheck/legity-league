-- Self-service account deletion (an App Store requirement for apps with accounts).
--
-- Deleting the auth user cascades to everything the person owns: profile, group memberships, sleep nights, ingest
-- tokens and events (all reference profiles/auth.users with on delete cascade). Rows others created that point at the
-- person (groups.created_by, invites, competitions) are set null by their foreign keys.
--
-- Two group rules so nobody is left stranded:
--   * An owner of a group that still has other members must hand ownership over first (transfer_ownership), or remove
--     the members, so a group is never left without an owner.
--   * A group the person is the only member of is deleted with them, since nobody could ever use it again.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not signed in';
  end if;

  if exists (
    select 1
    from public.group_members me
    where me.user_id = v_uid
      and me.role = 'owner'
      and exists (
        select 1 from public.group_members other
        where other.group_id = me.group_id and other.user_id <> v_uid
      )
  ) then
    raise exception 'You own a group with other members. Make someone else the owner (or remove the members) before deleting your account';
  end if;

  delete from public.groups g
  where exists (
    select 1 from public.group_members me
    where me.group_id = g.id and me.user_id = v_uid and me.role = 'owner'
  );

  delete from auth.users where id = v_uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon, authenticated;
grant execute on function public.delete_my_account() to authenticated;
