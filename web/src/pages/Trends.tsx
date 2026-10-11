import { useCallback, useMemo, useState } from 'react'
import { Moon } from 'lucide-react'
import { addDays, dayNumFromISO, todayISO } from '../lib/dates'
import { formatDuration, formatMetric } from '../lib/format'
import { DEFAULT_GOAL_MIN } from '../lib/score'
import { METRIC_LABELS, metricValue, type Metric } from '../lib/stats'
import { useGroup } from '../hooks/group'
import { useBlackout } from '../hooks/useBlackout'
import { useGroupNights, useMyNights, useProfile } from '../hooks/queries'
import { TrendChart } from '../components/TrendChart'
import { GroupSwitcher } from '../components/GroupSwitcher'
import { PageHead, Segmented, Spinner } from '../components/ui'

type Scale = 'W' | 'M' | '6M' | 'Y' | 'All' | 'Custom'
const SCALE_DAYS: Partial<Record<Scale, number>> = { W: 7, M: 30, '6M': 182, Y: 365 }
const SCALES: Scale[] = ['W', 'M', '6M', 'Y', 'All', 'Custom']
const MAX_CUSTOM_DAYS = 1500
const METRIC_NOUN: Record<Metric, string> = { duration: 'Avg. time asleep', restorative: 'Avg. restorative sleep', score: 'Avg. sleep score' }

function longDay(iso: string, withYear: boolean) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) })
}

