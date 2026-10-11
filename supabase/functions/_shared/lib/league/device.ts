// GENERATED from web/src/lib/league/device.ts by scripts/sync-shared.mjs. Do not edit here: change the source and run
//   node scripts/sync-shared.mjs
import type { DeviceClass, Division } from './types.ts'

/**
 * Manual nights are typed in by hand (or written straight to the API), so they never count for records or podiums.
 * Flip this to let them compete in the Non-Watch division.
 */
export const COUNTS_MANUAL = false

export function divisionOf(device: DeviceClass): Division | null {
  if (device === 'watch') return 'watch'
  if (device === 'phone') return 'phone'
  return COUNTS_MANUAL ? 'phone' : null
}

/**
 * The night's device class. Uses the stored column when the migration is applied; otherwise the same rule the
 * migration backfills with: a night with deep/REM minutes came from a tracker that writes sleep stages
 * (an Apple Watch, or any other wearable writing to Apple Health), manual rows are manual, the rest is phone-only.
 */
export function deviceClassOf(n: {
  device_class?: string | null
  source: string
  deep_min: number | null
  rem_min: number | null
}): DeviceClass {
  if (n.device_class === 'watch' || n.device_class === 'phone' || n.device_class === 'manual') return n.device_class
  if (n.source === 'manual') return 'manual'
  if (n.deep_min != null || n.rem_min != null) return 'watch'
  return 'phone'
}
