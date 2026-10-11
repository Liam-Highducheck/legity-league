import type { ScoreFormula, ScoreNight, ScorePart } from './types'

/**
 * Apple-style sleep score (watchOS 26 / iOS 26), 0-100:
 *   duration 50 + bedtime consistency 30 + interruptions 20.
 * Apple publishes only those weights, the 13-night bedtime window and the bands. The curves inside each
 * part were fitted to real Apple scores (docs/scoring.md); tweak the constants here, nothing else depends on them.
 */

export const APPLE_BANDS = [
  { min: 96, label: 'Very high' },
  { min: 81, label: 'High' },
  { min: 61, label: 'OK' },
  { min: 41, label: 'Low' },
  { min: 0, label: 'Very low' },
] as const

// ---- duration (50) ----
// Apple's curve isn't a simple formula. This lookup is fitted to 100 nights of Apple scores: [minutes short of the
// goal, points], linear in between (reproduces 91% of nights exactly in cross-validation). Beyond the last knot it
// continues at the final slope. Oversleeping is not penalised.
const DURATION_POINTS: [number, number][] = [
  [0, 50],
  [15, 48.25],
  [30, 47.71],
  [60, 45.6],
  [90, 40.71],
  [120, 36.04],
  [180, 28.0],
  [240, 21.36],
  [300, 13.08],
]

function durationPoints(minutesShort: number): number {
  const t = DURATION_POINTS
  if (minutesShort <= 0) return 50
  for (let i = 1; i < t.length; i++) {
    if (minutesShort <= t[i][0]) {
      const [x0, y0] = t[i - 1]
      const [x1, y1] = t[i]
      return y0 + ((y1 - y0) * (minutesShort - x0)) / (x1 - x0)
    }
  }
  const [x0, y0] = t[t.length - 2]
  const [x1, y1] = t[t.length - 1]
  return Math.max(0, y1 + ((y1 - y0) / (x1 - x0)) * (minutesShort - x1))
}

// ---- bedtime consistency (30) ----
/** Apple: sleep onset vs the previous 13 nights; the baseline is their mean (a median fits worse). */
export const BEDTIME_WINDOW = 13
/** Below this many earlier nights there is no meaningful baseline, so no points are deducted. */
const BEDTIME_MIN_HISTORY = 3
/** Up to 15 min late is free, then 20 points per 90 min (60 min late = 10, 150 min late = 30). */
const LATE_FREE_MIN = 15
const LATE_LOSS_PER_MIN = 20 / 90
/** Up to 60 min early is free, then 1 point per 30 min, at most 6. */
const EARLY_FREE_MIN = 60
const EARLY_LOSS_PER_MIN = 1 / 30
const EARLY_LOSS_MAX = 6

// ---- interruptions (20) ----
// Inputs are Apple's own "Awake" segments inside the night: wake events (awake spells of 1+ min) and total awake minutes.
/** The first 2.5 wake events are free, then 1.1 points each. */
const WAKES_FREE = 2.5
const WAKE_LOSS = 1.1
/** The first 11 awake minutes are free, then 0.15 points per minute (a long awake spell zeroes this part). */
const AWAKE_FREE_MIN = 11
const AWAKE_LOSS_PER_MIN = 0.15

/** Minutes after local noon that sleep began. Anchoring on noon keeps 23:50 and 00:10 on the same side of the wrap. */
function onsetFromNoon(iso: string, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso))
  const h = Number(parts.find((p) => p.type === 'hour')!.value)
  const m = Number(parts.find((p) => p.type === 'minute')!.value)
  return (((h * 60 + m - 720) % 1440) + 1440) % 1440
}

function hm(min: number): string {
  const m = Math.round(Math.abs(min))
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
}

export const appleScore: ScoreFormula = {
  id: 'apple',
  name: 'Apple-style',
  description: 'Duration 50 + bedtime consistency 30 + interruptions 20, fitted to Apple’s Sleep Score.',
  compute(night: ScoreNight, history: ScoreNight[], ctx) {
    if (!night.sleep_start || night.awake_min == null || night.wake_count == null) return null
    const caveats: string[] = []

    // duration
    const short = Math.max(0, ctx.goalMin - night.duration_min)
    const durationPts = durationPoints(short)
    const duration: ScorePart = {
      key: 'duration',
      label: 'Duration',
      max: 50,
      points: durationPts,
      note: short === 0 ? 'Goal met' : `${hm(short)} under your ${hm(ctx.goalMin)} goal`,
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
      const onsets = prior.map((p) => onsetFromNoon(p.sleep_start!, ctx.timezone))
      const baseline = onsets.reduce((a, b) => a + b, 0) / onsets.length
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
    const wakeLoss = Math.max(0, night.wake_count - WAKES_FREE) * WAKE_LOSS
    const awakeLoss = Math.max(0, night.awake_min - AWAKE_FREE_MIN) * AWAKE_LOSS_PER_MIN
    const interruptionsPts = Math.max(0, 20 - awakeLoss - wakeLoss)
    const interruptions: ScorePart = {
      key: 'interruptions',
      label: 'Interruptions',
      max: 20,
      points: interruptionsPts,
      note:
        wakeLoss === 0 && awakeLoss === 0
          ? 'Barely woke'
          : `${night.wake_count} wake${night.wake_count === 1 ? '' : 's'}, ${hm(night.awake_min)} awake`,
    }

    const parts = [duration, bedtime, interruptions]
    const score = Math.round(parts.reduce((s, p) => s + p.points, 0))
    const band = APPLE_BANDS.find((b) => score >= b.min)!.label
    return { score, band, parts: parts.map((p) => ({ ...p, points: Math.round(p.points * 10) / 10 })), caveats }
  },
}
