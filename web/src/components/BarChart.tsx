import { dayNumFromISO } from '../lib/dates'

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
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" role="img" aria-label="Sleep chart">
      {goal != null && (
        <>
          <line x1={padL} x2={W} y1={y(goal)} y2={y(goal)} stroke="#2a3158" strokeDasharray="4 4" />
          <text x={W - 2} y={y(goal) - 3} textAnchor="end">{format(goal)}</text>
        </>
      )}
      {data.map((d, i) =>
        d.value == null ? null : (
          <rect
            key={d.date}
            x={x(i) - barW / 2}
            y={y(d.value)}
            width={barW}
            height={Math.max(1, padT + innerH - y(d.value))}
            rx={Math.min(4, barW / 2)}
            fill={goal != null && d.value >= goal ? '#5eead4' : '#8b7cff'}
          />
        ),
      )}
      {linePts && <polyline points={linePts} fill="none" stroke="#ffd166" strokeWidth="2" strokeLinejoin="round" strokeDasharray="5 3" />}
      {labelIdx.map((i) => (
        <text key={i} x={x(i)} y={height - 5} textAnchor="middle">{dayLabel(data[i].date)}</text>
      ))}
    </svg>
  )
}
