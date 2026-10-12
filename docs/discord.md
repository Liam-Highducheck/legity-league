# Discord integration

Each group can post to a Discord channel through a webhook: the standings after each finished period (podium plus
the full ranking, one embed per metric) and a message whenever a record is broken. Posting runs in a Supabase Edge
Function triggered by pg_cron every 15 minutes. Owners/admins configure it in the app under Group -> Discord.

## What gets posted

- **Standings:** the day after a period ends, at the group's chosen hour in the group timezone (default 9am,
  Australia/Sydney). Weekly, fortnightly, monthly and seasonal can each be switched on or off. Nights that arrive
  after the post (a late sync) are not added to it.
- **Records:** "New record: Longest night (Watch) - Sam, 10h 12m (Sat 24 Oct), beating Alex (9h 40m), which stood
  23 days." Plain text, no @mentions. Ties, first records and revoked records are not announced.
- **Championships:** the final standings after a championship ends.
- Turning posting on records the current records **silently** first, so only new ones are announced.
- Nothing is ever posted for periods that came due before posting was switched on, or more than 3 days ago.

## Setting it up (Liam, once)

The repo is public: keep every secret out of git.

1. **Migrations.** From the branch, check them first: `cd tools/migration-check && npm install && npm run check`.
   Then `supabase db push` applies all four. That is safe in any order of the later steps: the cron job
   (`20261012090004`) does nothing until the Vault secrets below exist, and nothing posts until a group switches
   posting on. Then regenerate types:
   `supabase gen types typescript --linked --schema public > packages/core/src/database.types.ts`.
2. **Smoke-test ingest** (migration 1 redefines `ingest_sleep_segments`). With a real token, send one payload with only
   an `Asleep` segment and one with `Core`/`Deep` segments (see the curl in `docs/shortcut.md`); check
   `select night_date, device_class from sleep_nights order by night_date desc limit 5;`.
3. **Secrets for the function.** Pick a long random string for `DISCORD_CRON_SECRET`.
   `supabase secrets set DISCORD_CRON_SECRET=<random> APP_URL=https://<user>.github.io/legity-league/`
   (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically).
4. **Deploy the functions.**
   `supabase functions deploy discord-tick --no-verify-jwt` (the database calls it, authenticated by the secret) and
   `supabase functions deploy discord-test` (the app's "Send a test message" button; keeps JWT verification).
5. **Vault secrets for the cron job** (SQL editor). If `pg_cron`/`pg_net` aren't available, enable them under
   Database -> Extensions first.
   `select vault.create_secret('<same random string>', 'discord_cron_secret');`
   `select vault.create_secret('https://<project-ref>.supabase.co/functions/v1', 'discord_functions_url');`
   From here the 15-minute job calls `discord-tick` for every group that has posting switched on.

Switch it off any time: `select cron.unschedule('discord-tick');`.

## Checking it works

Create a test group with a private channel, add the webhook, switch posting on, use "Send a test message", then:

- `select * from cron.job_run_details order by start_time desc limit 5;`
- `select id, status_code, content from net._http_response order by created desc limit 5;` (401 usually means the
  secret in Vault and in `supabase secrets` differ)
- `select group_id, kind, key, status, attempts, last_error from discord_posted order by created_at desc limit 10;`
- Switching posting on must post **nothing** (silent baseline).

## Design notes

- The webhook URL lives in `group_discord`, whose column grants leave `webhook_url` out: it can't be read from the
  client, only written through owner/admin RPCs. Always select explicit columns from the app (never `*`).
- Delivery is at-least-once. A post is claimed in `discord_posted` before sending and retried on later runs (up to 5
  attempts). A failure halfway through a multi-message post can repeat the first message.
- A 401/404 from Discord marks the webhook `invalid` and stops posting until a new one is saved.
- The function's code is shared with the web app: `scripts/sync-shared.mjs` copies the pure TypeScript from
  `packages/core/src` into `supabase/functions/_shared/lib` (generated, committed). CI fails if they drift
  (`node scripts/sync-shared.mjs --check`) and type-checks the function with Deno. If the Supabase CLI turns out to
  bundle imports from outside `supabase/`, the copy step can be dropped and the imports pointed at `packages/core/src`.
