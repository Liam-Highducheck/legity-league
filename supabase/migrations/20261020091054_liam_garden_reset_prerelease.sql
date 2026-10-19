-- One-off, before the garden is released: clear every player's garden so everyone starts empty and tracking begins from
-- their own first visit (the no-backlog rule only applied to gardens created after it). Only the developer's test garden
-- existed when this was written. The catalog tables (species, achievements) are untouched; gardens are recreated empty by
-- garden_init() the next time the tab opens.
delete from public.garden_night_claims;
delete from public.garden_achievement_claims;
delete from public.garden_plants;
delete from public.garden_inventory;
delete from public.garden_state;
