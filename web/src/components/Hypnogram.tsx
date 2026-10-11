import type { RawSegment } from '../hooks/queries'

const ROWS: RawSegment['stage'][] = ['awake', 'rem', 'core', 'deep']
const LABEL: Record<string, string> = { awake: 'Awake', rem: 'REM', core: 'Core', deep: 'Deep', asleep: 'Asleep' }
const FILL: Record<string, string> = {
  awake: 'var(--chart-line)',
  rem: 'var(--chart-rem)',
  core: 'var(--chart-bar)',
  deep: 'var(--chart-deep)',
  asleep: 'var(--chart-bar)',
}
const W = 340
const ROW_H = 26
const PAD_L = 44

export function Hypnogram({ segments, timeZone }: { segments: RawSegment[]; timeZone?: string | null }) {
  if (segments.length === 0) return null
  const rows = segments.some((s) => s.stage === 'asleep') ? [...ROWS, 'asleep' as const] : ROWS
  const t0 = Math.min(...segments.map((s) => Date.parse(s.start)))
  const t1 = Math.max(...segments.map((s) => Date.parse(s.end)))
  const x = (t: number) => PAD_L + ((t - t0) / (t1 - t0)) * (W - PAD_L - 4)
  const H = rows.length * ROW_H + 20
  const hour = (t: number) => new Date(t).toLocaleTimeString('en-AU', { hour: 'numeric', hour12: true, timeZone: timeZone ?? undefined }).replace(' ', '')
  // an hour tick for roughly every 1-2 hours across the night
  const stepH = (t1 - t0) / 3_600_000 > 8 ? 2 : 1
  const ticks: number[] = []
  const first = Math.ceil(t0 / 3_600_000) * 3_600_000
  for (let t = first, i = 0; t < t1; t += 3_600_000, i++) if (i % stepH === 0) ticks.push(t)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Sleep stages through the night">
      {rows.map((r, i) => (
        <g key={r}>
          <line x1={PAD_L} x2={W - 4} y1={i * ROW_H + ROW_H / 2} y2={i * ROW_H + ROW_H / 2} style={{ stroke: 'var(--chart-grid)' }} />
          <text x={0} y={i * ROW_H + ROW_H / 2 + 3}>{LABEL[r]}</text>
        </g>
      ))}
      {segments.map((s, k) => {
        const i = rows.indexOf(s.stage)
        if (i < 0) return null
        const x0 = x(Date.parse(s.start))
        return (
          <rect key={k} x={x0} y={i * ROW_H + 5} width={Math.max(1, x(Date.parse(s.end)) - x0)} height={ROW_H - 10} rx={2} style={{ fill: FILL[s.stage] }} />
        )
      })}
      {ticks.map((t) => (
        <text key={t} x={x(t)} y={H - 4} textAnchor="middle">{hour(t)}</text>
      ))}
    </svg>
  )
}
