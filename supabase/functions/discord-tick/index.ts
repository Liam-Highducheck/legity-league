// Runs one Discord tick for one group. Called every 15 minutes per enabled group by pg_cron (see migration
// 20261012090004). Deploy with --no-verify-jwt: the caller is the database, authenticated by DISCORD_CRON_SECRET.
//
//   supabase secrets set DISCORD_CRON_SECRET=... APP_URL=https://<user>.github.io/legity-league/
//   supabase functions deploy discord-tick --no-verify-jwt
import { runTick } from '../_shared/lib/discord/tick.ts'
import { createStore, serviceClient, webhookSender } from '../_shared/store.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/** Constant-time string comparison, so response timing doesn't leak the secret. */
function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a)
  const eb = new TextEncoder().encode(b)
  let diff = ea.length ^ eb.length
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0)
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  const secret = Deno.env.get('DISCORD_CRON_SECRET')
  if (!secret || !safeEqual(req.headers.get('x-cron-secret') ?? '', secret)) return json({ error: 'unauthorized' }, 401)

  const body = await req.json().catch(() => null)
  const groupId = body?.group_id
  if (typeof groupId !== 'string' || !UUID.test(groupId)) return json({ error: 'group_id required' }, 400)

  try {
    const result = await runTick(groupId, {
      store: createStore(serviceClient()),
      sender: webhookSender,
      now: () => new Date(),
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      appUrl: Deno.env.get('APP_URL') ?? undefined,
    })
    return json(result)
  } catch (e) {
    console.error('discord-tick failed', groupId, e instanceof Error ? e.message : e)
    return json({ error: 'tick failed' }, 500)
  }
})
