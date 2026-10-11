import { daysBetween } from '../dates.ts'
import { formatDuration, formatSpread } from '../format.ts'
import { completedPeriods, periodTitle, type PeriodKind } from '../periods.ts'
import { divisionOf } from './device.ts'
import { isBetter } from './rank.ts'
import { LEAGUE_KINDS, type Division, type LeagueMember, type LeagueNight } from './types.ts'
import { indexNights, quantizeStat, windowNights, windowStats, type RecordStat } from './windows.ts'

export type { RecordStat }

export type RecordScope = 'night' | PeriodKind

export interface RecordCategory {
  /** `${scope}:${stat}:${division}`, e.g. "week:duration:watch". Stable: it is stored as the Discord announcement marker. */
  key: string
  scope: RecordScope
  stat: RecordStat
  division: Division
  direction: 'max' | 'min'
  label: string
}

const ADJECTIVE: Record<PeriodKind, string> = {
  week: 'weekly',
  fortnight: 'fortnightly',
  month: 'monthly',
  season: 'seasonal',
  half: 'six-monthly',
  year: 'yearly',
}

function labelFor(scope: RecordScope, stat: RecordStat): string {
  if (scope === 'night') {
    return { duration: 'Longest night', restorative: 'Most restorative night', score: 'Best night score', spread: '', gap: '' }[stat]
  }
  const adj = ADJECTIVE[scope]
  switch (stat) {
    case 'duration': return `Best ${adj} average duration`
    case 'restorative': return `Best ${adj} average restorative`
    case 'score': return `Best ${adj} average score`
    case 'spread': return `Most consistent ${adj} bedtime`
    case 'gap': return `${adj[0].toUpperCase()}${adj.slice(1)} bedtime closest to target`
  }
}

/**
 * Every record the league tracks. Duration, bedtime spread and bedtime gap exist in both divisions; restorative
 * and score need sleep-stage data, so they exist for the Watch division only.
 */
export function recordCategories(kinds: PeriodKind[] = LEAGUE_KINDS): RecordCategory[] {
  const out: RecordCategory[] = []
  const add = (scope: RecordScope, stat: RecordStat, division: Division) =>
    out.push({
      key: `${scope}:${stat}:${division}`,
      scope,
      stat,
      division,
      direction: stat === 'spread' || stat === 'gap' ? 'min' : 'max',
      label: labelFor(scope, stat),
    })
  const both: Division[] = ['watch', 'phone']
  for (const d of both) add('night', 'duration', d)
  add('night', 'restorative', 'watch')
  add('night', 'score', 'watch')
  for (const kind of kinds) {
    for (const d of both) add(kind, 'duration', d)
    add(kind, 'restorative', 'watch')
    add(kind, 'score', 'watch')
    for (const d of both) add(kind, 'spread', d)
    for (const d of both) add(kind, 'gap', d)
  }
  return out
}

export function formatRecordValue(stat: RecordStat, v: number): string {
  if (stat === 'duration' || stat === 'restorative') return formatDuration(v)
  if (stat === 'score') return String(Math.round(v * 10) / 10)
  return formatSpread('duration', v)
}

export interface Achievement {
  categoryKey: string
  userId: string
  value: number
  /** The night's date, or the last day of the period for window averages. */
  achievedOn: string
  start?: string
  end?: string
  title?: string
}

/** Every value anyone has achieved in any category. Windows count only when COMPLETE (they ended before `asOf`). */
export function collectAchievements(
  members: LeagueMember[],
  nights: LeagueNight[],
  asOf: string,
  kinds: PeriodKind[] = LEAGUE_KINDS,
): Achievement[] {
  const out: Achievement[] = []
  const ids = new Set(members.map((m) => m.user_id))
  const mine = nights.filter((n) => ids.has(n.user_id))
  const index = indexNights(mine)

  for (const n of mine) {
    const division = divisionOf(n.device)
    if (!division) continue
    out.push({ categoryKey: `night:duration:${division}`, userId: n.user_id, value: quantizeStat('duration', n.duration_min), achievedOn: n.night_date })
    if (division === 'watch' && n.restorative_min != null) {
      out.push({ categoryKey: 'night:restorative:watch', userId: n.user_id, value: quantizeStat('restorative', n.restorative_min), achievedOn: n.night_date })
    }
    if (division === 'watch' && n.sleep_score != null) {
      out.push({ categoryKey: 'night:score:watch', userId: n.user_id, value: quantizeStat('score', n.sleep_score), achievedOn: n.night_date })
    }
  }

  if (mine.length === 0) return out
  const earliest = mine.reduce((min, n) => (n.night_date < min ? n.night_date : min), mine[0].night_date)
  for (const kind of kinds) {
    for (const period of completedPeriods(kind, asOf, earliest)) {
      const title = periodTitle(kind, period)
      for (const m of members) {
        const window = windowNights(index.get(m.user_id), period.start, period.end)
        const st = window && windowStats(window, m.target_bedtime)
        if (!st) continue
        const base = { userId: m.user_id, achievedOn: period.end, start: period.start, end: period.end, title }
        out.push({ ...base, categoryKey: `${kind}:duration:${st.division}`, value: st.duration })
        if (st.division === 'watch' && st.restorative != null) out.push({ ...base, categoryKey: `${kind}:restorative:watch`, value: st.restorative })
        if (st.division === 'watch' && st.score != null) out.push({ ...base, categoryKey: `${kind}:score:watch`, value: st.score })
        if (st.spread != null) out.push({ ...base, categoryKey: `${kind}:spread:${st.division}`, value: st.spread })
        if (st.gap != null) out.push({ ...base, categoryKey: `${kind}:gap:${st.division}`, value: st.gap })
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
): RecordsReport {
  const categories = replayRecords(collectAchievements(members, nights, asOf, kinds), recordCategories(kinds), asOf)
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
