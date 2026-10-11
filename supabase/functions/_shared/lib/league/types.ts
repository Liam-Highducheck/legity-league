// GENERATED from web/src/lib/league/types.ts by scripts/sync-shared.mjs. Do not edit here: change the source and run
//   node scripts/sync-shared.mjs
import type { ScoreNight } from '../score/types.ts'
import type { Metric } from '../stats.ts'
import type { PeriodKind } from '../periods.ts'

/** Where a night's data came from: Apple Watch-like stage data, phone-only Health data, or typed in by hand. */
export type DeviceClass = 'watch' | 'phone' | 'manual'
/** The two competitive divisions. Manual nights belong to neither (they never count). */
export type Division = 'watch' | 'phone'

export const DIVISION_LABELS: Record<Division, string> = { watch: 'Watch', phone: 'Non-Watch' }

/** A stored night as read from sleep_nights. */
export interface RawNight extends ScoreNight {
  user_id: string
  restorative_min: number | null
  source: string
  /** Set by ingest; undefined/null before that migration is applied. */
  device_class?: string | null
}

/** A stored night plus its computed score and resolved device class. */
export interface LeagueNight extends RawNight {
  sleep_score: number | null
  device: DeviceClass
}

export interface LeagueMember {
  user_id: string
  name: string
  /** 'HH:MM[:SS]' target bedtime from the member's profile. */
  target_bedtime?: string | null
}

/** Period podiums, plus the per-group championship competitions. */
export type PodiumKind = PeriodKind | 'championship'

/** The period kinds the league tracks. (half/year exist in periods.ts; add them here to switch them on.) */
export const LEAGUE_KINDS: PeriodKind[] = ['week', 'fortnight', 'month', 'season']

export const PODIUM_METRICS: Metric[] = ['duration', 'restorative', 'score']

export interface Competition {
  id: string
  name: string
  starts_on: string
  ends_on: string
}
