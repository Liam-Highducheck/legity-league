// GENERATED from web/src/lib/stats.ts by scripts/sync-shared.mjs. Do not edit here: change the source and run
//   node scripts/sync-shared.mjs
import { dayNumFromISO } from './dates.ts'

/** The fields the league stats read. A SleepNight satisfies this, and so does a night inside the Edge Function. */
export interface StatsNight {
  user_id: string
  night_date: string
  duration_min: number
  restorative_min: number | null
  sleep_score: number | null
}

export type Metric = 'duration' | 'restorative' | 'score'

export const METRIC_LABELS: Record<Metric, string> = {
  duration: 'Duration',
  restorative: 'Restorative',
  score: 'Score',
}

export function metricValue(n: StatsNight, metric: Metric): number | null {
  if (metric === 'duration') return n.duration_min
  if (metric === 'restorative') return n.restorative_min
  return n.sleep_score
}

export interface LeaderRow {
  user_id: string
  name: string
  avg: number | null
  nights: number
}

export function leaderboard(
  members: { user_id: string; name: string }[],
  nights: StatsNight[],
  metric: Metric,
  start: string,
  end: string,
): LeaderRow[] {
  const rows = members.map((m) => {
    const vals = nights
      .filter((n) => n.user_id === m.user_id && n.night_date >= start && n.night_date <= end)
      .map((n) => metricValue(n, metric))
      .filter((v): v is number => v != null)
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    return { user_id: m.user_id, name: m.name, avg, nights: vals.length }
  })
  return rows.sort((a, b) => {
    if (a.avg == null && b.avg == null) return a.name.localeCompare(b.name)
    if (a.avg == null) return 1
    if (b.avg == null) return -1
    return b.avg - a.avg
  })
}

export const LONG_SLEEP_MIN = 480

export interface CountRow {
  user_id: string
  name: string
  value: number
}

export function nightsAtLeast(
  members: { user_id: string; name: string }[],
  nights: StatsNight[],
  minMinutes: number,
  start: string,
  end: string,
): CountRow[] {
  return members
    .map((m) => ({
      user_id: m.user_id,
      name: m.name,
      value: nights.filter(
        (n) => n.user_id === m.user_id && n.night_date >= start && n.night_date <= end && n.duration_min >= minMinutes,
      ).length,
    }))
    .sort((a, b) => b.value - a.value)
}

export function longestStreak(
  members: { user_id: string; name: string }[],
  nights: StatsNight[],
  minMinutes: number,
  start: string,
  end: string,
): CountRow[] {
  return members
    .map((m) => {
      const days = nights
        .filter((n) => n.user_id === m.user_id && n.night_date >= start && n.night_date <= end && n.duration_min >= minMinutes)
        .map((n) => dayNumFromISO(n.night_date))
        .sort((a, b) => a - b)
      let best = 0
      let run = 0
      let prev = -Infinity
      for (const d of days) {
        run = d === prev + 1 ? run + 1 : 1
        best = Math.max(best, run)
        prev = d
      }
      return { user_id: m.user_id, name: m.name, value: best }
    })
    .sort((a, b) => b.value - a.value)
}

/** Population standard deviation (0 for fewer than two values). */
export function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length)
}

/**
 * "BOX": how much a member's nights varied (standard deviation of the metric over the period), most first.
 * The more variance the more BOX. Members with fewer than `minNights` nights are left out.
 */
export function mostBox(
  members: { user_id: string; name: string }[],
  nights: StatsNight[],
  metric: Metric,
  start: string,
  end: string,
  minNights = 3,
): CountRow[] {
  const rows: CountRow[] = []
  for (const m of members) {
    const vals = nights
      .filter((n) => n.user_id === m.user_id && n.night_date >= start && n.night_date <= end)
      .map((n) => metricValue(n, metric))
      .filter((v): v is number => v != null)
    if (vals.length < minNights) continue
    rows.push({ user_id: m.user_id, name: m.name, value: stdDev(vals) })
  }
  return rows.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
}
