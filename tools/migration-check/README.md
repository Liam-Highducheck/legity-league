# Migration check

Applies every file in `supabase/migrations/` to an in-memory Postgres ([PGlite](https://pglite.dev)) and runs
behavioural checks against the 2026-10-12 migrations: device-class backfill and ingest classification, client
writes forced to `manual`, owner/admin gating on competitions and Discord settings, the webhook column being
unreadable from the client, and the cron tick function.

```bash
cd tools/migration-check && npm install && npm run check
```

This is a stand-in, not Supabase. `auth.uid()`, the `anon`/`authenticated`/`service_role` roles and the `vault`,
`pg_cron` and `pg_net` pieces are minimal stubs (see `harness.mjs`), so it validates the SQL and the permission model,
not the extensions themselves. Run it before `supabase db push`; it doesn't replace the smoke tests in `docs/discord.md`.
