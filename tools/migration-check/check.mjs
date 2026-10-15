import { db, u } from './harness.mjs'
import { runGarden } from './garden.check.mjs'

let pass = 0, fail = 0
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  -> ' + extra}`) }
async function as(user, fn) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${u(user)}', false)`)
  try { return await fn() } finally { await db.exec('reset role') }
}
async function throws(user, sql, params, pattern) {
  try { await as(user, () => db.query(sql, params)); return [false, 'did not throw'] }
  catch (e) { return [pattern ? pattern.test(e.message) : true, e.message] }
}
const G = '11111111-1111-1111-1111-111111111111'
await db.exec(`insert into public.groups (id, name, created_by) values ('${G}', 'Test', '${u(1)}')`)
await db.exec(`insert into public.group_members (group_id, user_id, role) values ('${G}','${u(1)}','owner'),('${G}','${u(2)}','admin'),('${G}','${u(3)}','member')`)

// ---------- ingest classification ----------
const tok = 'll_testtoken'
await db.exec(`insert into public.ingest_tokens (user_id, label, token_prefix, token_hash) values ('${u(1)}','t','ll_test', encode(sha256(convert_to('${tok}','UTF8')),'hex'))`)
const watchNight = [
  { start: '2026-10-07T23:00:00+11:00', end: '2026-10-08T02:00:00+11:00', value: 'Core' },
  { start: '2026-10-08T02:00:00+11:00', end: '2026-10-08T03:00:00+11:00', value: 'Deep' },
  { start: '2026-10-08T03:00:00+11:00', end: '2026-10-08T04:00:00+11:00', value: 'REM' },
  { start: '2026-10-08T04:00:00+11:00', end: '2026-10-08T06:30:00+11:00', value: 'Core' },
]
const phoneNight = [{ start: '2026-10-08T23:00:00+11:00', end: '2026-10-09T06:30:00+11:00', value: 'Asleep' }]
const ingest = (segs) => db.query(`select public.ingest_sleep_segments($1, $2::jsonb, 'apple_health', 'test') r`, [tok, JSON.stringify(segs)])
await ingest([...watchNight, ...phoneNight])
const classes = async () => Object.fromEntries((await db.query(`select night_date::text d, device_class c from public.sleep_nights where user_id='${u(1)}' and night_date >= '2026-10-08' order by 1`)).rows.map((r) => [r.d, r.c]))
let c = await classes()
check('ingest: stage data => watch', c['2026-10-08'] === 'watch', JSON.stringify(c))
check('ingest: asleep-only => phone', c['2026-10-09'] === 'phone', JSON.stringify(c))
await ingest([...watchNight, ...phoneNight])
c = await classes()
check('ingest: re-sync keeps classes', c['2026-10-08'] === 'watch' && c['2026-10-09'] === 'phone', JSON.stringify(c))
// the same night re-sent later with stage data upgrades the class
await ingest([{ start: '2026-10-08T23:00:00+11:00', end: '2026-10-09T02:00:00+11:00', value: 'Core' }, { start: '2026-10-09T02:00:00+11:00', end: '2026-10-09T06:30:00+11:00', value: 'Deep' }])
c = await classes()
check('ingest: richer re-send upgrades phone -> watch', c['2026-10-09'] === 'watch', JSON.stringify(c))

// ---------- client writes are forced to manual ----------
await as(1, () => db.query(`insert into public.sleep_nights (user_id, night_date, source, duration_min, device_class) values ($1,'2026-10-12','manual',400,'watch')`, [u(1)]))
c = Object.fromEntries((await db.query(`select night_date::text d, device_class c from public.sleep_nights where user_id='${u(1)}'`)).rows.map((r) => [r.d, r.c]))
check('client insert claiming watch => manual', c['2026-10-12'] === 'manual', JSON.stringify(c))
await as(1, () => db.query(`insert into public.sleep_nights (user_id, night_date, source, duration_min, device_class) values ($1,'2026-10-08','manual',999,'watch') on conflict (user_id,night_date) do update set source='manual', duration_min=excluded.duration_min, device_class='watch'`, [u(1)]))
c = Object.fromEntries((await db.query(`select night_date::text d, device_class c from public.sleep_nights where user_id='${u(1)}'`)).rows.map((r) => [r.d, r.c]))
check('client upsert over a watch night => manual', c['2026-10-08'] === 'manual', JSON.stringify(c))
let [ok, msg] = await throws(1, `insert into public.sleep_nights (user_id, night_date, source, duration_min) values ($1,'2026-10-13','apple_health',400)`, [u(1)], /row-level security/)
check('client still cannot write a non-manual source', ok, msg)

