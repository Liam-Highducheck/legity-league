import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BedDouble, Box, ChevronLeft, ChevronRight, Crown, Flame } from 'lucide-react'
import { addDays, daysBetween, eachDay, formatDay, formatShortDay, todayISO } from '../lib/dates'
import { dailyWinners } from '../lib/heat'
import { formatMetric, formatSpread } from '../lib/format'
import { memberPath } from '../lib/links'
import { podiumFor } from '../lib/league/podiums'
import { DIVISION_LABELS } from '../lib/league/types'
import { formatRecordValue } from '../lib/league/records'
import { PERIOD_LABELS, SCALES, SCALE_PERIOD, periodOffset, periodRange, type PeriodKind, type Scale } from '../lib/periods'
import {
  LONG_SLEEP_MIN,
  METRIC_LABELS,
  leaderboard,
  longestStreak,
  metricValue,
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
import { DayDots } from '../components/DayDots'
import { PodiumCard } from '../components/PodiumCard'
import { Avatar, PageHead, Segmented, Spinner } from '../components/ui'

const KINDS = Object.keys(PERIOD_LABELS) as PeriodKind[]
const isKind = (v: string | null): v is PeriodKind => !!v && (KINDS as string[]).includes(v)
const isMetric = (v: string | null): v is Metric => !!v && v in METRIC_LABELS
const KIND_SCALE = Object.fromEntries(Object.entries(SCALE_PERIOD).map(([sc, k]) => [k, sc])) as Partial<Record<PeriodKind, Scale>>

export function League() {
  const uid = useUserId()
  const { group } = useGroup()
  const profile = useProfile()
  const blackout = useBlackout()
  const [params] = useSearchParams()
  const [scale, setScale] = useState<Scale>('W')
  // A deep link can land on a period the selector has no button for (fortnight, season): keep it here, unhighlighted.
  const [linkedKind, setLinkedKind] = useState<PeriodKind | null>(null)
  const [offset, setOffset] = useState(0)
  const [metric, setMetric] = useState<Metric>('duration')
  const tz = profile.data?.timezone
  const today = todayISO(tz)
  const [custom, setCustom] = useState({ from: addDays(today, -29), to: today })

  const kind: PeriodKind | null = linkedKind ?? SCALE_PERIOD[scale] ?? null
  const roster = useRoster(group?.id)

  // Deep links (from Discord posts and profiles): /league?kind=week&p=2026-09-28&metric=duration
  const linked = params.toString()
  useEffect(() => {
    const k = params.get('kind')
    const p = params.get('p')
    if (!isKind(k) || !p || !profile.data) return
    const off = periodOffset(k, p, todayISO(profile.data.timezone))
    if (off == null) return
    const sc = KIND_SCALE[k]
    if (sc) {
      setScale(sc)
      setLinkedKind(null)
    } else {
      setLinkedKind(k)
    }
    setOffset(off)
    const m = params.get('metric')
    if (isMetric(m)) setMetric(m)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linked, profile.data?.timezone])

  // All time and Custom are plain date ranges; the others step through whole calendar periods.
  const periodRangeNow = kind ? periodRange(kind, offset, tz) : null
  const queryStart = scale === 'All' && !kind ? undefined : !kind ? custom.from : periodRangeNow!.start
  const queryEnd = scale === 'All' && !kind ? undefined : !kind ? custom.to : periodRangeNow!.end
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

  // Day-by-day heat strip per person (only for periods short enough to read, up to a month).
  const dotDates = daysBetween(range.start, range.end) < 31 ? eachDay(range.start, range.end) : null
  const dayValues = new Map<string, Map<string, number>>()
  for (const n of nights) {
    const v = metricValue(n, metric)
    if (v == null || n.night_date < range.start || n.night_date > range.end) continue
    let byDate = dayValues.get(n.user_id)
    if (!byDate) dayValues.set(n.user_id, (byDate = new Map()))
    byDate.set(n.night_date, v)
  }
  const winners = dailyWinners(dayValues)
  const wonBy = (userId: string) => new Set([...winners].filter(([, users]) => users.has(userId)).map(([d]) => d))
  const daysLeft = range.isCurrent ? Math.max(0, daysBetween(today, range.end)) : 0

  // The official podium needs a finished period and a night on every day (the live ranking below doesn't).
  const podium = kind && base && !range.isCurrent ? podiumFor(kind, range, metric, base.members, base.index, base.eligibility) : null
  const kindLabel = kind ? PERIOD_LABELS[kind].toLowerCase() : 'period'

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

      <Segmented
        value={linkedKind && !KIND_SCALE[linkedKind] ? ('' as Scale) : scale}
        onChange={(v) => {
          setScale(v)
          setLinkedKind(null)
          setOffset(0)
        }}
        options={SCALES.map((v) => ({ value: v, label: v }))}
      />

      {kind ? (
        <div className="stepper">
          <button className="icon-btn" aria-label="Previous period" onClick={() => setOffset((o) => o - 1)}><ChevronLeft size={20} /></button>
          <div className="center">
            <b>{range.label}</b>
            <p className="muted small">{range.isCurrent ? `In progress${daysLeft > 0 ? ` · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : ' · last day'}` : offset === -1 ? 'Last one' : 'Final'}</p>
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
          Scores from different devices aren&apos;t directly comparable.
        </p>
      )}

      {kind && (podium ? (
        <PodiumCard podium={podium} />
      ) : (
        <p className="muted small">
          The official podium is awarded when this {kindLabel} ends, and needs a night on every day.
        </p>
      ))}

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
                  {dotDates && (
                    <DayDots dates={dotDates} values={dayValues.get(r.user_id) ?? new Map()} metric={metric} today={today} won={wonBy(r.user_id)} format={(v) => formatMetric(metric, v)} />
                  )}
                </div>
                <span className="value">{formatMetric(metric, r.avg)}</span>
                <ChevronRight size={18} className="chev" />
              </Link>
            ))}
            {without.map((r) => (
              <Link key={r.user_id} to={memberPath(r.user_id)} className="list-item" style={{ opacity: 0.5 }}>
                <span className="rank">–</span>
                <Avatar name={r.name} />
                <div className="grow">
                  <b>{r.name}</b>
                  {dotDates && <DayDots dates={dotDates} values={new Map()} metric={metric} today={today} won={new Set()} format={(v) => formatMetric(metric, v)} />}
                </div>
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
                <Box size={16} className="inline-icon muted" /> Most BOX {kindLabel}: <b>{box.name}</b> (±{formatSpread(metric, box.value)} {METRIC_LABELS[metric].toLowerCase()})
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
