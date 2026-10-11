import { daysBetween } from '../dates.ts'
import type { Eligibility } from './eligibility.ts'
import { championshipPodiums, earliestNight, medalTally, periodPodiums, type MedalTally, type Podium } from './podiums.ts'
import { computeRecords, type RecordsReport } from './records.ts'
import { LEAGUE_KINDS, PODIUM_METRICS, type Competition, type LeagueMember, type LeagueNight } from './types.ts'
import { indexNights, type NightIndex } from './windows.ts'

/** Everything the league pages derive from a group's nights. */
export interface LeagueBase {
  members: LeagueMember[]
  nights: LeagueNight[]
  index: NightIndex
  eligibility: Eligibility
  /** Today in the group's timezone: periods that ended before this are complete. */
  asOf: string
  timeZone: string
  earliest: string
}

export function buildBase(
  members: LeagueMember[],
  nights: LeagueNight[],
  eligibility: Eligibility,
  asOf: string,
  timeZone: string,
): LeagueBase {
  const index = indexNights(nights)
  return { members, nights, index, eligibility, asOf, timeZone, earliest: earliestNight(index, asOf) }
}

export interface LeagueReport {
  /** Period podiums (newest first) followed by championship podiums. */
  podiums: Podium[]
  tally: MedalTally
  records: RecordsReport
}

/** Podiums, medal tallies and records for the whole history. Pure, so the same call works in tests. */
export function buildReport(base: LeagueBase, competitions: Competition[]): LeagueReport {
  const podiums = [
    ...periodPodiums(base.members, base.index, LEAGUE_KINDS, PODIUM_METRICS, base.asOf, base.earliest, base.eligibility),
    ...championshipPodiums(base.members, base.index, competitions, PODIUM_METRICS, base.asOf, base.eligibility),
  ]
  return { podiums, tally: medalTally(podiums), records: computeRecords(base.members, base.nights, base.asOf) }
}

/** 'Active' while today is within the dates, 'upcoming' before, 'finished' after. */
export function competitionStatus(c: Pick<Competition, 'starts_on' | 'ends_on'>, today: string): 'upcoming' | 'active' | 'finished' {
  if (today < c.starts_on) return 'upcoming'
  if (today > c.ends_on) return 'finished'
  return 'active'
}

export function competitionDays(c: Pick<Competition, 'starts_on' | 'ends_on'>): number {
  return daysBetween(c.starts_on, c.ends_on) + 1
}
