import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react'

interface Props {
  /** every day the chart can scroll across, oldest first */
  dates: string[]
  values: (number | null)[]
  /** overlay line, same length as dates */
  line?: (number | null)[]
  goal?: number
  yMax: number
  yTicks: number[]
  format: (v: number) => string
  /** days visible at once; the chart scrolls horizontally when there are more dates than this */
  windowDays: number
  /** reports the visible window as indexes into dates (inclusive) */
  onWindow: (start: number, end: number) => void
  height?: number
}

const PAD_T = 10
const PAD_B = 22
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const mean = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x != null)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

/** An Apple-Health-style chart: a fixed-size window over a longer history that scrolls sideways. */
export const TrendChart = memo(function TrendChart({
  dates, values, line, goal, yMax, yTicks, format, windowDays, onWindow, height = 200,
}: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const endRef = useRef(dates.length - 1)
  const lastReported = useRef('')
  const [vw, setVw] = useState(0)

  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    setVw(el.clientWidth)
    const ro = new ResizeObserver(() => setVw(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const total = dates.length
  const n = Math.max(1, Math.min(windowDays, total))
  const slot = vw / n
  const width = Math.max(vw, total * slot)

  const report = (end: number) => {
    const e = Math.min(total - 1, Math.max(n - 1, end))
    endRef.current = e
    const key = `${e - n + 1}:${e}`
    if (key === lastReported.current) return
    lastReported.current = key
    onWindow(e - n + 1, e)
  }

  // New range, zoom or width: keep the window's last day where it was (or the latest day for a new range).
  const prevTotal = useRef(total)
  useLayoutEffect(() => {
    const el = wrap.current
    if (!el || vw === 0) return
    if (prevTotal.current !== total) {
      prevTotal.current = total
      endRef.current = total - 1
    }
    const e = Math.min(total - 1, Math.max(n - 1, endRef.current))
    el.scrollLeft = (e + 1) * slot - vw
    lastReported.current = ''
    report(e)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vw, slot, total, n])

  const bucket = n <= 45 ? 1 : n <= 400 ? 7 : 30
  const y = (v: number) => PAD_T + (height - PAD_T - PAD_B) * (1 - Math.min(v, yMax) / yMax)
  const base = height - PAD_B

  const svg = useMemo(() => {
    if (vw === 0) return null
    const nb = Math.ceil(total / bucket)
    const buckets = Array.from({ length: nb }, (_, k) => {
      const end = total - (nb - k - 1) * bucket - 1
      const start = Math.max(0, end - bucket + 1)
      return {
        start, end,
        v: mean(values.slice(start, end + 1)),
        l: line ? mean(line.slice(start, end + 1)) : null,
      }
    })
    const cx = (b: { start: number; end: number }) => ((b.start + b.end + 1) / 2) * slot
    const ticks: { i: number; label: string; rule: boolean }[] = []
    dates.forEach((d, i) => {
      const day = Number(d.slice(8, 10))
      if (n <= 10) ticks.push({ i, label: String(day), rule: false })
      else if (n <= 45) day % 7 === 0 && day <= 28 && ticks.push({ i, label: String(day), rule: true })
      else if (day === 1) {
        const m = Number(d.slice(5, 7)) - 1
        ticks.push({ i, label: m === 0 ? `${MONTHS[m]} ${d.slice(2, 4)}` : MONTHS[m], rule: true })
      }
    })
    const linePts = buckets
      .filter((b) => b.l != null)
      .map((b) => `${cx(b)},${y(b.l!)}`)
      .join(' ')
    return (
      <svg width={width} height={height} role="img" aria-label="Sleep chart" style={{ display: 'block' }}>
        {yTicks.map((t) => (
          <line key={t} x1={0} x2={width} y1={y(t)} y2={y(t)} style={{ stroke: 'var(--chart-grid)' }} strokeWidth="1" />
        ))}
        {goal != null && (
          <line x1={0} x2={width} y1={y(goal)} y2={y(goal)} style={{ stroke: 'var(--chart-grid)' }} strokeDasharray="4 4" />
        )}
        {ticks.map((t) => (
          <g key={t.i}>
            {t.rule && <line x1={t.i * slot} x2={t.i * slot} y1={PAD_T} y2={base + 4} style={{ stroke: 'var(--chart-grid)' }} strokeDasharray="2 3" />}
            <text x={t.rule ? t.i * slot + 3 : (t.i + 0.5) * slot} y={height - 6} textAnchor={t.rule ? 'start' : 'middle'}>{t.label}</text>
          </g>
        ))}
        {buckets.map((b) => {
          if (b.v == null) return null
          const w = (b.end - b.start + 1) * slot
          const bw = Math.max(1.5, Math.min(bucket === 1 ? 18 : 40, w * (bucket === 1 ? 0.68 : 0.8)))
          return (
            <rect
              key={b.start}
              x={cx(b) - bw / 2}
              y={y(b.v)}
              width={bw}
              height={Math.max(1, base - y(b.v))}
              rx={Math.min(4, bw / 2)}
              style={{ fill: goal != null && b.v >= goal ? 'var(--chart-hit)' : 'var(--chart-bar)' }}
            />
          )
        })}
        {linePts && (
          <>
            <polyline points={linePts} fill="none" style={{ stroke: 'var(--surface)' }} strokeWidth="5" strokeLinejoin="round" />
            <polyline points={linePts} fill="none" style={{ stroke: 'var(--chart-line)' }} strokeWidth="2" strokeLinejoin="round" strokeDasharray="5 3" />
          </>
        )}
      </svg>
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vw, dates, values, line, goal, yMax, yTicks, n, bucket, slot, width, height])

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={wrap}
        className="trend-scroll"
        onScroll={(e) => report(Math.round((e.currentTarget.scrollLeft + vw) / slot) - 1)}
      >
        {svg}
      </div>
      <div className="trend-yaxis" aria-hidden="true">
        {yTicks.filter((t) => t > 0).map((t) => (
          <span key={t} style={{ top: y(t) - 14 }}>{format(t)}</span>
        ))}
      </div>
    </div>
  )
})
