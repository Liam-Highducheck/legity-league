import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Flag, Webhook } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatShortDay } from '../lib/dates'
import { useGroup } from '../hooks/group'
import { useUserId } from '../hooks/auth'
import {
  useCreateInvite,
  useInvites,
  useLeaveGroup,
  useRenameGroup,
  useRevokeInvite,
  useRoster,
} from '../hooks/queries'
import { Avatar, CopyButton, ErrorNote, PageHead, Spinner } from '../components/ui'
import { EligibilityCard } from '../components/EligibilityCard'

function inviteLink(code: string): string {
  return `${window.location.href.split('#')[0]}#/join/${code}`
}

export function GroupManage() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const uid = useUserId()
  const { groups } = useGroup()
  const group = groups.find((g) => g.id === id)
  const roster = useRoster(id)
  const isOwner = group?.role === 'owner'
  const isAdmin = isOwner || group?.role === 'admin'

  const invites = useInvites(id, isAdmin)
  const createInvite = useCreateInvite()
  const revokeInvite = useRevokeInvite()
  const rename = useRenameGroup()
  const leave = useLeaveGroup()
  const [name, setName] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  if (!group) return <div className="screen"><PageHead title="Group" back /><p className="muted">You&apos;re not in this group.</p></div>

  const liveInvites = (invites.data ?? []).filter(
    (i) => !i.revoked_at && new Date(i.expires_at) > new Date() && i.uses < i.max_uses,
  )

  return (
    <div className="screen stack">
      <PageHead title={group.name} back />

      <div className="card">
        <h2>Members · {roster.data?.length ?? 0}</h2>
        {roster.isLoading ? (
          <Spinner />
        ) : (
          <div className="list">
            {(roster.data ?? []).map((m) => (
              <button key={m.user_id} className="list-item" onClick={() => nav(`/me/groups/${id}/members/${m.user_id}`)}>
                <Avatar name={m.display_name} />
                <div className="grow">
                  <b>{m.display_name}{m.user_id === uid ? ' (you)' : ''}</b>
                  <p className="muted small">{m.full_name ?? 'No name set'}</p>
                </div>
                {m.role !== 'member' && <span className="chip" style={{ textTransform: 'capitalize' }}>{m.role}</span>}
                <ChevronRight size={18} className="chev" />
              </button>
            ))}
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="card stack">
          <h2>Invites</h2>
          <button
            className="btn"
            disabled={createInvite.isPending}
            onClick={() => createInvite.mutate({ groupId: id, days: 7, maxUses: 25 })}
          >
            {createInvite.isPending ? 'Creating…' : 'New invite link'}
          </button>
          <p className="muted small">Links last 7 days and work for up to 25 people. New members always join as regular members.</p>
          <ErrorNote error={createInvite.error ?? revokeInvite.error} />
          {liveInvites.map((i) => (
            <div key={i.id} className="card flat stack" style={{ padding: 12, gap: 8 }}>
              <div className="row between">
                <span className="mono">{i.code}</span>
                <span className="muted small">{i.uses}/{i.max_uses} used · until {formatShortDay(i.expires_at.slice(0, 10))}</span>
              </div>
              <div className="row">
                <CopyButton text={inviteLink(i.code)} label="Copy link" />
                <CopyButton text={i.code} label="Copy code" />
                <button className="btn danger small" onClick={() => revokeInvite.mutate(i.id)}>Revoke</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card flush">
        <div className="list">
          <button className="list-item" onClick={() => nav(`/me/groups/${id}/competitions`)}>
            <Flag size={20} className="muted" />
            <div className="grow"><b>Championships</b></div>
            <ChevronRight size={18} className="chev" />
          </button>
          {isAdmin && (
            <button className="list-item" onClick={() => nav(`/me/groups/${id}/discord`)}>
              <Webhook size={20} className="muted" />
              <div className="grow"><b>Discord</b></div>
              <ChevronRight size={18} className="chev" />
            </button>
          )}
        </div>
      </div>

      {isAdmin && <EligibilityCard groupId={id} />}

      {isAdmin && (
        <form
          className="card stack"
          onSubmit={async (e) => {
            e.preventDefault()
            await rename.mutateAsync({ groupId: id, name: name ?? group.name })
            setName(null)
          }}
        >
          <h2>Group name</h2>
          <input value={name ?? group.name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          <ErrorNote error={rename.error} />
          <button className="btn secondary" disabled={rename.isPending || name == null || !name.trim()}>Rename</button>
        </form>
      )}

      {!isOwner && (
        <>
          <ErrorNote error={leave.error} />
          <button
            className="btn danger"
            onClick={async () => {
              if (!window.confirm(`Leave ${group.name}? You'll stop seeing the group's data.`)) return
              await leave.mutateAsync(id)
              nav('/me/groups', { replace: true })
            }}
          >
            Leave group
          </button>
        </>
      )}

      {isOwner && (
        <>
          <ErrorNote error={deleteError} />
          <button
            className="btn danger"
            onClick={async () => {
              if (!window.confirm(`Delete ${group.name} for everyone? This can't be undone. Nobody's sleep data is deleted.`)) return
              const { error } = await supabase.from('groups').delete().eq('id', id)
              if (error) return setDeleteError(error.message)
              await qc.invalidateQueries({ queryKey: ['groups'] })
              nav('/me/groups', { replace: true })
            }}
          >
            Delete group
          </button>
        </>
      )}

    </div>
  )
}
