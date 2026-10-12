import { describe, expect, it } from 'vitest'
import { dailyWinners, heat } from './heat'

describe('heat', () => {
  it('scales each metric between fixed bounds and clamps', () => {
    expect(heat('duration', 300)).toBe(0)
    expect(heat('duration', 405)).toBeCloseTo(0.5)
    expect(heat('duration', 600)).toBe(1)
    expect(heat('score', 80)).toBeCloseTo(0.5)
    expect(heat('restorative', 10)).toBe(0)
  })
})

describe('dailyWinners', () => {
  const m = (e: [string, number][]) => new Map(e)
  it('picks the best person each day, shares ties, ignores days with only one night', () => {
    const w = dailyWinners(
      new Map([
        ['a', m([['2026-10-05', 480], ['2026-10-06', 450], ['2026-10-07', 500]])],
        ['b', m([['2026-10-05', 470], ['2026-10-06', 450]])],
      ]),
    )
    expect([...w.get('2026-10-05')!]).toEqual(['a'])
    expect([...w.get('2026-10-06')!].sort()).toEqual(['a', 'b'])
    expect(w.has('2026-10-07')).toBe(false)
  })
})
