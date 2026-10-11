import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Moon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/auth'
import { useGroup } from '../hooks/group'
import { ErrorNote, Spinner } from '../components/ui'

function useInviteCheck(code: string) {
  return useQuery({
    queryKey: ['invite-check', code],
    enabled: code.trim().length >= 6,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('check_invite', { p_code: code.trim() })
      if (error) throw new Error(error.message)
      return data?.[0] ?? { valid: false, group_name: null }
    },
  })
}

export function Join() {
  const params = useParams()
  const [code, setCode] = useState((params.code ?? '').toUpperCase())
  const { session } = useAuth()
  const check = useInviteCheck(code)
  const valid = check.data?.valid === true

  return (
    <div className="screen no-tabs stack" style={{ paddingTop: 'calc(var(--safe-top) + 40px)' }}>
      <div className="center stack" style={{ gap: 6 }}>
        <Moon size={44} color="var(--gold)" strokeWidth={1.6} style={{ margin: '0 auto' }} />
        <h1 style={{ fontSize: 28 }}>Join Legity League</h1>
      </div>

      <label className="field">
        Invite code
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          placeholder="e.g. K7QX9M2P41AB"
        />
      </label>

      {check.isFetching && <Spinner />}
      {!check.isFetching && code.trim().length >= 6 && check.data && !valid && (
        <p className="error">That invite isn&apos;t valid. It may have expired or been used up. Ask for a new one.</p>
      )}

      {valid && (
        <div className="card hero center">
          <p className="muted small">You&apos;re invited to</p>
          <h2 style={{ fontSize: 26, textTransform: 'none', letterSpacing: 0, color: 'var(--text)', margin: '4px 0 0' }}>
            {check.data?.group_name}
          </h2>
        </div>
      )}

      {valid && (session ? <JoinExisting code={code} /> : <JoinNew code={code} />)}

      {!session && (
        <p className="center muted">
          <Link to="/welcome">Back to sign in</Link>
        </p>
      )}
    </div>
  )
}

function JoinExisting({ code }: { code: string }) {
  const nav = useNavigate()
  const qc = useQueryClient()
  const { setGroupId } = useGroup()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  return (
    <div className="stack">
      <ErrorNote error={error} />
      <button
        className="btn"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          setError(null)
          const { data, error } = await supabase.rpc('join_group', { p_code: code })
          setBusy(false)
          if (error) return setError(error)
          await qc.invalidateQueries({ queryKey: ['groups'] })
          setGroupId(data as string)
          nav('/today', { replace: true })
        }}
      >
        {busy ? 'Joining…' : 'Join this group'}
      </button>
    </div>
  )
}

function JoinNew({ code }: { code: string }) {
  const nav = useNavigate()
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')
  const [fullName, setFullName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { invite_code: code, display_name: displayName.trim(), full_name: fullName.trim() } },
      })
      setBusy(false)
      if (error) {
        setError(
          /database error/i.test(error.message)
            ? 'That invite is no longer valid. Ask for a new one.'
            : error.message,
        )
        return
      }
      if (data.session) nav('/onboarding', { replace: true })
      else setCheckEmail(true)
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setBusy(false)
        return setError(signInError.message)
      }
      const { error: joinError } = await supabase.rpc('join_group', { p_code: code })
      setBusy(false)
      if (joinError) return setError(joinError.message)
      nav('/today', { replace: true })
    }
  }

  if (checkEmail) {
    return (
      <div className="notice">
        <b>Check your email.</b> Confirm your address, then come back and sign in. You&apos;ll already be in the group.
      </div>
    )
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="seg">
        <button type="button" className={mode === 'signup' ? 'on' : ''} onClick={() => setMode('signup')}>New here</button>
        <button type="button" className={mode === 'signin' ? 'on' : ''} onClick={() => setMode('signin')}>I have an account</button>
      </div>
      {mode === 'signup' && (
        <>
          <label className="field">
            Your name
            <input autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={80} />
          </label>
          <label className="field">
            Display name (what everyone sees)
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={40} />
          </label>
        </>
      )}
      <label className="field">
        Email
        <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label className="field">
        Password
        <input
          type="password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={busy}>
        {busy ? 'One sec…' : mode === 'signup' ? 'Create account & join' : 'Sign in & join'}
      </button>
    </form>
  )
}
