import { useState } from 'react'
import { BedDouble, ChevronLeft, ChevronRight, Crown, Flame } from 'lucide-react'
import { formatDay } from '../lib/dates'
import { formatDuration, formatMetric } from '../lib/format'
import { PERIOD_LABELS, periodRange, type PeriodKind } from '../lib/periods'
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

const KINDS = Object.keys(PERIOD_LABELS) as PeriodKind[]

export function League() {
  const uid = useUserId()
  const { group } = useGroup()
  const profile = useProfile()
  const blackout = useBlackout()
  const [kind, setKind] = useState<PeriodKind>('week')
  const [offset, setOffset] = useState(0)
  const [metric, setMetric] = useState<Metric>('duration')

  const range = periodRange(kind, offset, profile.data?.timezone)
  const roster = useRoster(group?.id)
  const periodNights = useGroupNights(group?.id, range.start, range.end)
  const allNights = useGroupNights(group?.id)

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

  const all = allNights.data ?? []
  const records = [
    { label: 'Longest night', r: bestNight(members, all, 'duration'), fmt: (v: number) => formatDuration(v) },
    { label: 'Most restorative night', r: bestNight(members, all, 'restorative'), fmt: (v: number) => formatDuration(v) },
    { label: 'Best 7-day average', r: bestWeeklyAverage(members, all, 'duration'), fmt: (v: number) => formatDuration(v) },
  ].filter((x) => x.r)

  return (
    <div className="screen stack">
      {head}

      <div className="scroll-x" role="tablist" aria-label="Period">
        {KINDS.map((k) => (
          <button
            key={k}
            className={`pill ${k === kind ? 'on' : ''}`}
            onClick={() => {
              setKind(k)
              setOffset(0)
            }}
          >
            {PERIOD_LABELS[k]}
          </button>
        ))}
      </div>

      <div className="stepper">
        <button className="icon-btn" aria-label="Previous period" onClick={() => setOffset((o) => o - 1)}><ChevronLeft size={20} /></button>
        <div className="center">
          <b>{range.label}</b>
          <p className="muted small">{range.isCurrent ? 'In progress' : offset === -1 ? 'Last one' : 'Final'}</p>
        </div>
        <button className="icon-btn" aria-label="Next period" disabled={offset >= 0} onClick={() => setOffset((o) => Math.min(0, o + 1))}><ChevronRight size={20} /></button>
      </div>

      <Segmented
        value={metric}
        onChange={setMetric}
        options={(Object.keys(METRIC_LABELS) as Metric[]).map((m) => ({ value: m, label: METRIC_LABELS[m] }))}
      />

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
          <h2>All-time records</h2>
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
