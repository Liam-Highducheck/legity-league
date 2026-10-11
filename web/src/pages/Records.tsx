import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDay } from '../lib/dates'
import { formatPodiumValue, ordinal } from '../lib/format'
import { memberPath, leaguePath } from '../lib/links'
import { DIVISION_LABELS, LEAGUE_KINDS, PODIUM_METRICS, type Division } from '../lib/league/types'
import { medalTally, tallyKey, emptyCounts, type Podium } from '../lib/league/podiums'
import {
  formatRecordValue,
  type CategoryReport,
  type Holder,
  type RecordEvent,
  type RecordScope,
  type RecordsReport,
} from '../lib/league/records'
import { PERIOD_LABELS, type PeriodKind } from '../lib/periods'
import { METRIC_LABELS, type Metric } from '../lib/stats'
import { useGroup } from '../hooks/group'
import { useLeagueReport } from '../hooks/league'
import { Avatar, ErrorNote, PageHead, Segmented, Spinner } from '../components/ui'
import { GroupSwitcher } from '../components/GroupSwitcher'
import { MedalCount, MedalIcon } from '../components/MedalCount'

type Tab = 'records' | 'history' | 'holders' | 'medals'

const SCOPES: RecordScope[] = ['night', ...LEAGUE_KINDS]
const SCOPE_LABELS: Record<RecordScope, string> = { night: 'Single night', ...PERIOD_LABELS }
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

type Names = Map<string, string>

function People({ holders, names }: { holders: Holder[]; names: Names }) {
  return (
    <>
      {holders.map((h, i) => (
        <Fragment key={h.userId}>
          {i > 0 && (i === holders.length - 1 ? ' and ' : ', ')}
          <Link to={memberPath(h.userId)}><b>{names.get(h.userId) ?? 'Someone'}</b></Link>
        </Fragment>
      ))}
    </>
  )
}

function whenOf(e: Pick<RecordEvent, 'holders' | 'achievedOn'>): string {
  return e.holders[0]?.title ?? formatDay(e.achievedOn)
}

function EventLine({ category, event, names }: { category: CategoryReport['category']; event: RecordEvent; names: Names }) {
  return (
    <div className="list-item" style={{ alignItems: 'flex-start' }}>
      <div className="grow">
        <p>
          <b className="value">{formatRecordValue(category.stat, event.value)}</b> · <People holders={event.holders} names={names} />
        </p>
        <p className="muted small">
          {whenOf(event)}
          {event.previous
            ? ` · beat ${formatRecordValue(category.stat, event.previous.value)} after ${plural(event.previous.stoodDays, 'day')}`
            : ' · first record'}
        </p>
      </div>
      <span className="muted small">{event.supersededOn ? `stood ${plural(event.stoodDays, 'day')}` : 'standing'}</span>
    </div>
  )
}

function RecordCard({ report, names }: { report: CategoryReport; names: Names }) {
  const { category, current, events } = report
  const windowHint =
    category.scope === 'night' ? '' : ` It needs a full ${category.scope} with a night on every day.`
  return (
    <div className="card stack" style={{ gap: 8 }}>
      <b>{category.label}</b>
      {current ? (
        <>
          <p className="record-value">{formatRecordValue(category.stat, current.value)}</p>
          <p><People holders={current.holders} names={names} /></p>
          {current.ties.length > 0 && (
            <p className="small">Tied by <People holders={current.ties} names={names} /></p>
          )}
          <p className="muted small">
            {whenOf(current)} · standing for {plural(current.stoodDays, 'day')}
          </p>
        </>
      ) : (
        <p className="muted small">No record yet.{windowHint}</p>
      )}
      {events.length > 1 && (
        <details>
          <summary>History · {events.length} records</summary>
          <div className="list">
            {[...events].reverse().map((e) => (
              <EventLine key={`${e.achievedOn}-${e.value}`} category={category} event={e} names={names} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function DivisionPills({ value, onChange }: { value: Division; onChange: (d: Division) => void }) {
  return (
    <Segmented
      value={value}
      onChange={onChange}
      options={(Object.keys(DIVISION_LABELS) as Division[]).map((d) => ({ value: d, label: DIVISION_LABELS[d] }))}
    />
  )
}

function RecordsTab({ records, names }: { records: RecordsReport; names: Names }) {
  const [division, setDivision] = useState<Division>('watch')
  const [scope, setScope] = useState<RecordScope>('night')
  const shown = records.categories.filter((c) => c.category.division === division && c.category.scope === scope)
  return (
    <>
      <DivisionPills value={division} onChange={setDivision} />
      <div className="scroll-x" role="tablist" aria-label="Record type">
        {SCOPES.map((s) => (
          <button key={s} className={`pill ${s === scope ? 'on' : ''}`} onClick={() => setScope(s)}>
            {SCOPE_LABELS[s]}
          </button>
        ))}
      </div>
      {division === 'watch' ? (
        <p className="muted small">Watch records need sleep-stage data on every night counted (an Apple Watch, or another tracker that writes stages to Apple Health).</p>
      ) : (
        <p className="muted small">Non-Watch covers phone-only Health data. Restorative time and score need stage data, so they are Watch records only.</p>
      )}
      {shown.map((r) => <RecordCard key={r.category.key} report={r} names={names} />)}
    </>
  )
}

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
      {tab === 'records' && <RecordsTab records={report.records} names={names} />}
      {tab === 'history' && <HistoryTab records={report.records} names={names} />}
      {tab === 'holders' && <HoldersTab records={report.records} members={base.members} />}
      {tab === 'medals' && <MedalsTab podiums={report.podiums} members={base.members} />}
    </div>
  )
}
