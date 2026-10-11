import { describe, expect, it } from 'vitest'
import { addDays } from '../dates.ts'
import { night, run } from './fixtures.ts'
import { computeRecords, diffAnnouncements, formatRecordValue, recordCategories, type RecordMarker, type RecordsReport } from './records.ts'
import type { LeagueMember, LeagueNight } from './types.ts'

const members: LeagueMember[] = [
  { user_id: 'a', name: 'Alex', target_bedtime: '23:00:00' },
  { user_id: 'b', name: 'Bo', target_bedtime: '23:00:00' },
  { user_id: 'c', name: 'Cam', target_bedtime: '00:15:00' },
]

const cat = (report: RecordsReport, key: string) => report.categories.find((c) => c.category.key === key)!

describe('recordCategories', () => {
  it('has unique keys; restorative and score are Watch-only; bedtime stats are lower-is-better', () => {
    const all = recordCategories()
    expect(new Set(all.map((c) => c.key)).size).toBe(all.length)
    expect(all.filter((c) => c.stat === 'restorative' || c.stat === 'score').every((c) => c.division === 'watch')).toBe(true)
    expect(all.filter((c) => c.stat === 'spread' || c.stat === 'gap').every((c) => c.direction === 'min')).toBe(true)
    // night: 4, then per kind: 2 duration + 2 + 2 spread + 2 gap = 8
    expect(all).toHaveLength(4 + 4 * 8)
  })
})

