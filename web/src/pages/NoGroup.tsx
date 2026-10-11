import { useState } from 'react'
import { Trophy } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useCreateGroup, useJoinGroup } from '../hooks/queries'
import { useGroup } from '../hooks/group'
import { ErrorNote } from '../components/ui'

export function NoGroup() {
  const create = useCreateGroup()
  const join = useJoinGroup()
  const { setGroupId } = useGroup()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')

  return (
    <div className="screen no-tabs stack">
      <div className="center stack" style={{ gap: 6, marginTop: 24 }}>
        <Trophy size={44} color="var(--gold)" strokeWidth={1.6} style={{ margin: '0 auto' }} />
        <h1>Find your league</h1>
        <p className="muted">A group is where you and your friends compete. Join one or start your own.</p>
      </div>

      <form
        className="card stack"
        onSubmit={async (e) => {
          e.preventDefault()
          setGroupId(await join.mutateAsync(code.trim()))
        }}
      >
        <h2>Join with a code</h2>
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Invite code" autoCapitalize="characters" />
        <ErrorNote error={join.error} />
        <button className="btn" disabled={join.isPending || code.trim().length < 6}>Join</button>
      </form>

      <form
        className="card stack"
        onSubmit={async (e) => {
          e.preventDefault()
          setGroupId(await create.mutateAsync(name))
        }}
      >
        <h2>Start a group</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name" maxLength={60} />
        <ErrorNote error={create.error} />
        <button className="btn" disabled={create.isPending || !name.trim()}>Create group</button>
      </form>

      <button className="btn secondary" onClick={() => supabase.auth.signOut()}>Sign out</button>
    </div>
  )
}
