import { useState } from 'react'
import { BedDouble, ChevronLeft, ChevronRight, Crown, Flame } from 'lucide-react'
import { addDays, formatDay, formatShortDay, todayISO } from '../lib/dates'
import { formatDuration, formatMetric } from '../lib/format'
import { SCALES, SCALE_PERIOD, periodRange, type Scale } from '../lib/periods'
import {
  LONG_SLEEP_MIN,
  METRIC_LABELS,
  bestNight,
  bestWeeklyAverage,
  leaderboard,
  longestStreak,
  nightsAtLeast,
  type Metric,
} from '../lib/stats'
import { useGroup } from '../hooks/group'
import { useBlackout } from '../hooks/useBlackout'
import { useGroupNights, useProfile, useRoster } from '../hooks/queries'
import { useUserId } from '../hooks/auth'
import { BlackoutCard } from '../components/BlackoutCard'
import { GroupSwitcher } from '../components/GroupSwitcher'
import { Avatar, PageHead, Segmented, Spinner } from '../components/ui'

export function League() {
  const uid = useUserId()
  const { group } = useGroup()
  const profile = useProfile()
  const blackout = useBlackout()
  const [scale, setScale] = useState<Scale>('W')
  const [offset, setOffset] = useState(0)
  const [metric, setMetric] = useState<Metric>('duration')
  const tz = profile.data?.timezone
  const today = todayISO(tz)
  const [custom, setCustom] = useState({ from: addDays(today, -29), to: today })

  const kind = SCALE_PERIOD[scale]
  const roster = useRoster(group?.id)
  // All time and Custom are plain date ranges; the others step through whole calendar periods.
  const periodRangeNow = kind ? periodRange(kind, offset, tz) : null
  const queryStart = scale === 'All' ? undefined : scale === 'Custom' ? custom.from : periodRangeNow!.start
  const queryEnd = scale === 'All' ? undefined : scale === 'Custom' ? custom.to : periodRangeNow!.end
  const periodNights = useGroupNights(group?.id, queryStart, queryEnd)
  const firstDate = (periodNights.data ?? []).reduce((m, n) => (n.night_date < m ? n.night_date : m), today)
  const range =
    periodRangeNow ??
    (scale === 'All'
      ? { start: firstDate, end: today, label: 'All time', isCurrent: false }
      : (() => {
          const start = custom.from <= custom.to ? custom.from : custom.to
          const end = custom.from <= custom.to ? custom.to : custom.from
          return { start, end, label: `${formatShortDay(start)} – ${formatShortDay(end)}`, isCurrent: false }
        })())

  const members = (roster.data ?? []).map((m) => ({ user_id: m.user_id, name: m.display_name }))

  if (!blackout.ready || roster.isLoading) return <div className="screen"><Spinner /></div>

  const head = <PageHead title="League" right={<GroupSwitcher />} />
  if (blackout.active) {
    return (
      <div className="screen stack">
        {head}
        <BlackoutCard state={blackout} />
      </div>
    )
  }

  const nights = periodNights.data ?? []
  const board = leaderboard(members, nights, metric, range.start, range.end)
  const withData = board.filter((r) => r.avg != null)
  const without = board.filter((r) => r.avg == null)
  const long = nightsAtLeast(members, nights, LONG_SLEEP_MIN, range.start, range.end)[0]
  const streak = longestStreak(members, nights, LONG_SLEEP_MIN, range.start, range.end)[0]

  const records = [
    { label: 'Longest night', r: bestNight(members, nights, 'duration'), fmt: (v: number) => formatDuration(v) },
    { label: 'Most restorative night', r: bestNight(members, nights, 'restorative'), fmt: (v: number) => formatDuration(v) },
    { label: 'Best 7-day average', r: bestWeeklyAverage(members, nights, 'duration'), fmt: (v: number) => formatDuration(v) },
  ].filter((x) => x.r)

  return (
    <div className="screen stack">
      {head}

      <Segmented
        value={scale}
        onChange={(v) => {
          setScale(v)
          setOffset(0)
        }}
        options={SCALES.map((v) => ({ value: v, label: v }))}
      />

      {kind ? (
        <div className="stepper">
          <button className="icon-btn" aria-label="Previous period" onClick={() => setOffset((o) => o - 1)}><ChevronLeft size={20} /></button>
          <div className="center">
            <b>{range.label}</b>
            <p className="muted small">{range.isCurrent ? 'In progress' : offset === -1 ? 'Last one' : 'Final'}</p>
          </div>
          <button className="icon-btn" aria-label="Next period" disabled={offset >= 0} onClick={() => setOffset((o) => Math.min(0, o + 1))}><ChevronRight size={20} /></button>
        </div>
      ) : scale === 'Custom' ? (
        <div className="date-row">
          <label className="field">
            From
            <input type="date" value={custom.from} max={today} onChange={(e) => e.target.value && setCustom({ ...custom, from: e.target.value })} />
          </label>
          <label className="field">
            To
            <input type="date" value={custom.to} max={today} onChange={(e) => e.target.value && setCustom({ ...custom, to: e.target.value })} />
          </label>
        </div>
      ) : (
        <p className="center"><b>All time</b></p>
      )}

      <Segmented
        value={metric}
        onChange={setMetric}
        options={(Object.keys(METRIC_LABELS) as Metric[]).map((m) => ({ value: m, label: METRIC_LABELS[m] }))}
      />

      {metric === 'score' && (
        <p className="muted small">
          An Apple-style estimate from Apple Health sleep data. Nights logged by hand have no score and aren&apos;t ranked.
        </p>
      )}

      <div className="card">
        {periodNights.isLoading ? (
          <Spinner />
        ) : withData.length === 0 ? (
          <p className="muted center">Nobody has {METRIC_LABELS[metric].toLowerCase()} data for this period.</p>
        ) : (
          <div className="list">
            {withData.map((r, idx) => (
              <div key={r.user_id} className={`list-item ${r.user_id === uid ? 'me-row' : ''}`}>
                <span className={`rank ${idx === 0 ? 'first' : ''}`}>{idx === 0 ? <Crown size={18} /> : idx + 1}</span>
                <Avatar name={r.name} />
                <div className="grow">
                  <b>{r.name}</b>
                  <p className="muted small">{r.nights} night{r.nights === 1 ? '' : 's'}</p>
                </div>
                <span className="value">{formatMetric(metric, r.avg)}</span>
              </div>
            ))}
            {without.map((r) => (
              <div key={r.user_id} className="list-item" style={{ opacity: 0.5 }}>
                <span className="rank">–</span>
                <Avatar name={r.name} />
                <div className="grow"><b>{r.name}</b></div>
                <span className="muted small">no data</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {(long?.value > 0 || streak?.value > 1) && (
        <div className="card">
          <h2>Highlights</h2>
          <div className="stack" style={{ gap: 8 }}>
            {long?.value > 0 && <p><BedDouble size={16} className="inline-icon muted" /> Most 8h+ nights: <b>{long.name}</b> ({long.value})</p>}
            {streak?.value > 1 && <p><Flame size={16} className="inline-icon" color="var(--gold)" /> Longest 8h+ streak: <b>{streak.name}</b> ({streak.value} in a row)</p>}
          </div>
        </div>
      )}

      {records.length > 0 && (
        <div className="card">
          <h2>Records · {range.label}</h2>
          <div className="stack" style={{ gap: 10 }}>
            {records.map(({ label, r, fmt }) => (
              <div key={label}>
                <p className="muted small">{label}</p>
                <p><b>{r!.name}</b> · {fmt(r!.value)} <span className="muted small">· {formatDay(r!.date)}</span></p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
