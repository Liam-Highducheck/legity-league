# Legity League

Personal project: a sleep league for friends. Supabase + Vite/React PWA on GitHub Pages + Apple Shortcut ingest.

## Conventions
- **Icons:** use `lucide-react` for every icon. No emoji or text glyphs (✓ › ▾) as icons.
- **Routing:** `HashRouter` (GitHub Pages has no SPA fallback); invite links look like `/#/join/CODE`.
- **Target is an iOS home-screen web app:** 16px+ inputs, safe-area padding, no pinch zoom, no page-level scroll (`#root` scrolls).
- **Schema changes** go in new numbered files in `supabase/migrations/`, applied with `supabase db push`. Regenerate types with
  `supabase gen types typescript --linked --schema public > web/src/lib/database.types.ts`.
- **Membership, invites and tokens** change only through RPCs (see `20261011120004_rpc_functions.sql`), never direct table writes.
- `web/.env.production` / `.env.development` hold only public values (Supabase URL + anon key) and are committed on purpose.
- Pushing to `main` deploys to Pages.

## Working together (two people, two Claude accounts)
- **Branches:** do work on a branch (`git switch -c your-name/short-topic`), push it, open a PR, merge when CI is green.
  Merging or pushing to `main` deploys to the live app within a minute, and the live app is what friends are using, so
  never push something that doesn't build. Small, focused commits; `git pull --rebase` before pushing.
- **CI:** `.github/workflows/ci.yml` type-checks and builds every non-`main` branch and PR. Run `npm run build` in `web/`
  locally first (it includes `tsc --noEmit`).
- **Local dev talks to the live Supabase project** (`web/.env.development` has the same public URL and anon key). There
  is no staging database, so test with your own account and never bulk-edit or delete rows by hand.
- **Database changes (Liam only for now):** only Liam can apply migrations (`supabase db push`) and regenerate
  `web/src/lib/database.types.ts`. If you don't have Supabase access (no CLI login or MCP), do **not** try to change
  the database, run `supabase` commands, or edit `database.types.ts` by hand. Instead write the change as a new
  numbered file in `supabase/migrations/` (timestamp later than the newest file; never edit an applied migration), say
  so in the PR, and ask Liam to apply it. Merge the code that depends on a migration only after it's applied, because
  the live app would otherwise query columns that don't exist yet.
- **Don't commit** secrets, personal health exports or anything under `tools/score-fit` data folders (the repo is
  public). The anon key and Supabase URL in `web/.env.*` are the only keys that belong in git.
- **Where things live:** scoring formulas `web/src/lib/score/` (notes in `docs/scoring.md`), Apple Shortcut setup
  `docs/shortcut.md`, UI theme tokens at the top of `web/src/styles.css`.
- **Records, podiums, Discord:** rules in `docs/records.md`, setup runbook in `docs/discord.md`. The engines live in
  `web/src/lib/league/` and `web/src/lib/discord/` as pure TypeScript with tests (`npm test` in `web/`). The Edge
  Function shares them through generated copies: after changing anything those engines import, run
  `node scripts/sync-shared.mjs` (CI fails on drift). `tools/migration-check` applies every migration to an in-memory
  Postgres and runs permission checks: run it before asking Liam to `db push`.
- New tables and columns from the 2026-10-12 migrations are read through `web/src/lib/untyped.ts` until
  `database.types.ts` is regenerated; then switch those call sites back to `supabase` and delete the shim.
