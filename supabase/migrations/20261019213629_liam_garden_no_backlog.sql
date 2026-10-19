-- Garden nights count from the day the garden was started: nothing from before it is paid out, so everyone starts from 0.
-- (Was: a 7-day grace window before the start.) Rewards are unchanged.

-- Turns scored nights into coins: p_nights is [{"date": "2026-10-14", "score": 83}, ...]. One claim per night.
create or replace function public.garden_claim_nights(p_nights jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_state public.garden_state;
  v_today date;
  v_el jsonb;
  v_date date;
  v_score integer;
  v_coins integer := 0;
  v_boxes integer := 0;
  v_dates text[] := '{}';
  v_n integer;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if jsonb_typeof(p_nights) <> 'array' then raise exception 'Expected a list of nights'; end if;
  select * into v_state from public.garden_state where user_id = v_uid for update;
  if not found then raise exception 'Garden not started'; end if;
  v_today := private.garden_today(v_uid);

  for v_el in select * from jsonb_array_elements(p_nights) limit 400 loop
    v_date := (v_el ->> 'date')::date;
    v_score := least(100, greatest(0, round((v_el ->> 'score')::numeric)::integer));
    -- from the day the garden started (no backlog), not in the future, and a night that really exists for this user
    continue when v_date < v_state.started_on or v_date > v_today;
    continue when not exists (select 1 from public.sleep_nights where user_id = v_uid and night_date = v_date);
    insert into public.garden_night_claims (user_id, night_date, score, coins, box)
    values (v_uid, v_date, v_score, v_score, v_score >= 100)
    on conflict (user_id, night_date) do nothing;
    get diagnostics v_n = row_count;
    if v_n = 1 then
      v_coins := v_coins + v_score;
      if v_score >= 100 then v_boxes := v_boxes + 1; end if;
      v_dates := v_dates || v_date::text;
    end if;
  end loop;

  update public.garden_state set coins = coins + v_coins, boxes = boxes + v_boxes where user_id = v_uid;
  return jsonb_build_object('coins', v_coins, 'boxes', v_boxes, 'dates', to_jsonb(v_dates));
end;
$$;
