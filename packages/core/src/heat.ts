import type { Metric } from './stats'

/** The value range each metric's heat colour spans: at or below the low end is faintest, at or above the high end is strongest. */
const HEAT_RANGE: Record<Metric, [low: number, high: number]> = {
  duration: [300, 510], // 5h to 8h30
  restorative: [60, 240], // 1h to 4h
  score: [60, 100],
}

/** 0 (a poor night) to 1 (a great one), on a fixed scale so colours mean the same thing on every row and every week. */
export function heat(metric: Metric, value: number): number {
  const [low, high] = HEAT_RANGE[metric]
  return Math.min(1, Math.max(0, (value - low) / (high - low)))
}

/** The best value on each date across people, only for dates where at least two people have a night (a lone night wins nothing). */
export function dailyWinners(valuesByUser: Map<string, Map<string, number>>): Map<string, Set<string>> {
  const perDate = new Map<string, { best: number; users: string[]; count: number }>()
  for (const [user, byDate] of valuesByUser) {
    for (const [date, v] of byDate) {
      const e = perDate.get(date)
      if (!e) perDate.set(date, { best: v, users: [user], count: 1 })
      else {
        e.count++
        if (v > e.best) {
          e.best = v
          e.users = [user]
        } else if (v === e.best) e.users.push(user)
      }
    }
  }
  const out = new Map<string, Set<string>>()
  for (const [date, e] of perDate) if (e.count >= 2) out.set(date, new Set(e.users))
  return out
}