describe('single-night records', () => {
  it('the first night sets a record with nothing beaten', () => {
    const r = computeRecords(members, [night('a', '2026-10-01', { dur: 480 })], '2026-10-05')
    const c = cat(r, 'night:duration:watch')
    expect(c.current).toMatchObject({ value: 480, achievedOn: '2026-10-01', stoodDays: 4, previous: null, supersededOn: null })
    expect(c.current!.holders.map((h) => h.userId)).toEqual(['a'])
  })

  it('a strictly better night breaks the record and records how long the old one stood', () => {
    const r = computeRecords(members, [night('a', '2026-10-01', { dur: 480 }), night('b', '2026-10-03', { dur: 500 })], '2026-10-05')
    const c = cat(r, 'night:duration:watch')
    expect(c.events).toHaveLength(2)
    expect(c.events[0]).toMatchObject({ value: 480, supersededOn: '2026-10-03', stoodDays: 2 })
    expect(c.current).toMatchObject({ value: 500, stoodDays: 2 })
    expect(c.current!.previous).toMatchObject({ value: 480, stoodDays: 2 })
    expect(c.current!.previous!.holders.map((h) => h.userId)).toEqual(['a'])
  })

  it('a tie by someone else is a co-holder, not a new record; the same person matching themselves is ignored', () => {
    const tie = computeRecords(members, [night('a', '2026-10-01', { dur: 480 }), night('b', '2026-10-02', { dur: 480 })], '2026-10-05')
    const c = cat(tie, 'night:duration:watch')
    expect(c.events).toHaveLength(1)
    expect(c.current!.ties.map((h) => h.userId)).toEqual(['b'])
    // The fixture's restorative minutes and score match too, so Bo ties three categories.
    expect(tie.byUser.get('b')).toMatchObject({ tiedAllTime: 3 })
    expect(tie.byUser.get('b')!.tied).toContain('night:duration:watch')

    const self = computeRecords(members, [night('a', '2026-10-01', { dur: 480 }), night('a', '2026-10-02', { dur: 480 })], '2026-10-05')
    expect(cat(self, 'night:duration:watch').current!.ties).toEqual([])
  })

  it('people reaching the best value on the same day share the record; a lower value that day does not', () => {
    const shared = computeRecords(members, [night('a', '2026-10-03', { dur: 500 }), night('b', '2026-10-03', { dur: 500 }), night('c', '2026-10-03', { dur: 490 })], '2026-10-05')
    expect(cat(shared, 'night:duration:watch').current!.holders.map((h) => h.userId).sort()).toEqual(['a', 'b'])
    const split = computeRecords(members, [night('a', '2026-10-03', { dur: 500 }), night('b', '2026-10-03', { dur: 510 })], '2026-10-05')
    expect(cat(split, 'night:duration:watch').current!.holders.map((h) => h.userId)).toEqual(['b'])
  })

  it('counts records set and records held per user', () => {
    const r = computeRecords(members, [night('a', '2026-10-01', { dur: 480 }), night('b', '2026-10-03', { dur: 500 })], '2026-10-05')
    expect(r.byUser.get('a')!.held).not.toContain('night:duration:watch')
    expect(r.byUser.get('a')!.setAllTime).toBeGreaterThan(0)
    expect(r.byUser.get('b')!.held).toContain('night:duration:watch')
  })

  it('keeps Watch and Non-Watch divisions separate; manual nights never count', () => {
    const r = computeRecords(
      members,
      [night('a', '2026-10-01', { dur: 600, device: 'manual' }), night('b', '2026-10-01', { dur: 500, device: 'phone' }), night('c', '2026-10-01', { dur: 450 })],
      '2026-10-05',
    )
    expect(cat(r, 'night:duration:watch').current!.holders.map((h) => h.userId)).toEqual(['c'])
    expect(cat(r, 'night:duration:phone').current!.holders.map((h) => h.userId)).toEqual(['b'])
    expect(r.byUser.get('a')).toBeUndefined()
  })

  it('restorative and score records come from Watch nights only', () => {
    const r = computeRecords(members, [night('a', '2026-10-01', { device: 'phone', rest: 400, score: 100 }), night('b', '2026-10-01', { rest: 150, score: 80 })], '2026-10-05')
    expect(cat(r, 'night:restorative:watch').current!.holders[0].userId).toBe('b')
    expect(cat(r, 'night:score:watch').current!.value).toBe(80)
  })

  it('is stable when nights are re-synced (duplicates and rewrites with equal values)', () => {
    const nights = [night('a', '2026-10-01', { dur: 480 }), night('b', '2026-10-03', { dur: 500 })]
    const once = computeRecords(members, nights, '2026-10-05')
    const twice = computeRecords(members, [...nights, ...nights.map((n) => ({ ...n }))], '2026-10-05')
    expect(twice.categories).toEqual(once.categories)
  })

  it('a backfilled older night rewrites history: it can pre-empt a later record', () => {
    const before = computeRecords(members, [night('a', '2026-10-05', { dur: 480 }), night('b', '2026-10-10', { dur: 500 })], '2026-10-12')
    expect(cat(before, 'night:duration:watch').current!.holders[0].userId).toBe('b')
    const after = computeRecords(members, [night('a', '2026-10-05', { dur: 480 }), night('b', '2026-10-10', { dur: 500 }), night('a', '2026-10-03', { dur: 510 })], '2026-10-12')
    const c = cat(after, 'night:duration:watch')
    expect(c.events).toHaveLength(1)
    expect(c.current).toMatchObject({ value: 510, achievedOn: '2026-10-03', stoodDays: 9 })
  })
})

