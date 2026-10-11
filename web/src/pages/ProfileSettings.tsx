import { useState } from 'react'
import { useProfile, useUpdateProfile } from '../hooks/queries'
import { ErrorNote, PageHead, Spinner } from '../components/ui'

function timezones(): string[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (k: string) => string[] }
  return intl.supportedValuesOf ? intl.supportedValuesOf('timeZone') : []
}

export function ProfileSettings() {
  const profile = useProfile()
  const update = useUpdateProfile()
  const [fullName, setFullName] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [tz, setTz] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  if (!profile.data) return <div className="screen"><Spinner /></div>
  const p = profile.data
  const zones = timezones()
  const currentTz = tz ?? p.timezone

  return (
    <div className="screen stack">
      <PageHead title="Profile" back />
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault()
          setSaved(false)
          await update.mutateAsync({
            full_name: (fullName ?? p.full_name ?? '').trim() || null,
            display_name: (displayName ?? p.display_name).trim(),
            timezone: currentTz,
          })
          setSaved(true)
        }}
      >
        <label className="field">
          Your name
          <input value={fullName ?? p.full_name ?? ''} onChange={(e) => setFullName(e.target.value)} maxLength={80} />
        </label>
        <label className="field">
          Display name (shown everywhere)
          <input value={displayName ?? p.display_name} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} required />
        </label>
        <label className="field">
          Timezone
          {zones.length ? (
            <select value={currentTz} onChange={(e) => setTz(e.target.value)}>
              {!zones.includes(currentTz) && <option value={currentTz}>{currentTz}</option>}
              {zones.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          ) : (
            <input value={currentTz} onChange={(e) => setTz(e.target.value)} />
          )}
        </label>
        <p className="muted small">Your timezone decides which morning each night counts for, so keep it right when you travel.</p>
        <ErrorNote error={update.error} />
        <button className="btn" disabled={update.isPending}>{update.isPending ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}</button>
      </form>
    </div>
  )
}
