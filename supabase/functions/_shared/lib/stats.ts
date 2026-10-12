// GENERATED from packages/core/src/stats.ts by scripts/sync-shared.mjs. Do not edit here: change the source and run
//   node scripts/sync-shared.mjs
import { addDays, dayNumFromISO } from './dates.ts'

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

export interface ExtremeWindow {
  start: string
  end: string
  avg: number
  /** Nights with a value inside the window. */
  nights: number
  days: number
}

/** A window needs this share of its days to have a night before it can be "best" or "worst" (a missed night or two is fine). */
export const MIN_WINDOW_COVERAGE = 0.8

/**
 * One person's best (highest average) or worst (lowest) run of `days` consecutive days for a metric. The window
 * needs nights on at least MIN_WINDOW_COVERAGE of its days. Ties go to the most recent window.
 * `nights` are expected to belong to a single person.
 */
export function extremeWindow(
  nights: StatsNight[],
  metric: Metric,
  days: number,
  which: 'best' | 'worst',
): ExtremeWindow | null {
  const byDay = new Map<number, number>()
  for (const n of nights) {
    const v = metricValue(n, metric)
    if (v != null) byDay.set(dayNumFromISO(n.night_date), v)
  }
  if (byDay.size === 0) return null
  const keys = [...byDay.keys()]
  const first = Math.min(...keys)
  const last = Math.max(...keys)
  if (last - first + 1 < days) return null
  const len = last - first + 1
  // prefix sums of value and count per day
  const sum = new Array<number>(len + 1).fill(0)
  const cnt = new Array<number>(len + 1).fill(0)
  for (let i = 0; i < len; i++) {
    const v = byDay.get(first + i)
    sum[i + 1] = sum[i] + (v ?? 0)
    cnt[i + 1] = cnt[i] + (v == null ? 0 : 1)
  }
  const need = Math.max(Math.ceil(days * MIN_WINDOW_COVERAGE), Math.min(5, days))
  let pick: { s: number; avg: number; count: number } | null = null
  for (let s = 0; s + days <= len; s++) {
    const count = cnt[s + days] - cnt[s]
    if (count < need) continue
    const avg = (sum[s + days] - sum[s]) / count
    if (!pick || (which === 'best' ? avg >= pick.avg : avg <= pick.avg)) pick = { s, avg, count }
  }
  if (!pick) return null
  const startIso = addDays('1970-01-01', first + pick.s)
  return { start: startIso, end: addDays(startIso, days - 1), avg: pick.avg, nights: pick.count, days }
}
