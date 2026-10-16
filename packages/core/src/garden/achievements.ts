import { goalProgress } from './goals.ts'
import type { AchievementDef, Cond, GardenNight, GardenStats, Goal, Progress, Reward } from './types.ts'

const nights = (cond: Cond, count: number): Goal => ({ kind: 'nights', cond, count })
const streak = (cond: Cond, count: number): Goal => ({ kind: 'streak', cond, count })
const total = (metric: 'duration' | 'restorative' | 'deep' | 'rem', hours: number): Goal => ({ kind: 'total', metric, minutes: hours * 60 })
const dur = (hours: number): Cond => ({ metric: 'duration', op: '>=', value: hours * 60 })
const score = (v: number): Cond => ({ metric: 'score', op: '>=', value: v })
const anyNight: Cond = { metric: 'duration', op: '>=', value: 1 }
const bedtime = (afterNoonMin: number): Cond => ({ metric: 'bedtime', op: '<=', value: afterNoonMin })
const wakes = (n: number): Cond => ({ metric: 'wakes', op: '<=', value: n })
const stat = (s: keyof GardenStats, target: number): AchievementDef['goal'] => ({ kind: 'stat', stat: s, target })
const r = (coins: number, boxes = 0, seed?: string): Reward => ({ coins, boxes, ...(seed ? { seed } : {}) })

/**
 * Goals. Sleep goals count nights from the garden's start. Rewards are coins and Dream Boxes, plus the seed of a plant
 * that can ONLY be earned this way (willow, crystalrose, aurora, celestial). `pace.ts` times each goal for a typical
 * sleeper, and the tests keep the plant-awarding ones inside their rarity's band.
 */
