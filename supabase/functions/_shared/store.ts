// Supabase-backed implementations of the ports the Discord tick needs (see _shared/lib/discord/tick.ts).
// Runs with the service role, so it bypasses RLS: it reads webhook URLs and writes the bookkeeping tables.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { NIGHT_COLUMNS } from './lib/league/columns.ts'
import type { RecordMarker } from './lib/league/records.ts'
import type { Competition, LeagueMember, RawNight } from './lib/league/types.ts'
import type { PeriodKind } from './lib/periods.ts'
import type { DiscordPayload } from './lib/discord/format.ts'
import { MAX_ATTEMPTS, type ClaimedPost, type GroupConfig, type SendResult, type Sender, type TickPatch, type TickStore } from './lib/discord/tick.ts'

export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Same shape the database enforces; checked again before every request so a bad row can never turn this into a proxy. */
export const WEBHOOK_RE = /^https:\/\/(canary\.|ptb\.)?(discord|discordapp)\.com\/api(\/v[0-9]+)?\/webhooks\/[0-9]+\/[A-Za-z0-9_-]+$/

const STUCK_PENDING_MS = 10 * 60_000

function check<T>(res: { data: T; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`)
  return res.data
}

export function createStore(db: SupabaseClient): TickStore {
  return {
    async loadConfig(groupId): Promise<GroupConfig | null> {
      const d = check(await db.from('group_discord').select('*').eq('group_id', groupId).maybeSingle(), 'load discord config')
      if (!d) return null
      const g = check(await db.from('groups').select('name, timezone, settings').eq('id', groupId).maybeSingle(), 'load group')
      if (!g) return null
      return {
        groupId,
        groupName: g.name,
        timeZone: g.timezone,
        settings: g.settings,
        webhookUrl: d.webhook_url,
        webhookStatus: d.webhook_status,
        enabled: d.enabled,
        postHour: d.post_hour,
        periodKinds: d.period_kinds as PeriodKind[],
        postRecords: d.post_records,
        postChampionships: d.post_championships,
        enabledAt: d.enabled_at,
        recordsBaselinedAt: d.records_baselined_at,
        lastNightsSeenAt: d.last_nights_seen_at,
      }
    },

    async tryLock(groupId, until) {
      const now = new Date().toISOString()
      const rows = check(
        await db
          .from('group_discord')
          .update({ processing_until: until.toISOString() })
          .eq('group_id', groupId)
          .or(`processing_until.is.null,processing_until.lt.${now}`)
          .select('group_id'),
        'take lock',
      )
      return (rows?.length ?? 0) > 0
    },

    async unlock(groupId, patch: TickPatch) {
      const now = new Date().toISOString()
      const update: Record<string, unknown> = { processing_until: null }
      if (patch.lastPostAt) update.last_post_at = patch.lastPostAt
      if (patch.lastNightsSeenAt) update.last_nights_seen_at = patch.lastNightsSeenAt
      if (patch.lastError !== undefined) {
        update.last_error = patch.lastError
        update.last_error_at = patch.lastError ? now : null
      }
      if (patch.webhookStatus) update.webhook_status = patch.webhookStatus
      if (patch.recordsBaselinedAt) update.records_baselined_at = patch.recordsBaselinedAt
      check(await db.from('group_discord').update(update).eq('group_id', groupId), 'release lock')
    },

    async loadRoster(groupId): Promise<LeagueMember[]> {
      const rows = check(
        await db.from('group_members').select('user_id, profiles(display_name, target_bedtime)').eq('group_id', groupId),
        'load roster',
      ) as { user_id: string; profiles: { display_name: string; target_bedtime: string | null } | { display_name: string; target_bedtime: string | null }[] | null }[]
      return rows
        .map((r) => {
          const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
          return { user_id: r.user_id, name: p?.display_name ?? 'Unknown', target_bedtime: p?.target_bedtime ?? null }
        })
        .sort((a, b) => a.name.localeCompare(b.name))
    },

    async latestNightChange(userIds) {
      const rows = check(
        await db.from('sleep_nights').select('updated_at').in('user_id', userIds).order('updated_at', { ascending: false }).limit(1),
        'latest night change',
      )
      return rows?.[0]?.updated_at ?? null
    },

    async loadNights(userIds): Promise<RawNight[]> {
      const out: RawNight[] = []
      const size = 1000
      for (let from = 0; ; from += size) {
        const rows = check(
          await db
            .from('sleep_nights')
            .select(NIGHT_COLUMNS)
            .in('user_id', userIds)
            .order('night_date', { ascending: true })
            .order('user_id', { ascending: true })
            .range(from, from + size - 1),
          'load nights',
        ) as unknown as RawNight[]
        out.push(...rows)
        if (rows.length < size) break
      }
      return out
    },

    async loadCompetitions(groupId): Promise<Competition[]> {
      return check(await db.from('competitions').select('id, name, starts_on, ends_on').eq('group_id', groupId), 'load competitions') ?? []
    },

    async loadMarkers(groupId) {
      const rows = check(
        await db.from('discord_record_state').select('category_key, value, holder_ids').eq('group_id', groupId),
        'load record markers',
      ) as { category_key: string; value: number | null; holder_ids: string[] }[]
      return new Map(
        rows.map((r) => [r.category_key, { categoryKey: r.category_key, value: r.value == null ? null : Number(r.value), holderIds: [...r.holder_ids].sort() }]),
      )
    },

    async saveMarkers(groupId, markers: RecordMarker[]) {
      if (markers.length === 0) return
      const now = new Date().toISOString()
      check(
        await db.from('discord_record_state').upsert(
          markers.map((m) => ({ group_id: groupId, category_key: m.categoryKey, value: m.value, holder_ids: m.holderIds, updated_at: now })),
          { onConflict: 'group_id,category_key' },
        ),
        'save record markers',
      )
    },

    async claimPost(groupId, kind, key): Promise<ClaimedPost | null> {
      const ins = await db.from('discord_posted').insert({ group_id: groupId, kind, key, status: 'pending', attempts: 1 }).select('id').maybeSingle()
      if (!ins.error && ins.data) return { id: ins.data.id, attempts: 1 }
      if (ins.error && ins.error.code !== '23505') throw new Error(`claim post: ${ins.error.message}`)
      const row = check(
        await db.from('discord_posted').select('id, status, attempts, created_at').eq('group_id', groupId).eq('kind', kind).eq('key', key).maybeSingle(),
        'look up post',
      )
      if (!row) return null
      const stuck = row.status === 'pending' && Date.now() - Date.parse(row.created_at) > STUCK_PENDING_MS
      if ((row.status === 'failed' || stuck) && row.attempts < MAX_ATTEMPTS) {
        const attempts = row.attempts + 1
        check(await db.from('discord_posted').update({ status: 'pending', attempts }).eq('id', row.id), 'retry post')
        return { id: row.id, attempts }
      }
      return null
    },

    async finishPost(id, status, error) {
      check(
        await db
          .from('discord_posted')
          .update({ status, last_error: error ?? null, sent_at: status === 'sent' ? new Date().toISOString() : null })
          .eq('id', id),
        'finish post',
      )
    },
  }
}

/** Posts to a Discord webhook. Never logs or returns the URL. */
export const webhookSender: Sender = {
  async send(url: string, payload: DiscordPayload): Promise<SendResult> {
    if (!WEBHOOK_RE.test(url)) return { ok: false, kind: 'invalid_webhook' }
    let res: Response
    try {
      res = await fetch(`${url}?wait=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      })
    } catch {
      return { ok: false, kind: 'transient', message: 'Could not reach Discord' }
    }
    if (res.ok) return { ok: true }
    if (res.status === 429) {
      const body = await res.json().catch(() => ({}))
      return { ok: false, kind: 'rate_limited', retryAfterMs: Math.ceil(Number(body?.retry_after ?? 1) * 1000) }
    }
    if (res.status === 401 || res.status === 403 || res.status === 404) return { ok: false, kind: 'invalid_webhook' }
    if (res.status === 400) return { ok: false, kind: 'bad_request', message: 'Discord rejected the message (400)' }
    return { ok: false, kind: 'transient', message: `Discord returned ${res.status}` }
  },
}
