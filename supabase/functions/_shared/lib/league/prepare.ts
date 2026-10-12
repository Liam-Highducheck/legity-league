// GENERATED from packages/core/src/league/prepare.ts by scripts/sync-shared.mjs. Do not edit here: change the source and run
//   node scripts/sync-shared.mjs
import { scoreNights } from '../score/index.ts'
import { deviceClassOf } from './device.ts'
import type { DeviceClass, RawNight } from './types.ts'

/** Adds each night's resolved device class (keeps every other field). */
export function classifyNights<T extends RawNight>(nights: T[]): (T & { device: DeviceClass })[] {
  return nights.map((n) => ({ ...n, device: deviceClassOf(n) }))
}

/**
 * Raw stored nights -> nights the league engines understand: computes each night's sleep score (from the user's own
 * earlier nights, so include ~14 days of history) and resolves its device class. The web app and the Discord Edge
 * Function both end up here (the app scores while fetching, then classifies), which keeps their results identical.
 */
export function prepareLeagueData(raw: RawNight[]) {
  return classifyNights(scoreNights(raw))
}