describe('window records (every night of a complete period)', () => {
  const week = (user: string, durs: number[], o = {}) => run(user, '2026-10-05', durs, o)

  it('needs every night: 6 of 7 gives nothing', () => {
    const r = computeRecords(members, [...week('a', [480, 480, 480, 480, 480, 480]), ...week('b', Array(7).fill(470))], '2026-10-12')
    const c = cat(r, 'week:duration:watch')
    expect(c.current!.holders.map((h) => h.userId)).toEqual(['b'])
    expect(c.current).toMatchObject({ value: 470, achievedOn: '2026-10-11' })
    expect(c.current!.holders[0].title).toBe('Week of 5 Oct 2026')
  })

  it('only complete periods count', () => {
    const nights = week('a', Array(7).fill(480))
    expect(cat(computeRecords(members, nights, '2026-10-11'), 'week:duration:watch').current).toBeNull()
    expect(cat(computeRecords(members, nights, '2026-10-12'), 'week:duration:watch').current).not.toBeNull()
  })

  it('a window with any phone night is Non-Watch; a manual night disqualifies it', () => {
    const mixed = [...week('a', Array(6).fill(480)), night('a', '2026-10-11', { device: 'phone', dur: 480 })]
    const r = computeRecords(members, mixed, '2026-10-12')
    expect(cat(r, 'week:duration:watch').current).toBeNull()
    expect(cat(r, 'week:duration:phone').current!.holders[0].userId).toBe('a')
    const manual = [...week('a', Array(6).fill(480)), night('a', '2026-10-11', { device: 'manual', dur: 480 })]
    const m = computeRecords(members, manual, '2026-10-12')
    expect(m.categories.every((c) => c.category.scope === 'night' || c.current === null)).toBe(true)
  })

  it('compares rounded values, so near-equal averages tie instead of breaking', () => {
    const a = week('a', [480, 480, 480, 480, 480, 480, 483]) // 480.43 -> 480
    const b = week('b', Array(7).fill(480))
    const c = cat(computeRecords(members, [...a, ...b], '2026-10-12'), 'week:duration:watch')
    expect(c.events).toHaveLength(1)
    expect(c.current!.value).toBe(480)
    expect(c.current!.holders.concat(c.current!.ties).map((h) => h.userId).sort()).toEqual(['a', 'b'])
  })

  it('month records need every day of the calendar month', () => {
    const feb = run('a', '2026-02-01', Array(28).fill(480))
    expect(cat(computeRecords(members, feb, '2026-03-02'), 'month:duration:watch').current!.holders[0].title).toBe('Feb 2026')
    const short = run('a', '2026-02-01', Array(27).fill(480))
    expect(cat(computeRecords(members, short, '2026-03-02'), 'month:duration:watch').current).toBeNull()
  })
})

describe('bedtime records', () => {
  const week = (user: string, beds: string[]) => beds.map((bed, i) => night(user, addDays('2026-10-05', i), { bed }))

  it('most consistent bedtime is the lowest spread', () => {
    const steady = week('a', Array(7).fill('23:00'))
    const erratic = week('b', ['21:30', '00:30', '22:00', '01:00', '23:00', '21:00', '00:00'])
    const c = cat(computeRecords(members, [...steady, ...erratic], '2026-10-12'), 'week:spread:watch')
    expect(c.current).toMatchObject({ value: 0 })
    expect(c.current!.holders.map((h) => h.userId)).toEqual(['a'])
  })

  it('spread treats 23:50 and 00:10 as close (noon anchored)', () => {
    const across = week('a', ['23:50', '00:10', '23:50', '00:10', '23:50', '00:10', '23:50'])
    const spread = cat(computeRecords(members, across, '2026-10-12'), 'week:spread:watch').current!.value
    expect(spread).toBeLessThan(15)
  })

  it('target gap is the average circular distance from the member target', () => {
    const exact = week('a', Array(7).fill('23:00')) // target 23:00 -> 0
    const late = week('b', Array(7).fill('00:30')) // 90 minutes after 23:00
    const wrap = week('c', Array(7).fill('23:50')) // target 00:15 -> 25 across midnight
    const r = computeRecords(members, [...exact, ...late, ...wrap], '2026-10-12')
    expect(cat(r, 'week:gap:watch').current!.holders.map((h) => h.userId)).toEqual(['a'])
    expect(cat(r, 'week:gap:watch').current!.value).toBe(0)
    const noA = computeRecords(members, [...late, ...wrap], '2026-10-12')
    expect(cat(noA, 'week:gap:watch').current).toMatchObject({ value: 25 })
  })

  it('has no gap record without a target bedtime', () => {
    const r = computeRecords([{ user_id: 'a', name: 'Alex' }], week('a', Array(7).fill('23:00')), '2026-10-12')
    expect(cat(r, 'week:gap:watch').current).toBeNull()
    expect(cat(r, 'week:spread:watch').current).not.toBeNull()
  })
})

