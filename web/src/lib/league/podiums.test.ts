import { describe, expect, it } from 'vitest'
import { DEFAULT_ELIGIBILITY, parseEligibility, withEligibility, type Eligibility } from './eligibility.ts'
import { night, run } from './fixtures.ts'
import { championshipPodiums, medalTally, periodPodiums, rankRange, totalCounts } from './podiums.ts'
import { rankValues } from './rank.ts'
import type { LeagueMember } from './types.ts'
import { indexNights } from './windows.ts'

const members: LeagueMember[] = [
  { user_id: 'a', name: 'Alex' },
  { user_id: 'b', name: 'Bo' },
  { user_id: 'c', name: 'Cam' },
  { user_id: 'd', name: 'Dee' },
]

describe('rankValues', () => {
  it('uses standard competition ranking for ties', () => {
    const ranked = rankValues([{ v: 5 }, { v: 9 }, { v: 9 }, { v: 7 }], (x) => x.v)
    expect(ranked.map((r) => [r.v, r.rank])).toEqual([[9, 1], [9, 1], [7, 3], [5, 4]])
  })

  it('supports lower-is-better', () => {
    expect(rankValues([{ v: 5 }, { v: 3 }], (x) => x.v, 'min').map((r) => r.rank)).toEqual([1, 2])
  })
})

describe('rankRange (week of 5-11 Oct 2026)', () => {
  const nights = [
    ...run('a', '2026-10-05', [480, 480, 480, 480, 480, 480, 480]), // 480
    ...run('b', '2026-10-05', [500, 500, 500, 500, 500, 500, 500]), // 500
    ...run('c', '2026-10-05', [600, 600, 600, 600, 600, 600]), // missing Sunday -> unranked
    ...run('d', '2026-10-05', [500, 500, 500, 500, 500, 500, 500]), // ties with Bo
  ]
  const index = indexNights(nights)

  it('ranks only people with every night, and shares rank on ties', () => {
    const r = rankRange(members, index, '2026-10-05', '2026-10-11', 'duration', DEFAULT_ELIGIBILITY)
    expect(r.placings.map((p) => [p.name, p.rank])).toEqual([['Bo', 1], ['Dee', 1], ['Alex', 3]])
    expect(r.unranked).toEqual([{ userId: 'c', name: 'Cam', nights: 6 }])
    expect(r.days).toBe(7)
  })

  it('a single missing night makes the average ineligible, not just lower', () => {
    const r = rankRange(members, index, '2026-10-05', '2026-10-11', 'duration', DEFAULT_ELIGIBILITY)
    expect(r.placings.find((p) => p.userId === 'c')).toBeUndefined()
  })

  it('manual nights never count and break the every-night rule', () => {
    const withManual = indexNights([...run('a', '2026-10-05', [480, 480, 480, 480, 480, 480]), night('a', '2026-10-11', { device: 'manual', dur: 700 })])
    const r = rankRange(members, withManual, '2026-10-05', '2026-10-11', 'duration', DEFAULT_ELIGIBILITY)
    expect(r.placings).toEqual([])
    expect(r.unranked.find((u) => u.userId === 'a')!.nights).toBe(7)
  })

  it('restorative needs stage data: phone nights are unranked for it', () => {
    const mixed = indexNights([
      ...run('a', '2026-10-05', [480, 480, 480, 480, 480, 480, 480], { device: 'phone' }),
      ...run('b', '2026-10-05', [480, 480, 480, 480, 480, 480, 480]),
    ])
    const r = rankRange(members, mixed, '2026-10-05', '2026-10-11', 'restorative', DEFAULT_ELIGIBILITY)
    expect(r.placings.map((p) => p.name)).toEqual(['Bo'])
  })

  it('the admin eligibility grid can switch a device class off for one metric only', () => {
    const idx = indexNights([
      ...run('a', '2026-10-05', [520, 520, 520, 520, 520, 520, 520], { device: 'phone', score: 100 }),
      ...run('b', '2026-10-05', [480, 480, 480, 480, 480, 480, 480], { score: 80 }),
    ])
    const noPhoneScore: Eligibility = { ...DEFAULT_ELIGIBILITY, score: { watch: true, phone: false } }
    const duration = rankRange(members, idx, '2026-10-05', '2026-10-11', 'duration', noPhoneScore)
    const score = rankRange(members, idx, '2026-10-05', '2026-10-11', 'score', noPhoneScore)
    expect(duration.placings.map((p) => p.name)).toEqual(['Alex', 'Bo'])
    expect(score.placings.map((p) => p.name)).toEqual(['Bo'])
  })
})

