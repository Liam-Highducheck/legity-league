// GENERATED from web/src/lib/format.ts by scripts/sync-shared.mjs. Do not edit here: change the source and run
//   node scripts/sync-shared.mjs
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

/** A spread/gap in minutes: "42m", or "1h 12m" from an hour up. Scores are plain numbers with one decimal. */
export function formatSpread(metric: 'duration' | 'restorative' | 'score', v: number): string {
  if (metric === 'score') return (Math.round(v * 10) / 10).toFixed(1)
  const m = Math.round(v)
  return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`
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
