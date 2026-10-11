# Legity League

A competitive sleep league for friends. Supabase backend, a Vite + React PWA on GitHub Pages,
and an Apple Shortcut that pushes sleep data from Apple Health.

- `web/` — the app (`npm install && npm run dev`)
- `supabase/migrations/` — schema, RLS and RPCs (`supabase db push`)
- `docs/shortcut.md` — building the Apple Shortcut

## Dev

```bash
cd web && npm install && npm run dev
```

Public Supabase URL and anon key live in `web/.env.*` (safe to ship; RLS protects the data).
Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.
