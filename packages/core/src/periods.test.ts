import { describe, expect, it } from 'vitest'
import { completedPeriods, periodLength, periodOffset, periodRangeAt, periodTitle } from './periods.ts'

describe('periodRangeAt', () => {
  it('weeks run Monday to Sunday', () => {
    // 2026-10-11 is a Sunday: its week started Monday 5 Oct.
    const r = periodRangeAt('week', 0, '2026-10-11')
    expect(r.start).toBe('2026-10-05')
    expect(r.end).toBe('2026-10-11')
    expect(r.isCurrent).toBe(true)
    expect(periodRangeAt('week', 0, '2026-10-12').start).toBe('2026-10-12')
  })

  it('fortnights are 14-day blocks anchored on 2024-01-01', () => {
    const r = periodRangeAt('fortnight', 0, '2024-01-14')
    expect(r.start).toBe('2024-01-01')
    expect(r.end).toBe('2024-01-14')
    expect(periodRangeAt('fortnight', 0, '2024-01-15').start).toBe('2024-01-15')
    expect(periodRangeAt('fortnight', 0, '2023-12-31').start).toBe('2023-12-18')
  })

  it('months handle leap February', () => {
    expect(periodLength(periodRangeAt('month', 0, '2024-02-10'))).toBe(29)
    expect(periodLength(periodRangeAt('month', 0, '2026-02-10'))).toBe(28)
  })

  it('southern hemisphere seasons: summer spans the year change', () => {
    const summer = periodRangeAt('season', 0, '2026-01-20')
    expect(summer.start).toBe('2025-12-01')
    expect(summer.end).toBe('2026-02-28')
    expect(summer.label).toBe('Summer 25/26')
    expect(periodRangeAt('season', 0, '2026-10-11').label).toBe('Spring 2026')
  })

  it('offsets walk backwards across a year boundary', () => {
    expect(periodRangeAt('month', -1, '2026-01-15').label).toBe('Dec 2025')
    expect(periodRangeAt('year', -1, '2026-06-01').label).toBe('2025')
    expect(periodRangeAt('half', 0, '2026-06-30').label).toBe('Jan–Jun 2026')
  })
})

describe('completedPeriods', () => {
  it('excludes the period containing asOf and lists newest first', () => {
    const list = completedPeriods('week', '2026-10-11', '2026-09-01')
    expect(list[0].start).toBe('2026-09-28')
    expect(list.every((p) => p.end < '2026-10-11')).toBe(true)
    expect(list[list.length - 1].end >= '2026-09-01').toBe(true)
  })

  it('a period is complete the day after it ends', () => {
    expect(completedPeriods('week', '2026-10-11', '2026-10-01')[0].start).toBe('2026-09-28')
    expect(completedPeriods('week', '2026-10-12', '2026-10-01')[0].start).toBe('2026-10-05')
  })

  it('is empty when nothing has finished since earliest', () => {
    expect(completedPeriods('month', '2026-10-11', '2026-10-01')).toEqual([])
  })
})

describe('periodOffset and titles', () => {
  it('periodOffset inverts periodRangeAt', () => {
    for (const kind of ['week', 'fortnight', 'month', 'season', 'half', 'year'] as const) {
      const r = periodRangeAt(kind, -3, '2026-10-11')
      expect(periodOffset(kind, r.start, '2026-10-11')).toBe(-3)
    }
    expect(periodOffset('week', '2026-10-06', '2026-10-11')).toBeNull()
    expect(periodOffset('week', '2026-10-12', '2026-10-11')).toBeNull()
  })

  it('titles include the year', () => {
    expect(periodTitle('week', periodRangeAt('week', 0, '2026-10-11'))).toBe('Week of 5 Oct 2026')
    expect(periodTitle('month', periodRangeAt('month', 0, '2026-10-11'))).toBe('Oct 2026')
  })
})
