// Calendar dates are handled as 'YYYY-MM-DD' strings and day numbers (days since epoch, UTC math)
// so DST never shifts a day.

export function isoFromDayNum(n: number): string {
  return new Date(n * 86_400_000).toISOString().slice(0, 10)
}

export function dayNumFromISO(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / 86_400_000
}

export function todayISO(timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  return parts // en-CA formats as YYYY-MM-DD
}

export function addDays(iso: string, n: number): string {
  return isoFromDayNum(dayNumFromISO(iso) + n)
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
