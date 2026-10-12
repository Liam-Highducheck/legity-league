import { useState } from 'react'
import { Check, Moon } from 'lucide-react'
import { personalWindow } from '@legity/core/blackout'
import { hhmm, minutesToClock } from '@legity/core/format'
import { useForcedBlackout, useProfile, useUpdateProfile } from '@legity/data/queries'
import { toMinutes } from '@legity/core/blackout'
import { ErrorNote, PageHead, Segmented, Spinner, Toggle } from '../components/ui'
import type { Profile } from '@legity/core/types'

export function BlackoutSettings() {
  const profile = useProfile()
  const forced = useForcedBlackout()
  if (!profile.data) return <div className="screen"><Spinner /></div>
  return <Form key={profile.data.updated_at} p={profile.data} forced={forced.data} />
}

function Form({ p, forced }: { p: Profile; forced: { enabled: boolean; start: string; end: string } | null | undefined }) {
  const update = useUpdateProfile()
  const [enabled, setEnabled] = useState(p.blackout_enabled)
  const [mode, setMode] = useState<'bedtime' | 'fixed'>(p.blackout_mode as 'bedtime' | 'fixed')
  const [bed, setBed] = useState(hhmm(p.target_bedtime))
  const [wake, setWake] = useState(hhmm(p.target_wake))
  const [lead, setLead] = useState(p.blackout_lead_min)
  const [start, setStart] = useState(hhmm(p.blackout_start))
  const [end, setEnd] = useState(hhmm(p.blackout_end))
  const [saved, setSaved] = useState(false)

  const win = personalWindow({
    blackout_enabled: enabled,
    blackout_mode: mode,
    blackout_start: start,
    blackout_end: end,
    target_bedtime: bed,
    target_wake: wake,
    blackout_lead_min: lead,
  })

  return (
    <div className="screen stack">
      <PageHead title="Blackout" back />
      <p className="muted">
        Rankings and other people&apos;s sleep are hidden in the evening, so you don&apos;t go to bed stressing about a number.
        Your own data always stays visible.
      </p>

      {forced?.enabled && (
        <div className="notice">
          <Moon size={16} className="inline-icon" /> The whole league also rests from <b>{minutesToClock(toMinutes(forced.start))}</b> to{' '}
          <b>{minutesToClock(toMinutes(forced.end))}</b> (your local time). That can&apos;t be turned off.
        </div>
      )}

      <div className="card stack">
        <div className="row between">
          <div>
            <b>My own blackout</b>
            <p className="muted small">Adds to your group's blackout</p>
          </div>
          <Toggle on={enabled} onChange={setEnabled} label="Personal blackout" />
        </div>

        <h2 style={{ marginTop: 6, marginBottom: 0 }}>Sleep schedule</h2>
        <div className="row">
          <label className="field grow">
            Bedtime
            <input type="time" value={bed} onChange={(e) => setBed(e.target.value)} />
          </label>
          <label className="field grow">
            Wake up
            <input type="time" value={wake} onChange={(e) => setWake(e.target.value)} />
          </label>
        </div>

        {enabled && (
          <>
            <Segmented
              value={mode}
              onChange={setMode}
              options={[{ value: 'bedtime', label: 'Follow my bedtime' }, { value: 'fixed', label: 'Fixed times' }]}
            />
            {mode === 'bedtime' ? (
              <label className="field">
                Start hiding before bedtime
                <select value={lead} onChange={(e) => setLead(Number(e.target.value))}>
                  {[0, 30, 60, 90, 120, 180, 240, 300, 360, 480].map((m) => (
                    <option key={m} value={m}>
                      {m === 0 ? 'At bedtime' : m % 60 === 0 ? `${m / 60} hour${m > 60 ? 's' : ''} before` : `${m} minutes before`}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="row">
                <label className="field grow">
                  Hide from
                  <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
                </label>
                <label className="field grow">
                  Until
                  <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
                </label>
              </div>
            )}
            {win && (
              <p className="muted small">
                Hidden <b style={{ color: 'var(--text)' }}>{minutesToClock(win.start)}</b> →{' '}
                <b style={{ color: 'var(--text)' }}>{minutesToClock(win.end)}</b>
              </p>
            )}
          </>
        )}
      </div>

      <ErrorNote error={update.error} />
      <button
        className="btn"
        disabled={update.isPending}
        onClick={async () => {
          setSaved(false)
          await update.mutateAsync({
            blackout_enabled: enabled,
            blackout_mode: mode,
            blackout_lead_min: lead,
            blackout_start: start,
            blackout_end: end,
            target_bedtime: bed,
            target_wake: wake,
          })
          setSaved(true)
        }}
      >
        {update.isPending ? 'Saving…' : saved ? <><Check size={18} /> Saved</> : 'Save'}
      </button>
    </div>
  )
}
