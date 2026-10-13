import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useProfile, useUpdateProfile } from '@legity/data/queries'
import { hhmm } from '@legity/core/format'
import { ShortcutSetup } from '../components/ShortcutSetup'
import { ErrorNote, Spinner } from '../components/ui'

type Step = 'install' | 'you' | 'sleep' | 'connect'

function isStandalone(): boolean {
  return (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia('(display-mode: standalone)').matches
}
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)

// Remember the step across reloads (e.g. the auto-update reloading the app mid-onboarding).
const STEP_KEY = 'll_onb_step'
function readStep(): number {
  try {
    return Math.max(0, Number(localStorage.getItem(STEP_KEY)) || 0)
  } catch {
    return 0
  }
}
function saveStep(n: number) {
  try {
    localStorage.setItem(STEP_KEY, String(n))
  } catch {
    /* ignore */
  }
}

export function Onboarding() {
  const nav = useNavigate()
  const profile = useProfile()
  const update = useUpdateProfile()
  const needsInstall = isIOS && !isStandalone()
  const steps: Step[] = [...(needsInstall ? (['install'] as Step[]) : []), 'you', 'sleep', 'connect']
  const [i, setI] = useState(readStep)
  const [fullName, setFullName] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [bed, setBed] = useState<string | null>(null)
  const [wake, setWake] = useState<string | null>(null)
  const [lead, setLead] = useState<number | null>(null)

  if (!profile.data) return <div className="screen no-tabs"><Spinner /></div>
  const p = profile.data
  const chosenLead = lead ?? p.blackout_lead_min
  const step = steps[Math.min(i, steps.length - 1)]
  const go = (n: number) => {
    const clamped = Math.min(Math.max(n, 0), steps.length - 1)
    saveStep(clamped)
    setI(clamped)
  }
  const next = () => go(i + 1)
  const back = () => go(i - 1)

  async function finish() {
    await update.mutateAsync({ onboarded_at: new Date().toISOString(), sleep_source: 'apple_health' })
    saveStep(0)
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
          <h1>Connect your sleep</h1>
          <ShortcutSetup />
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
