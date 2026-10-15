# Legity League

Personal project: a sleep league for friends. Supabase + Vite/React PWA on GitHub Pages + Apple Shortcut ingest.

## Conventions
- **Icons:** use `lucide-react` for every icon. No emoji or text glyphs (✓ › ▾) as icons.
- **Native UI (`mobile/`):** state changes (focus, open, pressed, selected) must never change a box's border width, padding or
  size, or the content shifts. Change colours/opacity only, and draw rings with `FocusRing`, as the web uses `outline`.
- **Releasing the native app:** `docs/mobile-release.md` (EAS builds, TestFlight, OTA updates). New collaborator setup (EAS access, build commands, local testing) is in its "Getting a new maintainer building" section.
- **Routing:** `HashRouter` (GitHub Pages has no SPA fallback); invite links look like `/#/join/CODE`.
- **Target is an iOS home-screen web app:** 16px+ inputs, safe-area padding, no pinch zoom, no page-level scroll (`#root` scrolls).
- **Schema changes** go in new files in `supabase/migrations/` (naming below), applied with `supabase db push`. Regenerate types with
  `supabase gen types typescript --linked --schema public > packages/core/src/database.types.ts`.
- **Membership, invites and tokens** change only through RPCs (see `20261011120004_rpc_functions.sql`), never direct table writes.
- `web/.env.production` / `.env.development` hold only public values (Supabase URL + anon key) and are committed on purpose.
- Pushing to `main` deploys to Pages.
- **Layout (npm workspaces, one root `package-lock.json`):** `web/` (Vite PWA), `mobile/` (Expo/React Native, iOS + Android),
  `packages/core/` (`@legity/core`: pure TypeScript shared by web, mobile and the Edge Function: scoring, league rules,
  dates, formatting, generated DB types). Install once with `npm install` at the root. Put anything that isn't tied to the DOM
  or React Native in `core` and import it as `@legity/core/<file>`. Web-only code stays in `web/src/lib`.

## Working together (two people, two Claude accounts)
- **Pushing:** both of us can push straight to `main` (no PR needed). Pushing to `main` deploys to the live app within a
  minute, and friends are using it, so run `npm run typecheck` at the repo root first (type-checks core, builds web, type-checks mobile) and never push something that doesn't build.
  Small, focused commits; `git pull --rebase` before pushing. A branch + PR is still fine for anything big or risky.
- **CI:** `.github/workflows/ci.yml` type-checks and builds every non-`main` branch and PR (pushes to `main` build in the deploy workflow). Run `npm run typecheck` at the repo root
  locally first.
- **Local dev talks to the live Supabase project** (`web/.env.development` has the same public URL and anon key). There
  is no staging database, so test with your own account and never bulk-edit or delete rows by hand.
- **Database changes (Liam only for now):** only Liam can apply migrations (`supabase db push`) and regenerate
  `packages/core/src/database.types.ts`. If you don't have Supabase access (no CLI login or MCP), do **not** try to change
  the database, run `supabase` commands, or edit `database.types.ts` by hand. Instead write the change as a new
  file in `supabase/migrations/` (see naming; never edit an applied migration), say
  so in your message, and ask Liam to apply it. Push the code that depends on a migration only after it's applied, because
  the live app would otherwise query columns that don't exist yet.
- **Migration names:** `<timestamp>_<author>_<what>.sql`, e.g. `20261013143015_harrison_add_streak_column.sql`. The author is
  `liam` or `harrison`, the timestamp is the real current time (`date +%Y%m%d%H%M%S`, never hand-numbered like `...090001`),
  and the description is short snake_case. The timestamp is the migration's version and must be later than every
  migration already applied, or `supabase db push` refuses it. Files from before this rule keep their names (renaming an
  applied one would break the history).
- **Don't commit** secrets, personal health exports or anything under `tools/score-fit` data folders (the repo is
  public). The anon key and Supabase URL in `web/.env.*` are the only keys that belong in git.
- **Where things live:** scoring formulas `packages/core/src/score/` (notes in `docs/scoring.md`), Apple Shortcut setup
  `docs/shortcut.md`, UI theme tokens at the top of `web/src/styles.css`.
- **Records, podiums, Discord:** rules in `docs/records.md`, setup runbook in `docs/discord.md`. The engines live in
  `packages/core/src/league/` and `packages/core/src/discord/` as pure TypeScript with tests (`npm test` at the repo root). The Edge
  Function shares them through generated copies: after changing anything those engines import, run
  `node scripts/sync-shared.mjs` (CI fails on drift). `tools/migration-check` applies every migration to an in-memory
  Postgres and runs permission checks: run it before asking Liam to `db push`.
- **Garden** (seeds, plants, coins, evolutions, overgrown): rules in `docs/garden.md`, pure logic in `packages/core/src/garden/`
  (tested, plus a parity test against the garden migration), art in `mobile/src/garden/`, native only for now.
- New tables and columns from the 2026-10-12 migrations are read through `web/src/lib/untyped.ts` until
  `database.types.ts` is regenerated; then switch those call sites back to `supabase` and delete the shim.
