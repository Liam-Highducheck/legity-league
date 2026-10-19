import { addDays } from '../dates.ts'
import type { AchievementStatus } from './achievements.ts'
import { plantStatus } from './growth.ts'
import type { GardenNight, GardenStats, PlantRow } from './types.ts'

/** No backlog: only nights from the day the garden was created count, so every garden starts from 0. */
export const CLAIM_GRACE_DAYS = 0

/** Last night's score is today's coins; a perfect 100 also earns a Dream Box. */
export function nightReward(score: number): { coins: number; box: boolean } {
  const s = Math.max(0, Math.min(100, Math.round(score)))
  return { coins: s, box: s >= 100 }
}

export interface NightClaim {
  date: string
  score: number
}

/** Scored nights that haven't been turned into coins yet. Manual entries have no score and earn nothing. */
export function claimableNights(nights: GardenNight[], claimedDates: Set<string>, startedOn: string): NightClaim[] {
  const earliest = achievementWindowStart(startedOn)
  return nights
    .filter((n) => n.sleep_score != null && n.night_date >= earliest && !claimedDates.has(n.night_date))
    .map((n) => ({ date: n.night_date, score: Math.round(n.sleep_score as number) }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** The first night that counts toward goals and coins for a garden started on `startedOn` (the day it was created). */
export const achievementWindowStart = (startedOn: string) => addDays(startedOn, -CLAIM_GRACE_DAYS)

export function claimableAchievements(statuses: AchievementStatus[], claimedIds: Set<string>): string[] {
  return statuses.filter((s) => s.progress.done && !claimedIds.has(s.def.id)).map((s) => s.def.id)
}

/** The numbers garden achievements are measured against. */
export function gardenStats(plants: PlantRow[], nights: GardenNight[], boxesOpened: number): GardenStats {
  const species = new Set(plants.map((p) => p.species))
  for (const p of plants) if (p.evolved_from) species.add(p.evolved_from)
  return {
    plants: plants.length,
    species: species.size,
    evolved: plants.filter((p) => p.evolved_from).length,
    mature: plants.filter((p) => plantStatus(p, nights)?.mature).length,
    boxesOpened,
  }
}
