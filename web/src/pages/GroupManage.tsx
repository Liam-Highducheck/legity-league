import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { formatShortDay } from '../lib/dates'
import { useGroup } from '../hooks/group'
import { useUserId } from '../hooks/auth'
import {
  useCreateInvite,
  useInvites,
  useLeaveGroup,
  useRemoveMember,
  useRenameGroup,
  useRevokeInvite,
  useRoster,
  useSetMemberRole,
  useTransferOwnership,
} from '../hooks/queries'
import { Avatar, CopyButton, ErrorNote, PageHead, Sheet, Spinner } from '../components/ui'
import type { Member } from '../lib/types'

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
  const [selected, setSelected] = useState<Member | null>(null)
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
              <button key={m.user_id} className="list-item" onClick={() => setSelected(m)}>
                <Avatar name={m.display_name} />
                <div className="grow">
                  <b>{m.display_name}{m.user_id === uid ? ' (you)' : ''}</b>
                  <p className="muted small">{m.full_name ?? 'No name set'}</p>
                </div>
                {m.role !== 'member' && <span className="chip" style={{ textTransform: 'capitalize' }}>{m.role}</span>}
                <span className="chev">›</span>
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

      {selected && (
        <MemberSheet
          groupId={id}
          member={selected}
          me={uid}
          myRole={group.role}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

function MemberSheet({
  groupId,
  member,
  me,
  myRole,
  onClose,
}: {
  groupId: string
  member: Member
  me: string
  myRole: 'owner' | 'admin' | 'member'
  onClose: () => void
}) {
  const setRole = useSetMemberRole()
  const remove = useRemoveMember()
  const transfer = useTransferOwnership()
  const isMe = member.user_id === me
  const canRemove =
    !isMe && member.role !== 'owner' && (myRole === 'owner' || (myRole === 'admin' && member.role === 'member'))
  const ownerActions = myRole === 'owner' && !isMe && member.role !== 'owner'
  const busy = setRole.isPending || remove.isPending || transfer.isPending
  const error = setRole.error ?? remove.error ?? transfer.error

  async function run(fn: () => Promise<unknown>) {
    await fn()
    onClose()
  }

  return (
    <Sheet title={member.display_name} onClose={onClose}>
      <div className="stack">
        <p className="muted">{member.full_name ?? 'No name set'} · <span style={{ textTransform: 'capitalize' }}>{member.role}</span></p>
        <ErrorNote error={error} />
        {ownerActions && (
          <button
            className="btn secondary"
            disabled={busy}
            onClick={() => run(() => setRole.mutateAsync({ groupId, userId: member.user_id, role: member.role === 'admin' ? 'member' : 'admin' }))}
          >
            {member.role === 'admin' ? 'Make regular member' : 'Make admin'}
          </button>
        )}
        {ownerActions && (
          <button
            className="btn secondary"
            disabled={busy}
            onClick={() =>
              window.confirm(`Make ${member.display_name} the owner? You'll become an admin.`) &&
              run(() => transfer.mutateAsync({ groupId, userId: member.user_id }))
            }
          >
            Make owner
          </button>
        )}
        {canRemove && (
          <button
            className="btn danger"
            disabled={busy}
            onClick={() =>
              window.confirm(`Remove ${member.display_name} from the group?`) &&
              run(() => remove.mutateAsync({ groupId, userId: member.user_id }))
            }
          >
            Remove from group
          </button>
        )}
        {!ownerActions && !canRemove && <p className="muted small">No actions available.</p>}
      </div>
    </Sheet>
  )
}
