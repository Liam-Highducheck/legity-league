import { describe, expect, it } from 'vitest'
import { scoreNights } from './index.ts'

const base = { sleep_end: null, deep_min: 60, rem_min: 80, awake_min: 5, wake_count: 1, timezone: 'Australia/Sydney' }

function night(user: string, date: string, startIso: string, duration: number, extra: object = {}) {
  return { user_id: user, night_date: date, sleep_start: startIso, duration_min: duration, ...base, ...extra }
}

const FIXTURE = [
  night('u1', '2026-10-01', '2026-09-30T22:45:00+10:00', 470),
  night('u1', '2026-10-02', '2026-10-01T23:05:00+10:00', 430),
  night('u1', '2026-10-03', '2026-10-02T23:40:00+10:00', 390, { awake_min: 25, wake_count: 4 }),
  night('u1', '2026-10-04', '2026-10-03T22:30:00+10:00', 500),
  night('u1', '2026-10-05', '2026-10-04T23:50:00+11:00', 455),
  night('u1', '2026-10-06', '2026-10-05T22:55:00+11:00', 480, { sleep_start: null }),
  night('u2', '2026-10-05', '2026-10-04T21:30:00+11:00', 520, { awake_min: null, wake_count: null }),
  night('u2', '2026-10-06', '2026-10-05T21:35:00+11:00', 515),
]

describe('scoreNights', () => {
  it('scores each user from their own history', () => {
    expect(scoreNights(FIXTURE).map((n) => [n.user_id, n.night_date, n.sleep_score])).toMatchInlineSnapshot(`
      [
        [
          "u1",
          "2026-10-01",
          99,
        ],
        [
          "u1",
          "2026-10-02",
          95,
        ],
        [
          "u1",
          "2026-10-03",
          81,
        ],
        [
          "u1",
          "2026-10-04",
          100,
        ],
        [
          "u1",
          "2026-10-05",
          90,
        ],
        [
          "u1",
          "2026-10-06",
          null,
        ],
        [
          "u2",
          "2026-10-05",
          null,
        ],
        [
          "u2",
          "2026-10-06",
          100,
        ],
      ]
    `)
  })

  it('returns null when the inputs are missing', () => {
    const scored = scoreNights(FIXTURE)
    expect(scored.find((n) => n.user_id === 'u1' && n.night_date === '2026-10-06')!.sleep_score).toBeNull()
    expect(scored.find((n) => n.user_id === 'u2' && n.night_date === '2026-10-05')!.sleep_score).toBeNull()
  })
})
