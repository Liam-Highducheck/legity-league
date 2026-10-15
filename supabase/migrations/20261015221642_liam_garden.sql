-- The garden: every user grows plants from seeds, earned and bought with sleep. See docs/garden.md.
--
-- Only state lives here (coins, boxes, seeds, plants, claims). Everything that is *derived* from sleep (growth stage,
-- overgrown, achievement progress) is computed in packages/core/src/garden from the nights, so formulas can change
-- without a migration. Clients never write these tables directly: every change goes through the RPCs below, which
-- check inventory, balance and ownership. The catalog tables are mirrored from packages/core/src/garden (a core test
-- fails if they drift), so keep the `insert ... values` rows in the exact one-line format used here.
--
-- Trust model: night scores are computed by the client (formulas run in the app), so garden_claim_nights() trusts the
-- score it is given but only for nights that exist for that user, once per night, within a window after the garden
-- was created. Achievement progress is likewise checked by the client. Fine for a friends league; not for money.

-- ---------- catalog ----------

create table if not exists public.garden_species (
  id text primary key,
  rarity text not null check (rarity in ('common', 'uncommon', 'rare', 'epic')),
  price integer check (price is null or price > 0),
  shop text check (shop in ('always', 'rotating')),
  droppable boolean not null,
  evolves_from text references public.garden_species (id),
  check ((price is null) = (shop is null))
);

create table if not exists public.garden_achievements (
  id text primary key,
  coins integer not null default 0 check (coins >= 0),
  boxes integer not null default 0 check (boxes >= 0),
  seed_species text references public.garden_species (id)
);

insert into public.garden_species (id, rarity, price, shop, droppable, evolves_from) values
('sprout', 'common', 150, 'always', true, null),
('tulip', 'common', 150, 'always', true, null),
('chamomile', 'common', 150, 'always', true, null),
('fern', 'uncommon', 400, 'rotating', true, 'sprout'),
('lavender', 'uncommon', 400, 'always', true, null),
('succulent', 'uncommon', 400, 'always', true, null),
('bonsai', 'uncommon', 400, 'rotating', true, null),
('drowsycap', 'rare', 1000, 'rotating', true, null),
('moonlily', 'rare', 1000, 'rotating', true, 'lavender'),
('sakura', 'rare', null, null, false, 'bonsai'),
('starblossom', 'epic', null, null, true, 'chamomile'),
('dreamcatcher', 'epic', null, null, true, 'fern'),
('willow', 'epic', null, null, true, null)
on conflict (id) do update set rarity = excluded.rarity, price = excluded.price, shop = excluded.shop,
  droppable = excluded.droppable, evolves_from = excluded.evolves_from;

insert into public.garden_achievements (id, coins, boxes, seed_species) values
('first-night', 50, 0, 'tulip'),
('week-logged', 100, 1, null),
('month-logged', 300, 1, 'succulent'),
('hundred-logged', 800, 2, null),
('year-logged', 2500, 3, 'willow'),
('eight-streak-3', 150, 0, 'chamomile'),
('eight-streak-7', 400, 1, 'lavender'),
('eight-streak-14', 900, 2, 'willow'),
('sleep-100h', 300, 0, 'bonsai'),
('sleep-500h', 800, 2, null),
('sleep-1000h', 1500, 2, 'starblossom'),
('restorative-25h', 200, 0, 'drowsycap'),
('restorative-100h', 500, 1, 'moonlily'),
('restorative-250h', 1200, 2, 'dreamcatcher'),
('deep-25h', 250, 0, 'fern'),
('deep-100h', 700, 1, null),
('rem-25h', 250, 0, 'lavender'),
('rem-100h', 700, 2, null),
('score-80', 100, 0, null),
('score-90-x10', 300, 1, null),
('score-100', 500, 0, 'starblossom'),
('score-80-streak-5', 400, 0, 'bonsai'),
('score-85-streak-10', 1000, 3, null),
('early-bird-5', 200, 0, 'chamomile'),
('early-bird-streak-7', 600, 2, null),
('calm-5', 250, 0, 'succulent'),
('calm-streak-3', 300, 1, null),
('first-plant', 50, 0, null),
('plant-5', 150, 0, null),
('garden-full', 1000, 3, null),
('bloom-3', 300, 1, null),
('collector-5', 300, 1, null),
('collector-10', 1000, 3, null),
('first-evolution', 300, 1, null),
('open-5-boxes', 200, 0, null)
on conflict (id) do update set coins = excluded.coins, boxes = excluded.boxes, seed_species = excluded.seed_species;

