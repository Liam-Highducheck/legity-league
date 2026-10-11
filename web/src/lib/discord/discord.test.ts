import { describe, expect, it } from 'vitest'
import { DEFAULT_ELIGIBILITY } from '../league/eligibility.ts'
import { night, run } from '../league/fixtures.ts'
import { podiumFor, type Podium } from '../league/podiums.ts'
import { computeRecords, diffAnnouncements } from '../league/records.ts'
import type { LeagueMember } from '../league/types.ts'
import { indexNights } from '../league/windows.ts'
import { periodRangeAt } from '../periods.ts'
import { championshipPayloads, chunkLines, escapeMd, packEmbeds, periodSummaryPayloads, recordLine, recordPayloads, type DiscordPayload } from './format.ts'
import { dueItems } from './plan.ts'

const range = periodRangeAt('week', 0, '2026-10-05')

function weekPodiums(people: { id: string; name: string; dur: number }[], missing: string[] = []): Podium[] {
  const members: LeagueMember[] = people.map((p) => ({ user_id: p.id, name: p.name }))
  const nights = people.flatMap((p) => run(p.id, '2026-10-05', Array(missing.includes(p.id) ? 6 : 7).fill(p.dur)))
  const index = indexNights(nights)
  return (['duration', 'restorative', 'score'] as const).map((m) => podiumFor('week', range, m, members, index, DEFAULT_ELIGIBILITY))
}

function checkLimits(payloads: DiscordPayload[]) {
  for (const p of payloads) {
    expect(p.allowed_mentions).toEqual({ parse: [] })
    expect((p.content ?? '').length).toBeLessThanOrEqual(2000)
    const embeds = p.embeds ?? []
    expect(embeds.length).toBeLessThanOrEqual(10)
    let total = 0
    for (const e of embeds) {
      expect((e.description ?? '').length).toBeLessThanOrEqual(4096)
      expect((e.title ?? '').length).toBeLessThanOrEqual(256)
      expect((e.footer?.text ?? '').length).toBeLessThanOrEqual(2048)
      total += (e.title ?? '').length + (e.description ?? '').length + (e.footer?.text.length ?? 0)
    }
    expect(total).toBeLessThanOrEqual(6000)
  }
}

describe('escapeMd', () => {
  it('escapes markdown and defuses @mentions', () => {
    expect(escapeMd('*bold* _it_ `code` ~~x~~')).toBe('\\*bold\\* \\_it\\_ \\`code\\` \\~\\~x\\~\\~')
    expect(escapeMd('@everyone @here')).not.toContain('@everyone')
    expect(escapeMd('[a](http://x)')).toBe('\\[a\\]\\(http://x\\)')
  })
})

describe('periodSummaryPayloads', () => {
  it('shows the podium and the full ranking, and lists people who missed nights', () => {
    const podiums = weekPodiums(
      [
        { id: 'a', name: 'Alex', dur: 480 },
        { id: 'b', name: 'Bo', dur: 500 },
        { id: 'c', name: 'Cam', dur: 460 },
        { id: 'd', name: 'Dee', dur: 450 },
        { id: 'e', name: 'Eli', dur: 600 },
      ],
      ['e'],
    )
    const [msg] = periodSummaryPayloads({ groupName: 'Friends', podiums })
    const duration = msg.embeds![0]
    expect(duration.title).toBe('🏆 Week of 5 Oct 2026 — Duration')
    expect(duration.description).toContain('🥇 **Bo** — 8h 20m')
    expect(duration.description).toContain('🥈 **Alex** — 8h 00m')
    expect(duration.description).toContain('🥉 **Cam** — 7h 40m')
    expect(duration.description).toContain('**Full ranking**')
    expect(duration.description).toContain('4. Dee — 7h 30m')
    expect(duration.description).toContain('Eli (6/7)')
    expect(duration.description).toContain('needs all 7 nights')
    expect(duration.footer?.text).toBe('Friends · every night required')
  })

  it('says so when there is no podium', () => {
    const podiums = weekPodiums([{ id: 'a', name: 'Alex', dur: 480 }])
    const [msg] = periodSummaryPayloads({ groupName: 'G', podiums })
    expect(msg.embeds![0].description).toContain('No podium')
  })

  it('returns nothing when nobody has any data', () => {
    expect(periodSummaryPayloads({ groupName: 'G', podiums: weekPodiums([]) })).toEqual([])
  })

  it('escapes display names', () => {
    const podiums = weekPodiums([{ id: 'a', name: '*Alex* @everyone', dur: 480 }, { id: 'b', name: 'Bo', dur: 470 }])
    const text = JSON.stringify(periodSummaryPayloads({ groupName: 'G', podiums }))
    expect(text).not.toContain('@everyone')
    expect(text).toContain('\\\\*Alex\\\\*')
  })

  it('stays inside Discord limits with a 60-person group and long names', () => {
    const people = Array.from({ length: 60 }, (_, i) => ({ id: `u${i}`, name: `Member ${i} with a rather long display name`, dur: 400 + i }))
    const payloads = periodSummaryPayloads({ groupName: 'Big group', podiums: weekPodiums(people) })
    expect(payloads.length).toBeGreaterThan(0)
    checkLimits(payloads)
    const all = JSON.stringify(payloads)
    for (const p of people) expect(all).toContain(`Member ${p.id.slice(1)} with`)
  })
})

