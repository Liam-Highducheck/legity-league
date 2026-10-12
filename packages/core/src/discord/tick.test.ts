import { describe, expect, it } from 'vitest'
import { night, run } from '../league/fixtures.ts'
import type { RecordMarker } from '../league/records.ts'
import type { Competition, LeagueMember, LeagueNight, RawNight } from '../league/types.ts'
import type { DiscordPayload } from './format.ts'
import {
  MAX_ATTEMPTS,
  leagueLink,
  runTick,
  type ClaimedPost,
  type GroupConfig,
  type SendResult,
  type Sender,
  type TickPatch,
  type TickStore,
} from './tick.ts'

const G = 'g1'

class FakeStore implements TickStore {
  cfg: GroupConfig
  roster: LeagueMember[] = [
    { user_id: 'a', name: 'Alex' },
    { user_id: 'b', name: 'Bo' },
  ]
  nights: LeagueNight[] = []
  competitions: Competition[] = []
  markers = new Map<string, RecordMarker>()
  posts = new Map<string, { id: string; kind: string; key: string; attempts: number; status: string; error?: string }>()
  latest: string | null = null
  locked = false
  loadNightsCalls = 0

  constructor(cfg: Partial<GroupConfig> = {}) {
    this.cfg = {
      groupId: G,
      groupName: 'Friends',
      timeZone: 'Etc/GMT-10',
      settings: {},
      webhookUrl: 'https://discord.com/api/webhooks/1/abc',
      webhookStatus: 'ok',
      enabled: true,
      postHour: 9,
      periodKinds: [],
      postRecords: true,
      postChampionships: true,
      enabledAt: '2026-09-01T00:00:00Z',
      recordsBaselinedAt: '2026-09-01T00:00:00Z',
      lastNightsSeenAt: null,
      ...cfg,
    }
  }

  async loadConfig() { return this.cfg }
  async tryLock() { if (this.locked) return false; this.locked = true; return true }
  async unlock(_g: string, p: TickPatch) {
    this.locked = false
    if (p.lastNightsSeenAt) this.cfg.lastNightsSeenAt = p.lastNightsSeenAt
    if (p.webhookStatus) this.cfg.webhookStatus = p.webhookStatus
    if (p.recordsBaselinedAt) this.cfg.recordsBaselinedAt = p.recordsBaselinedAt
    this.lastPatch = p
  }
  lastPatch: TickPatch = {}
  async loadRoster() { return this.roster }
  async latestNightChange() { return this.latest }
  async loadNights(): Promise<RawNight[]> { this.loadNightsCalls++; return this.nights }
  async loadCompetitions() { return this.competitions }
  async loadMarkers() { return new Map(this.markers) }
  async saveMarkers(_g: string, ms: RecordMarker[]) { for (const m of ms) this.markers.set(m.categoryKey, m) }
  async claimPost(_g: string, kind: 'period' | 'championship', key: string): Promise<ClaimedPost | null> {
    const row = this.posts.get(key)
    if (!row) {
      const created = { id: `p${this.posts.size + 1}`, kind, key, attempts: 1, status: 'pending' }
      this.posts.set(key, created)
      return { id: created.id, attempts: 1 }
    }
    if (row.status === 'failed' && row.attempts < MAX_ATTEMPTS) {
      row.attempts++
      row.status = 'pending'
      return { id: row.id, attempts: row.attempts }
    }
    return null
  }
  async finishPost(id: string, status: 'sent' | 'failed' | 'skipped', error?: string) {
    const row = [...this.posts.values()].find((p) => p.id === id)!
    row.status = status
    row.error = error
  }
}

class FakeSender implements Sender {
  sent: DiscordPayload[] = []
  calls = 0
  results: SendResult[] = []
  async send(_url: string, payload: DiscordPayload): Promise<SendResult> {
    this.calls++
    const next = this.results.shift() ?? { ok: true as const }
    if (next.ok) this.sent.push(payload)
    return next
  }
}

function setup(cfg: Partial<GroupConfig> = {}, nowIso = '2026-10-06T00:00:00Z') {
  const store = new FakeStore(cfg)
  const sender = new FakeSender()
  const sleeps: number[] = []
  let now = new Date(nowIso)
  const deps = { store, sender, now: () => now, sleep: async (ms: number) => void sleeps.push(ms), appUrl: 'https://x.github.io/legity-league/' }
  return { store, sender, sleeps, deps, setNow: (iso: string) => (now = new Date(iso)), go: () => runTick(G, deps) }
}

const text = (s: FakeSender) => s.sent.map((p) => p.content ?? JSON.stringify(p.embeds)).join('\n')

