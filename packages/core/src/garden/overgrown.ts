import { addDays } from '../dates.ts'
import type { GardenNight } from './types.ts'

/** A night at or above this score keeps the garden healthy. */
export const GOOD_SCORE = 60
/** This many bad nights in a row and the plants grow wild. */
export const OVERGROWN_AFTER = 3

export interface Overgrowth {
  overgrown: boolean
  /** Consecutive bad nights ending today (or yesterday while today's night hasn't synced). */
  badRun: number
  /** Bad nights still to go before the garden overgrows (0 once it has). */
  nightsLeft: number
}

/**
 * The garden is overgrown when the last few nights were all bad: a missing night, or one scored under GOOD_SCORE.
 * Today's night is skipped while it's missing (it just hasn't synced yet). A night with no score (manual entry) is
 * neutral: it ends the run. One good night clears it, so recovery is automatic.
 */
export function overgrowth(nights: GardenNight[], today: string): Overgrowth {
  const byDate = new Map(nights.map((n) => [n.night_date, n]))
  let run = 0
  for (let i = 0; i < 60; i++) {
    const d = addDays(today, -i)
    const n = byDate.get(d)
    if (!n) {
      if (i === 0) continue
      run++
      continue
    }
    if (n.sleep_score == null || n.sleep_score >= GOOD_SCORE) break
    run++
  }
  return { overgrown: run >= OVERGROWN_AFTER, badRun: run, nightsLeft: Math.max(0, OVERGROWN_AFTER - run) }
}
