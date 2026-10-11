import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Moon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { ErrorNote } from '../components/ui'

export function SignIn() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setError(error)
    else nav('/today', { replace: true })
  }

  return (
    <div className="screen no-tabs stack" style={{ paddingTop: 'calc(var(--safe-top) + 56px)' }}>
      <div className="center stack" style={{ gap: 6, marginBottom: 12 }}>
        <Moon size={52} color="var(--gold)" strokeWidth={1.6} style={{ margin: '0 auto' }} />
        <h1 style={{ fontSize: 32, letterSpacing: '-0.02em' }}>Legity League</h1>
        <p className="muted">Sleep like you mean it.</p>
      </div>
      <form className="stack" onSubmit={submit}>
        <label className="field">
          Email
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">
          Password
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <ErrorNote error={error} />
        <button className="btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="center muted">
        Got an invite? <Link to="/join">Join with a code</Link>
      </p>
    </div>
  )
}
