import { addDays, dayNumFromISO, isoFromDayNum, todayISO } from './dates.ts'

export type PeriodKind = 'week' | 'fortnight' | 'month' | 'season' | 'half' | 'year'

export const PERIOD_LABELS: Record<PeriodKind, string> = {
  week: 'Week',
  fortnight: 'Fortnight',
  month: 'Month',
  season: 'Season',
  half: '6 months',
  year: 'Year',
}

export interface PeriodRange {
  start: string
  end: string
  label: string
  isCurrent: boolean
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const EPOCH_MONDAY = dayNumFromISO('2024-01-01')

function ymd(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m: m - 1, d }
}

function range(startNum: number, endNum: number, label: string, today: number, offset: number): PeriodRange {
  return { start: isoFromDayNum(startNum), end: isoFromDayNum(endNum), label, isCurrent: offset === 0 && today >= startNum && today <= endNum }
}

/**
 * The period `offset` steps from the one containing `todayStr` (offset 0 = that one, -1 = the one before, etc.).
 * Pure: pass any date as `todayStr`. Seasons are southern hemisphere (Dec–Feb summer).
 */
export function periodRangeAt(kind: PeriodKind, offset: number, todayStr: string): PeriodRange {
  const today = dayNumFromISO(todayStr)
  const { y, m } = ymd(todayStr)

  switch (kind) {
    case 'week': {
      const dow = (new Date(today * 86_400_000).getUTCDay() + 6) % 7
      const start = today - dow + offset * 7
      return range(start, start + 6, `${fmt(start)} – ${fmt(start + 6)}`, today, offset)
    }
    case 'fortnight': {
      const idx = Math.floor((today - EPOCH_MONDAY) / 14) + offset
      const start = EPOCH_MONDAY + idx * 14
      return range(start, start + 13, `${fmt(start)} – ${fmt(start + 13)}`, today, offset)
    }
    case 'month': {
      const total = y * 12 + m + offset
      const yy = Math.floor(total / 12)
      const mm = total % 12
      const start = Date.UTC(yy, mm, 1) / 86_400_000
      const end = Date.UTC(yy, mm + 1, 0) / 86_400_000
      return range(start, end, `${MONTHS[mm]} ${yy}`, today, offset)
    }
    case 'season': {
      const block = Math.floor((y * 12 + m + 1) / 3) + offset
      const startTotal = block * 3 - 1
      const sy = Math.floor(startTotal / 12)
      const sm = startTotal % 12
      const start = Date.UTC(sy, sm, 1) / 86_400_000
      const end = Date.UTC(sy, sm + 3, 0) / 86_400_000
      const name = { 11: 'Summer', 2: 'Autumn', 5: 'Winter', 8: 'Spring' }[sm] ?? 'Season'
      const label = sm === 11 ? `${name} ${String(sy).slice(2)}/${String(sy + 1).slice(2)}` : `${name} ${sy}`
      return range(start, end, label, today, offset)
    }
    case 'half': {
      const idx = y * 2 + (m < 6 ? 0 : 1) + offset
      const yy = Math.floor(idx / 2)
      const h = idx % 2
      const start = Date.UTC(yy, h * 6, 1) / 86_400_000
      const end = Date.UTC(yy, h * 6 + 6, 0) / 86_400_000
      return range(start, end, `${h === 0 ? 'Jan–Jun' : 'Jul–Dec'} ${yy}`, today, offset)
    }
    case 'year': {
      const yy = y + offset
      return range(Date.UTC(yy, 0, 1) / 86_400_000, Date.UTC(yy, 11, 31) / 86_400_000, String(yy), today, offset)
    }
  }
}

// offset 0 = current period, -1 = previous, etc., as seen in `timeZone`.
export function periodRange(kind: PeriodKind, offset: number, timeZone?: string): PeriodRange {
  return periodRangeAt(kind, offset, todayISO(timeZone))
}

/** Periods that ended before `asOf` (a YYYY-MM-DD date), newest first, stopping once a period ends before `earliest`. */
export function completedPeriods(kind: PeriodKind, asOf: string, earliest: string): PeriodRange[] {
  const out: PeriodRange[] = []
  for (let offset = -1; offset > -2000; offset--) {
    const r = periodRangeAt(kind, offset, asOf)
    if (r.end < earliest) break
    out.push(r)
  }
  return out
}

/** The offset (relative to `todayStr`) of the period starting on `startISO`, or null if no period starts then. */
export function periodOffset(kind: PeriodKind, startISO: string, todayStr: string): number | null {
  const current = periodRangeAt(kind, 0, todayStr)
  if (startISO > current.start) return null
  for (let offset = 0; offset > -2000; offset--) {
    const r = periodRangeAt(kind, offset, todayStr)
    if (r.start === startISO) return offset
    if (r.start < startISO) return null
  }
  return null
}

/** A label that includes the year, e.g. "Week of 6 Oct 2026" or "Spring 2026". */
export function periodTitle(kind: PeriodKind, r: Pick<PeriodRange, 'start' | 'label'>): string {
  if (kind === 'week' || kind === 'fortnight') {
    const { y, m, d } = ymd(r.start)
    return `${PERIOD_LABELS[kind]} of ${d} ${MONTHS[m]} ${y}`
  }
  return r.label
}

/** Number of calendar days a period covers. */
export function periodLength(r: Pick<PeriodRange, 'start' | 'end'>): number {
  return dayNumFromISO(r.end) - dayNumFromISO(r.start) + 1
}

/** The day after a period ends. */
export function dayAfter(r: Pick<PeriodRange, 'end'>): string {
  return addDays(r.end, 1)
}

function fmt(dayNum: number): string {
  const { m, d } = ymd(isoFromDayNum(dayNum))
  return `${d} ${MONTHS[m]}`
}
