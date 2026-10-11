// "Send test message" button in the app. Verifies the caller's JWT, requires owner/admin of the group, and posts one
// short message to the group's webhook. Rate limited to one test per 30 seconds per group.
//
//   supabase functions deploy discord-test
import { webhookSender, serviceClient, WEBHOOK_RE } from '../_shared/store.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const COOLDOWN_MS = 30_000

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const db = serviceClient()
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: auth } = await db.auth.getUser(jwt)
  if (!auth?.user) return json({ error: 'Sign in again' }, 401)

  const body = await req.json().catch(() => null)
  const groupId = body?.group_id
  if (typeof groupId !== 'string' || !UUID.test(groupId)) return json({ error: 'group_id required' }, 400)

  const { data: member } = await db.from('group_members').select('role').eq('group_id', groupId).eq('user_id', auth.user.id).maybeSingle()
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) return json({ error: 'Only owners and admins can do that' }, 403)

  const { data: cfg } = await db.from('group_discord').select('webhook_url, last_test_at').eq('group_id', groupId).maybeSingle()
  if (!cfg?.webhook_url || !WEBHOOK_RE.test(cfg.webhook_url)) return json({ error: 'Add a webhook URL first' }, 400)
  if (cfg.last_test_at && Date.now() - Date.parse(cfg.last_test_at) < COOLDOWN_MS) return json({ error: 'Wait a few seconds before testing again' }, 429)

  await db.from('group_discord').update({ last_test_at: new Date().toISOString() }).eq('group_id', groupId)
  const { data: group } = await db.from('groups').select('name').eq('id', groupId).maybeSingle()
  const result = await webhookSender.send(cfg.webhook_url, {
    content: `Test message from Legity League: this channel is connected for ${group?.name ?? 'your group'}.`,
    allowed_mentions: { parse: [] },
  })
  if (result.ok) return json({ ok: true })
  if (result.kind === 'invalid_webhook') {
    await db.from('group_discord').update({ webhook_status: 'invalid', last_error: 'Discord rejected the webhook (deleted or revoked). Paste a new one.', last_error_at: new Date().toISOString() }).eq('group_id', groupId)
    return json({ error: 'Discord rejected that webhook. It may have been deleted.' }, 400)
  }
  return json({ error: 'Discord did not accept the message. Try again in a moment.' }, 502)
})
