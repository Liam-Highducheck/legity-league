// GENERATED from packages/core/src/league/records.ts by scripts/sync-shared.mjs. Do not edit here: change the source and run
//   node scripts/sync-shared.mjs
import { addDays, daysBetween, formatDayPlain } from '../dates.ts'
import { formatDuration, formatSpread, minutesToClock } from '../format.ts'
import { completedPeriods, periodTitle, type PeriodKind } from '../periods.ts'
import { interruptionPoints } from '../score/apple.ts'
import { divisionOf } from './device.ts'
import { isBetter } from './rank.ts'
import { LEAGUE_KINDS, type Division, type LeagueMember, type LeagueNight } from './types.ts'
import { bedtimeOf, indexNights, parseClock, quantizeStat, windowNights, windowStats, type RecordStat, type WindowStats } from './windows.ts'

export type { RecordStat }

export type RecordScope = 'night' | PeriodKind

export interface RecordCategory {
  /**
   * `${scope}:${stat}:${division}` (a `~` after the scope marks rolling), e.g. "week:duration:watch" or
   * "week~:duration:watch". Stable: the non-rolling keys are stored as Discord announcement markers.
   */
  key: string
  scope: RecordScope
  stat: RecordStat
  division: Division
  direction: 'max' | 'min'
  label: string
  /** Any N consecutive days instead of a calendar period. */
  rolling: boolean
  /** Part of the "more statistics" page rather than the main records. */
  advanced: boolean
}

export interface RecordOptions {
  /** Rolling windows (any N consecutive days) instead of calendar periods. */
  rolling?: boolean
  /** The detailed stats (REM, deep sleep, interruptions) instead of the main ones. */
  advanced?: boolean
}

/** Length of a rolling window per period kind. Calendar months and seasons vary, so rolling uses 30 and 90 days. */
export const ROLLING_DAYS: Record<PeriodKind, number> = { week: 7, fortnight: 14, month: 30, season: 90, half: 182, year: 365 }

const ADJECTIVE: Record<PeriodKind, string> = {
  week: 'weekly',
  fortnight: 'fortnightly',
  month: 'monthly',
  season: 'seasonal',
  half: 'six-monthly',
  year: 'yearly',
}

const NIGHT_LABELS: Record<RecordStat, string> = {
  duration: 'Longest night',
  restorative: 'Most restorative night',
  spread: '',
  gap: '',
  score: 'Best night score',
  rem: 'Most REM sleep',
  deep: 'Most deep sleep',
  interruptions: 'Best interruptions score',
}

const WINDOW_NOUN: Record<RecordStat, string> = {
  duration: 'average duration',
  restorative: 'average restorative time',
  spread: '',
  gap: '',
  score: 'average score',
  rem: 'average REM sleep',
  deep: 'average deep sleep',
  interruptions: 'average interruptions score',
}

function labelFor(scope: RecordScope, stat: RecordStat, rolling: boolean): string {
  if (scope === 'night') return NIGHT_LABELS[stat]
  const span = rolling ? `rolling ${ROLLING_DAYS[scope]}-day` : ADJECTIVE[scope]
  if (stat === 'spread') return `Most consistent ${rolling ? `bedtime over ${ROLLING_DAYS[scope]} days` : `${span} bedtime`}`
  if (stat === 'gap') return rolling ? `Bedtime closest to target over ${ROLLING_DAYS[scope]} days` : `${span[0].toUpperCase()}${span.slice(1)} bedtime closest to target`
  return `Best ${span} ${WINDOW_NOUN[stat]}`
}

interface StatDef {
  stat: RecordStat
  divisions: Division[]
  /** Only exists for windows of nights (a single night has no spread). */
  windowOnly?: boolean
}

const BOTH: Division[] = ['watch', 'phone']

/**
 * Main records, in the order they are shown: longest duration, longest restorative time, most consistent bedtime,
 * bedtime closest to target, best score. Restorative and score need stage data, so they are Watch records only.
 */
const MAIN_STATS: StatDef[] = [
  { stat: 'duration', divisions: BOTH },
  { stat: 'restorative', divisions: ['watch'] },
  { stat: 'spread', divisions: BOTH, windowOnly: true },
  { stat: 'gap', divisions: BOTH, windowOnly: true },
  { stat: 'score', divisions: ['watch'] },
]

/** The detailed page: REM, deep sleep and the interruptions score (all need Watch-quality data). */
const ADVANCED_STATS: StatDef[] = [
  { stat: 'rem', divisions: ['watch'] },
  { stat: 'deep', divisions: ['watch'] },
  { stat: 'interruptions', divisions: ['watch'] },
]

