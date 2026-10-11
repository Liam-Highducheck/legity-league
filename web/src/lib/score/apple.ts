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
// Confirmed against Apple's own "offset from average" on trip nights: the baseline is the mean sleep onset of the
// nights in the previous 13 calendar days that were slept in the SAME timezone (so a trip starts a fresh baseline).
export const BEDTIME_WINDOW_DAYS = 13
/** Minutes after noon (so 18:00 = 360): onsets earlier than this don't count as a night for the baseline. */
const AFTERNOON_ONSET_CUTOFF = 360
/** Up to 15 min later than the baseline is free, then 20 points per 90 min (60 late = 10, 150 late = 30). */
const LATE_FREE_MIN = 15
const LATE_LOSS_PER_MIN = 20 / 90
/** Up to 60 min earlier is free, then 1 point per 10 min, at most 6. */
const EARLY_FREE_MIN = 60
const EARLY_LOSS_PER_MIN = 0.1
const EARLY_LOSS_MAX = 6

// ---- interruptions (20) ----
// Inputs are Apple's own "Awake" segments inside the night: wake events (awake spells of 1+ min) and total awake minutes.
// Each wake event costs ~1.1 points after a 2.5 point allowance, plus 0.1 per awake minute beyond 10. This is the
// weakest part of the fit (about 60% of nights exact): Apple's own counts differ slightly from the raw segments.
const WAKE_LOSS = 1.1
const INTERRUPTION_ALLOWANCE = 2.5
const AWAKE_FREE_MIN = 10
const AWAKE_LOSS_PER_MIN = 0.1

/** Minutes after local noon that sleep began. Anchoring on noon keeps 23:50 and 00:10 on the same side of the wrap. */
function onsetFromNoon(iso: string, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso))
  const h = Number(parts.find((p) => p.type === 'hour')!.value)
  const m = Number(parts.find((p) => p.type === 'minute')!.value)
  return (((h * 60 + m - 720) % 1440) + 1440) % 1440
}

function addDaysISO(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
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
    const tzOf = (n: ScoreNight) => n.timezone || ctx.timezone
    const tz = tzOf(night)
    const windowStart = addDaysISO(night.night_date, -BEDTIME_WINDOW_DAYS)
    // Nights that start in the afternoon (a nap-like session) are ignored for the baseline: fitted, since one such
    // night otherwise throws off the next two weeks of scores.
    const inWindow = history.filter(
      (h) =>
        h.sleep_start &&
        h.night_date < night.night_date &&
        h.night_date >= windowStart &&
        onsetFromNoon(h.sleep_start, tzOf(h)) >= AFTERNOON_ONSET_CUTOFF,
    )
    // First night in a new timezone: nothing to compare with there yet, so fall back to the other nights.
    const sameTz = inWindow.filter((h) => tzOf(h) === tz)
    const prior = sameTz.length ? sameTz : inWindow
    let bedtimePts = 30
    let bedtimeNote = 'Same time as usual'
    if (prior.length === 0) {
      bedtimeNote = 'No earlier nights to compare with'
      caveats.push('Bedtime consistency compares with your previous 13 nights; full marks until there are some.')
    } else {
      const onsets = prior.map((p) => onsetFromNoon(p.sleep_start!, tzOf(p)))
      const baseline = onsets.reduce((a, b) => a + b, 0) / onsets.length
      const delta = onsetFromNoon(night.sleep_start, tz) - baseline // + = later than usual
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
    const loss = WAKE_LOSS * night.wake_count - INTERRUPTION_ALLOWANCE + AWAKE_LOSS_PER_MIN * Math.max(0, night.awake_min - AWAKE_FREE_MIN)
    const interruptionsPts = Math.max(0, Math.min(20, 20 - loss))
    const interruptions: ScorePart = {
      key: 'interruptions',
      label: 'Interruptions',
      max: 20,
      points: interruptionsPts,
      note:
        loss <= 0
          ? 'Barely woke'
          : `${night.wake_count} wake${night.wake_count === 1 ? '' : 's'}, ${hm(night.awake_min)} awake`,
    }

    const parts = [duration, bedtime, interruptions]
    const score = Math.round(parts.reduce((s, p) => s + p.points, 0))
    const band = APPLE_BANDS.find((b) => score >= b.min)!.label
    return { score, band, parts: parts.map((p) => ({ ...p, points: Math.round(p.points * 10) / 10 })), caveats }
  },
}
