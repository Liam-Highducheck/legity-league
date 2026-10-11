-- Signup gate: every new auth user needs a valid invite code in user_metadata
-- (supabase.auth.signUp({ options: { data: { invite_code, display_name } } })).
-- If redeeming fails the exception rolls back the whole signup.
-- The very first user (no profiles yet) is exempt so the owner can bootstrap.

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := new.raw_user_meta_data ->> 'invite_code';
  v_name text;
  v_is_first boolean := not exists (select 1 from public.profiles);
begin
  if not v_is_first and (v_code is null or btrim(v_code) = '') then
    raise exception 'An invite code is required to sign up';
  end if;

  v_name := left(
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(new.email, '@', 1)
    ),
    40
  );

  insert into public.profiles (id, display_name) values (new.id, v_name);

  if not v_is_first then
    perform private.redeem_invite(new.id, v_code);
  end if;

  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
