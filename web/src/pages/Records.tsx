import { useState } from 'react'
import { ChartColumn } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatPodiumValue, ordinal } from '@legity/core/format'
import { memberPath, leaguePath } from '@legity/core/links'
import { LEAGUE_KINDS, PODIUM_METRICS, type Division } from '@legity/core/league/types'
import { medalTally, tallyKey, emptyCounts, type Podium } from '@legity/core/league/podiums'
import { type RecordScope, type RecordsReport } from '@legity/core/league/records'
import { PERIOD_LABELS, type PeriodKind } from '@legity/core/periods'
import { METRIC_LABELS, type Metric } from '@legity/core/stats'
import { useGroup } from '../hooks/group'
import { useLeagueReport } from '../hooks/league'
import { Avatar, ErrorNote, PageHead, Segmented, Spinner } from '../components/ui'
import { GroupSwitcher } from '../components/GroupSwitcher'
import { MedalCount, MedalIcon } from '../components/MedalCount'
import { DivisionPills, EventLine, RecordsBrowser, SCOPE_LABELS, type Names } from '../components/RecordsBrowser'

type Tab = 'records' | 'history' | 'holders' | 'medals'

function HistoryTab({ records, names }: { records: RecordsReport; names: Names }) {
  const [division, setDivision] = useState<Division>('watch')
  const [limit, setLimit] = useState(40)
  const events = records.categories
    .filter((c) => c.category.division === division)
    .flatMap((c) => c.events.map((event) => ({ category: c.category, event })))
    .sort((a, b) => b.event.achievedOn.localeCompare(a.event.achievedOn) || a.category.key.localeCompare(b.category.key))
  return (
    <>
      <DivisionPills value={division} onChange={setDivision} />
      <div className="card">
        {events.length === 0 ? (
          <p className="muted center">No records have been set yet.</p>
        ) : (
          <div className="list">
            {events.slice(0, limit).map(({ category, event }) => (
              <div key={`${category.key}-${event.achievedOn}-${event.value}`} className="stack" style={{ gap: 0 }}>
                <p className="muted small" style={{ paddingTop: 10 }}>{category.label}</p>
                <EventLine category={category} event={event} names={names} />
              </div>
            ))}
          </div>
        )}
      </div>
      {events.length > limit && (
        <button className="btn secondary" onClick={() => setLimit((l) => l + 40)}>Show more</button>
      )}
    </>
  )
}

