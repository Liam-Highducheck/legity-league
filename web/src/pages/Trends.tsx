import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Moon, TrendingDown, TrendingUp } from 'lucide-react'
import { addDays, dayNumFromISO, todayISO } from '@legity/core/dates'
import { formatDuration, formatMetric } from '@legity/core/format'
import { DEFAULT_GOAL_MIN } from '@legity/core/score'
import type { SleepNight } from '@legity/core/types'
import { METRIC_LABELS, extremeWindow, metricValue, type Metric } from '@legity/core/stats'
import { useGroup } from '@legity/data/group'
import { useBlackout } from '@legity/data/useBlackout'
import { useGroupNights, useMyNights, useProfile } from '@legity/data/queries'
import { NightList, type NightListSpec } from '../components/NightList'
import { NightPeek, avg as mean, longDate, type PeekRange } from '../components/NightPeek'
import { SCALES, type Scale } from '@legity/core/periods'
import { TrendChart } from '../components/TrendChart'
import { GroupSwitcher } from '../components/GroupSwitcher'
import { PageHead, Segmented, Spinner } from '../components/ui'

const SCALE_DAYS: Partial<Record<Scale, number>> = { W: 7, M: 30, '6M': 182, Y: 365 }
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
  const [list, setList] = useState<'recorded' | 'hits' | 'streak' | 'best' | null>(null)
  const [win, setWin] = useState<[number, number]>([0, 0])
  const [targets, setTargets] = useState(loadTargets)
  const [custom, setCustom] = useState<{ from: string; to: string } | null>(view.custom)
  // Best/worst button: jumps to your best (then worst) run of the scale's length, remembering where to return to.
  const [ext, setExt] = useState<{ mode: 'best' | 'worst'; days: number; prev: Scale; found: boolean } | null>(null)

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
  const jumpToExtreme = (mode: 'best' | 'worst', days: number, prev: Scale) => {
    const w = nights ? extremeWindow(nights, metric, days, mode) : null
    if (w) zoomTo({ from: w.start, to: w.end })
    setExt({ mode, days, prev, found: !!w })
  }
  const cycleExtreme = () => {
    if (!ext) {
      const days = SCALE_DAYS[scale]
      if (days) jumpToExtreme('best', days, scale)
    } else if (ext.mode === 'best') {
      jumpToExtreme('worst', ext.days, ext.prev)
    } else {
      setScale(ext.prev)
      setExt(null)
    }
  }
  // Switching metric while a best/worst run is showing finds that metric's run instead.
  useEffect(() => {
    if (!ext || !nights) return
    const w = extremeWindow(nights, metric, ext.days, ext.mode)
    if (w) zoomTo({ from: w.start, to: w.end })
    setExt((e) => (e ? { ...e, found: !!w } : e))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric])

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
  const startISO = dates[lo]
  const endISO = dates[hi]
  const sameYear = startISO?.slice(0, 4) === endISO?.slice(0, 4)
  const rangeLabel = startISO ? `${longDay(startISO, !sameYear)} – ${longDay(endISO, true)}` : ''
  // Target stats: nights at or above it, the share of scored nights, and the longest run of consecutive days.
  const scoreWin = values.slice(lo, hi + 1)
  const hits = scoreWin.filter((v) => v != null && v >= target).length
  let streak = 0
  let streakEnd = -1
  for (let run = 0, i = 0; i < scoreWin.length; i++) {
    run = scoreWin[i] != null && scoreWin[i]! >= target ? run + 1 : 0
    if (run > 0 && run >= streak) {
      streak = run
      streakEnd = i
    }
  }
  const streakFrom = streak ? dates[lo + streakEnd - streak + 1] : null
  const streakTo = streak ? dates[lo + streakEnd] : null

  // What the "Nights" and "Longest streak" numbers open.
  const byDate = new Map((nights ?? []).map((n) => [n.night_date, n]))
  const listNights = (pred: (date: string, v: number) => boolean) =>
    dates
      .slice(lo, hi + 1)
      .map((d, i) => ({ d, v: values[lo + i] }))
      .filter((x): x is { d: string; v: number } => x.v != null && pred(x.d, x.v))
      .reverse()
  const rowFor = (d: string, v: number) => {
    const n = byDate.get(d)
    return {
      date: d,
      primary: fmt(v),
      secondary: n ? (metric === 'duration' ? (n.sleep_score != null ? `Score ${n.sleep_score}` : undefined) : `Asleep ${formatDuration(n.duration_min)}`) : undefined,
    }
  }
  let listSpec: NightListSpec | null = null
  if (list === 'recorded' || list === 'hits') {
    const rows = listNights((_, v) => list === 'recorded' || v >= target).map((x) => rowFor(x.d, x.v))
    listSpec = {
      title: list === 'recorded' ? `${rows.length} night${rows.length === 1 ? '' : 's'}` : `${rows.length} night${rows.length === 1 ? '' : 's'} at ${orHigher(target)}`,
      subtitle: rangeLabel,
      rows,
    }
  } else if (list === 'best') {
    // the window's top nights for this metric, best first (ties: most recent first)
    const rows = listNights(() => true)
      .sort((a, b) => b.v - a.v)
      .slice(0, 10)
      .map((x) => rowFor(x.d, x.v))
    listSpec = { title: `Best ${rows.length} night${rows.length === 1 ? '' : 's'}`, subtitle: rangeLabel, rows }
  } else if (list === 'streak' && streakFrom && streakTo) {
    const inStreak = listNights((d) => d >= streakFrom && d <= streakTo)
    const sn = inStreak.map((x) => byDate.get(x.d)).filter((n): n is SleepNight => !!n)
    const f = (m: Metric, xs: (number | null)[]) => formatMetric(m, mean(xs))
    listSpec = {
      title: `${streak}-night streak`,
      subtitle: `${longDate(streakFrom, false)} – ${longDate(streakTo)}`,
      stats: [
        { label: 'Avg. asleep', value: f('duration', sn.map((n) => n.duration_min)) },
        { label: 'Avg. restorative', value: f('restorative', sn.map((n) => n.restorative_min)) },
        { label: 'Avg. score', value: f('score', sn.map((n) => n.sleep_score)) },
        { label: `Best ${METRIC_LABELS[metric].toLowerCase()}`, value: fmt(Math.max(...inStreak.map((x) => x.v))) },
      ],
      rows: inStreak.map((x) => rowFor(x.d, x.v)),
      zoom: { from: streakFrom, to: streakTo },
    }
  }
  const cust = custom ?? { from: addDays(today, -29), to: today }

  return (
    <div className="screen stack">
      <PageHead title="Trends" right={<GroupSwitcher />} />
      <Segmented value={scale} onChange={(s) => { setExt(null); setScale(s); if (s === 'Custom' && !custom) setCustom(cust) }} options={SCALES.map((s) => ({ value: s, label: s }))} />

      {scale === 'Custom' && (
        <div className="date-row">
          <label className="field">
            From
            <input type="date" value={cust.from} max={today} onChange={(e) => { setExt(null); if (e.target.value) setCustom({ ...cust, from: e.target.value }) }} />
          </label>
          <label className="field">
            To
            <input type="date" value={cust.to} max={today} onChange={(e) => { setExt(null); if (e.target.value) setCustom({ ...cust, to: e.target.value }) }} />
          </label>
        </div>
      )}

      <Segmented
        value={metric}
        onChange={setMetric}
        options={(Object.keys(METRIC_LABELS) as Metric[]).map((m) => ({ value: m, label: METRIC_LABELS[m] }))}
      />

      {(ext || (nights && nights.length > 0 && SCALE_DAYS[scale])) && (
        <div className="row between">
          <span className="muted small">
            {ext ? (ext.found ? `Your ${ext.mode} ${ext.days} days` : `Not enough nights for a ${ext.days}-day run yet`) : ''}
          </span>
          <button type="button" className={`pill ${ext ? 'on' : ''}`} aria-pressed={!!ext} onClick={cycleExtreme}>
            {ext?.mode === 'worst' ? <TrendingDown size={14} className="inline-icon" /> : <TrendingUp size={14} className="inline-icon" />}{' '}
            {!ext ? 'Best' : ext.mode === 'best' ? 'Best · tap for worst' : 'Worst · tap to reset'}
          </button>
        </div>
      )}

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

      <NightList spec={listSpec} onClose={() => setList(null)} onZoom={zoomTo} />
      <NightPeek range={peek} nights={nights ?? []} metric={metric} onClose={closePeek} onZoom={zoomTo} />

      <div className="row">
        <div className="card stat">
          <p className="muted small">Average</p>
          <p className="value">{avg == null ? '—' : fmt(avg)}</p>
        </div>
        <button className="card stat tap" disabled={best == null} onClick={() => setList('best')}>
          <p className="muted small">Best</p>
          <p className="value">{best == null ? '—' : fmt(best)}</p>
        </button>
        <button className="card stat tap" disabled={inWin.length === 0} onClick={() => setList('recorded')}>
          <p className="muted small">Nights</p>
          <p className="value">{inWin.length}</p>
        </button>
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
          <button className="stat tap" disabled={hits === 0} onClick={() => setList('hits')}>
            <p className="muted small">Nights</p>
            <p className="value">{hits}</p>
          </button>
          <div className="stat">
            <p className="muted small">Of nights</p>
            <p className="value">{inWin.length ? `${Math.round((hits / inWin.length) * 1000) / 10}%` : '—'}</p>
          </div>
          <button className="stat tap" disabled={streak === 0} onClick={() => setList('streak')}>
            <p className="muted small">Longest streak</p>
            <p className="value">{streak}</p>
          </button>
        </div>
      </div>
      {blackout.active && blackout.ready && (
        <p className="muted small center"><Moon size={14} className="inline-icon" /> Group comparison is hidden during blackout.</p>
      )}
    </div>
  )
}