export function recordCategories(kinds: PeriodKind[] = LEAGUE_KINDS, opts: RecordOptions = {}): RecordCategory[] {
  const rolling = !!opts.rolling
  const advanced = !!opts.advanced
  const defs = advanced ? ADVANCED_STATS : MAIN_STATS
  // Rolling windows have no "single night" scope (that is the same record either way).
  const scopes: RecordScope[] = rolling ? kinds : ['night', ...kinds]
  const out: RecordCategory[] = []
  for (const scope of scopes) {
    for (const def of defs) {
      if (scope === 'night' && def.windowOnly) continue
      for (const division of def.divisions) {
        out.push({
          key: `${scope}${rolling ? '~' : ''}:${def.stat}:${division}`,
          scope,
          stat: def.stat,
          division,
          direction: def.stat === 'spread' || def.stat === 'gap' ? 'min' : 'max',
          label: labelFor(scope, def.stat, rolling),
          rolling,
          advanced,
        })
      }
    }
  }
  return out
}

export function formatRecordValue(stat: RecordStat, v: number): string {
  if (stat === 'duration' || stat === 'restorative' || stat === 'rem' || stat === 'deep') return formatDuration(v)
  if (stat === 'score') return String(Math.round(v * 10) / 10)
  if (stat === 'interruptions') return `${Math.round(v * 10) / 10}/20`
  return formatSpread('duration', v)
}

/** What a single night contributes to a stat (bedtime stats use the bedtime itself; the gap is to `target`). */
export function nightStat(n: LeagueNight, stat: RecordStat, target?: string | null): number | null {
  switch (stat) {
    case 'duration': return n.duration_min
    case 'restorative': return n.restorative_min
    case 'score': return n.sleep_score
    case 'rem': return n.rem_min
    case 'deep': return n.deep_min
    case 'interruptions': return n.awake_min == null || n.wake_count == null ? null : interruptionPoints(n.wake_count, n.awake_min).points
    case 'spread': return bedtimeOf(n)?.onset ?? null
    case 'gap': {
      const c = bedtimeOf(n)
      const t = parseClock(target)
      if (!c || t == null) return null
      const d = Math.abs(c.minutes - t) % 1440
      return Math.min(d, 1440 - d)
    }
  }
}

/** A night's value for a stat, written for a list of nights: bedtime stats show the clock time. */
export function formatNightStat(n: LeagueNight, stat: RecordStat, target?: string | null): string {
  const v = nightStat(n, stat, target)
  if (v == null) return '—'
  const bed = bedtimeOf(n)
  if (stat === 'spread') return bed ? minutesToClock(bed.minutes) : '—'
  if (stat === 'gap') return `${bed ? minutesToClock(bed.minutes) : '—'} (${formatSpread('duration', v)} off)`
  return formatRecordValue(stat, quantizeStat(stat, v))
}

export interface Achievement {
  categoryKey: string
  userId: string
  value: number
  /** The night's date, or the last day of the period or window for averages. */
  achievedOn: string
  start?: string
  end?: string
  title?: string
}

type Contribution = [stat: RecordStat, division: Division, value: number | null][]

function windowContributions(st: WindowStats, advanced: boolean): Contribution {
  const watch = st.division === 'watch'
  if (advanced) {
    return [
      ['rem', 'watch', watch ? st.rem : null],
      ['deep', 'watch', watch ? st.deep : null],
      ['interruptions', 'watch', watch ? st.interruptions : null],
    ]
  }
  return [
    ['duration', st.division, st.duration],
    ['restorative', 'watch', watch ? st.restorative : null],
    ['score', 'watch', watch ? st.score : null],
    ['spread', st.division, st.spread],
    ['gap', st.division, st.gap],
  ]
}

/**
 * Every value anyone has achieved in any category. Calendar windows count only when COMPLETE (they ended before
 * `asOf`); rolling windows (any N consecutive days, ending on or before `asOf`) need a night on every one of the days.
 */
