-- Per-group blackout, set by the group owner. Replaces the app-wide blackout, which is switched off
-- here (the app_config row and client code stay, so it can be turned back on as a kill-switch).

alter table public.groups
  add column if not exists blackout_enabled boolean not null default false,
  add column if not exists blackout_start time not null default '19:00',
  add column if not exists blackout_end time not null default '07:00';

-- Not added to the `grant update (name, settings)` on groups: these columns change only through the RPC below.

create or replace function public.set_group_blackout(
  p_group_id uuid,
  p_enabled boolean,
  p_start time,
  p_end time
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.group_role_of(p_group_id) is distinct from 'owner' then
    raise exception 'Only the group owner can change the blackout';
  end if;

  update public.groups
  set blackout_enabled = p_enabled,
      blackout_start = p_start,
      blackout_end = p_end
  where id = p_group_id;
end;
$$;

revoke all on function public.set_group_blackout(uuid, boolean, time, time) from public, anon;
grant execute on function public.set_group_blackout(uuid, boolean, time, time) to authenticated;

-- Turn the app-wide blackout off.
update public.app_config
set value = jsonb_set(value, '{enabled}', 'false'::jsonb),
    updated_at = now()
where key = 'forced_blackout';
