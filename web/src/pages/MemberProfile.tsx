import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Settings2 } from 'lucide-react'
import { addDays, formatDay } from '../lib/dates'
import { buildCoverage, COVERAGE_DAYS } from '../lib/coverage'
import { formatMetric, formatPodiumValue, ordinal } from '../lib/format'
import { leaguePath } from '../lib/links'
import { deviceClassOf } from '../lib/league/device'
import { totalCounts, tallyKey, emptyCounts, type MedalEntry } from '../lib/league/podiums'
import { formatRecordValue } from '../lib/league/records'
import { DIVISION_LABELS, LEAGUE_KINDS, PODIUM_METRICS, type PodiumKind } from '../lib/league/types'
import { PERIOD_LABELS } from '../lib/periods'
import { METRIC_LABELS, metricValue, type Metric } from '../lib/stats'
import { useGroup } from '../hooks/group'
import { useLeagueReport } from '../hooks/league'
import { useGroupNights, useRoster } from '../hooks/queries'
import { Avatar, ErrorNote, PageHead, Segmented, Spinner } from '../components/ui'
import { BarChart, type BarPoint } from '../components/BarChart'
import { CoverageGrid } from '../components/CoverageGrid'
import { MedalCount, MedalLegend } from '../components/MedalCount'
import { SleepScoreCard } from '../components/SleepScoreCard'

