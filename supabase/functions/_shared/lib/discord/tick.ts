// GENERATED from web/src/lib/discord/tick.ts by scripts/sync-shared.mjs. Do not edit here: change the source and run
//   node scripts/sync-shared.mjs
import { zonedNow } from '../dates.ts'
import { parseEligibility } from '../league/eligibility.ts'
import { championshipPodiums, podiumFor, type Podium } from '../league/podiums.ts'
import { prepareLeagueData } from '../league/prepare.ts'
import { computeRecords, diffAnnouncements, type RecordMarker } from '../league/records.ts'
import { PODIUM_METRICS, type Competition, type LeagueMember, type RawNight } from '../league/types.ts'
import { indexNights } from '../league/windows.ts'
import type { PeriodKind } from '../periods.ts'
import { championshipPayloads, periodSummaryPayloads, recordPayloads, type DiscordPayload } from './format.ts'
import { dueItems } from './plan.ts'

/**
 * One run of the Discord job for one group. The database and Discord are injected (TickStore, Sender) so the
 * Edge Function supplies the real ones and the tests supply fakes. Delivery is at-least-once: a post is claimed in
 * discord_posted before it is sent and retried on later runs until it succeeds or runs out of attempts.
 */

export const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 2
const RATE_LIMIT_WAIT_MAX_MS = 5000
const GAP_BETWEEN_MESSAGES_MS = 1000

export interface GroupConfig {
  groupId: string
  groupName: string
  timeZone: string
  /** groups.settings (carries the podium eligibility grid). */
  settings: unknown
  webhookUrl: string | null
  webhookStatus: 'ok' | 'invalid'
  enabled: boolean
  postHour: number
  periodKinds: PeriodKind[]
  postRecords: boolean
  postChampionships: boolean
  enabledAt: string | null
  recordsBaselinedAt: string | null
  lastNightsSeenAt: string | null
}

export interface TickPatch {
  lastPostAt?: string
  lastNightsSeenAt?: string
  lastError?: string | null
  webhookStatus?: 'invalid'
  recordsBaselinedAt?: string
}

export interface ClaimedPost {
  id: string
  attempts: number
}

export interface TickStore {
  loadConfig(groupId: string): Promise<GroupConfig | null>
  /** Takes the per-group lock for the run. False when another run holds it. */
  tryLock(groupId: string, until: Date): Promise<boolean>
  /** Releases the lock and applies the patch. */
  unlock(groupId: string, patch: TickPatch): Promise<void>
  loadRoster(groupId: string): Promise<LeagueMember[]>
  /** Latest updated_at over the members' nights, or null if none. */
  latestNightChange(userIds: string[]): Promise<string | null>
  loadNights(userIds: string[]): Promise<RawNight[]>
  loadCompetitions(groupId: string): Promise<Competition[]>
  loadMarkers(groupId: string): Promise<Map<string, RecordMarker>>
  saveMarkers(groupId: string, markers: RecordMarker[]): Promise<void>
  /** Registers the post, or returns null when it was already sent/skipped, is in flight, or has used its attempts. */
  claimPost(groupId: string, kind: 'period' | 'championship', key: string): Promise<ClaimedPost | null>
  finishPost(id: string, status: 'sent' | 'failed' | 'skipped', error?: string): Promise<void>
}

export type SendResult =
  | { ok: true }
  | { ok: false; kind: 'rate_limited'; retryAfterMs: number }
  | { ok: false; kind: 'invalid_webhook' }
  | { ok: false; kind: 'bad_request' | 'transient'; message: string }

export interface Sender {
  send(webhookUrl: string, payload: DiscordPayload): Promise<SendResult>
}

export interface TickDeps {
  store: TickStore
  sender: Sender
  now: () => Date
  sleep: (ms: number) => Promise<void>
  /** Public app URL (e.g. https://user.github.io/legity-league/) used for links in embeds. */
  appUrl?: string
}

export interface TickResult {
  status: 'disabled' | 'locked' | 'idle' | 'ran'
  recordsPosted: number
  periodsPosted: number
  championshipsPosted: number
  failures: number
}

type DeliveryOutcome = { ok: true } | { ok: false; invalid: boolean; message: string }

/** Link that opens a podium's period in the League page. */
export function leagueLink(appUrl: string | undefined, podium: Pick<Podium, 'kind' | 'start' | 'metric'>): string | undefined {
  if (!appUrl || podium.kind === 'championship') return undefined
  return `${appUrl.replace(/\/+$/, '')}/#/league?kind=${podium.kind}&p=${podium.start}&metric=${podium.metric}`
}

async function deliver(deps: TickDeps, webhookUrl: string, payloads: DiscordPayload[]): Promise<DeliveryOutcome> {
  for (let i = 0; i < payloads.length; i++) {
    if (i > 0) await deps.sleep(GAP_BETWEEN_MESSAGES_MS)
    let result = await deps.sender.send(webhookUrl, payloads[i])
    if (!result.ok && result.kind === 'rate_limited' && result.retryAfterMs <= RATE_LIMIT_WAIT_MAX_MS) {
      await deps.sleep(result.retryAfterMs)
      result = await deps.sender.send(webhookUrl, payloads[i])
    }
    if (result.ok) continue
    if (result.kind === 'invalid_webhook') return { ok: false, invalid: true, message: 'Discord rejected the webhook (deleted or revoked). Paste a new one.' }
    if (result.kind === 'rate_limited') return { ok: false, invalid: false, message: 'Discord is rate limiting this webhook; will retry.' }
    return { ok: false, invalid: false, message: result.message }
  }
  return { ok: true }
}

