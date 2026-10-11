import { useNavigate, useParams } from 'react-router-dom'
import { useGroup } from '../hooks/group'
import { useUserId } from '../hooks/auth'
import { useRemoveMember, useRoster, useSetMemberRole, useTransferOwnership } from '../hooks/queries'
import { ErrorNote, PageHead, Spinner } from '../components/ui'
import type { Member } from '../lib/types'

export function MemberPage() {
  const { id: groupId = '', userId = '' } = useParams()
  const nav = useNavigate()
  const me = useUserId()
  const { groups } = useGroup()
  const roster = useRoster(groupId)
  const group = groups.find((g) => g.id === groupId)
  const member = roster.data?.find((m) => m.user_id === userId)
  if (roster.isLoading) return <div className="screen"><PageHead title="Member" back /><Spinner /></div>
  if (!group || !member) return <div className="screen"><PageHead title="Member" back /><p className="muted">Member not found.</p></div>
  return <MemberActions groupId={groupId} member={member} me={me} myRole={group.role} onDone={() => nav(-1)} />
}

function MemberActions({
  groupId,
  member,
  me,
  myRole,
  onDone,
}: {
  groupId: string
  member: Member
  me: string | undefined
  myRole: 'owner' | 'admin' | 'member'
  onDone: () => void
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
    onDone()
  }

  return (
    <div className="screen stack">
      <PageHead title={member.display_name} back />
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
  )
}
