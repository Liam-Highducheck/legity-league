-- Garden catalog v5: the Sakura bonsai becomes an epic (the cloud bonsai's evolution now asks for 28 full nights, about a month).
--
-- Mirrors packages/core/src/garden (species.ts); a core test fails if they drift. Keep the one-line `values` format.

insert into public.garden_species (id, rarity, price, shop, droppable, evolves_from) values
('sakura', 'epic', null, null, false, 'bonsai')
on conflict (id) do update set rarity = excluded.rarity, price = excluded.price, shop = excluded.shop,
  droppable = excluded.droppable, evolves_from = excluded.evolves_from;
