// How long things take. The garden is balanced on one question: "how many days does a committed sleeper need to get this?"
// Every plant's routes (shop, box, goal, evolution) are timed with the model below, and tests keep each rarity inside its
// band, so a rare plant can't be bought in two weeks while another takes a year.
import type { Cond, Goal, GoalMetric, Rarity, TotalMetric } from './types.ts'

/** P(night meets it) for points on a curve, interpolated linearly. Sorted by x. */
type Curve = [number, number][]

// THE PLAYER THIS GAME IS BALANCED FOR. Not the average sleeper: someone who has decided to prioritise sleep. That is very
// achievable: 8 hours is half the score and a steady bedtime another 30 points, and only the interruptions are not fully in
// your control (and they cost little), so a score of 95-100 every night is a realistic aim. Plants are timed for that player.
// Goals that demand consistency (long streaks, a high score night after night) are deliberately hard for anyone else, which is
// what makes them worth showing off. The days below are how long this player needs; others take longer or may never get there.

/** Coins this player earns per day (their average sleep score). */
export const COINS_PER_DAY = 90

/** What a typical night looks like for this player, in minutes: used to turn totals ("40 h of sleep") into days. */
export const TYPICAL_NIGHT: Record<TotalMetric, number> = { duration: 485, restorative: 185, deep: 78, rem: 108 }

/** The days a route may take, by rarity. These are the contract: tests fail if a plant's route lands outside its band. */
export const RARITY_BANDS: Record<Rarity, [number, number]> = {
  common: [0, 8],
  uncommon: [8, 40],
  rare: [40, 110],
  // an evolved epic (the sakura bonsai) can take as little as ~2 months: a long-ish goal on top of a plant that was itself earned
  epic: [60, 270],
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


// Chance that one of this player's nights is AT LEAST x (for ">=" goals) ...
const AT_LEAST: Partial<Record<GoalMetric, Curve>> = {
  duration: [[360, 0.99], [420, 0.97], [450, 0.94], [480, 0.86], [510, 0.55], [540, 0.25], [570, 0.08], [600, 0.02]],
  score: [[60, 0.995], [70, 0.985], [75, 0.97], [80, 0.95], [85, 0.9], [90, 0.8], [95, 0.55], [98, 0.3], [100, 0.14]],
  restorative: [[120, 0.95], [150, 0.87], [180, 0.68], [210, 0.42], [240, 0.2], [270, 0.07], [300, 0.02]],
  deep: [[45, 0.92], [60, 0.82], [75, 0.62], [90, 0.4], [105, 0.2], [120, 0.1], [150, 0.02]],
  rem: [[60, 0.93], [90, 0.75], [105, 0.55], [120, 0.35], [150, 0.1], [180, 0.02]],
}
// ... or AT MOST x (for "<=" goals).
const AT_MOST: Partial<Record<GoalMetric, Curve>> = {
  awake: [[10, 0.4], [20, 0.65], [30, 0.8], [45, 0.9], [60, 0.95]],
  wakes: [[0, 0.35], [1, 0.62], [2, 0.82], [3, 0.93], [4, 0.97]],
  // minutes after noon sleep begins: 600 = 10pm, 630 = 10:30pm, 660 = 11pm, 720 = midnight
  bedtime: [[570, 0.2], [600, 0.45], [630, 0.7], [660, 0.88], [690, 0.95], [720, 0.98]],
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

/** Chance one of this player's nights meets the condition. */
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

/** Expected days (one night a day) for this player to complete a goal. */
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
