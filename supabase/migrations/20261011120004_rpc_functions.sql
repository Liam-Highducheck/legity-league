-- RPCs for everything that changes membership, invites or tokens, plus sleep ingest.
-- All are security definer and check the caller's role themselves.

-- Internal: consume an invite for a user. Shared by join_group() and the signup trigger.
create or replace function private.redeem_invite(p_user_id uuid, p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.group_invites;
begin
  select * into v_invite
  from public.group_invites
  where code = upper(btrim(p_code))
  for update;

  if not found
     or v_invite.revoked_at is not null
     or v_invite.expires_at <= now()
     or v_invite.uses >= v_invite.max_uses then
    raise exception 'Invite is invalid or has expired';
  end if;

  if exists (
    select 1 from public.group_members
    where group_id = v_invite.group_id and user_id = p_user_id
  ) then
    return v_invite.group_id;
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (v_invite.group_id, p_user_id, 'member');

  update public.group_invites set uses = uses + 1 where id = v_invite.id;

  return v_invite.group_id;
end;
$$;

revoke execute on function private.redeem_invite(uuid, text) from public, anon, authenticated;

-- Anyone (including logged-out visitors on the join page) can check a code.
create or replace function public.check_invite(p_code text)
returns table (valid boolean, group_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select true, g.name
  from public.group_invites i
  join public.groups g on g.id = i.group_id
  where i.code = upper(btrim(p_code))
    and i.revoked_at is null
    and i.expires_at > now()
    and i.uses < i.max_uses
  union all
  select false, null
  where not exists (
    select 1 from public.group_invites i
    where i.code = upper(btrim(p_code))
      and i.revoked_at is null
      and i.expires_at > now()
      and i.uses < i.max_uses
  );
$$;

create or replace function public.create_group(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := btrim(p_name);
  v_group_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if char_length(v_name) not between 1 and 60 then
    raise exception 'Group name must be 1-60 characters';
  end if;

  insert into public.groups (name, created_by)
  values (v_name, v_uid)
  returning id into v_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, v_uid, 'owner');

  return v_group_id;
end;
$$;

create or replace function public.join_group(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  return private.redeem_invite(auth.uid(), p_code);
end;
$$;

create or replace function public.create_invite(
  p_group_id uuid,
  p_expires_in interval default interval '7 days',
  p_max_uses integer default 25
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.group_role := private.group_role_of(p_group_id);
  v_code text;
begin
  if v_role is null or v_role not in ('owner', 'admin') then
    raise exception 'Only owners and admins can create invites';
  end if;
  if p_expires_in <= interval '0' or p_expires_in > interval '90 days' then
    raise exception 'Expiry must be between 0 and 90 days';
  end if;

  insert into public.group_invites (group_id, created_by, expires_at, max_uses)
  values (p_group_id, auth.uid(), now() + p_expires_in, p_max_uses)
  returning code into v_code;

  return v_code;
end;
$$;

create or replace function public.revoke_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
  v_role public.group_role;
begin
  select group_id into v_group_id from public.group_invites where id = p_invite_id;
  v_role := private.group_role_of(v_group_id);

  if v_role is null or v_role not in ('owner', 'admin') then
    raise exception 'Only owners and admins can revoke invites';
  end if;

  update public.group_invites
  set revoked_at = coalesce(revoked_at, now())
  where id = p_invite_id;
end;
$$;

create or replace function public.remove_member(p_group_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_role public.group_role := private.group_role_of(p_group_id);
  v_target_role public.group_role;
begin
  if v_caller_role is null or v_caller_role not in ('owner', 'admin') then
    raise exception 'Only owners and admins can remove members';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Use leave_group to leave a group';
  end if;

  select role into v_target_role
  from public.group_members
  where group_id = p_group_id and user_id = p_user_id;

  if not found then
    raise exception 'User is not a member of this group';
  end if;
  if v_target_role = 'owner' then
    raise exception 'The owner cannot be removed';
  end if;
  if v_target_role = 'admin' and v_caller_role <> 'owner' then
    raise exception 'Only the owner can remove admins';
  end if;

  delete from public.group_members
  where group_id = p_group_id and user_id = p_user_id;
end;
$$;

create or replace function public.set_member_role(
  p_group_id uuid,
  p_user_id uuid,
  p_role public.group_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target_role public.group_role;
begin
  if private.group_role_of(p_group_id) is distinct from 'owner' then
    raise exception 'Only the owner can change roles';
  end if;
  if p_role not in ('admin', 'member') then
    raise exception 'Role must be admin or member (use transfer_ownership for owner)';
  end if;

  select role into v_target_role
  from public.group_members
  where group_id = p_group_id and user_id = p_user_id;

  if not found then
    raise exception 'User is not a member of this group';
  end if;
  if v_target_role = 'owner' then
    raise exception 'The owner role cannot be changed here';
  end if;

  update public.group_members set role = p_role
  where group_id = p_group_id and user_id = p_user_id;
end;
$$;

create or replace function public.transfer_ownership(p_group_id uuid, p_new_owner uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.group_role_of(p_group_id) is distinct from 'owner' then
    raise exception 'Only the owner can transfer ownership';
  end if;
  if p_new_owner = auth.uid() then
    raise exception 'You already own this group';
  end if;
  if not exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_new_owner
  ) then
    raise exception 'New owner must already be a member';
  end if;

  update public.group_members set role = 'admin'
  where group_id = p_group_id and user_id = auth.uid();
  update public.group_members set role = 'owner'
  where group_id = p_group_id and user_id = p_new_owner;
end;
$$;

create or replace function public.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.group_role := private.group_role_of(p_group_id);
begin
  if v_role is null then
    raise exception 'You are not a member of this group';
  end if;
  if v_role = 'owner' then
    raise exception 'Transfer ownership or delete the group before leaving';
  end if;

  delete from public.group_members
  where group_id = p_group_id and user_id = auth.uid();
end;
$$;

-- Ingest tokens: the plaintext is returned once and never stored.
create or replace function public.create_ingest_token(p_label text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_token text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  v_token := 'll_' || replace(gen_random_uuid()::text, '-', '')
                   || replace(gen_random_uuid()::text, '-', '');

  insert into public.ingest_tokens (user_id, label, token_prefix, token_hash)
  values (
    v_uid,
    btrim(p_label),
    left(v_token, 8),
    encode(sha256(convert_to(v_token, 'UTF8')), 'hex')
  );

  return v_token;
end;
$$;

create or replace function public.revoke_ingest_token(p_token_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.ingest_tokens
  set revoked_at = coalesce(revoked_at, now())
  where id = p_token_id and user_id = auth.uid();
end;
$$;

-- Called by Apple Shortcuts (anon key + token). Latest write for a night wins.
create or replace function public.ingest_sleep_night(
  p_token text,
  p_night_date date,
  p_duration_min integer,
  p_source text default 'apple_health',
  p_sleep_start timestamptz default null,
  p_sleep_end timestamptz default null,
  p_score integer default null,
  p_restorative_min integer default null,
  p_deep_min integer default null,
  p_rem_min integer default null,
  p_raw jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  update public.ingest_tokens
  set last_used_at = now()
  where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    and revoked_at is null
  returning user_id into v_user_id;

  if v_user_id is null then
    raise exception 'Invalid token';
  end if;

  insert into public.sleep_nights (
    user_id, night_date, source, sleep_start, sleep_end, duration_min,
    score, restorative_min, deep_min, rem_min, raw
  )
  values (
    v_user_id, p_night_date, p_source, p_sleep_start, p_sleep_end, p_duration_min,
    p_score, p_restorative_min, p_deep_min, p_rem_min, p_raw
  )
  on conflict (user_id, night_date) do update set
    source = excluded.source,
    sleep_start = excluded.sleep_start,
    sleep_end = excluded.sleep_end,
    duration_min = excluded.duration_min,
    score = excluded.score,
    restorative_min = excluded.restorative_min,
    deep_min = excluded.deep_min,
    rem_min = excluded.rem_min,
    raw = excluded.raw;
end;
$$;

-- Execute grants: lock everything down, then open up exactly what's needed.
revoke execute on function
  public.check_invite(text),
  public.create_group(text),
  public.join_group(text),
  public.create_invite(uuid, interval, integer),
  public.revoke_invite(uuid),
  public.remove_member(uuid, uuid),
  public.set_member_role(uuid, uuid, public.group_role),
  public.transfer_ownership(uuid, uuid),
  public.leave_group(uuid),
  public.create_ingest_token(text),
  public.revoke_ingest_token(uuid),
  public.ingest_sleep_night(text, date, integer, text, timestamptz, timestamptz, integer, integer, integer, integer, jsonb)
  from public, anon, authenticated;

grant execute on function
  public.create_group(text),
  public.join_group(text),
  public.create_invite(uuid, interval, integer),
  public.revoke_invite(uuid),
  public.remove_member(uuid, uuid),
  public.set_member_role(uuid, uuid, public.group_role),
  public.transfer_ownership(uuid, uuid),
  public.leave_group(uuid),
  public.create_ingest_token(text),
  public.revoke_ingest_token(uuid)
  to authenticated;

grant execute on function
  public.check_invite(text),
  public.ingest_sleep_night(text, date, integer, text, timestamptz, timestamptz, integer, integer, integer, integer, jsonb)
  to anon, authenticated;
