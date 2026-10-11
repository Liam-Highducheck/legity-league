import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Moon } from 'lucide-react'
import { addDays, dayNumFromISO, todayISO } from '../lib/dates'
import { formatDuration, formatMetric } from '../lib/format'
import { DEFAULT_GOAL_MIN } from '../lib/score'
import type { SleepNight } from '../lib/types'
import { METRIC_LABELS, metricValue, type Metric } from '../lib/stats'
import { useGroup } from '../hooks/group'
import { useBlackout } from '../hooks/useBlackout'
import { useGroupNights, useMyNights, useProfile } from '../hooks/queries'
import { NightPeek, type PeekRange } from '../components/NightPeek'
import { TrendChart } from '../components/TrendChart'
import { GroupSwitcher } from '../components/GroupSwitcher'
import { PageHead, Segmented, Spinner } from '../components/ui'

type Scale = 'W' | 'M' | '6M' | 'Y' | 'All' | 'Custom'
const SCALE_DAYS: Partial<Record<Scale, number>> = { W: 7, M: 30, '6M': 182, Y: 365 }
const SCALES: Scale[] = ['W', 'M', '6M', 'Y', 'All', 'Custom']
const MAX_CUSTOM_DAYS = 1500
const METRIC_NOUN: Record<Metric, string> = { duration: 'Avg. time asleep', restorative: 'Avg. restorative sleep', score: 'Avg. sleep score' }

const DEFAULT_TARGET: Record<Metric, number> = { duration: DEFAULT_GOAL_MIN, restorative: 240, score: 100 }
const TARGET_TITLE: Record<Metric, string> = { duration: 'Nights asleep', restorative: 'Restorative nights', score: 'Nights scoring' }
const targetKey = (m: Metric) => `ll_target_${m}`

function loadTargets(): Record<Metric, number> {
  const out = { ...DEFAULT_TARGET }
  for (const m of Object.keys(out) as Metric[]) {
    try {
      const n = Number(localStorage.getItem(targetKey(m)))
      if (n > 0) out[m] = n
    } catch {
      /* default */
    }
  }
  return out
}

// Remembered while the app is open so coming back from a night's page lands on the same view.
const view: { scale: Scale; metric: Metric; custom: { from: string; to: string } | null; end: string | null } = {
  scale: 'M', metric: 'duration', custom: null, end: null,
}

function longDay(iso: string, withYear: boolean) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) })
}