export function Trends() {
  const { group } = useGroup()
  const profile = useProfile()
  const blackout = useBlackout()
  const [scale, setScale] = useState<Scale>('M')
  const [metric, setMetric] = useState<Metric>('duration')
  const [win, setWin] = useState<[number, number]>([0, 0])
  const [custom, setCustom] = useState<{ from: string; to: string } | null>(null)

  const today = todayISO(profile.data?.timezone)
  const mine = useMyNights()
  const groupNights = useGroupNights(group?.id)
  const showGroup = !blackout.active && blackout.ready

  const nights = mine.data
  const firstNight = nights?.[0]?.night_date ?? addDays(today, -29)

  // The days the chart can scroll across, and how many are visible at once.
  const { dates, windowDays } = useMemo(() => {
    let from: string
    let to = today
    let days: number
    if (scale === 'Custom') {
      const c = custom ?? { from: addDays(today, -29), to: today }
      from = c.from <= c.to ? c.from : c.to
      to = c.from <= c.to ? c.to : c.from
      days = dayNumFromISO(to) - dayNumFromISO(from) + 1
    } else if (scale === 'All') {
      from = firstNight
      days = dayNumFromISO(to) - dayNumFromISO(from) + 1
    } else {
      days = SCALE_DAYS[scale]!
      from = firstNight < addDays(to, -(days - 1)) ? firstNight : addDays(to, -(days - 1))
    }
    const total = Math.min(dayNumFromISO(to) - dayNumFromISO(from) + 1, scale === 'Custom' ? MAX_CUSTOM_DAYS : Infinity)
    return { dates: Array.from({ length: total }, (_, i) => addDays(from, i)), windowDays: Math.min(days, total) }
  }, [scale, custom, today, firstNight])

  const values = useMemo(() => {
    const by = new Map((nights ?? []).map((n) => [n.night_date, n]))
    return dates.map((d) => {
      const n = by.get(d)
      return n ? metricValue(n, metric) : null
    })
  }, [dates, nights, metric])

  const line = useMemo(() => {
    if (!showGroup) return undefined
    const sums = new Map<string, { s: number; c: number }>()
    for (const n of groupNights.data ?? []) {
      const v = metricValue(n, metric)
      if (v == null) continue
      const e = sums.get(n.night_date) ?? { s: 0, c: 0 }
      e.s += v
      e.c += 1
      sums.set(n.night_date, e)
    }
    return dates.map((d) => {
      const e = sums.get(d)
      return e ? e.s / e.c : null
    })
  }, [showGroup, groupNights.data, dates, metric])

  const { yMax, yTicks } = useMemo(() => {
    if (metric === 'score') return { yMax: 100, yTicks: [0, 50, 100] }
    const peak = Math.max(0, ...values.map((v) => v ?? 0))
    const top = Math.max(metric === 'duration' ? 540 : 120, Math.ceil(peak / 60) * 60)
    const step = top > 600 ? 240 : 120
    const ticks: number[] = []
    for (let t = 0; t <= top; t += step) ticks.push(t)
    return { yMax: top, yTicks: ticks }
  }, [metric, values])

  const onWindow = useCallback((s: number, e: number) => setWin([s, e]), [])

  if (!profile.data || mine.isLoading) return <div className="screen"><Spinner /></div>

  const lo = Math.min(win[0], dates.length - 1)
  const hi = Math.min(win[1], dates.length - 1)
  const inWin = values.slice(lo, hi + 1).filter((v): v is number => v != null)
  const avg = inWin.length ? inWin.reduce((a, b) => a + b, 0) / inWin.length : null
  const best = inWin.length ? Math.max(...inWin) : null
  const fmt = (v: number) => formatMetric(metric, v)
  const goal = metric === 'duration' ? DEFAULT_GOAL_MIN : undefined
  const startISO = dates[lo]
  const endISO = dates[hi]
  const sameYear = startISO?.slice(0, 4) === endISO?.slice(0, 4)
  const rangeLabel = startISO ? `${longDay(startISO, !sameYear)} – ${longDay(endISO, true)}` : ''
  const cust = custom ?? { from: addDays(today, -29), to: today }

  return (
    <div className="screen stack">
      <PageHead title="Trends" right={<GroupSwitcher />} />
      <Segmented value={scale} onChange={(s) => { setScale(s); if (s === 'Custom' && !custom) setCustom(cust) }} options={SCALES.map((s) => ({ value: s, label: s }))} />

      {scale === 'Custom' && (
        <div className="date-row">
          <label className="field">
            From
            <input type="date" value={cust.from} max={today} onChange={(e) => e.target.value && setCustom({ ...cust, from: e.target.value })} />
          </label>
          <label className="field">
            To
            <input type="date" value={cust.to} max={today} onChange={(e) => e.target.value && setCustom({ ...cust, to: e.target.value })} />
          </label>
        </div>
      )}

      <Segmented
        value={metric}
        onChange={setMetric}
        options={(Object.keys(METRIC_LABELS) as Metric[]).map((m) => ({ value: m, label: METRIC_LABELS[m] }))}
      />

      <div className="card stack" style={{ gap: 6 }}>
        <div>
          <p className="muted small" style={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>{METRIC_NOUN[metric]}</p>
          <p className="big-num" style={{ fontSize: 34 }}>{avg == null ? '—' : fmt(avg)}</p>
          <p className="muted small">{rangeLabel}</p>
        </div>
        {nights && nights.length === 0 ? (
          <p className="muted center">No sleep data yet.</p>
        ) : (
          <TrendChart
            dates={dates}
            values={values}
            line={line}
            goal={goal}
            yMax={yMax}
            yTicks={yTicks}
            format={fmt}
            windowDays={windowDays}
            onWindow={onWindow}
          />
        )}
        {showGroup && line && <p className="small muted"><span style={{ color: 'var(--gold)' }}>- - -</span> group average</p>}
      </div>

      <div className="row">
        <div className="card grow center">
          <p className="muted small">Average</p>
          <p className="value" style={{ fontSize: 22 }}>{avg == null ? '—' : fmt(avg)}</p>
        </div>
        <div className="card grow center">
          <p className="muted small">Best</p>
          <p className="value" style={{ fontSize: 22 }}>{best == null ? '—' : fmt(best)}</p>
        </div>
        <div className="card grow center">
          <p className="muted small">Nights</p>
          <p className="value" style={{ fontSize: 22 }}>{inWin.length}</p>
        </div>
      </div>
      {scale !== 'All' && scale !== 'Custom' && <p className="muted small center">Swipe the chart sideways to move through time.</p>}
      {metric === 'duration' && <p className="muted small center">Teal bars hit 8h ({formatDuration(DEFAULT_GOAL_MIN)}).{windowDays > 45 && ' Longer ranges show weekly or monthly averages.'}</p>}
      {blackout.active && blackout.ready && (
        <p className="muted small center"><Moon size={14} className="inline-icon" /> Group comparison is hidden during blackout.</p>
      )}
    </div>
  )
}
