-- Profile additions (full name, flexible blackout, onboarding state), app-wide config,
-- and raw-segment ingest: the Shortcut sends sleep segments, Postgres works out the nights.

alter table public.profiles
  add column if not exists full_name text
    check (full_name is null or char_length(full_name) between 1 and 80),
  add column if not exists target_bedtime time not null default '23:00',
  add column if not exists target_wake time not null default '07:00',
  -- 'fixed' uses blackout_start/end; 'bedtime' = target_bedtime - lead until target_wake
  add column if not exists blackout_mode text not null default 'bedtime'
    check (blackout_mode in ('fixed', 'bedtime')),
  add column if not exists blackout_lead_min integer not null default 240
    check (blackout_lead_min between 0 and 720),
  add column if not exists sleep_source text
    check (sleep_source is null or sleep_source in ('apple_health', 'manual', 'garmin', 'other')),
  add column if not exists onboarded_at timestamptz;

grant update (full_name, target_bedtime, target_wake, blackout_mode, blackout_lead_min,
              sleep_source, onboarded_at)
  on public.profiles to authenticated;

-- app_config: app-wide settings, editable only via dashboard/SQL
create table if not exists public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;
revoke all on public.app_config from anon, authenticated;
grant select on public.app_config to authenticated;

drop policy if exists app_config_select on public.app_config;
create policy app_config_select on public.app_config
  for select to authenticated using (true);

-- Everyone's rankings are hidden between these times (evaluated in each user's timezone),
-- in addition to their personal blackout.
insert into public.app_config (key, value)
values ('forced_blackout', '{"enabled": true, "start": "19:00", "end": "07:00"}')
on conflict (key) do nothing;

-- Signup trigger now also captures full_name.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := new.raw_user_meta_data ->> 'invite_code';
  v_name text;
  v_full text := left(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), 80);
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

  insert into public.profiles (id, display_name, full_name)
  values (new.id, v_name, v_full);

  if not v_is_first then
    perform private.redeem_invite(new.id, v_code);
  end if;

  return new;
end;
$$;

