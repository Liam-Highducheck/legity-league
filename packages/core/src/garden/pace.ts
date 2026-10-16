// How long things take. The garden is balanced on one question: "how many days does a typical player need to get this?"
// Every plant's routes (shop, box, goal, evolution) are timed with the model below, and tests keep each rarity inside its
// band, so a rare plant can't be bought in two weeks while another takes a year.
import type { Cond, Goal, GoalMetric, Rarity, TotalMetric } from './types.ts'

/** Coins a typical player earns per day (their average sleep score). */
export const COINS_PER_DAY = 78

/** What a typical night looks like, in minutes: used to turn totals ("40 h of sleep") into days. */
export const TYPICAL_NIGHT: Record<TotalMetric, number> = { duration: 445, restorative: 160, deep: 62, rem: 98 }

/** The days a route may take, by rarity. These are the contract: tests fail if a plant's route lands outside its band. */
export const RARITY_BANDS: Record<Rarity, [number, number]> = {
  common: [0, 8],
  uncommon: [8, 40],
  rare: [40, 110],
  epic: [110, 270],
  legendary: [270, 1200],
}

/** Days a growth goal alone may take, by rarity (so a common seed doesn't need a month of sleep to sprout). */
export const GROWTH_BANDS: Record<Rarity, [number, number]> = {
  common: [1, 8],
  uncommon: [4, 18],
  rare: [8, 40],
  epic: [18, 75],
  legendary: [30, 150],
}

/** P(night meets it) for points on a curve, interpolated linearly. Sorted by x. */
type Curve = [number, number][]

// Chance that a typical night is AT LEAST x (for ">=" goals) ...
const AT_LEAST: Partial<Record<GoalMetric, Curve>> = {
  duration: [[300, 0.99], [360, 0.92], [420, 0.74], [450, 0.6], [480, 0.4], [510, 0.22], [540, 0.1], [600, 0.02]],
  score: [[40, 0.99], [60, 0.9], [70, 0.75], [75, 0.62], [80, 0.48], [85, 0.3], [90, 0.13], [95, 0.04], [100, 0.008]],
  restorative: [[90, 0.9], [120, 0.78], [150, 0.6], [180, 0.42], [210, 0.22], [240, 0.1], [300, 0.01]],
  deep: [[30, 0.92], [45, 0.8], [60, 0.6], [75, 0.4], [90, 0.22], [120, 0.06], [150, 0.01]],
  rem: [[45, 0.9], [60, 0.8], [90, 0.5], [120, 0.2], [150, 0.05]],
}
// ... or AT MOST x (for "<=" goals).
const AT_MOST: Partial<Record<GoalMetric, Curve>> = {
  awake: [[5, 0.15], [10, 0.3], [20, 0.5], [30, 0.62], [45, 0.78], [60, 0.88], [90, 0.97]],
  wakes: [[0, 0.2], [1, 0.4], [2, 0.6], [3, 0.78], [4, 0.9]],
  // minutes after noon sleep begins: 600 = 10pm, 660 = 11pm, 720 = midnight
  bedtime: [[570, 0.08], [600, 0.15], [630, 0.3], [660, 0.5], [690, 0.7], [720, 0.85], [780, 0.97]],
}

function interpolate(curve: Curve, x: number): number {
  if (x <= curve[0][0]) return curve[0][1]
  for (let i = 1; i < curve.length; i++) {
    const [x1, y1] = curve[i]
    const [x0, y0] = curve[i - 1]
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
  }
  return curve[curve.length - 1][1]
}

/** Chance a typical night meets the condition. */
export function passRate(c: Cond): number {
  const curve = c.op === '>=' ? AT_LEAST[c.metric] : AT_MOST[c.metric]
  if (!curve) throw new Error(`No pass rate for ${c.metric} ${c.op}`)
  return Math.max(0.001, interpolate(curve, c.value))
}

/** Expected nights until `n` consecutive successes at chance p (the classic run-length formula). */
export function streakNights(p: number, n: number): number {
  if (p >= 1) return n
  const pn = Math.pow(p, n)
  return (1 - pn) / ((1 - p) * pn)
}

/** Expected days (one night a day) for a typical player to complete a goal. */
export function goalDays(g: Goal): number {
  if (g.kind === 'total') return g.minutes / TYPICAL_NIGHT[g.metric]
  const p = passRate(g.cond)
  return g.kind === 'nights' ? g.count / p : streakNights(p, g.count)
}

/** Days to earn `coins`. */
export const coinDays = (coins: number) => coins / COINS_PER_DAY

export const inBand = (days: number, r: Rarity, slack = 0.12) => {
  const [lo, hi] = RARITY_BANDS[r]
  return days >= lo * (1 - slack) && days <= hi * (1 + slack)
}
