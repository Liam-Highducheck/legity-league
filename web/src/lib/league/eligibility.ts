import type { Metric } from '../stats.ts'
import { divisionOf } from './device.ts'
import type { Division, LeagueNight } from './types.ts'

/** Which device divisions may be ranked for each podium metric. Admin-configurable per group. */
export type Eligibility = Record<Metric, Record<Division, boolean>>

export const DEFAULT_ELIGIBILITY: Eligibility = {
  duration: { watch: true, phone: true },
  restorative: { watch: true, phone: true },
  score: { watch: true, phone: true },
}

const METRICS: Metric[] = ['duration', 'restorative', 'score']
const DIVISIONS: Division[] = ['watch', 'phone']

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Reads `groups.settings.eligibility`; anything missing or malformed stays on (the default). */
export function parseEligibility(settings: unknown): Eligibility {
  const out: Eligibility = {
    duration: { ...DEFAULT_ELIGIBILITY.duration },
    restorative: { ...DEFAULT_ELIGIBILITY.restorative },
    score: { ...DEFAULT_ELIGIBILITY.score },
  }
  const raw = isRecord(settings) && isRecord(settings.eligibility) ? settings.eligibility : null
  if (!raw) return out
  for (const m of METRICS) {
    const row = raw[m]
    if (!isRecord(row)) continue
    for (const d of DIVISIONS) if (typeof row[d] === 'boolean') out[m][d] = row[d]
  }
  return out
}

/** Writes eligibility back into a settings object, keeping every other key. */
export function withEligibility(settings: unknown, eligibility: Eligibility): Record<string, unknown> {
  return { ...(isRecord(settings) ? settings : {}), eligibility }
}

/** The night's value for a podium metric. */
export function nightValue(n: LeagueNight, metric: Metric): number | null {
  if (metric === 'duration') return n.duration_min
  if (metric === 'restorative') return n.restorative_min
  return n.sleep_score
}

/** Can this night count toward a ranking on `metric`? (counted device, allowed by the group, and has the value) */
export function eligibleFor(n: LeagueNight, metric: Metric, eligibility: Eligibility): boolean {
  const division = divisionOf(n.device)
  if (!division || !eligibility[metric][division]) return false
  return nightValue(n, metric) != null
}