describe('runTick: guards', () => {
  it('does nothing for a disabled group, a missing webhook or an invalid webhook', async () => {
    for (const cfg of [{ enabled: false }, { webhookUrl: null }, { webhookStatus: 'invalid' as const }]) {
      const t = setup(cfg)
      expect((await t.go()).status).toBe('disabled')
      expect(t.store.loadNightsCalls).toBe(0)
    }
  })

  it('skips when another run holds the lock, and always releases its own lock', async () => {
    const t = setup()
    t.store.locked = true
    expect((await t.go()).status).toBe('locked')
    t.store.locked = false
    await t.go()
    expect(t.store.locked).toBe(false)
  })

  it('does not even load nights when nothing changed and nothing is due', async () => {
    const t = setup()
    t.store.latest = '2026-10-05T00:00:00Z'
    t.store.cfg.lastNightsSeenAt = '2026-10-05T00:00:00Z'
    expect((await t.go()).status).toBe('idle')
    expect(t.store.loadNightsCalls).toBe(0)
  })
})

describe('runTick: records', () => {
  const base = () => [night('a', '2026-10-01', { dur: 480 })]

  it('the first run baselines silently: nothing is announced, markers are saved', async () => {
    const t = setup({ recordsBaselinedAt: null })
    t.store.nights = base()
    t.store.latest = '2026-10-01T00:00:00Z'
    const r = await t.go()
    expect(r.status).toBe('ran')
    expect(t.sender.calls).toBe(0)
    expect(t.store.markers.size).toBeGreaterThan(0)
    expect(t.store.cfg.recordsBaselinedAt).not.toBeNull()
  })

  it('announces a broken record once, then stays quiet when nothing changes or data is re-synced', async () => {
    const t = setup({ recordsBaselinedAt: null })
    t.store.nights = base()
    t.store.latest = '2026-10-01T00:00:00Z'
    await t.go() // baseline

    t.store.nights = [...base(), night('b', '2026-10-05', { dur: 612 })]
    t.store.latest = '2026-10-05T01:00:00Z'
    const r = await t.go()
    expect(r.recordsPosted).toBeGreaterThan(0)
    expect(t.sender.sent).toHaveLength(1)
    expect(text(t.sender)).toContain('**New record:** Longest night (Watch) — **Bo**, 10h 12m')
    expect(text(t.sender)).toContain('beating Alex (8h 00m)')
    expect(t.sender.sent[0].allowed_mentions).toEqual({ parse: [] })

    // nothing new
    expect((await t.go()).status).toBe('idle')
    // a re-sync rewrites the same nights (updated_at moves, values don't)
    t.store.latest = '2026-10-05T09:00:00Z'
    const again = await t.go()
    expect(again.recordsPosted).toBe(0)
    expect(t.sender.sent).toHaveLength(1)
  })

  it('a failed send keeps the markers and is retried; lastNightsSeenAt only advances on success', async () => {
    const t = setup({ recordsBaselinedAt: null })
    t.store.nights = base()
    t.store.latest = '2026-10-01T00:00:00Z'
    await t.go()
    const seenAfterBaseline = t.store.cfg.lastNightsSeenAt

    t.store.nights = [...base(), night('b', '2026-10-05', { dur: 612 })]
    t.store.latest = '2026-10-05T01:00:00Z'
    t.sender.results = [{ ok: false, kind: 'transient', message: 'Discord 500' }]
    const failed = await t.go()
    expect(failed.failures).toBe(1)
    expect(t.sender.sent).toHaveLength(0)
    expect(t.store.lastPatch.lastError).toBe('Discord 500')
    expect(t.store.cfg.lastNightsSeenAt).toBe(seenAfterBaseline)

    const retry = await t.go()
    expect(retry.recordsPosted).toBeGreaterThan(0)
    expect(t.sender.sent).toHaveLength(1)
    expect(t.store.cfg.lastNightsSeenAt).toBe('2026-10-05T01:00:00Z')
    expect(t.store.lastPatch.lastError).toBeNull()
  })

  it('with record posts switched off it keeps the markers current without posting', async () => {
    const t = setup({ recordsBaselinedAt: null, postRecords: false })
    t.store.nights = base()
    t.store.latest = '2026-10-01T00:00:00Z'
    await t.go()
    t.store.nights = [...base(), night('b', '2026-10-05', { dur: 612 })]
    t.store.latest = '2026-10-05T01:00:00Z'
    await t.go()
    expect(t.sender.calls).toBe(0)
    expect(t.store.markers.get('night:duration:watch')!.value).toBe(612)
  })
})

