export function formatDuration(min: number | null | undefined): string {
  if (min == null) return '—'
  const rounded = Math.round(min)
  const h = Math.floor(rounded / 60)
  const m = rounded % 60
  return `${h}h ${String(m).padStart(2, '0')}m`
}

export function formatMetric(metric: 'duration' | 'restorative' | 'score', v: number | null): string {
  if (v == null) return '—'
  return metric === 'score' ? String(Math.round(v)) : formatDuration(v)
}

export function hhmm(t: string): string {
  return t.slice(0, 5)
}

export function minutesToClock(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  const h24 = Math.floor(m / 60)
  const suffix = h24 >= 12 ? 'pm' : 'am'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${String(m % 60).padStart(2, '0')}${suffix}`
}

export function initials(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '?'
}
