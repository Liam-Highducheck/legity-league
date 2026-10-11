/** The subset of a night every scoring formula can rely on. */
export interface ScoreNight {
  night_date: string
  sleep_start: string | null
  sleep_end: string | null
  duration_min: number
  awake_min: number | null
  wake_count: number | null
  deep_min: number | null
  rem_min: number | null
}

export interface ScoreContext {
  timezone: string
  /** Nightly sleep goal in minutes. */
  goalMin: number
}

export interface ScorePart {
  key: string
  label: string
  points: number
  max: number
  /** One line on why this part lost points. */
  note: string
}

export interface ScoreResult {
  score: number
  band: string
  parts: ScorePart[]
  /** Caveats, e.g. not enough history for the bedtime baseline. */
  caveats: string[]
}

export interface ScoreFormula {
  id: string
  name: string
  description: string
  /** `history` = the user's earlier nights (any order). Returns null when the inputs needed are missing. */
  compute(night: ScoreNight, history: ScoreNight[], ctx: ScoreContext): ScoreResult | null
}