export function Trends() {
  const { group } = useGroup()
  const profile = useProfile()
  const blackout = useBlackout()
  const [scale, setScale] = useState<Scale>(view.scale)
  const [metric, setMetric] = useState<Metric>(view.metric)
  const [peek, setPeek] = useState<PeekRange | null>(null)
  const [win, setWin] = useState<[number, number]>([0, 0])
  const [targets, setTargets] = useState(loadTargets)
  const [custom, setCustom] = useState<{ from: string; to: string } | null>(view.custom)

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

  // Restorative bars are split into deep (bottom) and REM (top), with a second line for the group's deep average.
  const split = useMemo(() => {
    if (metric !== 'restorative') return undefined
    const by = new Map((nights ?? []).map((n) => [n.night_date, n]))
    return dates.map((d) => by.get(d)?.deep_min ?? null)
  }, [metric, dates, nights])

  const groupDayAvg = useCallback(
    (pick: (n: SleepNight) => number | null) => {
      const sums = new Map<string, { s: number; c: number }>()
      for (const n of groupNights.data ?? []) {
        const v = pick(n)
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
    },
    [groupNights.data, dates],
  )
  const line = useMemo(() => (showGroup ? groupDayAvg((n) => metricValue(n, metric)) : undefined), [showGroup, groupDayAvg, metric])
  const line2 = useMemo(() => (showGroup && metric === 'restorative' ? groupDayAvg((n) => n.deep_min ?? null) : undefined), [showGroup, groupDayAvg, metric])

  const { yMax, yTicks } = useMemo(() => {
    if (metric === 'score') return { yMax: 100, yTicks: [0, 50, 100] }
    const peak = Math.max(0, ...values.map((v) => v ?? 0))
    const top = Math.max(metric === 'duration' ? 540 : 120, Math.ceil(peak / 60) * 60)
    const step = top > 600 ? 240 : 120
    const ticks: number[] = []
    for (let t = 0; t <= top; t += step) ticks.push(t)
    return { yMax: top, yTicks: ticks }
  }, [metric, values])

  const setTarget = (n: number) => {
    setTargets((t) => ({ ...t, [metric]: n }))
    try {
      localStorage.setItem(targetKey(metric), String(n))
    } catch {
      /* device-local convenience only */
    }
  }

  const onWindow = useCallback((s: number, e: number) => setWin([s, e]), [])
  const onSelect = useCallback((s: number, e: number) => setPeek({ from: dates[s], to: dates[e] }), [dates])
  const closePeek = useCallback(() => setPeek(null), [])
  const zoomTo = useCallback((r: PeekRange) => {
    setCustom({ from: r.from, to: r.to })
    setScale('Custom')
  }, [])
  const initialEnd = useMemo(() => {
    const i = view.end ? dates.indexOf(view.end) : -1
    return i >= 0 ? i : undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    view.scale = scale
    view.metric = metric
    view.custom = custom
    view.end = win[1] >= dates.length - 1 ? null : (dates[win[1]] ?? null)
  }, [scale, metric, custom, win, dates])

  if (!profile.data || mine.isLoading) return <div className="screen"><Spinner /></div>

  const lo = Math.min(win[0], dates.length - 1)
  const hi = Math.min(win[1], dates.length - 1)
  const inWin = values.slice(lo, hi + 1).filter((v): v is number => v != null)
  const avg = inWin.length ? inWin.reduce((a, b) => a + b, 0) / inWin.length : null
  const best = inWin.length ? Math.max(...inWin) : null
  const fmt = (v: number) => formatMetric(metric, v)
  const target = targets[metric]
  const goal = metric === 'score' ? undefined : target
  const hit = target
  const fmtTarget = (t: number) => (metric === 'score' ? String(t) : formatDuration(t))
  const orHigher = (t: number) => (metric === 'score' && t === 100 ? '100' : `${fmtTarget(t)} or higher`)
  // Choices: the score range, or 15-minute steps across the visible window's shortest to longest night.
  const targetOptions = (() => {
    if (metric === 'score') return Array.from({ length: 51 }, (_, i) => 100 - i)
    const lo15 = inWin.length ? Math.floor(Math.min(...inWin) / 15) * 15 : target
    const hi15 = inWin.length ? Math.ceil(Math.max(...inWin) / 15) * 15 : target
    const opts: number[] = []
    for (let t = Math.min(lo15, target); t <= Math.max(hi15, target); t += 15) opts.push(t)
    return opts.filter((t) => t > 0).reverse()
  })()
  // Target stats: nights at or above it, the share of scored nights, and the longest run of consecutive days.
  const scoreWin = values.slice(lo, hi + 1)
  const hits = scoreWin.filter((v) => v != null && v >= target).length
  let streak = 0
  for (let run = 0, i = 0; i < scoreWin.length; i++) {
    run = scoreWin[i] != null && scoreWin[i]! >= target ? run + 1 : 0
    streak = Math.max(streak, run)
  }
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
            split={split}
            line2={line2}
            goal={goal}
            hit={hit}
            yMax={yMax}
            yTicks={yTicks}
            format={fmt}
            windowDays={windowDays}
            onWindow={onWindow}
            onSelect={onSelect}
            initialEnd={initialEnd}
          />
        )}
        {showGroup && line && (
          <p className="small muted">
            <span style={{ color: 'var(--chart-line)' }}>- - -</span> group {metric === 'restorative' ? 'restorative' : ''} average
            {line2 && <> · <span style={{ color: 'var(--chart-line-2)' }}>· · ·</span> group deep average</>}
          </p>
        )}
        {split && <p className="small muted"><span style={{ color: 'var(--chart-deep)' }}>■</span> Deep · <span style={{ color: 'var(--chart-rem)' }}>■</span> REM</p>}
      </div>

      <NightPeek range={peek} nights={nights ?? []} onClose={closePeek} onZoom={zoomTo} />

      <div className="row">
        <div className="card stat">
          <p className="muted small">Average</p>
          <p className="value">{avg == null ? '—' : fmt(avg)}</p>
        </div>
        <div className="card stat">
          <p className="muted small">Best</p>
          <p className="value">{best == null ? '—' : fmt(best)}</p>
        </div>
        <div className="card stat">
          <p className="muted small">Nights</p>
          <p className="value">{inWin.length}</p>
        </div>
      </div>
      <div className="card stack" style={{ gap: 10 }}>
        <div className="row between">
          <h2 style={{ marginBottom: 0 }}>{TARGET_TITLE[metric]}</h2>
          <label className="chip chip-select">
            <b>{orHigher(target)}</b> <ChevronDown size={16} className="muted" />
            <select aria-label="Target" value={target} onChange={(e) => setTarget(Number(e.target.value))}>
              {targetOptions.map((t) => (
                <option key={t} value={t}>{orHigher(t)}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="row">
          <div className="stat">
            <p className="muted small">Nights</p>
            <p className="value">{hits}</p>
          </div>
          <div className="stat">
            <p className="muted small">Of nights</p>
            <p className="value">{inWin.length ? `${Math.round((hits / inWin.length) * 1000) / 10}%` : '—'}</p>
          </div>
          <div className="stat">
            <p className="muted small">Longest streak</p>
            <p className="value">{streak}</p>
          </div>
        </div>
        <p className="muted small">Counts the nights in the visible window. A night with no data ends a streak.</p>
      </div>
      {scale !== 'All' && scale !== 'Custom' && <p className="muted small center">Swipe the chart sideways to move through time.</p>}
      <p className="muted small center">Teal bars {metric === 'score' ? 'score' : 'reach'} {orHigher(target)}.{windowDays > 45 && ' Longer ranges show weekly or monthly averages.'}</p>
      {blackout.active && blackout.ready && (
        <p className="muted small center"><Moon size={14} className="inline-icon" /> Group comparison is hidden during blackout.</p>
      )}
    </div>
  )
}
