import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react'

interface Props {
  /** every day the chart can scroll across, oldest first */
  dates: string[]
  values: (number | null)[]
  /** overlay line, same length as dates */
  line?: (number | null)[]
  /** the deep-sleep part of each value: when given, bars are split deep (bottom) / rest (top) */
  split?: (number | null)[]
  /** second overlay line, same length as dates */
  line2?: (number | null)[]
  goal?: number
  /** bars at or above this are drawn in the success colour (defaults to goal) */
  hit?: number
  yMax: number
  yTicks: number[]
  format: (v: number) => string
  /** days visible at once; the chart scrolls horizontally when there are more dates than this */
  windowDays: number
  /** reports the visible window as indexes into dates (inclusive) */
  onWindow: (start: number, end: number) => void
  /** called when a bar is tapped, with the first and last day index it covers */
  onSelect?: (start: number, end: number) => void
  /** day index the window should end on at first (default: the latest day) */
  initialEnd?: number
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
  dates, values, line, split, line2, goal, hit, yMax, yTicks, format, windowDays, onWindow, onSelect, initialEnd, height = 200,
}: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const endRef = useRef(initialEnd ?? dates.length - 1)
  const lastReported = useRef('')
  const [vw, setVw] = useState(0)
  // the bar under a finger (or the mouse), highlighted before it is selected
  const [pressed, setPressed] = useState<number | null>(null)

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
        l2: line2 ? mean(line2.slice(start, end + 1)) : null,
        d: split ? mean(split.slice(start, end + 1)) : null,
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
    const hitRects = onSelect
      ? buckets.map((b) =>
          b.v == null ? null : (
            <rect key={b.start} x={b.start * slot} y={0} width={(b.end - b.start + 1) * slot} height={height} fill="transparent"
              style={{ cursor: 'pointer' }}
              onClick={() => onSelect(b.start, b.end)}
              onPointerDown={() => setPressed(b.start)}
              onPointerEnter={(e) => e.pointerType === 'mouse' && setPressed(b.start)}
              onPointerUp={() => setPressed(null)}
              onPointerCancel={() => setPressed(null)}
              onPointerLeave={() => setPressed(null)} />
          ),
        )
      : null
    const linePts = buckets
      .filter((b) => b.l != null)
      .map((b) => `${cx(b)},${y(b.l!)}`)
      .join(' ')
    const line2Pts = buckets
      .filter((b) => b.l2 != null)
      .map((b) => `${cx(b)},${y(b.l2!)}`)
      .join(' ')
    return (
      <svg width={width} height={height} role="img" aria-label="Sleep chart" style={{ display: 'block', WebkitTapHighlightColor: 'transparent' }}>
        {yTicks.map((t) => (
          <line key={t} x1={0} x2={width} y1={y(t)} y2={y(t)} style={{ stroke: 'var(--chart-grid)' }} strokeWidth="1" />
        ))}
        {goal != null && (
          <line x1={0} x2={width} y1={y(goal)} y2={y(goal)} style={{ stroke: 'var(--chart-grid)' }} strokeDasharray="4 4" />
        )}
        {ticks.map((t) => (
          <g key={t.i}>
            {t.rule && <line x1={t.i * slot} x2={t.i * slot} y1={PAD_T} y2={base + 4} style={{ stroke: 'var(--chart-grid)' }} strokeDasharray="2 3" />}
            <text x={t.rule ? t.i * slot + 7 : (t.i + 0.5) * slot} y={height - 6} textAnchor={t.rule ? 'start' : 'middle'}>{t.label}</text>
          </g>
        ))}
        {pressed != null && buckets.filter((b) => b.start === pressed).map((b) => (
          <rect key="pressed" x={b.start * slot} y={PAD_T - 4} width={(b.end - b.start + 1) * slot} height={base - PAD_T + 4}
            rx={Math.min(8, ((b.end - b.start + 1) * slot) / 2)} style={{ fill: 'var(--text)', opacity: 0.14 }} />
        ))}
        {buckets.map((b) => {
          if (b.v == null) return null
          const w = (b.end - b.start + 1) * slot
          const bw = Math.max(1.5, Math.min(bucket === 1 ? 18 : 40, w * (bucket === 1 ? 0.68 : 0.8)))
          const isHit = (hit ?? goal) != null && b.v >= (hit ?? goal)!
          const x0 = cx(b) - bw / 2
          const r = Math.min(4, bw / 2)
          if (b.d == null || b.d <= 0 || b.d >= b.v) {
            return (
              <rect key={b.start} x={x0} y={y(b.v)} width={bw} height={Math.max(1, base - y(b.v))} rx={r}
                style={{ fill: isHit ? 'var(--chart-hit)' : 'var(--chart-bar)' }} />
            )
          }
          // split bar: deep on the bottom, the rest (REM) on top, with a hairline between
          return (
            <g key={b.start}>
              <rect x={x0} y={y(b.v)} width={bw} height={Math.max(1, base - y(b.v))} rx={r}
                style={{ fill: isHit ? 'var(--chart-hit-rem)' : 'var(--chart-rem)' }} />
              <rect x={x0} y={y(b.d)} width={bw} height={Math.max(1, base - y(b.d))} rx={r}
                style={{ fill: isHit ? 'var(--chart-hit-deep)' : 'var(--chart-deep)', stroke: 'var(--surface)' }} strokeWidth="0.75" />
            </g>
          )
        })}
        {line2Pts && (
          <>
            <polyline points={line2Pts} fill="none" style={{ stroke: 'var(--surface)' }} strokeWidth="5" strokeLinejoin="round" />
            <polyline points={line2Pts} fill="none" style={{ stroke: 'var(--chart-line-2)' }} strokeWidth="2" strokeLinejoin="round" strokeDasharray="1 4" strokeLinecap="round" />
          </>
        )}
        {linePts && (
          <>
            <polyline points={linePts} fill="none" style={{ stroke: 'var(--surface)' }} strokeWidth="5" strokeLinejoin="round" />
            <polyline points={linePts} fill="none" style={{ stroke: 'var(--chart-line)' }} strokeWidth="2" strokeLinejoin="round" strokeDasharray="5 3" />
          </>
        )}
        {hitRects}
      </svg>
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vw, dates, values, line, split, line2, onSelect, pressed, goal, hit, yMax, yTicks, n, bucket, slot, width, height])

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