-- Segment ingest.
-- p_segments: [{"start": ISO8601, "end": ISO8601, "value": "Core"|"Deep"|"REM"|"Awake"|"In Bed"|"Asleep"}, ...]
-- Overlapping segments (e.g. Watch + iPhone) are merged, so duration is never double counted.
-- Segments are grouped into sleep sessions (gaps > 3h split them); each session is assigned to the
-- user's local date it ended on. Sessions under 2h (naps) are ignored; the longest session per date wins.
-- Re-sending data is safe: a night is only overwritten when the new duration is >= the stored one,
-- so a truncated window can't clobber a complete night.
create or replace function public.ingest_sleep_segments(
  p_token text,
  p_segments jsonb,
  p_source text default 'apple_health'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_tz text;
  v_result jsonb;
begin
  update public.ingest_tokens
  set last_used_at = now()
  where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    and revoked_at is null
  returning user_id into v_user_id;

  if v_user_id is null then
    raise exception 'Invalid token';
  end if;
  if jsonb_typeof(p_segments) is distinct from 'array' then
    raise exception 'p_segments must be a JSON array';
  end if;
  if jsonb_array_length(p_segments) > 5000 then
    raise exception 'Too many segments (max 5000)';
  end if;

  select timezone into v_tz from public.profiles where id = v_user_id;

  with segs as (
    select
      (seg ->> 'start')::timestamptz as s,
      (seg ->> 'end')::timestamptz as e,
      case
        when lower(coalesce(seg ->> 'value', seg ->> 'stage', '')) like '%deep%' then 'deep'
        when lower(coalesce(seg ->> 'value', seg ->> 'stage', '')) like '%rem%' then 'rem'
        when lower(coalesce(seg ->> 'value', seg ->> 'stage', '')) like '%core%'
          or lower(coalesce(seg ->> 'value', seg ->> 'stage', '')) like '%light%' then 'core'
        when lower(coalesce(seg ->> 'value', seg ->> 'stage', '')) like '%awake%' then 'awake'
        when lower(coalesce(seg ->> 'value', seg ->> 'stage', '')) like '%in bed%'
          or lower(coalesce(seg ->> 'value', seg ->> 'stage', '')) like '%inbed%' then 'inbed'
        else 'asleep'
      end as stage
    from jsonb_array_elements(p_segments) as t(seg)
  ),
  valid as (
    select s, e, case when stage = 'inbed' then 'asleep' else stage end as stage
    from segs
    where s is not null and e > s
      and (
        stage in ('deep', 'rem', 'core', 'asleep')
        or (stage = 'inbed'
            and not exists (select 1 from segs x where x.stage in ('deep', 'rem', 'core', 'asleep')))
      )
  ),
  -- merge overlapping intervals (gaps-and-islands)
  ordered as (
    select s, e,
      max(e) over (order by s, e rows between unbounded preceding and 1 preceding) as prev_max
    from valid
  ),
  islands as (
    select s, e,
      sum(case when prev_max is null or s > prev_max then 1 else 0 end)
        over (order by s, e) as island
    from ordered
  ),
  merged as (
    select min(s) as s, max(e) as e from islands group by island
  ),
  -- group merged intervals into sessions
  flagged as (
    select s, e,
      case when lag(e) over (order by s) is null
             or s - lag(e) over (order by s) > interval '3 hours'
           then 1 else 0 end as new_session
    from merged
  ),
  numbered as (
    select s, e, sum(new_session) over (order by s) as sess from flagged
  ),
  sessions as (
    select sess, min(s) as sleep_start, max(e) as sleep_end, sum(e - s) as asleep
    from numbered group by sess
  ),
  detail as (
    select
      ss.sleep_start, ss.sleep_end, ss.asleep,
      coalesce(sum(v.e - v.s) filter (where v.stage = 'deep'), interval '0') as deep,
      coalesce(sum(v.e - v.s) filter (where v.stage = 'rem'), interval '0') as rem,
      jsonb_agg(jsonb_build_object('start', v.s, 'end', v.e, 'stage', v.stage) order by v.s) as segs
    from sessions ss
    join valid v on v.s >= ss.sleep_start and v.s < ss.sleep_end
    where ss.asleep >= interval '120 minutes'
    group by ss.sess, ss.sleep_start, ss.sleep_end, ss.asleep
  ),
  nights as (
    select
      (sleep_end at time zone v_tz)::date as night_date,
      sleep_start, sleep_end, asleep, deep, rem, segs,
      row_number() over (
        partition by (sleep_end at time zone v_tz)::date order by asleep desc
      ) as rn
    from detail
  ),
  ins as (
    insert into public.sleep_nights (
      user_id, night_date, source, sleep_start, sleep_end,
      duration_min, restorative_min, deep_min, rem_min, raw
    )
    select
      v_user_id, night_date, p_source, sleep_start, sleep_end,
      least(round(extract(epoch from asleep) / 60)::int, 1440),
      case when deep + rem > interval '0'
           then least(round(extract(epoch from deep + rem) / 60)::int,
                      round(extract(epoch from asleep) / 60)::int) end,
      case when deep > interval '0' then round(extract(epoch from deep) / 60)::int end,
      case when rem > interval '0' then round(extract(epoch from rem) / 60)::int end,
      jsonb_build_object('segments', segs)
    from nights
    where rn = 1
    on conflict (user_id, night_date) do update set
      source = excluded.source,
      sleep_start = excluded.sleep_start,
      sleep_end = excluded.sleep_end,
      duration_min = excluded.duration_min,
      restorative_min = excluded.restorative_min,
      deep_min = excluded.deep_min,
      rem_min = excluded.rem_min,
      raw = excluded.raw
    where public.sleep_nights.source <> excluded.source
       or excluded.duration_min >= public.sleep_nights.duration_min
    returning night_date, duration_min
  )
  select jsonb_build_object(
    'nights',
    coalesce(jsonb_agg(jsonb_build_object('night_date', night_date, 'duration_min', duration_min)
                       order by night_date), '[]'::jsonb)
  )
  into v_result
  from ins;

  return v_result;
end;
$$;

revoke execute on function public.ingest_sleep_segments(text, jsonb, text) from public, anon, authenticated;
grant execute on function public.ingest_sleep_segments(text, jsonb, text) to anon, authenticated;