describe('periodPodiums and medals', () => {
  // Two complete weeks: 28 Sep - 4 Oct and 5 - 11 Oct, asOf 12 Oct.
  const nights = [
    ...run('a', '2026-09-28', Array(14).fill(500)),
    ...run('b', '2026-09-28', [...Array(7).fill(480), ...Array(7).fill(520)]),
    ...run('c', '2026-09-28', Array(14).fill(460)),
  ]
  const index = indexNights(nights)

  it('builds one podium per completed period and metric, never the current period', () => {
    const podiums = periodPodiums(members, index, ['week'], ['duration'], '2026-10-11', '2026-09-28', DEFAULT_ELIGIBILITY)
    // 11 Oct is still inside the week of 5 Oct, so only the week of 28 Sep is complete.
    expect(podiums.map((p) => p.start)).toEqual(['2026-09-28'])
    const done = periodPodiums(members, index, ['week'], ['duration'], '2026-10-12', '2026-09-28', DEFAULT_ELIGIBILITY)
    expect(done.map((p) => p.start)).toEqual(['2026-10-05', '2026-09-28'])
    expect(done[0].medals.map((m) => [m.name, m.rank])).toEqual([['Bo', 1], ['Alex', 2], ['Cam', 3]])
  })

  it('tallies medals per kind and metric with the periods behind each count', () => {
    const podiums = periodPodiums(members, index, ['week'], ['duration'], '2026-10-12', '2026-09-28', DEFAULT_ELIGIBILITY)
    const tally = medalTally(podiums)
    const bo = tally.get('b')!.get('week:duration')!
    expect([bo.gold, bo.silver, bo.bronze]).toEqual([1, 1, 0])
    expect(bo.entries.map((e) => e.title)).toEqual(['Week of 5 Oct 2026', 'Week of 28 Sep 2026'])
    // Each kind and metric is its own bucket: nothing leaks into other kinds.
    expect([...tally.get('b')!.keys()]).toEqual(['week:duration'])
    expect(totalCounts(tally, 'b', 'week').gold).toBe(1)
    expect(totalCounts(tally, 'b').entries).toHaveLength(2)
  })

  it('weekly and fortnightly podiums are separate buckets', () => {
    // 21 Sep - 4 Oct is a fortnight (blocks are anchored on 2024-01-01); the same nights also make two weeks.
    const long = indexNights([...run('a', '2026-09-21', Array(14).fill(500)), ...run('b', '2026-09-21', Array(14).fill(470))])
    const podiums = periodPodiums(members, long, ['week', 'fortnight'], ['duration'], '2026-10-05', '2026-09-21', DEFAULT_ELIGIBILITY)
    const keys = [...medalTally(podiums).get('a')!.keys()].sort()
    expect(keys).toEqual(['fortnight:duration', 'week:duration'])
    expect(medalTally(podiums).get('a')!.get('week:duration')!.gold).toBe(2)
    expect(medalTally(podiums).get('a')!.get('fortnight:duration')!.gold).toBe(1)
  })

  it('awards no medals when fewer than two people are ranked', () => {
    const solo = indexNights(run('a', '2026-09-28', Array(7).fill(500)))
    const podiums = periodPodiums(members, solo, ['week'], ['duration'], '2026-10-05', '2026-09-28', DEFAULT_ELIGIBILITY)
    expect(podiums[0].ranking.placings).toHaveLength(1)
    expect(podiums[0].medals).toEqual([])
  })

  it('championships rank over the competition dates and only once finished', () => {
    const comps = [{ id: 'k1', name: 'Spring Cup', starts_on: '2026-09-30', ends_on: '2026-10-02' }]
    const done = championshipPodiums(members, index, comps, ['duration'], '2026-10-03', DEFAULT_ELIGIBILITY)
    expect(done).toHaveLength(1)
    expect(done[0].kind).toBe('championship')
    expect(done[0].title).toBe('Spring Cup')
    expect(done[0].medals.map((m) => m.name)).toEqual(['Alex', 'Bo', 'Cam'])
    expect(championshipPodiums(members, index, comps, ['duration'], '2026-10-02', DEFAULT_ELIGIBILITY)).toEqual([])
  })
})

describe('eligibility settings', () => {
  it('defaults to everything on and survives malformed settings', () => {
    expect(parseEligibility(null)).toEqual(DEFAULT_ELIGIBILITY)
    expect(parseEligibility({ eligibility: 'nope' })).toEqual(DEFAULT_ELIGIBILITY)
    expect(parseEligibility({ eligibility: { score: { phone: 'yes', watch: false } } }).score).toEqual({ watch: false, phone: true })
  })

  it('round-trips through settings without dropping other keys', () => {
    const el: Eligibility = { ...DEFAULT_ELIGIBILITY, score: { watch: true, phone: false } }
    const settings = withEligibility({ other: 1 }, el)
    expect(settings.other).toBe(1)
    expect(parseEligibility(settings)).toEqual(el)
  })
})
