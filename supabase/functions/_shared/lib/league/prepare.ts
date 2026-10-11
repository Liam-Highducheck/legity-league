// GENERATED from web/src/lib/league/prepare.ts by scripts/sync-shared.mjs. Do not edit here: change the source and run
//   node scripts/sync-shared.mjs
import { scoreNights } from '../score/index.ts'
import { deviceClassOf } from './device.ts'
import type { LeagueNight, RawNight } from './types.ts'

/**
 * Raw stored nights -> nights the league engines understand: computes each night's sleep score (from the user's own
 * earlier nights, so include ~14 days of history) and resolves its device class. The web app and the Discord Edge
 * Function both call this, which is what keeps their results identical.
 */
export function prepareLeagueData(raw: RawNight[]): LeagueNight[] {
  return scoreNights(raw).map((n) => ({ ...n, device: deviceClassOf(n) }))
}
