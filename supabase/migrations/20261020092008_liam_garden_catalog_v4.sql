-- Garden catalog v4: ten, fourteen and twenty-one full nights (8h+) in a row are hard for anyone starting from poor sleep,
-- so they now pay much better and award a plant each. Ten nights gives the Cloud bonsai (uncommon), a fortnight gives the
-- Moon lily (rare), three weeks still gives the Lullaby willow (epic) with a bigger payout. A plant earned from a goal has no
-- other way to be obtained, so the bonsai leaves the shop and the moon lily leaves the rotating shop.
--
-- Mirrors packages/core/src/garden (species.ts, achievements.ts); a core test fails if they drift. Keep the one-line
-- `values` format.

insert into public.garden_species (id, rarity, price, shop, droppable, evolves_from) values
('bonsai', 'uncommon', null, null, false, null),
('moonlily', 'rare', null, null, false, null)
on conflict (id) do update set rarity = excluded.rarity, price = excluded.price, shop = excluded.shop,
  droppable = excluded.droppable, evolves_from = excluded.evolves_from;

insert into public.garden_achievements (id, coins, boxes, seed_species) values
('eight-streak-10', 1500, 2, 'bonsai'),
('eight-streak-14', 2800, 3, 'moonlily'),
('eight-streak-21', 5000, 4, 'willow')
on conflict (id) do update set coins = excluded.coins, boxes = excluded.boxes, seed_species = excluded.seed_species;