describe('championshipPayloads', () => {
  it('titles the competition and shows its dates', () => {
    const members = [{ user_id: 'a', name: 'Alex' }, { user_id: 'b', name: 'Bo' }]
    const index = indexNights([...run('a', '2026-10-01', [480, 480, 480]), ...run('b', '2026-10-01', [500, 500, 500])])
    const podium = { ...podiumFor('week', { start: '2026-10-01', end: '2026-10-03', label: 'x' }, 'duration', members, index, DEFAULT_ELIGIBILITY), kind: 'championship' as const, title: 'Spring Cup' }
    const [msg] = championshipPayloads({ groupName: 'G', podiums: [podium] })
    expect(msg.embeds![0].title).toBe('🏅 Spring Cup — Duration')
    expect(msg.embeds![0].description).toContain('**Championship**')
    expect(msg.embeds![0].description).toContain('🥇 **Bo**')
  })
})

describe('packEmbeds and chunkLines', () => {
  it('splits by embed count and character budget', () => {
    const big = { title: 't', description: 'x'.repeat(3000) }
    const packed = packEmbeds([big, big, big])
    expect(packed.map((p) => p.embeds!.length)).toEqual([1, 1, 1])
    expect(packEmbeds(Array.from({ length: 25 }, () => ({ title: 't', description: 'd' })))).toHaveLength(3)
  })

  it('chunks long line lists without splitting a line', () => {
    const lines = Array.from({ length: 50 }, (_, i) => `line ${i} ${'y'.repeat(60)}`)
    const chunks = chunkLines(lines, 500)
    expect(chunks.every((c) => c.length <= 500)).toBe(true)
    expect(chunks.join('\n').split('\n')).toEqual(lines)
  })
})

describe('record announcements', () => {
  const members: LeagueMember[] = [{ user_id: 'a', name: 'Alex' }, { user_id: 'b', name: 'Bo' }, { user_id: 'c', name: 'Cam' }]
  const names = new Map(members.map((m) => [m.user_id, m.name]))
  const before = [night('a', '2026-10-01', { dur: 580 })]
  const after = [...before, night('b', '2026-10-24', { dur: 612 })]

  function announce(nights = after) {
    const markers = new Map(diffAnnouncements(new Map(), computeRecords(members, before, '2026-10-24')).silent.map((m) => [m.categoryKey, m]))
    return diffAnnouncements(markers, computeRecords(members, nights, '2026-10-25')).announcements
  }

  it('names the holder, the value, who it beat and how long that stood', () => {
    const a = announce().find((x) => x.category.key === 'night:duration:watch')!
    expect(recordLine(a, names)).toBe(
      '**New record:** Longest night (Watch) — **Bo**, 10h 12m (Sat 24 Oct), beating Alex (9h 40m), which stood 23 days.',
    )
  })

  it('does not mention anyone', () => {
    const payloads = recordPayloads(announce(), names, 'G')
    checkLimits(payloads)
    expect(payloads[0].content).toContain('New record')
  })

  it('collapses a big batch into a digest embed', () => {
    const one = announce()[0]
    const many = Array.from({ length: 30 }, () => one)
    const payloads = recordPayloads(many, names, 'G')
    checkLimits(payloads)
    expect(payloads[0].embeds![0].title).toBe('30 records broken')
    expect(payloads[0].content).toBeUndefined()
  })

  it('posts nothing when nothing was broken', () => {
    expect(recordPayloads([], names, 'G')).toEqual([])
  })
})