// ---------- group timezone ----------
;[ok, msg] = await throws(2, `update public.groups set timezone='Mars/Phobos' where id=$1`, [G], /Unknown timezone/)
check('bad timezone rejected', ok, msg)
await as(2, () => db.query(`update public.groups set timezone='Europe/London' where id=$1`, [G]))
check('admin can set a valid timezone', (await db.query(`select timezone from public.groups where id='${G}'`)).rows[0].timezone === 'Europe/London')
await as(3, () => db.query(`update public.groups set timezone='Asia/Tokyo' where id=$1`, [G]))
check('member cannot change the timezone (RLS filters the row)', (await db.query(`select timezone from public.groups where id='${G}'`)).rows[0].timezone === 'Europe/London')
// settings.eligibility is writable by admins (no migration needed)
await as(2, () => db.query(`update public.groups set settings = $2::jsonb where id=$1`, [G, JSON.stringify({ eligibility: { score: { phone: false } } })]))
check('admin can write groups.settings', (await db.query(`select settings->'eligibility'->'score'->>'phone' v from public.groups where id='${G}'`)).rows[0].v === 'false')

// ---------- competitions ----------
const comp = await as(1, () => db.query(`select public.create_competition($1,'Spring Cup','2026-10-01','2026-10-31') id`, [G]))
const compId = comp.rows[0].id
check('owner creates a competition', !!compId)
;[ok, msg] = await throws(3, `select public.create_competition($1,'Nope','2026-10-01','2026-10-31')`, [G], /Only owners and admins/)
check('member cannot create a competition', ok, msg)
;[ok, msg] = await throws(1, `select public.create_competition($1,'Bad','2026-10-31','2026-10-01')`, [G], /check constraint/)
check('end before start rejected', ok, msg)
await as(2, () => db.query(`select public.update_competition($1,'Spring Cup 2','2026-10-02','2026-10-30')`, [compId]))
check('admin edits an upcoming competition', (await db.query(`select name from public.competitions where id='${compId}'`)).rows[0].name === 'Spring Cup 2')
check('member can read the group competitions', (await as(3, () => db.query('select id from public.competitions'))).rows.length === 1)
check('outsider cannot read them', (await as(4, () => db.query('select id from public.competitions'))).rows.length === 0)
const old = await as(1, () => db.query(`select public.create_competition($1,'Old','2020-01-01','2020-01-31') id`, [G]))
;[ok, msg] = await throws(1, `select public.update_competition($1,'Old','2020-01-02','2020-02-05')`, [old.rows[0].id], /finished competition/)
check('finished competition dates are locked', ok, msg)
await as(1, () => db.query(`select public.update_competition($1,'Old renamed','2020-01-01','2020-01-31')`, [old.rows[0].id]))
check('...but its name can change', true)
;[ok, msg] = await throws(3, `select public.delete_competition($1)`, [compId], /Only owners and admins/)
check('member cannot delete', ok, msg)
await as(1, () => db.query(`select public.delete_competition($1)`, [old.rows[0].id]))

