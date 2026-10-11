import { appleScore } from './apple'
import type { ScoreFormula } from './types'

export * from './types'

/** All scoring formulas. Add new ones here; the first is the default. */
export const FORMULAS: ScoreFormula[] = [appleScore]

export const DEFAULT_GOAL_MIN = 480

export function getFormula(id: string | null | undefined): ScoreFormula {
  return FORMULAS.find((f) => f.id === id) ?? FORMULAS[0]
}