export async function runTick(groupId: string, deps: TickDeps): Promise<TickResult> {
  const { store } = deps
  const result: TickResult = { status: 'idle', recordsPosted: 0, periodsPosted: 0, championshipsPosted: 0, failures: 0 }

  const cfg = await store.loadConfig(groupId)
  if (!cfg || !cfg.enabled || !cfg.webhookUrl || cfg.webhookStatus !== 'ok') return { ...result, status: 'disabled' }

  const now = deps.now()
  if (!(await store.tryLock(groupId, new Date(now.getTime() + LOCK_MINUTES * 60_000)))) return { ...result, status: 'locked' }

  const patch: TickPatch = {}
  try {
    const roster = await store.loadRoster(groupId)
    if (roster.length === 0) return result
    const ids = roster.map((m) => m.user_id)
    const competitions = await store.loadCompetitions(groupId)

    const due = dueItems({
      now,
      timeZone: cfg.timeZone,
      postHour: cfg.postHour,
      kinds: cfg.periodKinds,
      postChampionships: cfg.postChampionships,
      competitions,
      enabledAt: cfg.enabledAt ? new Date(cfg.enabledAt) : null,
    })
    const latest = await store.latestNightChange(ids)
    const changed = latest != null && (cfg.lastNightsSeenAt == null || Date.parse(latest) > Date.parse(cfg.lastNightsSeenAt))
    const needsBaseline = cfg.recordsBaselinedAt == null
    if (due.length === 0 && !changed && !needsBaseline) return result

    result.status = 'ran'
    const nights = prepareLeagueData(await store.loadNights(ids))
    const index = indexNights(nights)
    const asOf = zonedNow(cfg.timeZone, now).date
    const eligibility = parseEligibility(cfg.settings)
    const names = new Map(roster.map((m) => [m.user_id, m.name]))
    let invalid = false

    const fail = (message: string, isInvalid: boolean) => {
      result.failures++
      patch.lastError = message
      if (isInvalid) {
        patch.webhookStatus = 'invalid'
        invalid = true
      }
    }

    // ---- records ----
    const report = computeRecords(roster, nights, asOf)
    const markers = await store.loadMarkers(groupId)
    if (needsBaseline) {
      // First run after (re-)enabling: remember today's records without announcing any of them.
      await store.saveMarkers(groupId, diffAnnouncements(new Map(), report).silent)
      patch.recordsBaselinedAt = now.toISOString()
    } else {
      const { announcements, silent } = diffAnnouncements(markers, report)
      if (!cfg.postRecords) {
        await store.saveMarkers(groupId, [...silent, ...announcements.map((a) => a.marker)])
      } else {
        await store.saveMarkers(groupId, silent)
        if (announcements.length > 0) {
          const outcome = await deliver(deps, cfg.webhookUrl, recordPayloads(announcements, names, cfg.groupName))
          if (outcome.ok) {
            await store.saveMarkers(groupId, announcements.map((a) => a.marker))
            result.recordsPosted += announcements.length
            patch.lastPostAt = now.toISOString()
          } else {
            fail(outcome.message, outcome.invalid) // markers stay as they were, so the next run retries
          }
        }
      }
    }

    // ---- period summaries and championships ----
    for (const item of due) {
      if (invalid) break
      const claim = await store.claimPost(groupId, item.kind, item.key)
      if (!claim) continue
      let payloads: DiscordPayload[]
      if (item.kind === 'period') {
        const { kind, range } = item.period!
        const podiums = PODIUM_METRICS.map((m) => podiumFor(kind, range, m, roster, index, eligibility))
        payloads = periodSummaryPayloads({ groupName: cfg.groupName, podiums, urlFor: (p) => leagueLink(deps.appUrl, p) })
      } else {
        const podiums = championshipPodiums(roster, index, [item.competition!], PODIUM_METRICS, asOf, eligibility)
        payloads = championshipPayloads({ groupName: cfg.groupName, podiums })
      }
      if (payloads.length === 0) {
        await store.finishPost(claim.id, 'skipped', 'nobody had data')
        continue
      }
      const outcome = await deliver(deps, cfg.webhookUrl, payloads)
      if (outcome.ok) {
        await store.finishPost(claim.id, 'sent')
        patch.lastPostAt = now.toISOString()
        if (item.kind === 'period') result.periodsPosted++
        else result.championshipsPosted++
      } else {
        await store.finishPost(claim.id, 'failed', outcome.message)
        fail(outcome.message, outcome.invalid)
      }
    }

    if (result.failures === 0) {
      patch.lastError = null
      if (latest) patch.lastNightsSeenAt = latest
    }
    return result
  } catch (e) {
    patch.lastError = e instanceof Error ? e.message.slice(0, 300) : 'Unexpected error'
    result.failures++
    throw e
  } finally {
    await store.unlock(groupId, patch)
  }
}
