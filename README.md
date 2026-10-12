# Legity League

A competitive sleep league for friends. Supabase backend, a Vite + React PWA on GitHub Pages,
and an Apple Shortcut that pushes sleep data from Apple Health.

- `web/` — the app (`npm install && npm run dev`)
- `supabase/migrations/` — schema, RLS and RPCs (`supabase db push`)
- `docs/shortcut.md` — building the Apple Shortcut

## Dev

```bash
npm install && npm run dev -w legity-league-web
```

Public Supabase URL and anon key live in `web/.env.*` (safe to ship; RLS protects the data).
Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.

## Contributing

Work on a branch and open a pull request; CI type-checks and builds it. Merging to `main` deploys to the live app.
Database migrations are applied by Liam (`supabase db push`), so include any needed SQL in `supabase/migrations/` (named `<timestamp>_<author>_<what>.sql`, see CLAUDE.md) and
say so in the PR. Local dev uses the live Supabase project, so use your own account. See `CLAUDE.md` for the full
rules (also read by Claude Code).
