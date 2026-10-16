-- Garden catalog v2: a bigger roster where every rare-or-better plant has exactly one way to be obtained, prices and goals
-- timed in days (see packages/core/src/garden/pace.ts), and a legendary tier for the longest goals.
--
-- Same rules as the first garden migration: the rows below mirror packages/core/src/garden (species.ts, achievements.ts) and a
-- core test fails if they drift. Keep the one-line `values` format.

-- legendary joins the rarities (it only ever comes from a goal)
alter table public.garden_species drop constraint if exists garden_species_rarity_check;
alter table public.garden_species add constraint garden_species_rarity_check
  check (rarity in ('common', 'uncommon', 'rare', 'epic', 'legendary'));

insert into public.garden_species (id, rarity, price, shop, droppable, evolves_from) values
('sprout', 'common', 90, 'always', false, null),
('clover', 'common', 120, 'always', true, null),
('tulip', 'common', 150, 'always', false, null),
('chamomile', 'common', 190, 'always', false, null),
('dandelion', 'common', 230, 'always', true, null),
('reed', 'common', 310, 'rotating', true, null),
('lavender', 'uncommon', 700, 'always', true, null),
('fern', 'uncommon', 880, 'always', true, null),
('succulent', 'uncommon', 1050, 'always', true, null),
('bluebell', 'uncommon', 1250, 'rotating', true, null),
('poppy', 'uncommon', 1500, 'rotating', true, null),
('cactus', 'uncommon', 1800, 'rotating', true, null),
('pine', 'uncommon', 2100, 'always', false, null),
('bonsai', 'uncommon', 2400, 'always', false, null),
('sapling', 'uncommon', null, null, false, 'sprout'),
('twilighttulip', 'uncommon', null, null, false, 'tulip'),
('goldchamomile', 'uncommon', null, null, false, 'chamomile'),
('moonlily', 'rare', 4200, 'rotating', false, null),
('drowsycap', 'rare', 3600, 'rotating', false, null),
('lotus', 'rare', 5200, 'rotating', false, null),
('bamboo', 'rare', 4600, 'always', false, null),
('glimmerbud', 'rare', 4000, 'rotating', false, null),
('wisteria', 'rare', null, null, true, null),
('hydrangea', 'rare', null, null, true, null),
('threadvine', 'rare', null, null, true, null),
('dreamlavender', 'rare', null, null, false, 'lavender'),
('moonfern', 'rare', null, null, false, 'fern'),
('sakura', 'rare', null, null, false, 'bonsai'),
('bloomsucc', 'rare', null, null, false, 'succulent'),
('luckyclover', 'rare', null, null, false, 'clover'),
('wishdandelion', 'rare', null, null, false, 'dandelion'),
('frostpine', 'rare', null, null, false, 'pine'),
('orchid', 'epic', 13500, 'rotating', false, null),
('dreamcap', 'epic', null, null, true, null),
('willow', 'epic', null, null, false, null),
('crystalrose', 'epic', null, null, false, null),
('starblossom', 'epic', null, null, false, 'glimmerbud'),
('dreamcatcher', 'epic', null, null, false, 'threadvine'),
('moonlotus', 'epic', null, null, false, 'lotus'),
('moonwood', 'epic', null, null, false, 'sapling'),
('aurora', 'legendary', null, null, false, null),
('celestial', 'legendary', null, null, false, null)
on conflict (id) do update set rarity = excluded.rarity, price = excluded.price, shop = excluded.shop,
  droppable = excluded.droppable, evolves_from = excluded.evolves_from;

-- Goals that no longer exist (their thresholds could not be met in any reasonable time). Nobody keeps rewards that were
-- already paid out; only the claim records and the goals themselves go.
delete from public.garden_achievement_claims
  where achievement_id in ('eight-streak-7', 'eight-streak-14', 'score-85-streak-10', 'early-bird-streak-7');
delete from public.garden_achievements
  where id in ('eight-streak-7', 'eight-streak-14', 'score-85-streak-10', 'early-bird-streak-7');