export function collectAchievements(
  members: LeagueMember[],
  nights: LeagueNight[],
  asOf: string,
  kinds: PeriodKind[] = LEAGUE_KINDS,
  opts: RecordOptions = {},
): Achievement[] {
  const rolling = !!opts.rolling
  const advanced = !!opts.advanced
  const out: Achievement[] = []
  const ids = new Set(members.map((m) => m.user_id))
  const mine = nights.filter((n) => ids.has(n.user_id))
  const index = indexNights(mine)
  const push = (scope: RecordScope, stat: RecordStat, division: Division, userId: string, value: number, extra: Partial<Achievement>) =>
    out.push({ categoryKey: `${scope}${rolling ? '~' : ''}:${stat}:${division}`, userId, value: quantizeStat(stat, value), achievedOn: '', ...extra })

  if (!rolling) {
    for (const n of mine) {
      const division = divisionOf(n.device)
      if (!division) continue
      const watch = division === 'watch'
      const singles: [RecordStat, Division, number | null][] = advanced
        ? [['rem', 'watch', watch ? nightStat(n, 'rem') : null], ['deep', 'watch', watch ? nightStat(n, 'deep') : null], ['interruptions', 'watch', watch ? nightStat(n, 'interruptions') : null]]
        : [['duration', division, n.duration_min], ['restorative', 'watch', watch ? n.restorative_min : null], ['score', 'watch', watch ? n.sleep_score : null]]
      for (const [stat, div, value] of singles) if (value != null) push('night', stat, div, n.user_id, value, { achievedOn: n.night_date })
    }
  }

  if (mine.length === 0) return out
  const earliest = mine.reduce((min, n) => (n.night_date < min ? n.night_date : min), mine[0].night_date)
  const targets = new Map(members.map((m) => [m.user_id, m.target_bedtime]))

  for (const kind of kinds) {
    if (!rolling) {
      for (const period of completedPeriods(kind, asOf, earliest)) {
        const title = periodTitle(kind, period)
        for (const m of members) {
          const window = windowNights(index.get(m.user_id), period.start, period.end)
          const st = window && windowStats(window, m.target_bedtime)
          if (!st) continue
          for (const [stat, division, value] of windowContributions(st, advanced)) {
            if (value != null) push(kind, stat, division, m.user_id, value, { achievedOn: period.end, start: period.start, end: period.end, title })
          }
        }
      }
      continue
    }
    const days = ROLLING_DAYS[kind]
    for (const [userId, byDate] of index) {
      for (const end of byDate.keys()) {
        if (end > asOf) continue
        const start = addDays(end, -(days - 1))
        const window = windowNights(byDate, start, end)
        const st = window && windowStats(window, targets.get(userId))
        if (!st) continue
        const title = `${formatDayPlain(start)} to ${formatDayPlain(end)}`
        for (const [stat, division, value] of windowContributions(st, advanced)) {
          if (value != null) push(kind, stat, division, userId, value, { achievedOn: end, start, end, title })
        }
      }
    }
  }
  return out
}

export interface Holder {
  userId: string
  achievedOn: string
  start?: string
  end?: string
  title?: string
}

export interface RecordEvent {
  categoryKey: string
  value: number
  achievedOn: string
  /** Who set it (more than one when several people reached the same value on the same day). */
  holders: Holder[]
  /** Later matches of the same value by someone else. */
  ties: Holder[]
  /** The record this one beat, or null for the first value in the category. */
  previous: { value: number; holders: Holder[]; achievedOn: string; stoodDays: number } | null
  /** When this record was beaten; null while it still stands. */
  supersededOn: string | null
  /** Days it stood: until it was beaten, or until `asOf` while it still stands. */
  stoodDays: number
}

export interface CategoryReport {
  category: RecordCategory
  /** Chronological; the last one is the current record. */
  events: RecordEvent[]
  current: RecordEvent | null
}

export interface UserRecords {
  /** Category keys currently held (outright or tied). */
  held: string[]
  /** Subset of `held` where the user only tied the record. */
  tied: string[]
  /** Records ever set (every event they are a holder of). */
  setAllTime: number
  /** Times they tied a record. */
  tiedAllTime: number
}

export interface RecordsReport {
  asOf: string
  categories: CategoryReport[]
  byUser: Map<string, UserRecords>
}

function toHolder(a: Achievement): Holder {
  return { userId: a.userId, achievedOn: a.achievedOn, start: a.start, end: a.end, title: a.title }
}

/**
 * Replays achievements in date order. A record is broken only by a STRICTLY better value; an equal value by someone
 * else becomes a tie, and by the same person is ignored. People reaching the best value on the same day share it.
 */
