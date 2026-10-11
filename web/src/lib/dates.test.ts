import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, eachDay, formatDayPlain, zonedNow } from './dates.ts'

describe('dates', () => {
  it('counts days between dates across month and leap boundaries', () => {
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2)
    expect(daysBetween('2026-10-12', '2026-10-05')).toBe(-7)
  })

  it('lists each day inclusively', () => {
    expect(eachDay('2026-10-05', '2026-10-11')).toHaveLength(7)
    expect(eachDay('2024-02-01', '2024-02-29')).toHaveLength(29)
    expect(eachDay('2026-10-05', '2026-10-05')).toEqual(['2026-10-05'])
  })

  it('addDays is not shifted by DST', () => {
    expect(addDays('2026-10-03', 2)).toBe('2026-10-05')
    expect(addDays('2026-04-04', 2)).toBe('2026-04-06')
  })

  it('formats days without any locale data', () => {
    expect(formatDayPlain('2026-10-24')).toBe('Sat 24 Oct')
    expect(formatDayPlain('2026-01-01')).toBe('Thu 1 Jan')
  })

  it('reads the date and hour in the target zone, not the machine zone', () => {
    // 2026-10-04 22:30 UTC is 09:30 on the 5th in Sydney (DST started that morning).
    expect(zonedNow('Australia/Sydney', new Date('2026-10-04T22:30:00Z'))).toEqual({ date: '2026-10-05', hour: 9 })
    // The hour before the clocks changed: 14:30 UTC = 01:30 AEST on the 4th.
    expect(zonedNow('Australia/Sydney', new Date('2026-10-03T15:30:00Z'))).toEqual({ date: '2026-10-04', hour: 1 })
    expect(zonedNow('America/Los_Angeles', new Date('2026-10-05T03:00:00Z'))).toEqual({ date: '2026-10-04', hour: 20 })
  })
})
