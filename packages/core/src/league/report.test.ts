import { describe, expect, it } from 'vitest'
import { DEFAULT_ELIGIBILITY } from './eligibility.ts'
import { night, run } from './fixtures.ts'
import { classifyNights } from './prepare.ts'
import { buildBase, buildReport, competitionStatus } from './report.ts'
import { totalCounts } from './podiums.ts'

const members = [{ user_id: 'a', name: 'Alex' }, { user_id: 'b', name: 'Bo' }]

describe('buildReport', () => {
  const nights = [...run('a', '2026-09-28', Array(14).fill(480)), ...run('b', '2026-09-28', Array(14).fill(500))]
  const base = buildBase(members, nights, DEFAULT_ELIGIBILITY, '2026-10-12', 'Etc/GMT-10')

  it('finds the earliest night and builds podiums, medals and records together', () => {
    expect(base.earliest).toBe('2026-09-28')
    const report = buildReport(base, [])
    expect(report.podiums.length).toBeGreaterThan(0)
    // 2 complete weeks x 3 metrics (Bo wins duration and restorative; the score is a tie, which shares gold)
    expect(totalCounts(report.tally, 'b', 'week').gold).toBe(6)
    expect(report.records.byUser.get('b')!.held).toContain('night:duration:watch')
  })

  it('adds championship podiums for finished competitions', () => {
    const report = buildReport(base, [{ id: 'k', name: 'Cup', starts_on: '2026-09-28', ends_on: '2026-10-04' }])
    expect(totalCounts(report.tally, 'b', 'championship').gold).toBe(3) // one per metric
    expect(report.podiums.filter((p) => p.kind === 'championship')).toHaveLength(3)
  })

  it('has nothing to report for a group without nights', () => {
    const empty = buildReport(buildBase(members, [], DEFAULT_ELIGIBILITY, '2026-10-12', 'UTC'), [])
    expect(empty.podiums.every((p) => p.medals.length === 0)).toBe(true)
    expect(empty.records.categories.every((c) => c.current === null)).toBe(true)
  })
})

describe('competitionStatus', () => {
  it('is upcoming, active (inclusive of both ends) or finished', () => {
    const c = { starts_on: '2026-10-05', ends_on: '2026-10-11' }
    expect(competitionStatus(c, '2026-10-04')).toBe('upcoming')
    expect(competitionStatus(c, '2026-10-05')).toBe('active')
    expect(competitionStatus(c, '2026-10-11')).toBe('active')
    expect(competitionStatus(c, '2026-10-12')).toBe('finished')
  })
})

describe('classifyNights', () => {
  it('uses the stored class, falling back to the stage-data rule before the migration', () => {
    const raw = [
      { ...night('a', '2026-10-01'), device_class: undefined },
      { ...night('a', '2026-10-02', { device: 'phone' }), device_class: undefined },
      { ...night('a', '2026-10-03', { device: 'manual' }), device_class: undefined },
      { ...night('a', '2026-10-04', { device: 'phone' }), device_class: 'watch' },
    ]
    expect(classifyNights(raw).map((n) => n.device)).toEqual(['watch', 'phone', 'manual', 'watch'])
  })
})