describe('diffAnnouncements', () => {
  const markersOf = (r: RecordsReport): Map<string, RecordMarker> => {
    const { silent } = diffAnnouncements(new Map(), r)
    return new Map(silent.map((m) => [m.categoryKey, m]))
  }
  const base: LeagueNight[] = [night('a', '2026-10-01', { dur: 480 })]

  it('seeds every category silently the first time', () => {
    const r = computeRecords(members, base, '2026-10-05')
    const d = diffAnnouncements(new Map(), r)
    expect(d.announcements).toEqual([])
    expect(d.silent).toHaveLength(r.categories.length)
  })

  it('does nothing when re-run on identical data', () => {
    const r = computeRecords(members, base, '2026-10-05')
    const d = diffAnnouncements(markersOf(r), r)
    expect(d).toEqual({ announcements: [], silent: [] })
  })

  it('announces a strictly better value that beat a previous holder', () => {
    const markers = markersOf(computeRecords(members, base, '2026-10-05'))
    const next = computeRecords(members, [...base, night('b', '2026-10-06', { dur: 500 })], '2026-10-07')
    const d = diffAnnouncements(markers, next)
    const ann = d.announcements.find((x) => x.category.key === 'night:duration:watch')!
    expect(ann.event.value).toBe(500)
    expect(ann.event.previous).toMatchObject({ value: 480, stoodDays: 5 })
    expect(ann.marker).toMatchObject({ value: 500, holderIds: ['b'] })
  })

  it('does not announce ties, only updates who holds it', () => {
    const markers = markersOf(computeRecords(members, base, '2026-10-05'))
    const next = computeRecords(members, [...base, night('b', '2026-10-06', { dur: 480 })], '2026-10-07')
    const d = diffAnnouncements(markers, next)
    expect(d.announcements.find((x) => x.category.key === 'night:duration:watch')).toBeUndefined()
    expect(d.silent.find((m) => m.categoryKey === 'night:duration:watch')!.holderIds).toEqual(['a', 'b'])
  })

  it('does not announce the first record in a previously empty category', () => {
    const empty = computeRecords(members, [], '2026-10-05')
    const markers = markersOf(empty)
    const next = computeRecords(members, base, '2026-10-05')
    expect(diffAnnouncements(markers, next).announcements).toEqual([])
  })

  it('a revoked record resets silently instead of announcing', () => {
    const high = computeRecords(members, [...base, night('a', '2026-10-02', { dur: 520 })], '2026-10-05')
    const markers = markersOf(high)
    const after = computeRecords(members, base, '2026-10-05') // the 520 night was deleted
    const d = diffAnnouncements(markers, after)
    expect(d.announcements).toEqual([])
    expect(d.silent.find((m) => m.categoryKey === 'night:duration:watch')!.value).toBe(480)
  })

  it('a backfilled old night with nothing before it is not announced', () => {
    const markers = markersOf(computeRecords(members, [night('b', '2026-10-10', { dur: 500 })], '2026-10-12'))
    const next = computeRecords(members, [night('b', '2026-10-10', { dur: 500 }), night('a', '2026-10-03', { dur: 510 })], '2026-10-12')
    expect(diffAnnouncements(markers, next).announcements.find((x) => x.category.key === 'night:duration:watch')).toBeUndefined()
  })
})

describe('formatRecordValue', () => {
  it('formats by stat', () => {
    expect(formatRecordValue('duration', 612)).toBe('10h 12m')
    expect(formatRecordValue('score', 92.4)).toBe('92.4')
    expect(formatRecordValue('spread', 42)).toBe('42m')
    expect(formatRecordValue('gap', 90)).toBe('1h 30m')
  })
})
