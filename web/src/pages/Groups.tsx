import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCreateGroup, useJoinGroup } from '../hooks/queries'
import { useGroup } from '../hooks/group'
import { ErrorNote, PageHead } from '../components/ui'

export function Groups() {
  const { groups, setGroupId } = useGroup()
  const create = useCreateGroup()
  const join = useJoinGroup()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')

  return (
    <div className="screen stack">
      <PageHead title="Groups" back />
      <div className="card">
        <div className="list">
          {groups.map((g) => (
            <Link key={g.id} to={`/me/groups/${g.id}`} className="list-item">
              <div className="grow">
                <b>{g.name}</b>
                <p className="muted small" style={{ textTransform: 'capitalize' }}>{g.role}</p>
              </div>
              <span className="chev">›</span>
            </Link>
          ))}
        </div>
      </div>

      <form
        className="card stack"
        onSubmit={async (e) => {
          e.preventDefault()
          setGroupId(await join.mutateAsync(code.trim()))
          setCode('')
        }}
      >
        <h2>Join another group</h2>
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Invite code" autoCapitalize="characters" />
        <ErrorNote error={join.error} />
        <button className="btn secondary" disabled={join.isPending || code.trim().length < 6}>Join</button>
      </form>

      <form
        className="card stack"
        onSubmit={async (e) => {
          e.preventDefault()
          setGroupId(await create.mutateAsync(name))
          setName('')
        }}
      >
        <h2>Start a new group</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name" maxLength={60} />
        <ErrorNote error={create.error} />
        <button className="btn secondary" disabled={create.isPending || !name.trim()}>Create</button>
      </form>
    </div>
  )
}
