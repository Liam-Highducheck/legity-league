import { describe, expect, it } from 'vitest'
import { mostBox, stdDev, type StatsNight } from './stats.ts'
import { formatSpread } from './format.ts'

const members = [
  { user_id: 'a', name: 'Alex' },
  { user_id: 'b', name: 'Bo' },
  { user_id: 'c', name: 'Cam' },
]

function n(user: string, date: string, dur: number, score: number | null = null): StatsNight {
  return { user_id: user, night_date: date, duration_min: dur, restorative_min: null, sleep_score: score }
}

describe('stdDev', () => {
  it('is the population standard deviation', () => {
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2)
    expect(stdDev([480, 480, 480])).toBe(0)
    expect(stdDev([480])).toBe(0)
    expect(stdDev([])).toBe(0)
  })
})

describe('mostBox', () => {
  const nights = [
    n('a', '2026-10-05', 300), n('a', '2026-10-06', 540), n('a', '2026-10-07', 420), n('a', '2026-10-08', 480),
    n('b', '2026-10-05', 450), n('b', '2026-10-06', 460), n('b', '2026-10-07', 455),
    n('c', '2026-10-05', 100), n('c', '2026-10-06', 600), // only two nights: left out
    n('a', '2026-10-20', 1), // outside the period
  ]

  it('ranks by spread, most first, and ignores members with too few nights', () => {
    const rows = mostBox(members, nights, 'duration', '2026-10-05', '2026-10-11')
    expect(rows.map((r) => r.name)).toEqual(['Alex', 'Bo'])
    expect(rows[0].value).toBeCloseTo(stdDev([300, 540, 420, 480]))
  })

  it('uses the chosen metric and skips nights without it', () => {
    const scored = [n('a', '2026-10-05', 480, 90), n('a', '2026-10-06', 480, 70), n('a', '2026-10-07', 480, 50), n('a', '2026-10-08', 480, null)]
    const rows = mostBox(members, scored, 'score', '2026-10-05', '2026-10-11')
    expect(rows).toHaveLength(1)
    expect(rows[0].value).toBeCloseTo(stdDev([90, 70, 50]))
    expect(mostBox(members, scored, 'restorative', '2026-10-05', '2026-10-11')).toEqual([])
  })

  it('breaks ties by name', () => {
    const tied = [
      n('b', '2026-10-05', 400), n('b', '2026-10-06', 500), n('b', '2026-10-07', 450),
      n('a', '2026-10-05', 400), n('a', '2026-10-06', 500), n('a', '2026-10-07', 450),
    ]
    expect(mostBox(members, tied, 'duration', '2026-10-05', '2026-10-11').map((r) => r.name)).toEqual(['Alex', 'Bo'])
  })
})

describe('formatSpread', () => {
  it('formats minutes and scores', () => {
    expect(formatSpread('duration', 42.4)).toBe('42m')
    expect(formatSpread('duration', 72)).toBe('1h 12m')
    expect(formatSpread('score', 4.234)).toBe('4.2')
  })
})
