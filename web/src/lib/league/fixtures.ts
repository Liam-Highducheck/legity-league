// Test helpers: build league nights without a database. Not part of the shared Edge Function bundle.
import { addDays } from '../dates.ts'
import type { DeviceClass, LeagueNight } from './types.ts'

/** A fixed-offset zone (UTC+10, no DST) so tests don't depend on daylight saving. */
export const TZ = 'Etc/GMT-10'

export interface NightOpts {
  dur?: number
  rest?: number | null
  score?: number | null
  /** Local bedtime 'HH:MM' (before noon = after midnight, on the wake-up date). */
  bed?: string
  device?: DeviceClass
  tz?: string
}

/** Sleep onset as an ISO string for a night that ends on `date`. */
export function bedIso(date: string, bed: string, tz = TZ): string {
  const [h] = bed.split(':').map(Number)
  const day = h >= 12 ? addDays(date, -1) : date
  const offset = tz === TZ ? '+10:00' : '+00:00'
  return `${day}T${bed}:00${offset}`
}

export function night(user: string, date: string, o: NightOpts = {}): LeagueNight {
  const device = o.device ?? 'watch'
  const dur = o.dur ?? 480
  const hasStages = device === 'watch'
  const tz = o.tz ?? TZ
  return {
    user_id: user,
    night_date: date,
    duration_min: dur,
    restorative_min: o.rest !== undefined ? o.rest : hasStages ? Math.round(dur * 0.4) : null,
    source: device === 'manual' ? 'manual' : 'apple_health',
    device_class: device,
    sleep_start: device === 'manual' ? null : bedIso(date, o.bed ?? '23:00', tz),
    sleep_end: null,
    timezone: device === 'manual' ? null : tz,
    awake_min: device === 'manual' ? null : 0,
    wake_count: device === 'manual' ? null : 0,
    deep_min: hasStages ? 60 : null,
    rem_min: hasStages ? 80 : null,
    sleep_score: o.score !== undefined ? o.score : hasStages ? 90 : null,
    device,
  }
}

/** One night per day starting at `start`, with durations taken from `durs` in order. */
export function run(user: string, start: string, durs: number[], o: NightOpts = {}): LeagueNight[] {
  return durs.map((dur, i) => night(user, addDays(start, i), { ...o, dur }))
}