const KINDS: PodiumKind[] = [...LEAGUE_KINDS, 'championship']
const KIND_LABELS: Record<PodiumKind, string> = { ...PERIOD_LABELS, championship: 'Champion' }
const DEVICE_LABELS = { watch: 'Watch', phone: DIVISION_LABELS.phone, manual: 'Manual' }
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export function MemberProfile() {
  const { userId = '' } = useParams()
  const { group } = useGroup()
  const roster = useRoster(group?.id)
  const nightsQuery = useGroupNights(group?.id)
  const { base, report, isLoading, error } = useLeagueReport(group?.id)
  const [days, setDays] = useState(30)
  const [metric, setMetric] = useState<Metric>('duration')
  const [open, setOpen] = useState<{ kind: PodiumKind; metric: Metric } | null>(null)

  const head = <PageHead title="Profile" back />
  if (isLoading || nightsQuery.isLoading || roster.isLoading) return <div className="screen stack">{head}<Spinner /></div>
  if (error || !base || !report) return <div className="screen stack">{head}<ErrorNote error={error ?? new Error('Couldn’t load this profile')} /></div>

  const member = roster.data?.find((m) => m.user_id === userId)
  if (!group || !member) return <div className="screen stack">{head}<p className="muted">This person isn&apos;t in {group?.name ?? 'this group'}.</p></div>

  const today = base.asOf
  const mine = (nightsQuery.data ?? []).filter((n) => n.user_id === userId)
  const latest = mine[mine.length - 1]
  const scored = [...mine].reverse().find((n) => n.sleep_start)
  const device = latest ? deviceClassOf(latest) : null

  const start = addDays(today, -(days - 1))
  const byDate = new Map(mine.map((n) => [n.night_date, n]))
  const points: BarPoint[] = Array.from({ length: days }, (_, i) => {
    const d = addDays(start, i)
    const n = byDate.get(d)
    return { date: d, value: n ? metricValue(n, metric) : null }
  })
  const vals = points.map((p) => p.value).filter((v): v is number => v != null)
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  const best = vals.length ? Math.max(...vals) : null
  const fmt = (v: number) => formatMetric(metric, v)

  const cells = buildCoverage(mine.map((n) => n.night_date), today)
  const synced = cells.filter((c) => c.state === 'synced').length

  const medals = totalCounts(report.tally, userId)
  const cellCounts = (kind: PodiumKind, m: Metric) => report.tally.get(userId)?.get(tallyKey(kind, m)) ?? emptyCounts()
  const opened = open ? cellCounts(open.kind, open.metric) : null

  const userRecords = report.records.byUser.get(userId)
  const categories = new Map(report.records.categories.map((c) => [c.category.key, c]))
  const isAdmin = group.role === 'owner' || group.role === 'admin'

  return (
    <div className="screen stack">
      {head}
      <div className="card hero row" style={{ gap: 14 }}>
        <Avatar name={member.display_name} />
        <div className="grow">
          <b style={{ fontSize: 20 }}>{member.display_name}</b>
          <p className="muted small">{member.full_name ?? group.name}</p>
        </div>
        <div className="chips" style={{ justifyContent: 'flex-end' }}>
          {member.role !== 'member' && <span className="chip" style={{ textTransform: 'capitalize' }}>{member.role}</span>}
          {device && <span className="chip">{DEVICE_LABELS[device]}</span>}
        </div>
      </div>

      <div className="row">
        <div className="card grow center">
          <p className="muted small">Podiums</p>
          <p className="value" style={{ fontSize: 22 }}>{medals.gold + medals.silver + medals.bronze}</p>
        </div>
        <div className="card grow center">
          <p className="muted small">Records held</p>
          <p className="value" style={{ fontSize: 22 }}>{userRecords?.held.length ?? 0}</p>
        </div>
        <div className="card grow center">
          <p className="muted small">Records set</p>
          <p className="value" style={{ fontSize: 22 }}>{userRecords?.setAllTime ?? 0}</p>
        </div>
      </div>

      <div className="card stack" style={{ gap: 12 }}>
        <h2 style={{ marginBottom: 0 }}>Podiums</h2>
        <p className="muted small">Each kind is counted separately. Tap a count to see which periods it came from.</p>
        <div className="podium-grid">
          <span />
          {PODIUM_METRICS.map((m) => <span key={m} className="podium-head">{METRIC_LABELS[m]}</span>)}
          {KINDS.map((kind) => (
            <PodiumRow
              key={kind}
              kind={kind}
              counts={(m) => cellCounts(kind, m)}
              selected={open?.kind === kind ? open.metric : null}
              onSelect={(m) => setOpen(open?.kind === kind && open.metric === m ? null : { kind, metric: m })}
            />
          ))}
        </div>
        <MedalLegend />
        {open && opened && (
          <div className="card flat stack" style={{ gap: 6, padding: 12 }}>
            <b>{KIND_LABELS[open.kind]} · {METRIC_LABELS[open.metric]}</b>
            {opened.entries.length === 0 ? (
              <p className="muted small">No podiums here yet.</p>
            ) : (
              <div className="list">
                {opened.entries.map((e) => <EntryRow key={`${e.kind}-${e.start}-${e.metric}`} entry={e} />)}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card stack" style={{ gap: 10 }}>
        <div className="row between">
          <h2 style={{ marginBottom: 0 }}>Records</h2>
          <Link to="/records" className="small">All records</Link>
        </div>
        {userRecords && userRecords.held.length > 0 ? (
          <>
            <p className="muted small">
              Holds {plural(userRecords.held.length, 'record')}
              {userRecords.tied.length > 0 && ` (${userRecords.tied.length} tied)`}, set {plural(userRecords.setAllTime, 'record')} in total.
            </p>
            <div className="list">
              {userRecords.held.map((key) => {
                const r = categories.get(key)
                if (!r?.current) return null
                return (
                  <div key={key} className="list-item" style={{ alignItems: 'flex-start' }}>
                    <div className="grow">
                      <b>{r.category.label}</b>
                      <p className="muted small">
                        {DIVISION_LABELS[r.category.division]} · {r.current.holders[0]?.title ?? formatDay(r.current.achievedOn)} · {plural(r.current.stoodDays, 'day')}
                        {r.current.ties.some((t) => t.userId === userId) && ' · tied'}
                      </p>
                    </div>
                    <span className="value">{formatRecordValue(r.category.stat, r.current.value)}</span>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <p className="muted small">No records held right now.</p>
        )}
      </div>

      <Segmented
        value={days}
        onChange={setDays}
        options={[{ value: 30, label: '30 days' }, { value: 90, label: '90 days' }]}
      />
      <Segmented
        value={metric}
        onChange={setMetric}
        options={PODIUM_METRICS.map((m) => ({ value: m, label: METRIC_LABELS[m] }))}
      />
      <div className="card">
        {vals.length === 0 ? (
          <p className="muted center">No {METRIC_LABELS[metric].toLowerCase()} data in this range.</p>
        ) : (
          <BarChart data={points} goal={metric === 'duration' ? 480 : undefined} format={fmt} />
        )}
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
          <p className="value" style={{ fontSize: 22 }}>{vals.length}</p>
        </div>
      </div>

      {scored && <SleepScoreCard night={scored} history={mine} timezone={scored.timezone ?? base.timeZone} />}

      <div className="card stack">
        <h2 style={{ marginBottom: 0 }}>Nights synced</h2>
        <p><b>{synced}</b> of the last {COVERAGE_DAYS} nights. A podium or average record needs a night on every day of the period.</p>
        <CoverageGrid cells={cells} label={`${synced} of ${COVERAGE_DAYS} nights synced`} />
      </div>

      {isAdmin && (
        <Link to={`/me/groups/${group.id}/members/${userId}`} className="btn secondary">
          <Settings2 size={18} /> Manage member
        </Link>
      )}
    </div>
  )
}

function PodiumRow({
  kind,
  counts,
  selected,
  onSelect,
}: {
  kind: PodiumKind
  counts: (m: Metric) => { gold: number; silver: number; bronze: number }
  selected: Metric | null
  onSelect: (m: Metric) => void
}) {
  return (
    <>
      <span className="podium-row">{KIND_LABELS[kind]}</span>
      {PODIUM_METRICS.map((m) => {
        const c = counts(m)
        const any = c.gold + c.silver + c.bronze > 0
        return any ? (
          <button key={m} className={`podium-cell ${selected === m ? 'on' : ''}`} onClick={() => onSelect(m)} aria-pressed={selected === m}>
            <MedalCount gold={c.gold} silver={c.silver} bronze={c.bronze} compact />
          </button>
        ) : (
          <span key={m} className="podium-cell empty muted">–</span>
        )
      })}
    </>
  )
}

function EntryRow({ entry }: { entry: MedalEntry }) {
  const body = (
    <>
      <div className="grow">
        <b>{entry.title}</b>
        <p className="muted small">{ordinal(entry.rank)} place</p>
      </div>
      <span className="value">{formatPodiumValue(entry.metric, entry.value)}</span>
    </>
  )
  return entry.kind === 'championship' ? (
    <div className="list-item">{body}</div>
  ) : (
    <Link to={leaguePath(entry.kind, entry.start, entry.metric)} className="list-item">{body}</Link>
  )
}