export const ACHIEVEMENTS: AchievementDef[] = [
  // logging: one night a day, so these are as many days
  { id: 'first-night', name: 'First night', goal: nights(anyNight, 1), reward: r(50) },
  { id: 'week-logged', name: 'A week of sleep', goal: nights(anyNight, 7), reward: r(100, 1) },
  { id: 'month-logged', name: 'A month of sleep', goal: nights(anyNight, 30), reward: r(300, 1) },
  { id: 'hundred-logged', name: 'One hundred nights', goal: nights(anyNight, 100), reward: r(800, 2) },
  { id: 'year-logged', name: 'A year of sleep', goal: nights(anyNight, 365), reward: r(2500, 3, 'aurora') },
  // full nights (8h+)
  { id: 'full-5', name: 'Five full nights', goal: nights(dur(8), 5), reward: r(150) },
  { id: 'eight-streak-3', name: 'Three full nights running', goal: streak(dur(8), 3), reward: r(300) },
  { id: 'full-20', name: 'Twenty full nights', goal: nights(dur(8), 20), reward: r(500, 1) },
  { id: 'eight-streak-5', name: 'Five full nights running', goal: streak(dur(8), 5), reward: r(1000, 2) },
  { id: 'full-60', name: 'Sixty full nights', goal: nights(dur(8), 60), reward: r(1500, 2, 'willow') },
  // totals
  { id: 'sleep-100h', name: '100 hours asleep', goal: total('duration', 100), reward: r(300) },
  { id: 'sleep-500h', name: '500 hours asleep', goal: total('duration', 500), reward: r(800, 1) },
  { id: 'sleep-1000h', name: '1,000 hours asleep', goal: total('duration', 1000), reward: r(1500, 2) },
  { id: 'sleep-2500h', name: '2,500 hours asleep', goal: total('duration', 2500), reward: r(5000, 3, 'celestial') },
  // restorative, deep, REM
  { id: 'restorative-25h', name: '25 hours restorative', goal: total('restorative', 25), reward: r(200) },
  { id: 'restorative-100h', name: '100 hours restorative', goal: total('restorative', 100), reward: r(600, 1) },
  { id: 'restorative-250h', name: '250 hours restorative', goal: total('restorative', 250), reward: r(1500, 2) },
  { id: 'restorative-350h', name: '350 hours restorative', goal: total('restorative', 350), reward: r(1500, 1, 'crystalrose') },
  { id: 'deep-25h', name: '25 hours deep sleep', goal: total('deep', 25), reward: r(250) },
  { id: 'deep-100h', name: '100 hours deep sleep', goal: total('deep', 100), reward: r(900, 1) },
  { id: 'rem-25h', name: '25 hours of REM', goal: total('rem', 25), reward: r(250) },
  { id: 'rem-100h', name: '100 hours of REM', goal: total('rem', 100), reward: r(800, 2) },
  // scores
  { id: 'score-80', name: 'A great night', goal: nights(score(80), 1), reward: r(100) },
  { id: 'score-90-x10', name: 'Ten excellent nights', goal: nights(score(90), 10), reward: r(600, 1) },
  { id: 'score-80-streak-5', name: 'Five great nights running', goal: streak(score(80), 5), reward: r(600, 1) },
  { id: 'score-75-streak-7', name: 'A week of good nights', goal: streak(score(75), 7), reward: r(900, 2) },
  { id: 'score-100', name: 'Perfect night', goal: nights(score(100), 1), reward: r(800, 2) },
  // habits
  { id: 'early-bird-5', name: 'Early bird', goal: nights(bedtime(630), 5), reward: r(200) },
  { id: 'early-bird-streak-3', name: 'Early bird, three in a row', goal: streak(bedtime(630), 3), reward: r(500, 1) },
  { id: 'calm-5', name: 'Undisturbed', goal: nights(wakes(0), 5), reward: r(250) },
  { id: 'calm-streak-3', name: 'Three calm nights running', goal: streak(wakes(0), 3), reward: r(900, 2) },
  // garden
  { id: 'first-plant', name: 'Green thumb', goal: stat('plants', 1), reward: r(50) },
  { id: 'plant-5', name: 'Small garden', goal: stat('plants', 5), reward: r(150) },
  { id: 'bloom-3', name: 'In full bloom', goal: stat('mature', 3), reward: r(300, 1) },
  { id: 'first-evolution', name: 'Metamorphosis', goal: stat('evolved', 1), reward: r(300, 1) },
  { id: 'collector-5', name: 'Collector', goal: stat('species', 5), reward: r(300, 1) },
  { id: 'open-5-boxes', name: 'Box opener', goal: stat('boxesOpened', 5), reward: r(200) },
  { id: 'collector-10', name: 'Botanist', goal: stat('species', 10), reward: r(1000, 2) },
  { id: 'evolve-5', name: 'Five evolutions', goal: stat('evolved', 5), reward: r(1500, 2) },
  { id: 'open-25-boxes', name: 'Box enthusiast', goal: stat('boxesOpened', 25), reward: r(800, 1) },
  { id: 'garden-full', name: 'Full garden', goal: stat('plants', 25), reward: r(1000, 3) },
  { id: 'collector-20', name: 'Curator', goal: stat('species', 20), reward: r(2500, 3) },
]

export interface AchievementStatus {
  def: AchievementDef
  progress: Progress
}

/**
 * Progress for every achievement. Sleep goals count nights from `since` on (the garden's start, see
 * `achievementWindowStart`), garden goals look at the garden. Counting a veteran's whole history would pay out
 * thousands of coins and a dozen boxes on day one.
 */
export function achievementStatuses(nights: GardenNight[], stats: GardenStats, since?: string): AchievementStatus[] {
  const counted = since ? nights.filter((n) => n.night_date >= since) : nights
  return ACHIEVEMENTS.map((def) => {
    if (def.goal.kind === 'stat') {
      const v = stats[def.goal.stat]
      const target = def.goal.target
      return { def, progress: { value: Math.min(v, target), target, done: v >= target, doneOn: null } }
    }
    return { def, progress: goalProgress(def.goal, counted) }
  })
}
