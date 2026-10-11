import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BedDouble, Box, ChevronLeft, ChevronRight, Crown, Flame } from 'lucide-react'
import { formatDay, todayISO } from '../lib/dates'
import { formatMetric, formatSpread } from '../lib/format'
import { memberPath } from '../lib/links'
import { podiumFor } from '../lib/league/podiums'
import { DIVISION_LABELS } from '../lib/league/types'
import { formatRecordValue } from '../lib/league/records'
import { PERIOD_LABELS, periodOffset, periodRange, type PeriodKind } from '../lib/periods'
import {
  LONG_SLEEP_MIN,
  METRIC_LABELS,
  leaderboard,
  longestStreak,
  mostBox,
  nightsAtLeast,
  type Metric,
} from '../lib/stats'
import { useGroup } from '../hooks/group'
import { useBlackout } from '../hooks/useBlackout'
import { useGroupNights, useProfile, useRoster } from '../hooks/queries'
import { useLeagueReport } from '../hooks/league'
import { useUserId } from '../hooks/auth'
import { BlackoutCard } from '../components/BlackoutCard'
import { GroupSwitcher } from '../components/GroupSwitcher'
import { PodiumCard } from '../components/PodiumCard'
import { Avatar, PageHead, Segmented, Spinner } from '../components/ui'

const KINDS = Object.keys(PERIOD_LABELS) as PeriodKind[]
const isKind = (v: string | null): v is PeriodKind => !!v && (KINDS as string[]).includes(v)
const isMetric = (v: string | null): v is Metric => !!v && v in METRIC_LABELS

export function League() {
  const uid = useUserId()
  const { group } = useGroup()
  const profile = useProfile()
  const blackout = useBlackout()
  const [params] = useSearchParams()
  const [kind, setKind] = useState<PeriodKind>('week')
  const [offset, setOffset] = useState(0)
  const [metric, setMetric] = useState<Metric>('duration')

  // Deep links (from Discord posts and profiles): /league?kind=week&p=2026-09-28&metric=duration
  const linked = params.toString()
  useEffect(() => {
    const k = params.get('kind')
    const p = params.get('p')
    if (!isKind(k) || !p || !profile.data) return
    const off = periodOffset(k, p, todayISO(profile.data.timezone))
    if (off == null) return
    setKind(k)
    setOffset(off)
    const m = params.get('metric')
    if (isMetric(m)) setMetric(m)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linked, profile.data?.timezone])

  const range = periodRange(kind, offset, profile.data?.timezone)
  const roster = useRoster(group?.id)
  const periodNights = useGroupNights(group?.id, range.start, range.end)
  const { base, report } = useLeagueReport(group?.id)

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
  const box = mostBox(members, nights, metric, range.start, range.end)[0]

  // The official podium needs a finished period and a night on every day (the live ranking below doesn't).
  const podium = base && !range.isCurrent ? podiumFor(kind, range, metric, base.members, base.index, base.eligibility) : null

  const names = new Map(members.map((m) => [m.user_id, m.name]))
  const latestRecords = report
    ? report.records.categories
        .flatMap((c) => c.events.map((event) => ({ category: c.category, event })))
        .sort((a, b) => b.event.achievedOn.localeCompare(a.event.achievedOn))
        .slice(0, 3)
    : []

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

      {metric === 'score' && (
        <p className="muted small">
          An Apple-style estimate from Apple Health sleep data. Nights logged by hand have no score and aren&apos;t ranked.
          Scores from different devices aren&apos;t directly comparable.
        </p>
      )}

      {podium ? (
        <PodiumCard podium={podium} />
      ) : (
        <p className="muted small">
          The official podium is awarded when this {PERIOD_LABELS[kind].toLowerCase()} ends, and needs a night on every day.
        </p>
      )}

      <div className="card">
        <h2>Average ranking</h2>
        {periodNights.isLoading ? (
          <Spinner />
        ) : withData.length === 0 ? (
          <p className="muted center">Nobody has {METRIC_LABELS[metric].toLowerCase()} data for this period.</p>
        ) : (
          <div className="list">
            {withData.map((r, idx) => (
              <Link key={r.user_id} to={memberPath(r.user_id)} className={`list-item ${r.user_id === uid ? 'me-row' : ''}`}>
                <span className={`rank ${idx === 0 ? 'first' : ''}`}>{idx === 0 ? <Crown size={18} /> : idx + 1}</span>
                <Avatar name={r.name} />
                <div className="grow">
                  <b>{r.name}</b>
                  <p className="muted small">{r.nights} night{r.nights === 1 ? '' : 's'}</p>
                </div>
                <span className="value">{formatMetric(metric, r.avg)}</span>
                <ChevronRight size={18} className="chev" />
              </Link>
            ))}
            {without.map((r) => (
              <Link key={r.user_id} to={memberPath(r.user_id)} className="list-item" style={{ opacity: 0.5 }}>
                <span className="rank">–</span>
                <Avatar name={r.name} />
                <div className="grow"><b>{r.name}</b></div>
                <span className="muted small">no data</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {(long?.value > 0 || streak?.value > 1 || box) && (
        <div className="card">
          <h2>Highlights</h2>
          <div className="stack" style={{ gap: 8 }}>
            {long?.value > 0 && <p><BedDouble size={16} className="inline-icon muted" /> Most 8h+ nights: <b>{long.name}</b> ({long.value})</p>}
            {streak?.value > 1 && <p><Flame size={16} className="inline-icon" color="var(--gold)" /> Longest 8h+ streak: <b>{streak.name}</b> ({streak.value} in a row)</p>}
            {box && (
              <p>
                <Box size={16} className="inline-icon muted" /> Most BOX {PERIOD_LABELS[kind].toLowerCase()}: <b>{box.name}</b> (±{formatSpread(metric, box.value)} {METRIC_LABELS[metric].toLowerCase()})
              </p>
            )}
          </div>
        </div>
      )}

      {latestRecords.length > 0 && (
        <div className="card">
          <div className="row between" style={{ marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>Latest records</h2>
            <Link to="/records" className="small">See all</Link>
          </div>
          <div className="stack" style={{ gap: 10 }}>
            {latestRecords.map(({ category, event }) => (
              <div key={`${category.key}-${event.achievedOn}`}>
                <p className="muted small">{category.label} · {DIVISION_LABELS[category.division]}</p>
                <p>
                  <b>{event.holders.map((h) => names.get(h.userId) ?? 'Someone').join(' and ')}</b> · {formatRecordValue(category.stat, event.value)}{' '}
                  <span className="muted small">· {event.holders[0]?.title ?? formatDay(event.achievedOn)}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
