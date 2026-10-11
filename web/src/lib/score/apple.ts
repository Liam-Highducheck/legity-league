import type { ScoreFormula, ScoreNight, ScorePart } from './types'

/**
 * Apple-style sleep score (watchOS 26 / iOS 26), 0-100:
 *   duration 50 + bedtime consistency 30 + interruptions 20.
 * Apple publishes only those weights, the 13-night bedtime window and the bands. The curves inside each
 * part are community reverse-engineering (see docs/scoring.md) and are marked ESTIMATE below; tweak the
 * constants here, nothing else depends on their values.
 */

export const APPLE_BANDS = [
  { min: 96, label: 'Very high' },
  { min: 81, label: 'High' },
  { min: 61, label: 'OK' },
  { min: 41, label: 'Low' },
  { min: 0, label: 'Very low' },
] as const

// ---- duration (50) ----
/** ESTIMATE: no loss within this many minutes of the goal (7h50 for an 8h goal). */
const DURATION_FREE_MIN = 10
/** ESTIMATE: [minutes below the free threshold, points lost]; linear between anchors, loss capped at 50. */
const DURATION_LOSS: [number, number][] = [
  [0, 0],
  [60, 5],
  [120, 13],
  [180, 25],
  [240, 36],
  [300, 44],
  [360, 50],
]

// ---- bedtime consistency (30) ----
/** Apple: compares sleep onset to the previous 13 nights. */
export const BEDTIME_WINDOW = 13
/** Below this many earlier nights there is no meaningful baseline, so no points are deducted. */
const BEDTIME_MIN_HISTORY = 3
/** ESTIMATE: up to 15 min late is free, then 20 points per 90 min (so 60 min late = 10, 150 min late = 30). */
const LATE_FREE_MIN = 15
const LATE_LOSS_PER_MIN = 20 / 90
/** ESTIMATE: up to 60 min early is free, then 1 point per 30 min, at most 6. */
const EARLY_FREE_MIN = 60
const EARLY_LOSS_PER_MIN = 1 / 30
const EARLY_LOSS_MAX = 6

// ---- interruptions (20) ----
/** ESTIMATE: first 11 min awake free, then 1 point per 4 min. */
const AWAKE_FREE_MIN = 11
const AWAKE_MIN_PER_POINT = 4
/** ESTIMATE: first 2 wake events free, then 1 point per 2 events. */
const WAKES_FREE = 2
const WAKES_PER_POINT = 2

function interpolate(table: [number, number][], x: number): number {
  if (x <= table[0][0]) return table[0][1]
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i]
    if (x <= x1) {
      const [x0, y0] = table[i - 1]
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
    }
  }
  return table[table.length - 1][1]
}

/** Minutes after local noon that sleep began. Anchoring on noon keeps 23:50 and 00:10 on the same side of the wrap. */
function onsetFromNoon(iso: string, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso))
  const h = Number(parts.find((p) => p.type === 'hour')!.value)
  const m = Number(parts.find((p) => p.type === 'minute')!.value)
  return (((h * 60 + m - 720) % 1440) + 1440) % 1440
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function hm(min: number): string {
  const m = Math.round(Math.abs(min))
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
}

export const appleScore: ScoreFormula = {
  id: 'apple',
  name: 'Apple-style',
  description: 'Duration 50 + bedtime consistency 30 + interruptions 20, modelled on Apple’s Sleep Score.',
  compute(night: ScoreNight, history: ScoreNight[], ctx) {
    if (!night.sleep_start || night.awake_min == null || night.wake_count == null) return null
    const caveats: string[] = []

    // duration
    const freeAt = ctx.goalMin - DURATION_FREE_MIN
    const short = Math.max(0, freeAt - night.duration_min)
    const durationPts = Math.max(0, 50 - interpolate(DURATION_LOSS, short))
    const duration: ScorePart = {
      key: 'duration',
      label: 'Duration',
      max: 50,
      points: durationPts,
      note: short === 0 ? 'Goal met' : `${hm(short)} under your ${hm(freeAt)} target`,
    }

    // bedtime consistency
    const prior = history
      .filter((h) => h.sleep_start && h.night_date < night.night_date)
      .sort((a, b) => b.night_date.localeCompare(a.night_date))
      .slice(0, BEDTIME_WINDOW)
    let bedtimePts = 30
    let bedtimeNote = 'Same time as usual'
    if (prior.length < BEDTIME_MIN_HISTORY) {
      bedtimeNote = 'Not enough earlier nights yet'
      caveats.push(`Bedtime consistency needs ${BEDTIME_MIN_HISTORY}+ earlier nights; full marks until then.`)
    } else {
      const baseline = median(prior.map((p) => onsetFromNoon(p.sleep_start!, ctx.timezone)))
      const delta = onsetFromNoon(night.sleep_start, ctx.timezone) - baseline // + = later than usual
      if (delta > LATE_FREE_MIN) {
        bedtimePts = Math.max(0, 30 - (delta - LATE_FREE_MIN) * LATE_LOSS_PER_MIN)
        bedtimeNote = `${hm(delta)} later than usual`
      } else if (delta < -EARLY_FREE_MIN) {
        bedtimePts = 30 - Math.min(EARLY_LOSS_MAX, (-delta - EARLY_FREE_MIN) * EARLY_LOSS_PER_MIN)
        bedtimeNote = `${hm(-delta)} earlier than usual`
      } else if (Math.abs(delta) > 5) {
        bedtimeNote = `${hm(Math.abs(delta))} ${delta > 0 ? 'later' : 'earlier'} than usual, within range`
      }
    }
    const bedtime: ScorePart = { key: 'bedtime', label: 'Bedtime', max: 30, points: bedtimePts, note: bedtimeNote }

    // interruptions
    const awakeLoss = Math.max(0, night.awake_min - AWAKE_FREE_MIN) / AWAKE_MIN_PER_POINT
    const wakeLoss = Math.max(0, night.wake_count - WAKES_FREE) / WAKES_PER_POINT
    const interruptionsPts = Math.max(0, 20 - awakeLoss - wakeLoss)
    const interruptions: ScorePart = {
      key: 'interruptions',
      label: 'Interruptions',
      max: 20,
      points: interruptionsPts,
      note:
        night.wake_count === 0 && night.awake_min <= AWAKE_FREE_MIN
          ? 'Barely woke'
          : `${night.wake_count} wake${night.wake_count === 1 ? '' : 's'}, ${hm(night.awake_min)} awake`,
    }

    const parts = [duration, bedtime, interruptions]
    const score = Math.round(parts.reduce((s, p) => s + p.points, 0))
    const band = APPLE_BANDS.find((b) => score >= b.min)!.label
    return { score, band, parts: parts.map((p) => ({ ...p, points: Math.round(p.points * 10) / 10 })), caveats }
  },
}
