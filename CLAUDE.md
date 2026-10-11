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
