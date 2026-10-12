// GENERATED from packages/core/src/score/index.ts by scripts/sync-shared.mjs. Do not edit here: change the source and run
//   node scripts/sync-shared.mjs
import { appleScore } from './apple.ts'
import type { ScoreFormula, ScoreNight } from './types.ts'

export * from './types.ts'

/** All scoring formulas. Add new ones here; the first is the default. */
export const FORMULAS: ScoreFormula[] = [appleScore]

export const DEFAULT_GOAL_MIN = 480

export function getFormula(id: string | null | undefined): ScoreFormula {
  return FORMULAS.find((f) => f.id === id) ?? FORMULAS[0]
}

/** Earlier nights the bedtime baseline can look back over (calendar days). */
export const SCORE_HISTORY_DAYS = 14

/** Computes the default formula's score for every night, using each user's own earlier nights as history. */
export function scoreNights<T extends ScoreNight & { user_id: string }>(nights: T[]): (T & { sleep_score: number | null })[] {
  const formula = getFormula(null)
  const byUser = new Map<string, T[]>()
  for (const n of nights) byUser.set(n.user_id, [...(byUser.get(n.user_id) ?? []), n])
  const scores = new Map<T, number | null>()
  for (const mine of byUser.values()) {
    for (const n of mine) {
      scores.set(n, formula.compute(n, mine, { timezone: n.timezone || 'UTC', goalMin: DEFAULT_GOAL_MIN })?.score ?? null)
    }
  }
  return nights.map((n) => ({ ...n, sleep_score: scores.get(n) ?? null }))
}
