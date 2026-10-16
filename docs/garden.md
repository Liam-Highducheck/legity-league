# The garden

Every user has a 5x5 isometric garden. Sleep earns coins, seeds and Dream Boxes; plants grow on sleep goals; neglect
makes the garden overgrown. It is the first card on every profile and the third tab of the native app.

## Where things live

| What | Where |
| --- | --- |
| Rules as pure TypeScript (goals, growth, evolution, overgrown, achievements, economy) with tests | `packages/core/src/garden/` |
| Database state and RPCs | `supabase/migrations/*_garden.sql` (checks in `tools/migration-check/garden.check.mjs`) |
| Data hooks (garden, shop, mutations, reward sync) | `packages/data/src/garden.ts` |
| Art (plants, stages, overgrown, ground, fireflies) | `mobile/src/garden/` (`plants.tsx` has the species drawings, `PlantArt.tsx` stages and overgrowth) |
| Garden tab | `mobile/src/garden/GardenScreen.tsx`, route `mobile/src/app/(app)/(tabs)/garden.tsx` |
| Dev tools (dev builds only, **Me > Developer**) | **Plant codex** `/garden-dex` (every plant: all stages, overgrown, how to grow it, where its seed comes from, evolutions), **Dream Box animations** `/garden-box-lab` (four openings, pick the rarity it lands on, slow motion down to 1/10×, slow-server test, choose the one the garden uses), **Garden lab** `/garden-lab` (stage, overgrown, night/day, performance readout) |

The web app does not have the garden yet (native first). Records moved off the tab bar: League > "Latest records" > See all
opens `/records` (and the profile's Records card links there too).

## Rules

- **Coins.** Each scored night is worth its sleep score in coins, once per night (about 78 a day for a typical sleeper). A perfect
  100 also earns a Dream Box. Nights are claimed when the Garden tab opens (`useGardenSync`), so nothing is lost if you skip
  days. Manual entries have no score and earn nothing. Only nights from 7 days before the garden was created count.
- **Ways to get a plant** (`species.ts`): a starter seed, the shop (a fixed price per plant; some always in stock, three
  rotating per day), a Dream Box, a goal that awards the seed, or evolving another plant. **Rare, epic and legendary plants
  have exactly one way**, so a plant on someone's profile tells you how hard it was to get; common and uncommon may have two.
  Legendary plants come only from goals. A test enforces all of this, and that goal-awarded and evolution-only plants cannot
  also be bought or dropped.
- **Pace.** The roster is balanced on "how many days does a typical sleeper need?" (`pace.ts`: pass rates for each kind of night,
  streak maths, 78 coins a day). Every route must land in its rarity's band (common 0-8 days, uncommon 8-40, rare 40-110, epic
  110-270, legendary 270+) and every growth goal in its own band; tests fail otherwise. That is why prices differ: a plant costs
  roughly the days it should take. Change a price or goal, run `npm test`, and the failing line says what drifted.
- **Dream Boxes.** 50/30/17/3% common/uncommon/rare/epic (legendary never drops), guaranteed rare+ after 6 boxes without one. The
  rare and epic plants in the box pool are box-only.
- **Growth.** A seed has a sleep goal: N nights meeting a condition, N nights in a row, or a running total. Only nights *after*
  the planting date count. Stage = progress thirds: seedling, young, growing, mature. Stored plants keep growing; growth is
  derived from your nights, never stored.
- **Evolution.** An evolved plant is the same plant grown up (the evolved art is the base art made richer). Once mature, a harder
  goal counts from the night it matured; when it is met a sparkle appears and the plant can evolve. Evolved plants arrive fully
  grown (no growth goal of their own) and may have their own next evolution. Evolution-only plants cannot be planted from a seed.