-- ---------- per-user state ----------

create table if not exists public.garden_state (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  coins integer not null default 0 check (coins >= 0),
  boxes integer not null default 0 check (boxes >= 0),
  /** Dream Boxes opened in a row without a rare or epic drop. */
  pity integer not null default 0 check (pity >= 0),
  boxes_opened integer not null default 0,
  started_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists garden_state_set_updated_at on public.garden_state;
create trigger garden_state_set_updated_at
  before update on public.garden_state
  for each row execute function private.set_updated_at();

create table if not exists public.garden_inventory (
  user_id uuid not null references public.profiles (id) on delete cascade,
  species text not null references public.garden_species (id),
  qty integer not null check (qty > 0),
  primary key (user_id, species)
);

-- cell is 0..24 (row * 5 + col) while planted, null while stored in the inventory
create table if not exists public.garden_plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  species text not null references public.garden_species (id),
  cell smallint check (cell between 0 and 24),
  planted_on date not null,
  evolved_from text references public.garden_species (id),
  evolved_on date,
  created_at timestamptz not null default now()
);

create unique index if not exists garden_plants_one_per_cell
  on public.garden_plants (user_id, cell) where cell is not null;
create index if not exists garden_plants_user_idx on public.garden_plants (user_id);

create table if not exists public.garden_night_claims (
  user_id uuid not null references public.profiles (id) on delete cascade,
  night_date date not null,
  score smallint not null check (score between 0 and 100),
  coins integer not null,
  box boolean not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, night_date)
);