export function replayRecords(achievements: Achievement[], categories: RecordCategory[], asOf: string): CategoryReport[] {
  const byCategory = new Map<string, Achievement[]>()
  for (const a of achievements) {
    const list = byCategory.get(a.categoryKey)
    if (list) list.push(a)
    else byCategory.set(a.categoryKey, [a])
  }

  return categories.map((category) => {
    const list = (byCategory.get(category.key) ?? []).sort((a, b) => a.achievedOn.localeCompare(b.achievedOn))
    const events: RecordEvent[] = []
    let current: RecordEvent | null = null

    for (let i = 0; i < list.length; ) {
      const date = list[i].achievedOn
      const day: Achievement[] = []
      while (i < list.length && list[i].achievedOn === date) day.push(list[i++])
      const best = day.reduce((b, a) => (isBetter(a.value, b, category.direction) ? a.value : b), day[0].value)
      const atBest: Holder[] = []
      for (const a of day) if (a.value === best && !atBest.some((h) => h.userId === a.userId)) atBest.push(toHolder(a))

      if (!current) {
        current = { categoryKey: category.key, value: best, achievedOn: date, holders: atBest, ties: [], previous: null, supersededOn: null, stoodDays: 0 }
        events.push(current)
      } else if (isBetter(best, current.value, category.direction)) {
        current.supersededOn = date
        current.stoodDays = daysBetween(current.achievedOn, date)
        const previous: NonNullable<RecordEvent['previous']> = { value: current.value, holders: current.holders, achievedOn: current.achievedOn, stoodDays: current.stoodDays }
        current = { categoryKey: category.key, value: best, achievedOn: date, holders: atBest, ties: [], previous, supersededOn: null, stoodDays: 0 }
        events.push(current)
      } else if (best === current.value) {
        for (const h of atBest) {
          if (!current.holders.some((x) => x.userId === h.userId) && !current.ties.some((x) => x.userId === h.userId)) current.ties.push(h)
        }
      }
    }
    if (current) current.stoodDays = Math.max(0, daysBetween(current.achievedOn, asOf))
    return { category, events, current }
  })
}

function summarise(reports: CategoryReport[]): Map<string, UserRecords> {
  const byUser = new Map<string, UserRecords>()
  const get = (id: string) => {
    let u = byUser.get(id)
    if (!u) byUser.set(id, (u = { held: [], tied: [], setAllTime: 0, tiedAllTime: 0 }))
    return u
  }
  for (const r of reports) {
    for (const e of r.events) {
      for (const h of e.holders) get(h.userId).setAllTime++
      for (const h of e.ties) get(h.userId).tiedAllTime++
    }
    if (!r.current) continue
    for (const h of r.current.holders) get(h.userId).held.push(r.category.key)
    for (const h of r.current.ties) {
      const u = get(h.userId)
      u.held.push(r.category.key)
      u.tied.push(r.category.key)
    }
  }
  return byUser
}

export function computeRecords(
  members: LeagueMember[],
  nights: LeagueNight[],
  asOf: string,
  kinds: PeriodKind[] = LEAGUE_KINDS,
  opts: RecordOptions = {},
): RecordsReport {
  const categories = replayRecords(collectAchievements(members, nights, asOf, kinds, opts), recordCategories(kinds, opts), asOf)
  return { asOf, categories, byUser: summarise(categories) }
}

// ---- Discord announcements --------------------------------------------------------------------------

/** What has already been announced for a category (persisted in discord_record_state). */
export interface RecordMarker {
  categoryKey: string
  value: number | null
  holderIds: string[]
}

export interface Announcement {
  category: RecordCategory
  event: RecordEvent
  /** Persist this only after the message was delivered, so a failed send is retried on the next run. */
  marker: RecordMarker
}

function markerFor(r: CategoryReport): RecordMarker {
  return {
    categoryKey: r.category.key,
    value: r.current?.value ?? null,
    holderIds: r.current ? [...r.current.holders, ...r.current.ties].map((h) => h.userId).sort() : [],
  }
}

function sameMarker(a: RecordMarker, b: RecordMarker): boolean {
  return a.value === b.value && a.holderIds.join(',') === b.holderIds.join(',')
}

/**
 * Compares the computed records with what was last announced. It is state-based rather than event-based, so a
 * Shortcut re-sync, a backfill of old nights or a rewrite with identical values can never produce a duplicate post.
 * Announced: a current record strictly better than the marker that beat a previous holder. Everything else
 * (first record in a category, ties, revoked records, new categories) only updates the marker, silently.
 */
export function diffAnnouncements(
  markers: Map<string, RecordMarker>,
  report: Pick<RecordsReport, 'categories'>,
): { announcements: Announcement[]; silent: RecordMarker[] } {
  const announcements: Announcement[] = []
  const silent: RecordMarker[] = []
  for (const r of report.categories) {
    const next = markerFor(r)
    const known = markers.get(r.category.key)
    if (!known || known.value == null || !r.current) {
      if (!known || !sameMarker(known, next)) silent.push(next)
    } else if (isBetter(r.current.value, known.value, r.category.direction)) {
      if (r.current.previous) announcements.push({ category: r.category, event: r.current, marker: next })
      else silent.push(next)
    } else if (!sameMarker(known, next)) {
      silent.push(next)
    }
  }
  return { announcements, silent }
}
