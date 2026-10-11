import { PGlite } from '@electric-sql/pglite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = fileURLToPath(new URL('../../supabase/migrations', import.meta.url))
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
const db = new PGlite()

await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  create schema auth; create schema extensions; create schema private; create schema vault;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth, extensions, public to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`)

async function apply(f, transform = (s) => s) {
  const sql = transform(fs.readFileSync(path.join(dir, f), 'utf8'))
  try { await db.exec(sql) } catch (e) { console.error('FAILED', f, '\n', e.message); process.exit(1) }
  console.log('applied', f)
}

const BEFORE = files.filter((f) => f < '20261012')
for (const f of BEFORE) await apply(f)

// ---- seed pre-migration data to prove the backfill ----
await db.exec('alter table auth.users disable trigger on_auth_user_created')
const u = (n) => `00000000-0000-0000-0000-00000000000${n}`
for (const n of [1, 2, 3, 4]) {
  await db.exec(`insert into auth.users (id, email) values ('${u(n)}', 'u${n}@x.test')`)
  await db.exec(`insert into public.profiles (id, display_name, timezone, onboarded_at) values ('${u(n)}', 'User${n}', 'Australia/Sydney', now()) on conflict (id) do nothing`)
}
const ins = (user, date, source, dur, extra = {}) => db.query(
  `insert into public.sleep_nights (user_id, night_date, source, duration_min, deep_min, rem_min, raw) values ($1,$2,$3,$4,$5,$6,$7)`,
  [user, date, source, dur, extra.deep ?? null, extra.rem ?? null, extra.raw ? JSON.stringify(extra.raw) : null])
await ins(u(1), '2026-10-01', 'manual', 400)
await ins(u(1), '2026-10-02', 'apple_health', 450, { deep: 60, rem: 80 })
await ins(u(1), '2026-10-03', 'apple_health', 450, { raw: { segments: [{ stage: 'asleep' }] } })
await ins(u(1), '2026-10-04', 'apple_health', 450, { raw: { segments: [{ stage: 'core' }, { stage: 'asleep' }] } })
await ins(u(1), '2026-10-05', 'apple_health', 450)
await ins(u(1), '2026-10-06', 'apple_health', 450, { raw: { segments: 'oops' } })

for (const f of files.filter((f) => f >= '20261012')) {
  await apply(f, f.includes('cron') ? (s) => s.replace(/create extension[^;]*;/g, '-- (stubbed)') : (s) => s)
  if (f.includes('090001')) {
    const r = await db.query(`select night_date::text d, device_class from public.sleep_nights order by 1`)
    console.log('backfill:', JSON.stringify(r.rows.map((x) => `${x.d.slice(8)}:${x.device_class}`)))
  }
  if (f.includes('090003')) {
    // stub cron / net / vault before the cron migration
    await db.exec(`
      create schema if not exists cron; create schema if not exists net;
      create table cron.job (jobid serial, jobname text, schedule text, command text);
      create function cron.schedule(n text, s text, c text) returns bigint language sql as $$ insert into cron.job (jobname, schedule, command) values (n,s,c) returning jobid::bigint $$;
      create function cron.unschedule(n text) returns boolean language sql as $$ delete from cron.job where jobname = n returning true $$;
      create table net.calls (url text, headers jsonb, body jsonb);
      create function net.http_post(url text, headers jsonb default '{}', body jsonb default '{}', timeout_milliseconds int default 5000) returns bigint language sql as $$ insert into net.calls values (url, headers, body) returning 1::bigint $$;
      create table vault.secrets_stub (name text, decrypted_secret text);
      create view vault.decrypted_secrets as select * from vault.secrets_stub;
    `)
  }
}
export { db, u }
