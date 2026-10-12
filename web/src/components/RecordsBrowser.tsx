import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { eachDay, formatDay, formatDayPlain } from '@legity/core/dates'
import { formatDuration, minutesToClock } from '@legity/core/format'
import { memberPath } from '@legity/core/links'
import {
  ROLLING_DAYS,
  computeRecords,
  formatNightStat,
  formatRecordValue,
  type CategoryReport,
  type Holder,
  type RecordEvent,
  type RecordScope,
  type RecordsReport,
} from '@legity/core/league/records'
import type { LeagueBase } from '@legity/core/league/report'
import { DIVISION_LABELS, LEAGUE_KINDS, type Division } from '@legity/core/league/types'
import { bedtimeOf } from '@legity/core/league/windows'
import { PERIOD_LABELS } from '@legity/core/periods'
import { Segmented } from './ui'

const SCOPES: RecordScope[] = ['night', ...LEAGUE_KINDS]
export const SCOPE_LABELS: Record<RecordScope, string> = { night: 'Single night', ...PERIOD_LABELS }
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export type Names = Map<string, string>

export function People({ holders, names }: { holders: Holder[]; names: Names }) {
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

export function whenOf(e: Pick<RecordEvent, 'holders' | 'achievedOn'>): string {
  return e.holders[0]?.title ?? formatDay(e.achievedOn)
}

const eventKey = (e: RecordEvent) => `${e.achievedOn}-${e.value}`

/** The nights behind a record: every night of the window (or the single night) with its value and a little context. */
function NightsPanel({ holder, category, base, name }: { holder: Holder; category: CategoryReport['category']; base: LeagueBase; name: string }) {
  const target = base.members.find((m) => m.user_id === holder.userId)?.target_bedtime
  const byDate = base.index.get(holder.userId)
  const single = !(holder.start && holder.end)
  const dates = single ? [holder.achievedOn] : eachDay(holder.start!, holder.end!)
  return (
    <div className="card flat stack" style={{ gap: 4, padding: 12 }}>
      <p className="small"><b>{name}</b> <span className="muted">· {single ? 'the night' : `${dates.length} nights`}</span></p>
      <div className="list" style={{ maxHeight: 360, overflowY: 'auto' }}>
        {dates.map((d) => {
          const n = byDate?.get(d)
          const bed = n ? bedtimeOf(n) : null
          return (
            <div key={d} className="list-item" style={{ minHeight: 44, padding: '8px 4px' }}>
              <div className="grow">
                <b>{formatDayPlain(d)}</b>
                <p className="muted small">
                  {n
                    ? [
                        `${formatDuration(n.duration_min)} asleep`,
                        n.sleep_score != null ? `score ${n.sleep_score}` : null,
                        bed ? `bed ${minutesToClock(bed.minutes)}` : null,
                        single && n.restorative_min != null ? `restorative ${formatDuration(n.restorative_min)}` : null,
                        single && n.deep_min != null ? `deep ${formatDuration(n.deep_min)}` : null,
                        single && n.rem_min != null ? `REM ${formatDuration(n.rem_min)}` : null,
                      ].filter(Boolean).join(' · ')
                    : 'No night recorded'}
                </p>
              </div>
              <span className="value">{n ? formatNightStat(n, category.stat, target) : '—'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Panels({ event, category, base, names }: { event: RecordEvent; category: CategoryReport['category']; base: LeagueBase; names: Names }) {
  return (
    <>
      {[...event.holders, ...event.ties].map((h) => (
        <NightsPanel key={h.userId} holder={h} category={category} base={base} name={names.get(h.userId) ?? 'Someone'} />
      ))}
    </>
  )
}

export function EventLine({
  category,
  event,
  names,
  open,
  onToggle,
}: {
  category: CategoryReport['category']
  event: RecordEvent
  names: Names
  open?: boolean
  onToggle?: () => void
}) {
  const body = (
    <>
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
    </>
  )
  if (!onToggle) return <div className="list-item" style={{ alignItems: 'flex-start' }}>{body}</div>
  return (
    <button type="button" className="list-item" style={{ alignItems: 'flex-start' }} onClick={onToggle} aria-expanded={!!open}>
      {body}
    </button>
  )
}

function RecordCard({ report, names, base }: { report: CategoryReport; names: Names; base: LeagueBase }) {
  const { category, current, events } = report
  const [open, setOpen] = useState<string | null>(null)
  const toggle = (e: RecordEvent) => setOpen(open === eventKey(e) ? null : eventKey(e))
  const hint =
    category.scope === 'night'
      ? ''
      : category.rolling
        ? ` It needs ${ROLLING_DAYS[category.scope]} days in a row with a night on every day.`
        : ` It needs a full ${category.scope} with a night on every day.`
  return (
    <div className="card stack" style={{ gap: 8 }}>
      <b>{category.label}</b>
      {current ? (
        <>
          <p className="record-value">{formatRecordValue(category.stat, current.value)}</p>
          <p><People holders={current.holders} names={names} /></p>
          {current.ties.length > 0 && <p className="small">Tied by <People holders={current.ties} names={names} /></p>}
          <p className="muted small">{whenOf(current)} · standing for {plural(current.stoodDays, 'day')}</p>
          <button type="button" className="btn secondary small" style={{ alignSelf: 'flex-start' }} onClick={() => toggle(current)} aria-expanded={open === eventKey(current)}>
            {open === eventKey(current) ? 'Hide nights' : category.scope === 'night' ? 'Show the night' : 'Show the nights'}
          </button>
          {open === eventKey(current) && <Panels event={current} category={category} base={base} names={names} />}
        </>
      ) : (
        <p className="muted small">No record yet.{hint}</p>
      )}
      {events.length > 1 && (
        <details>
          <summary>History · {events.length} records</summary>
          <div className="list">
            {[...events].reverse().map((e) => (
              <Fragment key={eventKey(e)}>
                <EventLine category={category} event={e} names={names} open={open === eventKey(e)} onToggle={() => toggle(e)} />
                {open === eventKey(e) && e !== current && <Panels event={e} category={category} base={base} names={names} />}
              </Fragment>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

export function DivisionPills({ value, onChange }: { value: Division; onChange: (d: Division) => void }) {
  return (
    <Segmented
      value={value}
      onChange={onChange}
      options={(Object.keys(DIVISION_LABELS) as Division[]).map((d) => ({ value: d, label: DIVISION_LABELS[d] }))}
    />
  )
}

/**
 * Record cards for one set of statistics: Watch / Non-Watch, single night or period, and calendar or rolling
 * windows. `mainReport` is the already-computed calendar report; anything else is computed on demand.
 */
export function RecordsBrowser({ base, mainReport, advanced = false }: { base: LeagueBase; mainReport?: RecordsReport; advanced?: boolean }) {
  const [division, setDivision] = useState<Division>('watch')
  const [scope, setScope] = useState<RecordScope>('night')
  const [rolling, setRolling] = useState(false)
  const names: Names = useMemo(() => new Map(base.members.map((m) => [m.user_id, m.name])), [base.members])

  const report = useMemo(
    () => (!advanced && !rolling && mainReport ? mainReport : computeRecords(base.members, base.nights, base.asOf, LEAGUE_KINDS, { rolling, advanced })),
    [advanced, rolling, mainReport, base],
  )
  const shownScope: RecordScope = rolling && scope === 'night' ? 'week' : scope
  const shown = report.categories.filter((c) => c.category.division === division && c.category.scope === shownScope)

  return (
    <>
      <DivisionPills value={division} onChange={setDivision} />
      <div className="scroll-x" role="tablist" aria-label="Record type">
        {SCOPES.filter((s) => !(rolling && s === 'night')).map((s) => (
          <button key={s} className={`pill ${s === shownScope ? 'on' : ''}`} onClick={() => setScope(s)}>
            {SCOPE_LABELS[s]}
          </button>
        ))}
      </div>
      {shownScope !== 'night' && (
        <div className="row between">
          <span className="muted small">
            {rolling ? `Any ${ROLLING_DAYS[shownScope]} days in a row` : `Calendar ${shownScope === 'week' ? 'weeks (Mon to Sun)' : `${shownScope}s`}`}
          </span>
          <button
            type="button"
            className={`pill ${rolling ? 'on' : ''}`}
            aria-pressed={rolling}
            onClick={() => {
              setRolling(!rolling)
              if (!rolling && scope === 'night') setScope('week')
            }}
          >
            Rolling
          </button>
        </div>
      )}
      {division === 'watch' ? (
        <p className="muted small">Watch records need sleep-stage data on every night counted (an Apple Watch, or another tracker that writes stages to Apple Health).</p>
      ) : (
        <p className="muted small">Non-Watch covers phone-only Health data. Restorative time, score and sleep stages need stage data, so they are Watch records only.</p>
      )}
      {shown.length === 0 && <p className="muted center">Nothing to show here.</p>}
      {shown.map((r) => <RecordCard key={r.category.key} report={r} names={names} base={base} />)}
    </>
  )
}
