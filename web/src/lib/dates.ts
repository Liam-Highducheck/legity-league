// Calendar dates are handled as 'YYYY-MM-DD' strings and day numbers (days since epoch, UTC math)
// so DST never shifts a day.

export function isoFromDayNum(n: number): string {
  return new Date(n * 86_400_000).toISOString().slice(0, 10)
}

export function dayNumFromISO(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / 86_400_000
}

export function todayISO(timeZone?: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  return parts // en-CA formats as YYYY-MM-DD
}

/** The calendar date and hour (0-23) it currently is in `timeZone`. Compare these tuples instead of converting back to an instant, so DST can't skew them. */
export function zonedNow(timeZone: string, now: Date = new Date()): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)!.value
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) }
}

export function addDays(iso: string, n: number): string {
  return isoFromDayNum(dayNumFromISO(iso) + n)
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  return dayNumFromISO(b) - dayNumFromISO(a)
}

/** Every date from start to end inclusive. */
export function eachDay(start: string, end: string): string[] {
  const out: string[] = []
  for (let d = dayNumFromISO(start), last = dayNumFromISO(end); d <= last; d++) out.push(isoFromDayNum(d))
  return out
}

export function formatDay(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function formatShortDay(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}
