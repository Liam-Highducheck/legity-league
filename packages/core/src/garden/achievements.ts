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

export const ACHIEVEMENTS: AchievementDef[] = [
  // logging
  { id: 'first-night', name: 'First night', goal: nights(anyNight, 1), reward: r(50, 0, 'tulip') },
  { id: 'week-logged', name: 'A week of sleep', goal: nights(anyNight, 7), reward: r(100, 1) },
  { id: 'month-logged', name: 'A month of sleep', goal: nights(anyNight, 30), reward: r(300, 1, 'succulent') },
  { id: 'hundred-logged', name: 'One hundred nights', goal: nights(anyNight, 100), reward: r(800, 2) },
  { id: 'year-logged', name: 'A year of sleep', goal: nights(anyNight, 365), reward: r(2500, 3, 'willow') },
  // full nights
  { id: 'eight-streak-3', name: 'Three full nights', goal: streak(dur(8), 3), reward: r(150, 0, 'chamomile') },
  { id: 'eight-streak-7', name: 'A full week', goal: streak(dur(8), 7), reward: r(400, 1, 'lavender') },
  { id: 'eight-streak-14', name: 'Fortnight of rest', goal: streak(dur(8), 14), reward: r(900, 2, 'willow') },
  { id: 'sleep-100h', name: '100 hours asleep', goal: total('duration', 100), reward: r(300, 0, 'bonsai') },
  { id: 'sleep-500h', name: '500 hours asleep', goal: total('duration', 500), reward: r(800, 2) },
  { id: 'sleep-1000h', name: '1,000 hours asleep', goal: total('duration', 1000), reward: r(1500, 2, 'starblossom') },
  // restorative, deep, REM
  { id: 'restorative-25h', name: '25 hours restorative', goal: total('restorative', 25), reward: r(200, 0, 'drowsycap') },
  { id: 'restorative-100h', name: '100 hours restorative', goal: total('restorative', 100), reward: r(500, 1, 'moonlily') },
  { id: 'restorative-250h', name: '250 hours restorative', goal: total('restorative', 250), reward: r(1200, 2, 'dreamcatcher') },
  { id: 'deep-25h', name: '25 hours deep sleep', goal: total('deep', 25), reward: r(250, 0, 'fern') },
  { id: 'deep-100h', name: '100 hours deep sleep', goal: total('deep', 100), reward: r(700, 1) },
  { id: 'rem-25h', name: '25 hours of REM', goal: total('rem', 25), reward: r(250, 0, 'lavender') },
  { id: 'rem-100h', name: '100 hours of REM', goal: total('rem', 100), reward: r(700, 2) },
  // scores
  { id: 'score-80', name: 'A great night', goal: nights(score(80), 1), reward: r(100) },
  { id: 'score-90-x10', name: 'Ten excellent nights', goal: nights(score(90), 10), reward: r(300, 1) },
  { id: 'score-100', name: 'Perfect night', goal: nights(score(100), 1), reward: r(500, 0, 'starblossom') },
  { id: 'score-80-streak-5', name: 'Five great nights running', goal: streak(score(80), 5), reward: r(400, 0, 'bonsai') },
  { id: 'score-85-streak-10', name: 'Ten great nights running', goal: streak(score(85), 10), reward: r(1000, 3) },
  // habits
  { id: 'early-bird-5', name: 'Early bird', goal: nights(bedtime(630), 5), reward: r(200, 0, 'chamomile') },
  { id: 'early-bird-streak-7', name: 'Early bird week', goal: streak(bedtime(630), 7), reward: r(600, 2) },
  { id: 'calm-5', name: 'Undisturbed', goal: nights(wakes(0), 5), reward: r(250, 0, 'succulent') },
  { id: 'calm-streak-3', name: 'Three calm nights', goal: streak(wakes(0), 3), reward: r(300, 1) },
  // garden
  { id: 'first-plant', name: 'Green thumb', goal: stat('plants', 1), reward: r(50) },
  { id: 'plant-5', name: 'Small garden', goal: stat('plants', 5), reward: r(150) },
  { id: 'garden-full', name: 'Full garden', goal: stat('plants', 25), reward: r(1000, 3) },
  { id: 'bloom-3', name: 'In full bloom', goal: stat('mature', 3), reward: r(300, 1) },
  { id: 'collector-5', name: 'Collector', goal: stat('species', 5), reward: r(300, 1) },
  { id: 'collector-10', name: 'Botanist', goal: stat('species', 10), reward: r(1000, 3) },
  { id: 'first-evolution', name: 'Metamorphosis', goal: stat('evolved', 1), reward: r(300, 1) },
  { id: 'open-5-boxes', name: 'Box opener', goal: stat('boxesOpened', 5), reward: r(200) },
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
