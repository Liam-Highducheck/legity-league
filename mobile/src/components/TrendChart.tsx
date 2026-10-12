import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, Text, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'
import Svg, { G, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg'
import { useColors } from '../lib/theme'

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
  const c = useColors()
  const scroll = useRef<ScrollView>(null)
  const endRef = useRef(initialEnd ?? dates.length - 1)
  const lastReported = useRef('')
  const [vw, setVw] = useState(0)
  // the bar under a finger, highlighted before it is selected
  const [pressed, setPressed] = useState<number | null>(null)

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
  useEffect(() => {
    if (vw === 0) return
    if (prevTotal.current !== total) {
      prevTotal.current = total
      endRef.current = total - 1
    }
    const e = Math.min(total - 1, Math.max(n - 1, endRef.current))
    scroll.current?.scrollTo({ x: (e + 1) * slot - vw, animated: false })
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
    const linePts = buckets.filter((b) => b.l != null).map((b) => `${cx(b)},${y(b.l!)}`).join(' ')
    const line2Pts = buckets.filter((b) => b.l2 != null).map((b) => `${cx(b)},${y(b.l2!)}`).join(' ')
    const threshold = hit ?? goal
    return (
      <Svg width={width} height={height}>
        {yTicks.map((t) => (
          <Line key={t} x1={0} x2={width} y1={y(t)} y2={y(t)} stroke={c.chartGrid} strokeWidth={1} />
        ))}
        {goal != null && <Line x1={0} x2={width} y1={y(goal)} y2={y(goal)} stroke={c.chartGrid} strokeDasharray="4 4" />}
        {ticks.map((t) => (
          <G key={t.i}>
            {t.rule && <Line x1={t.i * slot} x2={t.i * slot} y1={PAD_T} y2={base + 4} stroke={c.chartGrid} strokeDasharray="2 3" />}
            <SvgText x={t.rule ? t.i * slot + 7 : (t.i + 0.5) * slot} y={height - 6} textAnchor={t.rule ? 'start' : 'middle'} fill={c.muted} fontSize={10}>
              {t.label}
            </SvgText>
          </G>
        ))}
        {pressed != null &&
          buckets.filter((b) => b.start === pressed).map((b) => (
            <Rect key="pressed" x={b.start * slot} y={PAD_T - 4} width={(b.end - b.start + 1) * slot} height={base - PAD_T + 4}
              rx={Math.min(8, ((b.end - b.start + 1) * slot) / 2)} fill={c.text} opacity={0.14} />
          ))}
        {buckets.map((b) => {
          if (b.v == null) return null
          const w = (b.end - b.start + 1) * slot
          const bw = Math.max(1.5, Math.min(bucket === 1 ? 18 : 40, w * (bucket === 1 ? 0.68 : 0.8)))
          const isHit = threshold != null && b.v >= threshold
          const x0 = cx(b) - bw / 2
          const r = Math.min(4, bw / 2)
          if (b.d == null || b.d <= 0 || b.d >= b.v) {
            return <Rect key={b.start} x={x0} y={y(b.v)} width={bw} height={Math.max(1, base - y(b.v))} rx={r} fill={isHit ? c.chartHit : c.chartBar} />
          }
          // split bar: deep on the bottom, the rest (REM) on top, with a hairline between
          return (
            <G key={b.start}>
              <Rect x={x0} y={y(b.v)} width={bw} height={Math.max(1, base - y(b.v))} rx={r} fill={isHit ? c.chartHitRem : c.chartRem} />
              <Rect x={x0} y={y(b.d)} width={bw} height={Math.max(1, base - y(b.d))} rx={r} fill={isHit ? c.chartHitDeep : c.chartDeep} stroke={c.surface} strokeWidth={0.75} />
            </G>
          )
        })}
        {line2Pts ? (
          <>
            <Polyline points={line2Pts} fill="none" stroke={c.surface} strokeWidth={5} strokeLinejoin="round" />
            <Polyline points={line2Pts} fill="none" stroke={c.chartLine2} strokeWidth={2} strokeLinejoin="round" strokeDasharray="1 4" strokeLinecap="round" />
          </>
        ) : null}
        {linePts ? (
          <>
            <Polyline points={linePts} fill="none" stroke={c.surface} strokeWidth={5} strokeLinejoin="round" />
            <Polyline points={linePts} fill="none" stroke={c.chartLine} strokeWidth={2} strokeLinejoin="round" strokeDasharray="5 3" />
          </>
        ) : null}
        {onSelect
          ? buckets.map((b) =>
              b.v == null ? null : (
                <Rect key={`hit-${b.start}`} x={b.start * slot} y={0} width={(b.end - b.start + 1) * slot} height={height} fill="transparent"
                  onPress={() => onSelect(b.start, b.end)}
                  onPressIn={() => setPressed(b.start)}
                  onPressOut={() => setPressed(null)} />
              ),
            )
          : null}
      </Svg>
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vw, dates, values, line, split, line2, onSelect, pressed, goal, hit, yMax, yTicks, n, bucket, slot, width, height, c])

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => report(Math.round((e.nativeEvent.contentOffset.x + vw) / slot) - 1)

  return (
    <View style={{ position: 'relative', height }} onLayout={(e: LayoutChangeEvent) => setVw(e.nativeEvent.layout.width)}>
      <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} scrollEventThrottle={16} onScroll={onScroll} contentContainerStyle={{ width }} directionalLockEnabled>
        {svg}
      </ScrollView>
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
        {yTicks.filter((t) => t > 0).map((t) => (
          <Text
            key={t}
            style={{ position: 'absolute', right: 6, top: y(t) - 14, fontSize: 11, color: c.muted, textShadowColor: c.surface, textShadowRadius: 4 }}
          >
            {format(t)}
          </Text>
        ))}
      </View>
    </View>
  )
})