create table if not exists public.garden_achievement_claims (
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id text not null references public.garden_achievements (id),
  claimed_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- ---------- access ----------

alter table public.garden_species enable row level security;
alter table public.garden_achievements enable row level security;
alter table public.garden_state enable row level security;
alter table public.garden_inventory enable row level security;
alter table public.garden_plants enable row level security;
alter table public.garden_night_claims enable row level security;
alter table public.garden_achievement_claims enable row level security;

revoke all on public.garden_species, public.garden_achievements, public.garden_state, public.garden_inventory,
  public.garden_plants, public.garden_night_claims, public.garden_achievement_claims from anon, authenticated;
grant select on public.garden_species, public.garden_achievements, public.garden_state, public.garden_inventory,
  public.garden_plants, public.garden_night_claims, public.garden_achievement_claims to authenticated;

drop policy if exists garden_species_select on public.garden_species;
create policy garden_species_select on public.garden_species for select to authenticated using (true);
drop policy if exists garden_achievements_select on public.garden_achievements;
create policy garden_achievements_select on public.garden_achievements for select to authenticated using (true);

drop policy if exists garden_state_select_own on public.garden_state;
create policy garden_state_select_own on public.garden_state for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists garden_inventory_select_own on public.garden_inventory;
create policy garden_inventory_select_own on public.garden_inventory for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists garden_night_claims_select_own on public.garden_night_claims;
create policy garden_night_claims_select_own on public.garden_night_claims for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists garden_achievement_claims_select_own on public.garden_achievement_claims;
create policy garden_achievement_claims_select_own on public.garden_achievement_claims for select to authenticated
  using (user_id = (select auth.uid()));

-- Groupmates see each other's planted gardens (the profile page shows it). Stored plants stay private.
drop policy if exists garden_plants_select on public.garden_plants;
create policy garden_plants_select on public.garden_plants for select to authenticated
  using (user_id = (select auth.uid()) or (cell is not null and private.shares_group_with(user_id)));

-- ---------- helpers ----------

-- Today's date where the user lives (their profile timezone); night_date uses the same local calendar.
create or replace function private.garden_today(p_user_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (now() at time zone coalesce((select timezone from public.profiles where id = p_user_id), 'UTC'))::date;
$$;

create or replace function private.garden_add_seed(p_user_id uuid, p_species text, p_qty integer)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.garden_inventory (user_id, species, qty) values (p_user_id, p_species, p_qty)
  on conflict (user_id, species) do update set qty = public.garden_inventory.qty + excluded.qty;
$$;

-- Removes one seed from the inventory; false when the user has none. Rows with qty 0 never exist.
create or replace function private.garden_take_seed(p_user_id uuid, p_species text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.garden_inventory set qty = qty - 1 where user_id = p_user_id and species = p_species and qty > 1;
  if found then return true; end if;
  delete from public.garden_inventory where user_id = p_user_id and species = p_species and qty = 1;
  return found;
end;
$$;

-- Shop stock for today: every 'always' species plus two rotating ones, picked by a hash of the date so the whole
-- league sees the same rotation on the same day.
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
   order by md5(s.id || p_date::text) limit 2);
$$;

revoke execute on function private.garden_today(uuid) from public, anon, authenticated;
revoke execute on function private.garden_add_seed(uuid, text, integer) from public, anon, authenticated;
revoke execute on function private.garden_stock(date) from public, anon, authenticated;
revoke execute on function private.garden_take_seed(uuid, text) from public, anon, authenticated;

-- ---------- RPCs ----------

-- Creates the garden on first call and hands out the starter seeds. Safe to call every time the tab opens.
create or replace function public.garden_init()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_n integer;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  insert into public.garden_state (user_id, started_on) values (v_uid, private.garden_today(v_uid))
  on conflict (user_id) do nothing;
  get diagnostics v_n = row_count;
  if v_n = 1 then
    perform private.garden_add_seed(v_uid, 'sprout', 2);
    perform private.garden_add_seed(v_uid, 'tulip', 1);
    perform private.garden_add_seed(v_uid, 'chamomile', 1);
  end if;
  return v_n = 1;
end;
$$;

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
    -- inside the grace window, not in the future, and a night that really exists for this user
    continue when v_date < v_state.started_on - 7 or v_date > v_today;
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

-- Grants the rewards of achievements the client found complete. One claim per achievement.
create or replace function public.garden_claim_achievements(p_ids text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_a public.garden_achievements;
  v_id text;
  v_n integer;
  v_coins integer := 0;
  v_boxes integer := 0;
  v_claimed text[] := '{}';
  v_seeds text[] := '{}';
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  perform 1 from public.garden_state where user_id = v_uid for update;
  if not found then raise exception 'Garden not started'; end if;

  foreach v_id in array (select coalesce(array_agg(distinct x), '{}') from unnest(p_ids[1:60]) x) loop
    select * into v_a from public.garden_achievements where id = v_id;
    continue when not found;
    insert into public.garden_achievement_claims (user_id, achievement_id) values (v_uid, v_id)
    on conflict do nothing;
    get diagnostics v_n = row_count;
    continue when v_n = 0;
    v_coins := v_coins + v_a.coins;
    v_boxes := v_boxes + v_a.boxes;
    v_claimed := v_claimed || v_id;
    if v_a.seed_species is not null then
      perform private.garden_add_seed(v_uid, v_a.seed_species, 1);
      v_seeds := v_seeds || v_a.seed_species;
    end if;
  end loop;

  update public.garden_state set coins = coins + v_coins, boxes = boxes + v_boxes where user_id = v_uid;
  return jsonb_build_object('coins', v_coins, 'boxes', v_boxes, 'claimed', to_jsonb(v_claimed), 'seeds', to_jsonb(v_seeds));
end;
$$;

-- Today's stock. box_price mirrors BOX_PRICE in packages/core/src/garden/species.ts (a core test checks the number).
create or replace function public.garden_shop()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  box_price constant integer := 500;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  return jsonb_build_object(
    'date', private.garden_today(v_uid),
    'box_price', box_price,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('species', species, 'price', price, 'rarity', rarity, 'rotating', rotating) order by rotating, price, species)
      from private.garden_stock(private.garden_today(v_uid))
    ), '[]'::jsonb)
  );
end;
$$;