describe('runTick: period summaries', () => {
  // Monday 5 Oct 2026 10:00 at UTC+10 (the week of 28 Sep has just finished).
  const NOW = '2026-10-05T00:00:00Z'
  const weekNights = () => [...run('a', '2026-09-28', Array(7).fill(480)), ...run('b', '2026-09-28', Array(7).fill(500))]

  it('posts the finished week once with a link back to the app', async () => {
    const t = setup({ periodKinds: ['week'] }, NOW)
    t.store.nights = weekNights()
    t.store.latest = '2026-10-05T00:00:00Z'
    const r = await t.go()
    expect(r.periodsPosted).toBe(1)
    const embeds = t.sender.sent.flatMap((p) => p.embeds ?? [])
    expect(embeds[0].title).toBe('🏆 Week of 28 Sep 2026 — Duration')
    expect(embeds[0].url).toBe('https://x.github.io/legity-league/#/league?kind=week&p=2026-09-28&metric=duration')
    expect(embeds[0].description).toContain('🥇 **Bo**')

    const sentCount = t.sender.sent.length
    await t.go() // still due, already sent
    expect(t.sender.sent).toHaveLength(sentCount)
    expect([...t.store.posts.values()][0].status).toBe('sent')
  })

  it('is not posted before the post hour', async () => {
    const t = setup({ periodKinds: ['week'] }, '2026-10-04T22:00:00Z') // 08:00 Monday local
    t.store.nights = weekNights()
    expect((await t.go()).periodsPosted).toBe(0)
    expect(t.sender.calls).toBe(0)
  })

  it('retries a failed post on later runs and gives up after the maximum attempts', async () => {
    const t = setup({ periodKinds: ['week'] }, NOW)
    t.store.nights = weekNights()
    t.sender.results = Array(10).fill({ ok: false, kind: 'transient', message: 'down' })
    for (let i = 0; i < MAX_ATTEMPTS + 2; i++) await t.go()
    expect(t.sender.calls).toBe(MAX_ATTEMPTS)
    const post = [...t.store.posts.values()][0]
    expect(post).toMatchObject({ status: 'failed', attempts: MAX_ATTEMPTS, error: 'down' })
  })

  it('marks the webhook invalid when Discord says it is gone, and stops posting', async () => {
    const t = setup({ periodKinds: ['week'] }, NOW)
    t.store.nights = weekNights()
    t.sender.results = [{ ok: false, kind: 'invalid_webhook' }]
    await t.go()
    expect(t.store.cfg.webhookStatus).toBe('invalid')
    expect(t.store.lastPatch.lastError).toMatch(/webhook/i)
    expect((await t.go()).status).toBe('disabled')
  })

  it('waits out a short rate limit and retries the same message', async () => {
    const t = setup({ periodKinds: ['week'] }, NOW)
    t.store.nights = weekNights()
    t.sender.results = [{ ok: false, kind: 'rate_limited', retryAfterMs: 1500 }]
    const r = await t.go()
    expect(r.periodsPosted).toBe(1)
    expect(t.sleeps).toContain(1500)
  })

  it('defers a long rate limit to the next run', async () => {
    const t = setup({ periodKinds: ['week'] }, NOW)
    t.store.nights = weekNights()
    t.sender.results = [{ ok: false, kind: 'rate_limited', retryAfterMs: 60_000 }]
    const r = await t.go()
    expect(r.failures).toBe(1)
    expect(t.sleeps).not.toContain(60_000)
    expect((await t.go()).periodsPosted).toBe(1)
  })

  it('marks a period nobody has data for as skipped instead of posting', async () => {
    const t = setup({ periodKinds: ['week'] }, NOW)
    t.store.nights = []
    await t.go()
    expect(t.sender.calls).toBe(0)
    expect([...t.store.posts.values()][0].status).toBe('skipped')
  })

  it('applies the group eligibility grid to the summary', async () => {
    const t = setup({ periodKinds: ['week'], settings: { eligibility: { duration: { watch: false, phone: true } } } }, NOW)
    t.store.nights = [...run('a', '2026-09-28', Array(7).fill(480), { device: 'phone' }), ...run('b', '2026-09-28', Array(7).fill(500))]
    await t.go()
    const duration = t.sender.sent.flatMap((p) => p.embeds ?? []).find((e) => e.title?.includes('Duration'))!
    expect(duration.description).toContain('1. Alex')
    expect(duration.description).toContain('Bo (not eligible)')
  })

  it('posts a finished championship and not an unfinished one', async () => {
    const t = setup({ periodKinds: [] }, NOW)
    t.store.nights = weekNights()
    t.store.competitions = [
      { id: 'k1', name: 'Spring Cup', starts_on: '2026-09-28', ends_on: '2026-10-04' },
      { id: 'k2', name: 'Long Cup', starts_on: '2026-09-28', ends_on: '2026-12-01' },
    ]
    const r = await t.go()
    expect(r.championshipsPosted).toBe(1)
    expect(JSON.stringify(t.sender.sent)).toContain('Spring Cup')
    expect(JSON.stringify(t.sender.sent)).not.toContain('Long Cup')
  })
})

describe('leagueLink', () => {
  it('builds deep links and skips championships and missing app URLs', () => {
    expect(leagueLink('https://x.test/app/', { kind: 'month', start: '2026-09-01', metric: 'score' })).toBe('https://x.test/app/#/league?kind=month&p=2026-09-01&metric=score')
    expect(leagueLink(undefined, { kind: 'week', start: '2026-09-28', metric: 'duration' })).toBeUndefined()
    expect(leagueLink('https://x.test', { kind: 'championship', start: '2026-09-28', metric: 'duration' })).toBeUndefined()
  })
})
