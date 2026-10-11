-- History import. The sleep-ingest logic moves into private.ingest_core so it can be called both by the
-- token-authenticated Shortcut endpoint and by a signed-in user importing their full Apple Health export.
-- Segments may now carry an optional "tz" (IANA zone, e.g. from HKTimeZone); a session is dated and stored in
-- the zone of its latest segment that names a valid one, falling back to the profile timezone.

create or replace function private.ingest_core(
  p_user_id uuid,
  p_token_id uuid,
  p_segments jsonb,
  p_source text,
  p_trigger text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tz text;
  v_result jsonb;
begin
  if jsonb_typeof(p_segments) is distinct from 'array' then
    raise exception 'p_segments must be a JSON array (got %: %)', jsonb_typeof(p_segments), left(p_segments::text, 300);
  end if;
  if jsonb_array_length(p_segments) > 5000 then
    raise exception 'Too many segments (max 5000)';
  end if;

  select timezone into v_tz from public.profiles where id = p_user_id;

  with segs as (
    select
      (seg ->> 'start')::timestamptz as s,
      (seg ->> 'end')::timestamptz as e,
      nullif(btrim(seg ->> 'tz'), '') as tz,
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
  -- Apple's explicit Awake segments that fall inside a session (not before sleep onset or after waking)
  awake_in as (
    select ss.sess, count(*) filter (where a.e - a.s >= interval '1 minute') as wakes, sum(extract(epoch from (a.e - a.s)) / 60) as awake_min
    from sessions ss
    join segs a on a.stage = 'awake' and a.s is not null and a.e > a.s
               and a.s >= ss.sleep_start and a.e <= ss.sleep_end
    group by ss.sess
  ),
  zones as materialized (select name from pg_timezone_names),
  -- the zone the session was slept in: the latest segment that names a valid zone (history import sends one)
  session_tz as (
    select ss.sess, (array_agg(z.name order by sg.e desc))[1] as tz
    from sessions ss
    join segs sg on sg.tz is not null and sg.s >= ss.sleep_start and sg.s < ss.sleep_end
    join zones z on z.name = sg.tz
    group by ss.sess
  ),
  detail as (
    select
      ss.sleep_start, ss.sleep_end, ss.asleep, coalesce(max(st.tz), v_tz) as tz,
      coalesce(max(aw.wakes), 0) as wakes, coalesce(max(aw.awake_min), 0) as awake_min,
      coalesce(sum(v.e - v.s) filter (where v.stage = 'deep'), interval '0') as deep,
      coalesce(sum(v.e - v.s) filter (where v.stage = 'rem'), interval '0') as rem,
      jsonb_agg(jsonb_build_object('start', v.s, 'end', v.e, 'stage', v.stage) order by v.s) as segs
    from sessions ss
    join valid v on v.s >= ss.sleep_start and v.s < ss.sleep_end
    left join awake_in aw on aw.sess = ss.sess
    left join session_tz st on st.sess = ss.sess
    where ss.asleep >= interval '120 minutes'
    group by ss.sess, ss.sleep_start, ss.sleep_end, ss.asleep
  ),
  nights as (
    select
      (sleep_end at time zone tz)::date as night_date,
      tz, sleep_start, sleep_end, asleep, wakes, awake_min as awake_mins, deep, rem, segs,
      row_number() over (
        partition by (sleep_end at time zone tz)::date order by asleep desc
      ) as rn
    from detail
  ),
  ins as (
    insert into public.sleep_nights (
      user_id, night_date, source, sleep_start, sleep_end,
      duration_min, restorative_min, deep_min, rem_min, awake_min, wake_count, timezone, raw
    )
    select
      p_user_id, night_date, p_source, sleep_start, sleep_end,
      least(round(extract(epoch from asleep) / 60)::int, 1440),
      case when deep + rem > interval '0'
           then least(round(extract(epoch from deep + rem) / 60)::int,
                      round(extract(epoch from asleep) / 60)::int) end,
      case when deep > interval '0' then round(extract(epoch from deep) / 60)::int end,
      case when rem > interval '0' then round(extract(epoch from rem) / 60)::int end,
      round(awake_mins::numeric, 1),
      wakes,
      tz,
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
      awake_min = excluded.awake_min,
      wake_count = excluded.wake_count,
      timezone = excluded.timezone,
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
    p_user_id,
    p_token_id,
    left(nullif(btrim(p_trigger), ''), 40),
    jsonb_array_length(p_segments),
    jsonb_array_length(v_result -> 'nights')
  );

  return v_result;
end;
$$;

revoke execute on function private.ingest_core(uuid, uuid, jsonb, text, text) from public, anon, authenticated;

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
  v_segments jsonb := p_segments;
  v_text text;
  v_parsed jsonb;
begin
  update public.ingest_tokens
  set last_used_at = now()
  where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    and revoked_at is null
  returning id, user_id into v_token_id, v_user_id;

  if v_user_id is null then
    raise exception 'Invalid token';
  end if;
  -- Apple Shortcuts can't easily send a native JSON array, so also accept a string that is either
  -- a JSON array, or lines of "start|end|value" (tab also works as the separator).
  if jsonb_typeof(v_segments) = 'string' then
    v_text := v_segments #>> '{}';
    begin
      v_parsed := v_text::jsonb;
    exception when others then
      v_parsed := null;
    end;
    if v_parsed is null or jsonb_typeof(v_parsed) is distinct from 'array' then
      -- JSON lines: one JSON object per line (what Shortcuts sends for a list of dictionaries)
      begin
        select jsonb_agg(l::jsonb) into v_parsed
        from regexp_split_to_table(v_text, E'\\r?\\n') as l
        where btrim(l) <> '';
      exception when others then
        v_parsed := null;
      end;
    end if;
    if v_parsed is not null and jsonb_typeof(v_parsed) = 'array' then
      v_segments := v_parsed;
    else
      select coalesce(
        jsonb_agg(jsonb_build_object('start', btrim(parts[1]), 'end', btrim(parts[2]), 'value', btrim(parts[3]))),
        '[]'::jsonb
      )
      into v_segments
      from (
        select regexp_split_to_array(line, E'[|\\t]') as parts
        from regexp_split_to_table(v_text, E'\\r?\\n') as line
        where btrim(line) <> ''
      ) s
      where array_length(parts, 1) >= 3;
      if jsonb_array_length(v_segments) = 0 and btrim(v_text) <> '' then
        raise exception 'No segments recognised in text (expected lines of start|end|value). Got: %', left(v_text, 300);
      end if;
    end if;
  end if;
  if jsonb_typeof(v_segments) is distinct from 'array' then
    raise exception 'p_segments must be a JSON array or lines of start|end|value (got %: %)',
      jsonb_typeof(p_segments), left(p_segments::text, 300);
  end if;

  return private.ingest_core(v_user_id, v_token_id, v_segments, p_source, p_trigger);
end;
$$;

revoke execute on function public.ingest_sleep_segments(text, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.ingest_sleep_segments(text, jsonb, text, text) to anon, authenticated;

-- Signed-in import (no ingest token): the web app parses an Apple Health export in the browser and sends
-- it in batches that never split a sleep session.
create or replace function public.import_sleep_segments(p_segments jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Not signed in';
  end if;
  return private.ingest_core(v_uid, null, p_segments, 'apple_health', 'history-import');
end;
$$;

revoke execute on function public.import_sleep_segments(jsonb) from public, anon, authenticated;
grant execute on function public.import_sleep_segments(jsonb) to authenticated;
