import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, ChevronLeft, Smartphone, Watch, type LucideIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useProfile, useUpdateProfile } from '../hooks/queries'
import { hhmm } from '../lib/format'
import { ShortcutSetup } from '../components/ShortcutSetup'
import { ErrorNote, Spinner } from '../components/ui'

type Step = 'install' | 'you' | 'source' | 'sleep' | 'connect'
type Source = 'apple_health' | 'manual' | 'garmin'

function isStandalone(): boolean {
  return (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia('(display-mode: standalone)').matches
}
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)

export function Onboarding() {
  const nav = useNavigate()
  const profile = useProfile()
  const update = useUpdateProfile()
  const needsInstall = isIOS && !isStandalone()
  const steps: Step[] = [...(needsInstall ? (['install'] as Step[]) : []), 'you', 'source', 'sleep', 'connect']
  const [i, setI] = useState(0)
  const [fullName, setFullName] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [source, setSource] = useState<Source | null>(null)
  const [bed, setBed] = useState<string | null>(null)
  const [wake, setWake] = useState<string | null>(null)
  const [lead, setLead] = useState<number | null>(null)

  if (!profile.data) return <div className="screen no-tabs"><Spinner /></div>
  const p = profile.data
  const chosenSource: Source = source ?? (p.sleep_source as Source | null) ?? 'apple_health'
  const chosenLead = lead ?? p.blackout_lead_min
  const step = steps[i]
  const next = () => setI((n) => Math.min(n + 1, steps.length - 1))
  const back = () => setI((n) => Math.max(n - 1, 0))

  async function finish() {
    await update.mutateAsync({ onboarded_at: new Date().toISOString() })
    nav('/today', { replace: true })
  }

  return (
    <div className="screen no-tabs stack">
      <div className="onb-head">
        <button className="back" onClick={back} style={{ visibility: i === 0 ? 'hidden' : 'visible' }} aria-label="Previous step">
          <ChevronLeft size={20} /> Back
        </button>
        <div className="dots" aria-hidden>
          {steps.map((s, idx) => <i key={s} className={idx <= i ? 'on' : ''} />)}
        </div>
        <span style={{ width: 70 }} />
      </div>

      {step === 'install' && (
        <>
          <h1>Add to your Home Screen</h1>
          <p className="muted">Do this first. The installed app keeps you signed in and feels like a real app.</p>
          <div className="card">
            <ol className="steps">
              <li>Tap the <b>Share</b> button (square with an arrow) in Safari&apos;s toolbar.</li>
              <li>Scroll and tap <b>Add to Home Screen</b>.</li>
              <li>Tap <b>Add</b>, then open <b>Legity League</b> from your Home Screen.</li>
              <li>Sign in there, and setup carries on from this screen.</li>
            </ol>
          </div>
          <button className="btn secondary" onClick={next}>Continue in the browser anyway</button>
        </>
      )}

      {step === 'you' && (
        <>
          <h1>Who are you?</h1>
          <label className="field">
            Your name
            <input value={fullName ?? p.full_name ?? ''} onChange={(e) => setFullName(e.target.value)} maxLength={80} autoComplete="name" />
          </label>
          <label className="field">
            Display name (shown everywhere in the league)
            <input value={displayName ?? p.display_name} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} />
          </label>
          <ErrorNote error={update.error} />
          <button
            className="btn"
            disabled={update.isPending || !(displayName ?? p.display_name).trim()}
            onClick={async () => {
              await update.mutateAsync({
                display_name: (displayName ?? p.display_name).trim(),
                full_name: (fullName ?? p.full_name ?? '').trim() || null,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || p.timezone,
              })
              next()
            }}
          >
            Next
          </button>
        </>
      )}

      {step === 'source' && (
        <>
          <h1>How do you track sleep?</h1>
          {(
            [
              ['apple_health', Watch, 'Apple Watch / Apple Health', 'Fully automatic through a Shortcut. Best option.'],
              ['garmin', Activity, 'Garmin', 'Works automatically if Garmin Connect writes sleep to Apple Health. Otherwise log manually.'],
              ['manual', Smartphone, 'Something else / manual', 'Log bed and wake time yourself. Perfect for trying it out.'],
            ] as [Source, LucideIcon, string, string][]
          ).map(([value, Icon, title, blurb]) => (
            <button
              key={value}
              className="card"
              style={{ textAlign: 'left', borderColor: chosenSource === value ? "var(--accent)" : undefined, background: chosenSource === value ? 'var(--accent-soft)' : undefined }}
              onClick={() => setSource(value)}
            >
              <div className="row">
                <Icon size={28} color="var(--accent)" strokeWidth={1.7} />
                <div className="grow">
                  <b>{title}</b>
                  <p className="muted small">{blurb}</p>
                </div>
              </div>
            </button>
          ))}
          <button
            className="btn"
            disabled={update.isPending}
            onClick={async () => {
              await update.mutateAsync({ sleep_source: chosenSource })
              next()
            }}
          >
            Next
          </button>
        </>
      )}

      {step === 'sleep' && (
        <>
          <h1>Your sleep schedule</h1>
          <p className="muted">
            Rankings are hidden each evening so you&apos;re not checking scores in bed. Tell us when you aim to sleep and we&apos;ll
            hide them before then.
          </p>
          <div className="row">
            <label className="field grow">
              Bedtime
              <input type="time" value={bed ?? hhmm(p.target_bedtime)} onChange={(e) => setBed(e.target.value)} />
            </label>
            <label className="field grow">
              Wake up
              <input type="time" value={wake ?? hhmm(p.target_wake)} onChange={(e) => setWake(e.target.value)} />
            </label>
          </div>
          <label className="field">
            Hide rankings before bedtime
            <select value={chosenLead} onChange={(e) => setLead(Number(e.target.value))}>
              {[60, 120, 180, 240, 300, 360].map((m) => (
                <option key={m} value={m}>{m / 60} hour{m > 60 ? 's' : ''} before</option>
              ))}
            </select>
          </label>
          <p className="small muted">You can fine-tune this any time in Me → Blackout.</p>
          <ErrorNote error={update.error} />
          <button
            className="btn"
            disabled={update.isPending}
            onClick={async () => {
              await update.mutateAsync({
                target_bedtime: bed ?? hhmm(p.target_bedtime),
                target_wake: wake ?? hhmm(p.target_wake),
                blackout_mode: 'bedtime',
                blackout_lead_min: chosenLead,
                blackout_enabled: true,
              })
              next()
            }}
          >
            Next
          </button>
        </>
      )}

      {step === 'connect' && (
        <>
          {p.sleep_source === 'manual' ? (
            <>
              <h1>You&apos;re all set</h1>
              <div className="card">
                <p>Log each morning from the Today tab: wake date, time asleep, and optionally restorative minutes or a score from your app.</p>
                <p className="muted small" style={{ marginTop: 8 }}>
                  If you use Sleep Cycle, copy the numbers from it. You can switch to the automatic Shortcut later in Me → Devices.
                </p>
              </div>
            </>
          ) : (
            <>
              <h1>Connect your sleep</h1>
              {p.sleep_source === 'garmin' && (
                <div className="notice">
                  First check Health → Browse → Sleep → Data Sources &amp; Access. If Garmin Connect is listed, continue. If not,
                  choose manual logging instead (Me → Devices).
                </div>
              )}
              <ShortcutSetup />
            </>
          )}
          <ErrorNote error={update.error} />
          <button className="btn" disabled={update.isPending} onClick={finish}>
            {update.isPending ? 'Finishing…' : 'Finish setup'}
          </button>
          <button className="btn secondary" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </>
      )}
    </div>
  )
}
