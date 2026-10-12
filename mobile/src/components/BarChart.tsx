import { Line, Polyline, Rect, Text as SvgText } from 'react-native-svg'
import { dayNumFromISO } from '@legity/core/dates'
import { useColors } from '../lib/theme'
import { ScaledSvg } from './ScaledSvg'

export interface BarPoint {
  date: string
  value: number | null
}

interface Props {
  data: BarPoint[]
  /** optional overlay line (same length as data) */
  line?: (number | null)[]
  goal?: number
  format: (v: number) => string
  height?: number
}

const W = 340

export function BarChart({ data, line, goal, format, height = 180 }: Props) {
  const c = useColors()
  const padL = 4
  const padB = 20
  const padT = 10
  const max = Math.max(1, goal ?? 0, ...data.map((d) => d.value ?? 0), ...(line ?? []).map((v) => v ?? 0)) * 1.08
  const innerH = height - padB - padT
  const slot = (W - padL) / data.length
  const barW = Math.max(2, Math.min(18, slot * 0.68))
  const y = (v: number) => padT + innerH - (v / max) * innerH
  const x = (i: number) => padL + slot * i + slot / 2

  const labelIdx = data.length <= 7 ? data.map((_, i) => i) : [0, Math.floor(data.length / 2), data.length - 1]
  const dayLabel = (iso: string) => {
    const d = new Date(dayNumFromISO(iso) * 86_400_000)
    return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`
  }

  const linePts = (line ?? [])
    .map((v, i) => (v == null ? null : `${x(i)},${y(v)}`))
    .filter(Boolean)
    .join(' ')

  return (
    <ScaledSvg w={W} h={height}>
      {goal != null && <Line x1={padL} x2={W} y1={y(goal)} y2={y(goal)} stroke={c.chartGrid} strokeDasharray="4 4" />}
      {data.map((d, i) =>
        d.value == null ? null : (
          <Rect
            key={d.date}
            x={x(i) - barW / 2}
            y={y(d.value)}
            width={barW}
            height={Math.max(1, padT + innerH - y(d.value))}
            rx={Math.min(4, barW / 2)}
            fill={goal != null && d.value >= goal ? c.chartHit : c.chartBar}
          />
        ),
      )}
      {goal != null && (
        <SvgText x={W - 2} y={y(goal) - 4} textAnchor="end" fill={c.muted} fontSize={10} stroke={c.surface} strokeWidth={3} strokeLinejoin="round">
          {format(goal)}
        </SvgText>
      )}
      {linePts ? (
        <>
          <Polyline points={linePts} fill="none" stroke={c.surface} strokeWidth={5} strokeLinejoin="round" />
          <Polyline points={linePts} fill="none" stroke={c.chartLine} strokeWidth={2} strokeLinejoin="round" strokeDasharray="5 3" />
        </>
      ) : null}
      {labelIdx.map((i) => (
        <SvgText
          key={i}
          x={i === 0 ? padL : i === data.length - 1 ? W - 2 : x(i)}
          y={height - 5}
          textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
          fill={c.muted}
          fontSize={10}
        >
          {dayLabel(data[i].date)}
        </SvgText>
      ))}
    </ScaledSvg>
  )
}
