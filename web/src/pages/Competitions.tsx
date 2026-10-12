import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Flag, Pencil, Trash2 } from 'lucide-react'
import { formatShortDay, todayISO } from '@legity/core/dates'
import { formatPodiumValue, ordinal } from '@legity/core/format'
import { competitionDays, competitionStatus } from '@legity/core/league/report'
import type { Competition } from '@legity/core/league/types'
import { METRIC_LABELS } from '@legity/core/stats'
import { useGroup } from '../hooks/group'
import {
  useCompetitions,
  useCreateCompetition,
  useDeleteCompetition,
  useGroupSettings,
  useLeagueReport,
  useUpdateCompetition,
} from '../hooks/league'
import { useProfile } from '../hooks/queries'
import { ErrorNote, PageHead, Spinner } from '../components/ui'

const STATUS_LABELS = { upcoming: 'Upcoming', active: 'Running', finished: 'Finished' }

function CompetitionForm({
  initial,
  busy,
  error,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: { name: string; startsOn: string; endsOn: string }
  busy: boolean
  error: unknown
  submitLabel: string
  onSubmit: (v: { name: string; startsOn: string; endsOn: string }) => void
  onCancel?: () => void
}) {
  const [name, setName] = useState(initial.name)
  const [startsOn, setStartsOn] = useState(initial.startsOn)
  const [endsOn, setEndsOn] = useState(initial.endsOn)
  const valid = name.trim().length > 0 && startsOn && endsOn && endsOn >= startsOn
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onSubmit({ name: name.trim(), startsOn, endsOn })
      }}
    >
      <label className="field">
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Spring Championship" />
      </label>
      <div className="row">
        <label className="field grow">
          Starts
          <input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
        </label>
        <label className="field grow">
          Ends
          <input type="date" value={endsOn} min={startsOn} onChange={(e) => setEndsOn(e.target.value)} />
        </label>
      </div>
      <ErrorNote error={error} />
      <div className="row">
        <button className="btn grow" disabled={busy || !valid}>{busy ? 'Saving…' : submitLabel}</button>
        {onCancel && <button type="button" className="btn secondary" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  )
}

export function Competitions() {
  const { id = '' } = useParams()
  const { groups } = useGroup()
  const group = groups.find((g) => g.id === id)
  const isAdmin = group?.role === 'owner' || group?.role === 'admin'
  const profile = useProfile()
  const settings = useGroupSettings(id)
  const list = useCompetitions(id)
  const { report } = useLeagueReport(id)
  const create = useCreateCompetition()
  const update = useUpdateCompetition()
  const remove = useDeleteCompetition()
  const [editing, setEditing] = useState<string | null>(null)

  const head = <PageHead title="Championships" back />
  if (!group) return <div className="screen stack">{head}<p className="muted">You&apos;re not in this group.</p></div>
  if (list.isLoading || settings.isLoading) return <div className="screen stack">{head}<Spinner /></div>
  if (list.error) return <div className="screen stack">{head}<ErrorNote error={list.error} /></div>
  if (!list.data?.available) {
    return (
      <div className="screen stack">
        {head}
        <div className="notice">
          Championships aren&apos;t switched on for this app yet. The database update for them (migration 20261012090002)
          hasn&apos;t been applied, so ask Liam to run <code>supabase db push</code>.
        </div>
      </div>
    )
  }

  const today = todayISO(settings.data?.timezone ?? profile.data?.timezone)
  const rows = list.data.rows
  const winnersOf = (c: Competition) => (report?.podiums ?? []).filter((p) => p.competitionId === c.id && p.medals.length > 0)

  return (
    <div className="screen stack">
      {head}
      <p className="muted">
        A championship is a date range set by an owner or admin. Whoever places in the top three over those dates, with a night
        on every day, earns a championship podium.
      </p>

      {rows.length === 0 && <p className="muted center">No championships yet.</p>}

      {rows.map((c) => {
        const status = competitionStatus(c, today)
        const winners = winnersOf(c)
        return (
          <div key={c.id} className="card stack" style={{ gap: 10 }}>
            {editing === c.id ? (
              <CompetitionForm
                initial={{ name: c.name, startsOn: c.starts_on, endsOn: c.ends_on }}
                busy={update.isPending}
                error={update.error}
                submitLabel="Save changes"
                onCancel={() => setEditing(null)}
                onSubmit={(v) => update.mutate({ id: c.id, ...v }, { onSuccess: () => setEditing(null) })}
              />
            ) : (
              <>
                <div className="row between">
                  <b style={{ fontSize: 18 }}>{c.name}</b>
                  <span className="chip">{STATUS_LABELS[status]}</span>
                </div>
                <p className="muted small">
                  {formatShortDay(c.starts_on)} to {formatShortDay(c.ends_on)} · {competitionDays(c)} days
                </p>
                {status === 'finished' &&
                  (winners.length === 0 ? (
                    <p className="muted small">No podium: it needs at least two people with a night on every day.</p>
                  ) : (
                    winners.map((p) => (
                      <p key={p.metric} className="small">
                        <b>{METRIC_LABELS[p.metric]}:</b>{' '}
                        {p.medals.map((m) => `${ordinal(m.rank)} ${m.name} (${formatPodiumValue(p.metric, m.value)})`).join(' · ')}
                      </p>
                    ))
                  ))}
                {isAdmin && (
                  <div className="row">
                    <button className="btn secondary small" onClick={() => setEditing(c.id)}><Pencil size={16} /> Edit</button>
                    <button
                      className="btn danger small"
                      disabled={remove.isPending}
                      onClick={() => window.confirm(`Delete ${c.name}? Its championship podiums go with it.`) && remove.mutate(c.id)}
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )
      })}
      <ErrorNote error={remove.error} />

      {isAdmin && (
        <div className="card stack">
          <h2 style={{ marginBottom: 0 }}><Flag size={14} className="inline-icon" /> New championship</h2>
          <CompetitionForm
            key={rows.length}
            initial={{ name: '', startsOn: today, endsOn: '' }}
            busy={create.isPending}
            error={create.error}
            submitLabel="Create championship"
            onSubmit={(v) => create.mutate({ groupId: id, ...v })}
          />
          <p className="muted small">Dates can be changed until the championship has finished.</p>
        </div>
      )}
    </div>
  )
}