insert into public.garden_achievements (id, coins, boxes, seed_species) values
('first-night', 50, 0, null),
('week-logged', 100, 1, null),
('month-logged', 300, 1, null),
('hundred-logged', 800, 2, null),
('year-logged', 2500, 3, 'aurora'),
('full-5', 150, 0, null),
('eight-streak-3', 300, 0, null),
('full-20', 500, 1, null),
('eight-streak-5', 1000, 2, null),
('full-60', 1500, 2, 'willow'),
('sleep-100h', 300, 0, null),
('sleep-500h', 800, 1, null),
('sleep-1000h', 1500, 2, null),
('sleep-2500h', 5000, 3, 'celestial'),
('restorative-25h', 200, 0, null),
('restorative-100h', 600, 1, null),
('restorative-250h', 1500, 2, null),
('restorative-350h', 1500, 1, 'crystalrose'),
('deep-25h', 250, 0, null),
('deep-100h', 900, 1, null),
('rem-25h', 250, 0, null),
('rem-100h', 800, 2, null),
('score-80', 100, 0, null),
('score-90-x10', 600, 1, null),
('score-80-streak-5', 600, 1, null),
('score-75-streak-7', 900, 2, null),
('score-100', 800, 2, null),
('early-bird-5', 200, 0, null),
('early-bird-streak-3', 500, 1, null),
('calm-5', 250, 0, null),
('calm-streak-3', 900, 2, null),
('first-plant', 50, 0, null),
('plant-5', 150, 0, null),
('bloom-3', 300, 1, null),
('first-evolution', 300, 1, null),
('collector-5', 300, 1, null),
('open-5-boxes', 200, 0, null),
('collector-10', 1000, 2, null),
('evolve-5', 1500, 2, null),
('open-25-boxes', 800, 1, null),
('garden-full', 1000, 3, null),
('collector-20', 2500, 3, null)
on conflict (id) do update set coins = excluded.coins, boxes = excluded.boxes, seed_species = excluded.seed_species;

-- Shop: three rotating seeds a day now (there are more of them).
create or replace function private.garden_stock(p_date date)
returns table (species text, price integer, rarity text, rotating boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select id, s.price, s.rarity, false from public.garden_species s where s.shop = 'always'
  union all
  (select id, s.price, s.rarity, true from public.garden_species s where s.shop = 'rotating'
   order by md5(s.id || p_date::text) limit 3);
$$;

-- Dream Box odds: weights common=50 uncommon=30 rare=17 epic=3 (legendary never drops), pity=6, as in core's BOX_WEIGHTS /
-- BOX_PITY (a core test checks these constants).
create or replace function public.garden_open_box()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_state public.garden_state;
  w_common constant integer := 50;
  w_uncommon constant integer := 30;
  w_rare constant integer := 17;
  w_epic constant integer := 3;
  pity_after constant integer := 6;
  v_roll numeric;
  v_rarity text;
  v_species text;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  select * into v_state from public.garden_state where user_id = v_uid for update;
  if not found then raise exception 'Garden not started'; end if;
  if v_state.boxes < 1 then raise exception 'No Dream Boxes to open'; end if;

  if v_state.pity >= pity_after then
    -- guaranteed rare or better, keeping the rare:epic odds
    v_rarity := case when random() * (w_rare + w_epic) < w_rare then 'rare' else 'epic' end;
  else
    v_roll := random() * (w_common + w_uncommon + w_rare + w_epic);
    v_rarity := case
      when v_roll < w_common then 'common'
      when v_roll < w_common + w_uncommon then 'uncommon'
      when v_roll < w_common + w_uncommon + w_rare then 'rare'
      else 'epic' end;
  end if;

  select id into v_species from public.garden_species where droppable and rarity = v_rarity order by random() limit 1;
  if v_species is null then
    select id into v_species from public.garden_species where droppable order by random() limit 1;
  end if;

  update public.garden_state
  set boxes = boxes - 1,
      boxes_opened = boxes_opened + 1,
      pity = case when v_rarity in ('rare', 'epic') then 0 else pity + 1 end
  where user_id = v_uid;
  perform private.garden_add_seed(v_uid, v_species, 1);
  return v_species;
end;
$$;

revoke execute on function public.garden_open_box() from public, anon;
grant execute on function public.garden_open_box() to authenticated;
