import { daysBetween } from '../dates.ts'
import { completedPeriods, periodTitle, type PeriodKind, type PeriodRange } from '../periods.ts'
import type { Metric } from '../stats.ts'
import { eligibleFor, nightValue, type Eligibility } from './eligibility.ts'
import { rankValues } from './rank.ts'
import type { Competition, LeagueMember, LeagueNight, PodiumKind } from './types.ts'
import { countNights, quantizeStat, windowNights, type NightIndex } from './windows.ts'

/** Medals need at least this many fully eligible people, otherwise "winning" means nothing. */
export const MIN_PODIUM_PARTICIPANTS = 2

export interface Placing {
  userId: string
  name: string
  value: number
  rank: number
}

export interface Unranked {
  userId: string
  name: string
  /** Nights present in the window (of `days`). */
  nights: number
}

export interface RangeRanking {
  /** Everyone fully eligible, best first, with standard competition ranks. */
  placings: Placing[]
  /** Everyone else: missing a night, or a night that can't count for this metric. */
  unranked: Unranked[]
  days: number
}

function windowValue(nights: LeagueNight[], metric: Metric): number {
  const vals = nights.map((n) => nightValue(n, metric) as number)
  return quantizeStat(metric, vals.reduce((a, b) => a + b, 0) / vals.length)
}

/** Ranks members by their average `metric` over [start, end]. Only members with an eligible night on EVERY day are ranked. */
export function rankRange(
  members: LeagueMember[],
  index: NightIndex,
  start: string,
  end: string,
  metric: Metric,
  eligibility: Eligibility,
): RangeRanking {
  const eligible: { userId: string; name: string; value: number }[] = []
  const unranked: Unranked[] = []
  const days = daysBetween(start, end) + 1
  for (const m of [...members].sort((a, b) => a.name.localeCompare(b.name))) {
    const byDate = index.get(m.user_id)
    const nights = windowNights(byDate, start, end)
    if (nights && nights.every((n) => eligibleFor(n, metric, eligibility))) {
      eligible.push({ userId: m.user_id, name: m.name, value: windowValue(nights, metric) })
    } else {
      unranked.push({ userId: m.user_id, name: m.name, nights: countNights(byDate, start, end) })
    }
  }
  return { placings: rankValues(eligible, (e) => e.value, 'max'), unranked, days }
}

export interface Podium {
  kind: PodiumKind
  metric: Metric
  start: string
  end: string
  title: string
  competitionId?: string
  ranking: RangeRanking
  /** Placings on the podium (rank 1-3, ties included). Empty when fewer than MIN_PODIUM_PARTICIPANTS were ranked. */
  medals: Placing[]
}

function makePodium(
  kind: PodiumKind,
  metric: Metric,
  start: string,
  end: string,
  title: string,
  ranking: RangeRanking,
  competitionId?: string,
): Podium {
  const medals = ranking.placings.length >= MIN_PODIUM_PARTICIPANTS ? ranking.placings.filter((p) => p.rank <= 3) : []
  return { kind, metric, start, end, title, competitionId, ranking, medals }
}

/** One podium for a single period and metric (used for live views and the Discord summary). */
export function podiumFor(
  kind: PeriodKind,
  range: Pick<PeriodRange, 'start' | 'end' | 'label'>,
  metric: Metric,
  members: LeagueMember[],
  index: NightIndex,
  eligibility: Eligibility,
): Podium {
  return makePodium(kind, metric, range.start, range.end, periodTitle(kind, range), rankRange(members, index, range.start, range.end, metric, eligibility))
}

/** Podiums for every completed period of each kind, newest first, back to `earliest`. */
export function periodPodiums(
  members: LeagueMember[],
  index: NightIndex,
  kinds: PeriodKind[],
  metrics: Metric[],
  asOf: string,
  earliest: string,
  eligibility: Eligibility,
): Podium[] {
  const out: Podium[] = []
  for (const kind of kinds) {
    for (const range of completedPeriods(kind, asOf, earliest)) {
      for (const metric of metrics) out.push(podiumFor(kind, range, metric, members, index, eligibility))
    }
  }
  return out
}

/** Championship podiums for competitions that have finished (ended before `asOf`). */
export function championshipPodiums(
  members: LeagueMember[],
  index: NightIndex,
  competitions: Competition[],
  metrics: Metric[],
  asOf: string,
  eligibility: Eligibility,
): Podium[] {
  const out: Podium[] = []
  for (const c of [...competitions].sort((a, b) => b.ends_on.localeCompare(a.ends_on))) {
    if (c.ends_on >= asOf) continue
    for (const metric of metrics) {
      out.push(makePodium('championship', metric, c.starts_on, c.ends_on, c.name, rankRange(members, index, c.starts_on, c.ends_on, metric, eligibility), c.id))
    }
  }
  return out
}

export interface MedalEntry {
  kind: PodiumKind
  metric: Metric
  rank: number
  start: string
  end: string
  title: string
  value: number
  competitionId?: string
}

export interface MedalCounts {
  gold: number
  silver: number
  bronze: number
  /** The exact periods behind the counts, newest first. */
  entries: MedalEntry[]
}

/** user id -> `${kind}:${metric}` -> counts */
export type MedalTally = Map<string, Map<string, MedalCounts>>

export const tallyKey = (kind: PodiumKind, metric: Metric) => `${kind}:${metric}`

export function emptyCounts(): MedalCounts {
  return { gold: 0, silver: 0, bronze: 0, entries: [] }
}

export function medalTally(podiums: Podium[]): MedalTally {
  const tally: MedalTally = new Map()
  for (const p of podiums) {
    for (const placing of p.medals) {
      let byKey = tally.get(placing.userId)
      if (!byKey) tally.set(placing.userId, (byKey = new Map()))
      const key = tallyKey(p.kind, p.metric)
      let counts = byKey.get(key)
      if (!counts) byKey.set(key, (counts = emptyCounts()))
      if (placing.rank === 1) counts.gold++
      else if (placing.rank === 2) counts.silver++
      else counts.bronze++
      counts.entries.push({
        kind: p.kind,
        metric: p.metric,
        rank: placing.rank,
        start: p.start,
        end: p.end,
        title: p.title,
        value: placing.value,
        competitionId: p.competitionId,
      })
    }
  }
  for (const byKey of tally.values()) for (const c of byKey.values()) c.entries.sort((a, b) => b.end.localeCompare(a.end))
  return tally
}

/** Sum of a user's counts for one kind across metrics (or every kind when `kind` is omitted). */
export function totalCounts(tally: MedalTally, userId: string, kind?: PodiumKind): MedalCounts {
  const total = emptyCounts()
  for (const [key, c] of tally.get(userId) ?? []) {
    if (kind && !key.startsWith(`${kind}:`)) continue
    total.gold += c.gold
    total.silver += c.silver
    total.bronze += c.bronze
    total.entries.push(...c.entries)
  }
  total.entries.sort((a, b) => b.end.localeCompare(a.end))
  return total
}

/** First night date across everyone (periods before it can't have a podium), or `fallback` when there are no nights. */
export function earliestNight(index: NightIndex, fallback: string): string {
  let min: string | null = null
  for (const byDate of index.values()) for (const d of byDate.keys()) if (min == null || d < min) min = d
  return min ?? fallback
}
