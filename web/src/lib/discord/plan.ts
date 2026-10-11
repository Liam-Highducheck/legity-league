import { addDays, zonedNow } from '../dates.ts'
import { periodRangeAt, periodTitle, type PeriodKind, type PeriodRange } from '../periods.ts'
import type { Competition } from '../league/types.ts'

export interface DueItem {
  kind: 'period' | 'championship'
  /** Idempotency key stored in discord_posted: "period:week:2026-10-05" or "championship:<id>". */
  key: string
  /** The local date the post became due (the day after the period or competition ended). */
  dueDate: string
  period?: { kind: PeriodKind; range: PeriodRange; title: string }
  competition?: Competition
}

export interface DueOptions {
  now: Date
  /** The group's timezone. */
  timeZone: string
  /** Local hour (0-23) the post goes out on the day after a period ends. */
  postHour: number
  kinds: PeriodKind[]
  postChampionships: boolean
  competitions: Competition[]
  /** When posting was switched on. Anything that came due before this is never posted. */
  enabledAt: Date | null
  /** Anything that came due longer ago than this many days is dropped, so an outage can't flood the channel. */
  lookbackDays?: number
}

/**
 * Which summaries are due right now. Everything is compared as (local date, local hour), never converted back to an
 * instant, so daylight saving changes can't skew it. Posting is "at or after the due hour" so a missed run catches up.
 */
export function dueItems(o: DueOptions): DueItem[] {
  const lookback = o.lookbackDays ?? 3
  const local = zonedNow(o.timeZone, o.now)
  const enabled = o.enabledAt ? zonedNow(o.timeZone, o.enabledAt) : null
  const oldest = addDays(local.date, -lookback)

  const isDue = (dueDate: string) => local.date > dueDate || (local.date === dueDate && local.hour >= o.postHour)
  const afterEnabled = (dueDate: string) =>
    !enabled || dueDate > enabled.date || (dueDate === enabled.date && o.postHour > enabled.hour)

  const out: DueItem[] = []
  for (const kind of o.kinds) {
    for (let offset = -1; offset > -60; offset--) {
      const range = periodRangeAt(kind, offset, local.date)
      const dueDate = addDays(range.end, 1)
      if (dueDate < oldest) break
      if (isDue(dueDate) && afterEnabled(dueDate)) {
        out.push({ kind: 'period', key: `period:${kind}:${range.start}`, dueDate, period: { kind, range, title: periodTitle(kind, range) } })
      }
    }
  }
  if (o.postChampionships) {
    for (const competition of o.competitions) {
      const dueDate = addDays(competition.ends_on, 1)
      if (dueDate >= oldest && isDue(dueDate) && afterEnabled(dueDate)) {
        out.push({ kind: 'championship', key: `championship:${competition.id}`, dueDate, competition })
      }
    }
  }
  return out.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.key.localeCompare(b.key))
}