function HoldersTab({ records, members }: { records: RecordsReport; members: { user_id: string; name: string }[] }) {
  const rows = members
    .map((m) => ({ m, u: records.byUser.get(m.user_id) }))
    .sort(
      (a, b) =>
        (b.u?.held.length ?? 0) - (a.u?.held.length ?? 0) ||
        (b.u?.setAllTime ?? 0) - (a.u?.setAllTime ?? 0) ||
        a.m.name.localeCompare(b.m.name),
    )
  return (
    <div className="card">
      <div className="list">
        {rows.map(({ m, u }) => {
          const byScope = new Map<string, number>()
          for (const key of u?.held ?? []) byScope.set(key.split(':')[0], (byScope.get(key.split(':')[0]) ?? 0) + 1)
          return (
            <Link key={m.user_id} to={memberPath(m.user_id)} className="list-item">
              <Avatar name={m.name} />
              <div className="grow">
                <b>{m.name}</b>
                <p className="muted small">
                  {u && u.held.length > 0
                    ? [...byScope].map(([scope, n]) => `${SCOPE_LABELS[scope as RecordScope] ?? scope} ${n}`).join(' · ')
                    : 'No current records'}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="value">{u?.held.length ?? 0} held</p>
                <p className="muted small">{u?.setAllTime ?? 0} set all-time</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

const MEDAL_KINDS: (PeriodKind | 'championship')[] = [...LEAGUE_KINDS, 'championship']
const KIND_LABELS: Record<PeriodKind | 'championship', string> = { ...PERIOD_LABELS, championship: 'Championship' }

function MedalsTab({ podiums, members }: { podiums: Podium[]; members: { user_id: string; name: string }[] }) {
  const [kind, setKind] = useState<PeriodKind | 'championship'>('week')
  const [metric, setMetric] = useState<Metric>('duration')
  const tally = medalTally(podiums)
  const rows = members
    .map((m) => ({ m, c: tally.get(m.user_id)?.get(tallyKey(kind, metric)) ?? emptyCounts() }))
    .filter((r) => r.c.gold + r.c.silver + r.c.bronze > 0)
    .sort((a, b) => b.c.gold - a.c.gold || b.c.silver - a.c.silver || b.c.bronze - a.c.bronze || a.m.name.localeCompare(b.m.name))
  const recent = podiums.filter((p) => p.kind === kind && p.metric === metric && p.medals.length > 0).slice(0, 12)
  return (
    <>
      <div className="scroll-x" role="tablist" aria-label="Podium type">
        {MEDAL_KINDS.map((k) => (
          <button key={k} className={`pill ${k === kind ? 'on' : ''}`} onClick={() => setKind(k)}>{KIND_LABELS[k]}</button>
        ))}
      </div>
      <Segmented
        value={metric}
        onChange={setMetric}
        options={PODIUM_METRICS.map((m) => ({ value: m, label: METRIC_LABELS[m] }))}
      />
      <p className="muted small">
        {KIND_LABELS[kind]} podiums are counted on their own: a weekly gold is not a monthly gold.
      </p>
      <div className="card">
        {rows.length === 0 ? (
          <p className="muted center">No {KIND_LABELS[kind].toLowerCase()} medals yet. A podium needs a night on every day of a finished period.</p>
        ) : (
          <div className="list">
            {rows.map(({ m, c }, i) => (
              <Link key={m.user_id} to={memberPath(m.user_id)} className="list-item">
                <span className="rank">{i + 1}</span>
                <Avatar name={m.name} />
                <b className="grow">{m.name}</b>
                <MedalCount gold={c.gold} silver={c.silver} bronze={c.bronze} />
              </Link>
            ))}
          </div>
        )}
      </div>
      {recent.length > 0 && (
        <div className="card">
          <h2>{kind === 'championship' ? 'Championships' : 'Recent podiums'}</h2>
          <div className="list">
            {recent.map((p) => {
              const body = (
                <>
                  <div className="grow">
                    <b>{p.title}</b>
                    <p className="muted small">
                      {p.medals.map((m) => `${ordinal(m.rank)} ${m.name} (${formatPodiumValue(metric, m.value)})`).join(' · ')}
                    </p>
                  </div>
                  <MedalIcon rank={1} />
                </>
              )
              return p.kind === 'championship' ? (
                <div key={p.title + p.start} className="list-item">{body}</div>
              ) : (
                <Link key={p.kind + p.start} to={leaguePath(p.kind, p.start, p.metric)} className="list-item">{body}</Link>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}

export function Records() {
  const { group } = useGroup()
  const { base, report, isLoading, error } = useLeagueReport(group?.id)
  const [tab, setTab] = useState<Tab>('records')

  const head = <PageHead title="Records" right={<GroupSwitcher />} />
  if (isLoading) return <div className="screen stack">{head}<Spinner /></div>
  if (error || !base || !report) {
    return <div className="screen stack">{head}<ErrorNote error={error ?? new Error('Couldn’t load records')} /></div>
  }
  const names: Names = new Map(base.members.map((m) => [m.user_id, m.name]))

  return (
    <div className="screen stack">
      {head}
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'records', label: 'Records' },
          { value: 'history', label: 'History' },
          { value: 'holders', label: 'Holders' },
          { value: 'medals', label: 'Medals' },
        ]}
      />
      {tab === 'records' && (
        <>
          <Link to="/records/advanced" className="btn secondary">
            <ChartColumn size={18} /> More statistics: REM, deep sleep, interruptions
          </Link>
          <RecordsBrowser base={base} mainReport={report.records} />
        </>
      )}
      {tab === 'history' && <HistoryTab records={report.records} names={names} />}
      {tab === 'holders' && <HoldersTab records={report.records} members={base.members} />}
      {tab === 'medals' && <MedalsTab podiums={report.podiums} members={base.members} />}
    </div>
  )
}
