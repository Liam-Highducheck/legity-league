// GENERATED from web/src/lib/league/windows.ts by scripts/sync-shared.mjs. Do not edit here: change the source and run
//   node scripts/sync-shared.mjs
import { eachDay } from '../dates.ts'
import { stdDev } from '../stats.ts'
import { interruptionPoints } from '../score/apple.ts'
import { minutesOfDay, onsetFromNoon } from '../score/time.ts'
import { divisionOf } from './device.ts'
import type { Division, LeagueNight } from './types.ts'

/** user id -> night date -> night */
export type NightIndex = Map<string, Map<string, LeagueNight>>

export function indexNights(nights: LeagueNight[]): NightIndex {
  const index: NightIndex = new Map()
  for (const n of nights) {
    let byDate = index.get(n.user_id)
    if (!byDate) index.set(n.user_id, (byDate = new Map()))
    byDate.set(n.night_date, n)
  }
  return index
}

export type RecordStat = 'duration' | 'restorative' | 'score' | 'spread' | 'gap' | 'rem' | 'deep' | 'interruptions'

/** Values are compared after rounding (whole minutes, or 0.1 for score averages), so a record never "beats" an identical-looking one. */
export function quantizeStat(stat: RecordStat, v: number): number {
  return stat === 'score' || stat === 'interruptions' ? Math.round(v * 10) / 10 : Math.round(v)
}

/** Number of nights present within [start, end]. */
export function countNights(byDate: Map<string, LeagueNight> | undefined, start: string, end: string): number {
  if (!byDate) return 0
  return eachDay(start, end).filter((d) => byDate.has(d)).length
}

/** The nights in [start, end], or null unless there is one for EVERY day (averages and podiums need them all). */
export function windowNights(byDate: Map<string, LeagueNight> | undefined, start: string, end: string): LeagueNight[] | null {
  if (!byDate) return null
  const out: LeagueNight[] = []
  for (const d of eachDay(start, end)) {
    const n = byDate.get(d)
    if (!n) return null
    out.push(n)
  }
  return out
}

export interface WindowStats {
  /** 'watch' only if every night in the window is watch-class, otherwise 'phone' (Non-Watch). */
  division: Division
  duration: number
  restorative: number | null
  score: number | null
  /** Standard deviation of bedtime (minutes). Lower is more consistent. */
  spread: number | null
  /** Average distance from the member's target bedtime (minutes). Lower is closer. */
  gap: number | null
  rem: number | null
  deep: number | null
  /** Average interruptions score (0-20, higher is fewer wake-ups). */
  interruptions: number | null
}

/** 'HH:MM' or 'HH:MM:SS' -> minutes after midnight, or null. */
export function parseClock(t: string | null | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(t ?? '')
  if (!m) return null
  const mins = Number(m[1]) * 60 + Number(m[2])
  return mins < 1440 ? mins : null
}

function circularDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 1440
  return Math.min(d, 1440 - d)
}

const avg = (vals: number[]) => vals.reduce((a, b) => a + b, 0) / vals.length
const tzOf = (n: LeagueNight) => n.timezone || 'UTC'

// Rolling windows revisit the same nights many times, so compute each night's bedtime once.
const clocks = new WeakMap<LeagueNight, { onset: number; minutes: number } | null>()
export function bedtimeOf(n: LeagueNight): { onset: number; minutes: number } | null {
  if (!n.sleep_start) return null
  let c = clocks.get(n)
  if (c === undefined) {
    c = { onset: onsetFromNoon(n.sleep_start, tzOf(n)), minutes: minutesOfDay(n.sleep_start, tzOf(n)) }
    clocks.set(n, c)
  }
  return c
}

/** Average of `pick` over the nights, or null if any night lacks it. */
function averageOf(nights: LeagueNight[], pick: (n: LeagueNight) => number | null): number | null {
  const vals: number[] = []
  for (const n of nights) {
    const v = pick(n)
    if (v == null) return null
    vals.push(v)
  }
  return avg(vals)
}

/** Stats for a full window of nights; null if empty or any night doesn't count (manual). */
export function windowStats(nights: LeagueNight[], targetBedtime?: string | null): WindowStats | null {
  if (nights.length === 0) return null
  let division: Division = 'watch'
  for (const n of nights) {
    const d = divisionOf(n.device)
    if (!d) return null
    if (d !== 'watch') division = 'phone'
  }
  const target = parseClock(targetBedtime)
  const clock = nights.map(bedtimeOf)
  const haveStarts = clock.every((c) => c != null)
  const q = (stat: RecordStat, v: number | null) => (v == null ? null : quantizeStat(stat, v))
  return {
    division,
    duration: quantizeStat('duration', avg(nights.map((n) => n.duration_min))),
    restorative: q('restorative', averageOf(nights, (n) => n.restorative_min)),
    score: q('score', averageOf(nights, (n) => n.sleep_score)),
    spread: haveStarts ? quantizeStat('spread', stdDev(clock.map((c) => c!.onset))) : null,
    gap: haveStarts && target != null ? quantizeStat('gap', avg(clock.map((c) => circularDistance(c!.minutes, target)))) : null,
    rem: q('rem', averageOf(nights, (n) => n.rem_min)),
    deep: q('deep', averageOf(nights, (n) => n.deep_min)),
    interruptions: q(
      'interruptions',
      averageOf(nights, (n) => (n.awake_min == null || n.wake_count == null ? null : interruptionPoints(n.wake_count, n.awake_min).points)),
    ),
  }
}
