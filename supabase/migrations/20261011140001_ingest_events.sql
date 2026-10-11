-- Sync log: one row per Shortcut check-in, labelled with what triggered it.
-- Used to see which automation triggers actually work, and to debug "why isn't my sleep syncing".

create table if not exists public.ingest_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token_id uuid references public.ingest_tokens (id) on delete set null,
  trigger_label text,
  segment_count integer not null,
  nights_written integer not null,
  created_at timestamptz not null default now()
);

create index if not exists ingest_events_user_created_idx
  on public.ingest_events (user_id, created_at desc);

alter table public.ingest_events enable row level security;
revoke all on public.ingest_events from anon, authenticated;
grant select on public.ingest_events to authenticated;

drop policy if exists ingest_events_select_own on public.ingest_events;
create policy ingest_events_select_own on public.ingest_events
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Replace ingest_sleep_segments with a version that takes an optional trigger label and logs the call.
drop function if exists public.ingest_sleep_segments(text, jsonb, text);

create or replace function public.ingest_sleep_segments(
  p_token text,
  p_segments jsonb,
  p_source text default 'apple_health',
  p_trigger text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_token_id uuid;
  v_tz text;
  v_result jsonb;
begin
  update public.ingest_tokens
  set last_used_at = now()
  where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    and revoked_at is null
  returning id, user_id into v_token_id, v_user_id;

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

  insert into public.ingest_events (user_id, token_id, trigger_label, segment_count, nights_written)
  values (
    v_user_id,
    v_token_id,
    left(nullif(btrim(p_trigger), ''), 40),
    jsonb_array_length(p_segments),
    jsonb_array_length(v_result -> 'nights')
  );

  return v_result;
end;
$$;

revoke execute on function public.ingest_sleep_segments(text, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.ingest_sleep_segments(text, jsonb, text, text) to anon, authenticated;