describe('dueItems', () => {
  const base = {
    timeZone: 'Australia/Sydney',
    postHour: 9,
    kinds: ['week' as const],
    postChampionships: true,
    competitions: [],
    enabledAt: null,
  }
  // Sydney moved to daylight time on Sun 4 Oct 2026, the last day of the week of 28 Sep: due Mon 5 Oct at 9am local.
  it('is due at the post hour the day after the period ends, DST-safe', () => {
    expect(dueItems({ ...base, now: new Date('2026-10-04T21:59:00Z') })).toEqual([]) // 08:59 AEDT
    const due = dueItems({ ...base, now: new Date('2026-10-04T22:00:00Z') }) // 09:00 AEDT
    expect(due.map((d) => d.key)).toEqual(['period:week:2026-09-28'])
    expect(due[0].period!.title).toBe('Week of 28 Sep 2026')
  })

  it('catches up later the same day and the next days, but not past the lookback', () => {
    expect(dueItems({ ...base, now: new Date('2026-10-05T10:00:00Z') }).map((d) => d.key)).toEqual(['period:week:2026-09-28'])
    expect(dueItems({ ...base, now: new Date('2026-10-08T01:00:00Z') }).map((d) => d.key)).toEqual(['period:week:2026-09-28']) // Thu
    expect(dueItems({ ...base, now: new Date('2026-10-09T01:00:00Z') })).toEqual([]) // Fri: 4 days late
  })

  it('never posts what came due before posting was enabled', () => {
    const now = new Date('2026-10-05T03:00:00Z') // Mon 14:00 Sydney
    expect(dueItems({ ...base, now, enabledAt: new Date('2026-10-05T02:00:00Z') })).toEqual([]) // enabled 13:00, after the 09:00 post
    expect(dueItems({ ...base, now, enabledAt: new Date('2026-10-04T10:00:00Z') }).map((d) => d.key)).toEqual(['period:week:2026-09-28'])
  })

  it('respects the group timezone and the chosen post hour', () => {
    // Los Angeles is still on Sunday night when Sydney is on Monday morning.
    expect(dueItems({ ...base, timeZone: 'America/Los_Angeles', now: new Date('2026-10-04T22:00:00Z') })).toEqual([])
    expect(dueItems({ ...base, postHour: 18, now: new Date('2026-10-05T03:00:00Z') })).toEqual([]) // 14:00 < 18:00
    expect(dueItems({ ...base, postHour: 18, now: new Date('2026-10-05T07:30:00Z') })).toHaveLength(1)
  })

  it('lists several kinds that end the same day, and only the enabled kinds', () => {
    // Sunday 31 May 2026 ends both a week and a month, so both are due on Monday 1 June.
    const now = new Date('2026-05-31T23:30:00Z') // Mon 1 Jun 09:30 AEST
    const keys = dueItems({ ...base, kinds: ['week', 'month'], now }).map((d) => d.key)
    expect(keys).toEqual(['period:month:2026-05-01', 'period:week:2026-05-25'])
    expect(dueItems({ ...base, kinds: ['month'], now }).map((d) => d.key)).toEqual(['period:month:2026-05-01'])
  })

  it('posts a finished championship once, and only when enabled', () => {
    const competitions = [{ id: 'k1', name: 'Spring Cup', starts_on: '2026-10-01', ends_on: '2026-10-04' }]
    const now = new Date('2026-10-04T22:30:00Z') // Mon 5 Oct 09:30 AEDT
    const keys = dueItems({ ...base, kinds: [], competitions, now }).map((d) => d.key)
    expect(keys).toEqual(['championship:k1'])
    expect(dueItems({ ...base, kinds: [], competitions, postChampionships: false, now })).toEqual([])
    expect(dueItems({ ...base, kinds: [], competitions, now: new Date('2026-10-04T20:00:00Z') })).toEqual([]) // still before 9am
  })
})