- **Overgrown.** Three bad nights in a row (a missing night, or a score under 60; today's night is skipped until it syncs)
  overgrow the garden. One good night clears it. It is purely visual plus a nudge.
- **Goals (achievements).** `achievements.ts`. Sleep goals count nights from the garden's start (minus the 7-day grace), garden
  goals look at your plants. They pay coins and boxes; four of them also award the seed of a goal-only plant.
- **Board.** The whole screen is the garden. Dock: Seeds (a tray; pick one, then tap a plot), Boxes (opens one), Shop and Goals
  (sheets). Tap a plant for its card (growth, move, pick up, evolve). The eye button hides every control.

## Server and trust

Clients never write the garden tables; they call RPCs (`garden_init`, `garden_claim_nights`, `garden_claim_achievements`,
`garden_shop`, `garden_buy`, `garden_open_box`, `garden_plant`, `garden_move`, `garden_evolve`), which check balance,
inventory, ownership and cell bounds. Box rolls happen in SQL. Because scores and sleep goals are computed in the app,
`garden_claim_nights` trusts the score it is sent (for a night that exists, once, inside the window) and achievements are
checked by the client. That is fine for a friends league and not for anything with real stakes.

The catalog (species rarity/price/shop/droppable/evolves_from, achievement rewards, box price/odds/pity, starter seeds)
exists twice, in TypeScript and in the migration, so the server can price and pay. `parity.test.ts` fails if they differ.
To change the catalog, edit `species.ts` / `achievements.ts` and add a *new* migration that upserts the rows (never edit
an applied one); the parity test reads all `*_garden.sql` files, later ones win only if you also keep the format.

## Motion and feel

All ambient motion uses the native driver (translate, rotate, scale, opacity only), so the JS thread stays free: a full
board of 25 plants drew in about 210 ms with the JS thread at 50-60 fps on a dev build (the lab shows both numbers).

- **Wind.** `Sway.tsx`: one shared slow gust (`WindProvider`) scales every plant's own sway; the sway's phase comes from the
  tile position, so it travels across the board as a wave. Trees (`period` in `plants.tsx`) move slower than flowers.
- **Life.** Plants pop in when placed (`Appear`) and bump when they grow a stage; planting, moving, picking up and evolving
  fire a particle `Burst`; the selected tile pulses and a marker bobs above it; glowing species have idle effects
  (`SpeciesFx.tsx`).
- **Scene.** `scenery.tsx` fills the screen: sky, hills, petals. Fireflies stay over the board (`Fireflies`). Night (`Sky`: twinkling stars, crescent moon, drifting mist) or day (`DaySky`: sun and clouds) by the phone's
  clock (`useTimeOfDay`, 07:00-18:00 is day; dev builds can force `/garden?sky=day|night`). Ambient motes and petals are in `Ambient.tsx`.
- **Feedback.** Haptics and toasts (`feedback.tsx`), rolling coin counts, eased panel changes (`LayoutAnimation`), optimistic
  planting and moving with rollback.
- **Reduced motion.** With the system setting on, everything above stands still (`useReducedMotion`).

## Dream Box opening

`BoxScene.tsx`: about 3 s of build (the shake, glow and heartbeat intensify and the haptics speed up), about 1 s of climax,
then the reveal. While it builds, four pips light one by one (common, uncommon, rare, epic) and each adds a glow in its
colour, up to the real rarity, so the build itself tells you what is coming. The server call runs during the build; the climax
waits for both. Tap during the build to skip the wait. Variants: gift box, seed orb, constellation, lantern (`BOX_VARIANTS`);
the garden uses `getBoxVariant()` (`boxPrefs.ts`, default gift box; the box lab can switch it for the session).

## Adding a plant

1. Draw it in `mobile/src/garden/plants.tsx` (100x120 canvas, roots at 50,112; `scale`, `sway`; look at an existing one).
2. Add the species in `packages/core/src/garden/species.ts` (goal, rarity, shop, droppable, evolution).
3. Add its row to a new migration (`insert ... on conflict do update`) and keep the one-line `values` format. The art id must equal the species id (a dev-build check logs any mismatch).
4. `npm test`, check it in the plant codex (`/garden-dex`), `supabase db push`.
