import { G, Line, Rect, Text as SvgText } from 'react-native-svg'
import type { RawSegment } from '@legity/data/queries'
import { useColors } from '../lib/theme'
import { ScaledSvg } from './ScaledSvg'

const ROWS: RawSegment['stage'][] = ['awake', 'rem', 'core', 'deep']
const LABEL: Record<string, string> = { awake: 'Awake', rem: 'REM', core: 'Core', deep: 'Deep', asleep: 'Asleep' }
const W = 340
const ROW_H = 26
const PAD_L = 44

export function Hypnogram({ segments, timeZone }: { segments: RawSegment[]; timeZone?: string | null }) {
  const c = useColors()
  if (segments.length === 0) return null
  const fill: Record<string, string> = { awake: c.chartLine, rem: c.chartRem, core: c.chartBar, deep: c.chartDeep, asleep: c.chartBar }
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
    <ScaledSvg w={W} h={H}>
      {rows.map((r, i) => (
        <G key={r}>
          <Line x1={PAD_L} x2={W - 4} y1={i * ROW_H + ROW_H / 2} y2={i * ROW_H + ROW_H / 2} stroke={c.chartGrid} />
          <SvgText x={0} y={i * ROW_H + ROW_H / 2 + 3} fill={c.muted} fontSize={10}>{LABEL[r]}</SvgText>
        </G>
      ))}
      {segments.map((s, k) => {
        const i = rows.indexOf(s.stage)
        if (i < 0) return null
        const x0 = x(Date.parse(s.start))
        return <Rect key={k} x={x0} y={i * ROW_H + 5} width={Math.max(1, x(Date.parse(s.end)) - x0)} height={ROW_H - 10} rx={2} fill={fill[s.stage]} />
      })}
      {ticks.map((t) => (
        <SvgText key={t} x={x(t)} y={H - 4} textAnchor="middle" fill={c.muted} fontSize={10}>{hour(t)}</SvgText>
      ))}
    </ScaledSvg>
  )
}
