import { daysBetween } from '../dates.ts'
import { onsetFromNoon } from '../score/time.ts'
import type { Cond, Goal, GardenNight, GoalMetric, Progress, TotalMetric } from './types.ts'

/** The value of `metric` for one night, or null when the night doesn't have it (e.g. no awake data on a manual entry). */
export function nightValue(n: GardenNight, metric: GoalMetric): number | null {
  switch (metric) {
    case 'duration': return n.duration_min
    case 'score': return n.sleep_score
    case 'restorative': return n.restorative_min
    case 'deep': return n.deep_min
    case 'rem': return n.rem_min
    case 'awake': return n.awake_min
    case 'wakes': return n.wake_count
    case 'bedtime': return n.sleep_start ? onsetFromNoon(n.sleep_start, n.timezone || 'UTC') : null
  }
}

export function meets(n: GardenNight, c: Cond): boolean {
  const v = nightValue(n, c.metric)
  if (v == null) return false
  return c.op === '>=' ? v >= c.value : v <= c.value
}

/** Evaluates a goal over nights counted from `after` (exclusive night_date; omit to count everything). */
export function goalProgress(goal: Goal, nights: GardenNight[], after?: string): Progress {
  const list = nights.filter((n) => !after || n.night_date > after).sort((a, b) => a.night_date.localeCompare(b.night_date))

  if (goal.kind === 'total') {
    const target = goal.minutes
    let sum = 0
    let doneOn: string | null = null
    for (const n of list) {
      sum += nightValue(n, goal.metric as GoalMetric) ?? 0
      if (doneOn == null && sum >= target) doneOn = n.night_date
    }
    return { value: Math.min(sum, target), target, done: doneOn != null, doneOn }
  }

  const target = goal.count
  if (goal.kind === 'nights') {
    let count = 0
    let doneOn: string | null = null
    for (const n of list) {
      if (!meets(n, goal.cond)) continue
      count++
      if (doneOn == null && count >= target) doneOn = n.night_date
    }
    return { value: Math.min(count, target), target, done: doneOn != null, doneOn }
  }

  // streak: the best run of consecutive dates that meet the condition
  let run = 0
  let best = 0
  let prev: string | null = null
  let doneOn: string | null = null
  for (const n of list) {
    const ok = meets(n, goal.cond)
    if (!ok) {
      run = 0
    } else {
      run = prev && daysBetween(prev, n.night_date) === 1 && run > 0 ? run + 1 : 1
      best = Math.max(best, run)
      if (doneOn == null && run >= target) doneOn = n.night_date
    }
    prev = n.night_date
  }
  return { value: Math.min(best, target), target, done: doneOn != null, doneOn }
}

// ---- wording ------------------------------------------------------------------

const hours = (min: number) => {
  const h = min / 60
  return Number.isInteger(h) ? `${h}h` : `${Math.floor(min / 60)}h ${min % 60}m`
}

function clock(afterNoon: number): string {
  const m = (afterNoon + 720) % 1440
  const h = Math.floor(m / 60)
  const mm = m % 60
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}${mm ? ':' + String(mm).padStart(2, '0') : ''}${h < 12 ? 'am' : 'pm'}`
}

export function describeCond(c: Cond): string {
  const v = c.value
  switch (c.metric) {
    case 'duration': return v <= 1 ? 'logged' : `with ${hours(v)}+ of sleep`
    case 'score': return `with a sleep score of ${v}+`
    case 'restorative': return `with ${hours(v)}+ of restorative sleep`
    case 'deep': return `with ${hours(v)}+ of deep sleep`
    case 'rem': return `with ${hours(v)}+ of REM sleep`
    case 'awake': return `with ${v} min or less awake`
    case 'wakes': return v === 0 ? 'with no wake-ups' : `with ${v} or fewer wake-ups`
    case 'bedtime': return `asleep by ${clock(v)}`
  }
}

const TOTAL_LABEL: Record<TotalMetric, string> = {
  duration: 'sleep',
  restorative: 'restorative sleep',
  deep: 'deep sleep',
  rem: 'REM sleep',
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`

export function describeGoal(g: Goal): string {
  if (g.kind === 'total') return `${hours(g.minutes)} of ${TOTAL_LABEL[g.metric]} in total`
  if (g.kind === 'streak') return `${plural(g.count, 'night')} in a row ${describeCond(g.cond)}`
  return `${plural(g.count, 'night')} ${describeCond(g.cond)}`
}

/** "2 / 3 nights" or "4h / 10h" for a progress bar caption. */
export function formatProgress(g: Goal, p: Progress): string {
  if (g.kind === 'total') return `${hours(Math.round(p.value))} / ${hours(p.target)}`
  return `${p.value} / ${p.target} night${p.target === 1 ? '' : 's'}`
}