// ---------- discord ----------
const URL = 'https://discord.com/api/webhooks/123456789012345678/AbCdEf_ghIJKlmnOPQrstuVWXyz-0123456789abcdef'
;[ok, msg] = await throws(2, `select public.set_group_discord_webhook($1, 'https://evil.example.com/hook')`, [G], /doesn't look like a Discord webhook/)
check('non-Discord URL rejected', ok, msg)
check('error text does not echo the URL', !/evil\.example/.test(msg), msg)
;[ok, msg] = await throws(3, `select public.set_group_discord_webhook($1, '${URL}')`, [G], /Only owners and admins/)
check('member cannot set a webhook', ok, msg)
;[ok, msg] = await throws(2, `select public.update_group_discord($1, true)`, [G], /Add a webhook/)
check('cannot enable before a webhook is added', ok, msg)
await as(2, () => db.query(`select public.set_group_discord_webhook($1, $2)`, [G, URL]))
await db.exec(`insert into public.discord_record_state (group_id, category_key, value) values ('${G}','night:duration:watch', 480)`)
const row = (await as(2, () => db.query(`select webhook_configured, webhook_hint, webhook_status, enabled from public.group_discord where group_id=$1`, [G]))).rows[0]
check('admin reads status columns, hint = last 4 chars', row.webhook_configured === true && row.webhook_hint === URL.slice(-4) && row.enabled === false, JSON.stringify(row))
;[ok, msg] = await throws(2, `select webhook_url from public.group_discord where group_id=$1`, [G], /permission denied/)
check('admin CANNOT read webhook_url', ok, msg)
;[ok, msg] = await throws(2, `select * from public.group_discord where group_id=$1`, [G], /permission denied/)
check('select * is denied (explicit columns only)', ok, msg)
check('member sees no discord row (RLS)', (await as(3, () => db.query(`select group_id from public.group_discord`))).rows.length === 0)
;[ok, msg] = await throws(2, `update public.group_discord set webhook_url=null where group_id=$1`, [G], /permission denied/)
check('no direct writes to the table', ok, msg)
;[ok, msg] = await throws(2, `select * from public.discord_posted`, [], /permission denied/)
check('discord_posted is service-role only', ok, msg)
;[ok, msg] = await throws(2, `select * from public.discord_record_state`, [], /permission denied/)
check('discord_record_state is service-role only', ok, msg)
await as(2, () => db.query(`select public.update_group_discord($1, true, 8, array['week','month'], true, false)`, [G]))
const after = (await db.query(`select enabled, enabled_at is not null ea, post_hour, period_kinds, post_championships, records_baselined_at is null rb from public.group_discord where group_id='${G}'`)).rows[0]
check('enabling sets prefs and starts a re-baseline', after.enabled && after.ea && after.post_hour === 8 && after.period_kinds.join() === 'week,month' && after.post_championships === false && after.rb, JSON.stringify(after))
check('enabling cleared the old record state', (await db.query(`select count(*)::int n from public.discord_record_state`)).rows[0].n === 0)
;[ok, msg] = await throws(2, `select public.update_group_discord($1, null, 25)`, [G], /check constraint/)
check('post hour out of range rejected', ok, msg)
;[ok, msg] = await throws(2, `select public.update_group_discord($1, null, null, array['week','decade'])`, [G], /check constraint/)
check('unknown period kind rejected', ok, msg)

// ---------- cron ----------
await db.exec(`delete from net.calls`)
await db.exec(`select private.discord_tick()`)
check('tick does nothing before the Vault secrets exist', (await db.query('select count(*)::int n from net.calls')).rows[0].n === 0)
await db.exec(`insert into vault.secrets_stub values ('discord_cron_secret','s3cret'),('discord_functions_url','https://x.supabase.co/functions/v1/')`)
await db.exec(`select private.discord_tick()`)
const calls = (await db.query('select * from net.calls')).rows
check('tick posts once per enabled group with the secret header', calls.length === 1 && calls[0].url === 'https://x.supabase.co/functions/v1/discord-tick' && calls[0].headers['x-cron-secret'] === 's3cret' && calls[0].body.group_id === G, JSON.stringify(calls))
await as(2, () => db.query(`select public.clear_group_discord_webhook($1)`, [G]))
await db.exec(`delete from net.calls`)
await db.exec(`select private.discord_tick()`)
check('clearing the webhook disables posting and stops ticks', (await db.query('select count(*)::int n from net.calls')).rows[0].n === 0)
;[ok, msg] = await throws(2, `select private.discord_tick()`, [], /permission denied/)
check('authenticated users cannot run the tick', ok, msg)

// ---------- account deletion ----------
const G2 = '22222222-2222-2222-2222-222222222222'
await db.exec(`insert into public.groups (id, name, created_by) values ('${G2}', 'Solo', '${u(4)}')`)
await db.exec(`insert into public.group_members (group_id, user_id, role) values ('${G2}','${u(4)}','owner')`)
;[ok, msg] = await throws(1, `select public.delete_my_account()`, [], /own a group with other members/)
check('delete account: owner of a group with other members is blocked', ok, msg)
check('delete account: a blocked delete changes nothing', (await db.query(`select count(*)::int n from auth.users where id='${u(1)}'`)).rows[0].n === 1)
await as(3, () => db.query(`select public.delete_my_account()`))
check('delete account: member removed with all their data', (await db.query(`select (select count(*) from auth.users where id='${u(3)}')::int a, (select count(*) from public.profiles where id='${u(3)}')::int p, (select count(*) from public.group_members where user_id='${u(3)}')::int m`)).rows.every((r) => r.a === 0 && r.p === 0 && r.m === 0))
check('delete account: the group they left is untouched', (await db.query(`select count(*)::int n from public.groups where id='${G}'`)).rows[0].n === 1)
await as(4, () => db.query(`select public.delete_my_account()`))
check('delete account: a sole-owner group is deleted with the account', (await db.query(`select count(*)::int n from public.groups where id='${G2}'`)).rows[0].n === 0)
await db.exec('set role anon')
try { await db.query(`select public.delete_my_account()`); check('delete account: anon cannot call it', false, 'did not throw') } catch (e) { check('delete account: anon cannot call it', /permission denied/.test(e.message), e.message) }
await db.exec('reset role')

await runGarden({ db, u, check, as, throws })

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