-- Buys seeds (p_item = a species id in today's stock) or Dream Boxes (p_item = 'box'). Returns the new balance.
create or replace function public.garden_buy(p_item text, p_qty integer default 1)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_state public.garden_state;
  v_price integer;
  box_price constant integer := 500;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if p_qty is null or p_qty < 1 or p_qty > 20 then raise exception 'Quantity must be between 1 and 20'; end if;
  select * into v_state from public.garden_state where user_id = v_uid for update;
  if not found then raise exception 'Garden not started'; end if;

  if p_item = 'box' then
    v_price := box_price;
  else
    select price into v_price from private.garden_stock(private.garden_today(v_uid)) where species = p_item;
    if v_price is null then raise exception 'That seed is not in the shop today'; end if;
  end if;
  if v_state.coins < v_price * p_qty then raise exception 'Not enough coins'; end if;

  update public.garden_state
  set coins = coins - v_price * p_qty, boxes = boxes + case when p_item = 'box' then p_qty else 0 end
  where user_id = v_uid;
  if p_item <> 'box' then perform private.garden_add_seed(v_uid, p_item, p_qty); end if;
  return v_state.coins - v_price * p_qty;
end;
$$;

-- Opens one Dream Box and returns the species it dropped. Odds and pity mirror BOX_WEIGHTS / BOX_PITY in core
-- (a core test checks these constants): weights common=50 uncommon=30 rare=15 epic=5, pity=6.
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
  w_rare constant integer := 15;
  w_epic constant integer := 5;
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

-- Plants a seed from the inventory in an empty cell. Returns the new plant's id.
create or replace function public.garden_plant(p_species text, p_cell integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if p_cell is null or p_cell < 0 or p_cell > 24 then raise exception 'That cell is outside the garden'; end if;
  perform 1 from public.garden_state where user_id = v_uid for update;
  if not found then raise exception 'Garden not started'; end if;
  if exists (select 1 from public.garden_plants where user_id = v_uid and cell = p_cell) then
    raise exception 'That cell is taken';
  end if;
  if not private.garden_take_seed(v_uid, p_species) then raise exception 'You have no % seeds', p_species; end if;
  insert into public.garden_plants (user_id, species, cell, planted_on)
  values (v_uid, p_species, p_cell, private.garden_today(v_uid))
  returning id into v_id;
  return v_id;
end;
$$;

-- Moves a plant to a cell, swapping with whatever is there. p_cell = null puts it into the inventory.
create or replace function public.garden_move(p_plant uuid, p_cell integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_plant public.garden_plants;
  v_other public.garden_plants;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if p_cell is not null and (p_cell < 0 or p_cell > 24) then raise exception 'That cell is outside the garden'; end if;
  perform 1 from public.garden_state where user_id = v_uid for update;
  select * into v_plant from public.garden_plants where id = p_plant and user_id = v_uid for update;
  if not found then raise exception 'Plant not found'; end if;
  if v_plant.cell is not distinct from p_cell then return; end if;

  if p_cell is not null then
    select * into v_other from public.garden_plants where user_id = v_uid and cell = p_cell for update;
    if found then
      update public.garden_plants set cell = null where id = v_other.id;
      update public.garden_plants set cell = p_cell where id = v_plant.id;
      update public.garden_plants set cell = v_plant.cell where id = v_other.id;
      return;
    end if;
  end if;
  update public.garden_plants set cell = p_cell where id = v_plant.id;
end;
$$;

-- Evolves a plant into the species that lists it as evolves_from. The client checks the sleep goal; the server
-- checks ownership, that an evolution exists, and that the plant has been around for at least a night.
create or replace function public.garden_evolve(p_plant uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_plant public.garden_plants;
  v_to text;
  v_today date;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  perform 1 from public.garden_state where user_id = v_uid for update;
  select * into v_plant from public.garden_plants where id = p_plant and user_id = v_uid for update;
  if not found then raise exception 'Plant not found'; end if;
  select id into v_to from public.garden_species where evolves_from = v_plant.species limit 1;
  if v_to is null then raise exception 'This plant does not evolve'; end if;
  v_today := private.garden_today(v_uid);
  if coalesce(v_plant.evolved_on, v_plant.planted_on) >= v_today then
    raise exception 'Give this plant at least one night first';
  end if;
  update public.garden_plants
  set species = v_to, evolved_from = v_plant.species, evolved_on = v_today
  where id = v_plant.id;
  return v_to;
end;
$$;

revoke execute on function public.garden_init() from public, anon;
revoke execute on function public.garden_claim_nights(jsonb) from public, anon;
revoke execute on function public.garden_claim_achievements(text[]) from public, anon;
revoke execute on function public.garden_shop() from public, anon;
revoke execute on function public.garden_buy(text, integer) from public, anon;
revoke execute on function public.garden_open_box() from public, anon;
revoke execute on function public.garden_plant(text, integer) from public, anon;
revoke execute on function public.garden_move(uuid, integer) from public, anon;
revoke execute on function public.garden_evolve(uuid) from public, anon;
grant execute on function public.garden_init() to authenticated;
grant execute on function public.garden_claim_nights(jsonb) to authenticated;
grant execute on function public.garden_claim_achievements(text[]) to authenticated;
grant execute on function public.garden_shop() to authenticated;
grant execute on function public.garden_buy(text, integer) to authenticated;
grant execute on function public.garden_open_box() to authenticated;
grant execute on function public.garden_plant(text, integer) to authenticated;
grant execute on function public.garden_move(uuid, integer) to authenticated;
grant execute on function public.garden_evolve(uuid) to authenticated;
