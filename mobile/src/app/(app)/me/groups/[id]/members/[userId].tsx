import { useLocalSearchParams, useRouter } from 'expo-router'
import { useGroup } from '@legity/data/group'
import { useUserId } from '@legity/data/auth'
import { useRemoveMember, useRoster, useSetMemberRole, useTransferOwnership } from '@legity/data/queries'
import type { Member } from '@legity/core/types'
import { confirm } from '../../../../../../lib/confirm'
import { Button, ErrorText, PageHead, Screen, Spinner, T } from '../../../../../../components/ui'

export default function MemberPage() {
  const { id: groupId = '', userId = '' } = useLocalSearchParams<{ id: string; userId: string }>()
  const router = useRouter()
  const me = useUserId()
  const { groups } = useGroup()
  const roster = useRoster(groupId)
  const group = groups.find((g) => g.id === groupId)
  const member = roster.data?.find((m) => m.user_id === userId)
  if (roster.isLoading) return <Screen><PageHead title="Member" back /><Spinner /></Screen>
  if (!group || !member) return <Screen><PageHead title="Member" back /><T muted>Member not found.</T></Screen>
  return <MemberActions groupId={groupId} member={member} me={me} myRole={group.role} onDone={() => router.back()} />
}

function MemberActions({ groupId, member, me, myRole, onDone }: { groupId: string; member: Member; me: string | undefined; myRole: 'owner' | 'admin' | 'member'; onDone: () => void }) {
  const router = useRouter()
  const setRole = useSetMemberRole()
  const remove = useRemoveMember()
  const transfer = useTransferOwnership()
  const isMe = member.user_id === me
  const canRemove = !isMe && member.role !== 'owner' && (myRole === 'owner' || (myRole === 'admin' && member.role === 'member'))
  const ownerActions = myRole === 'owner' && !isMe && member.role !== 'owner'
  const busy = setRole.isPending || remove.isPending || transfer.isPending
  const error = setRole.error ?? remove.error ?? transfer.error

  async function run(fn: () => Promise<unknown>) {
    await fn()
    onDone()
  }

  return (
    <Screen>
      <PageHead title={member.display_name} back />
      <T muted>
        {member.full_name ?? 'No name set'} · <T muted style={{ textTransform: 'capitalize' }}>{member.role}</T>
      </T>
      <Button title="View sleep stats, podiums and records" variant="secondary" onPress={() => router.push(`/league/member/${member.user_id}`)} />
      <ErrorText error={error} />
      {ownerActions && (
        <Button
          title={member.role === 'admin' ? 'Make regular member' : 'Make admin'}
          variant="secondary"
          disabled={busy}
          onPress={() => run(() => setRole.mutateAsync({ groupId, userId: member.user_id, role: member.role === 'admin' ? 'member' : 'admin' }))}
        />
      )}
      {ownerActions && (
        <Button
          title="Make owner"
          variant="secondary"
          disabled={busy}
          onPress={async () => {
            if (await confirm(`Make ${member.display_name} the owner?`, "You'll become an admin.", 'Make owner', false)) await run(() => transfer.mutateAsync({ groupId, userId: member.user_id }))
          }}
        />
      )}
      {canRemove && (
        <Button
          title="Remove from group"
          variant="danger"
          disabled={busy}
          onPress={async () => {
            if (await confirm(`Remove ${member.display_name} from the group?`, '', 'Remove')) await run(() => remove.mutateAsync({ groupId, userId: member.user_id }))
          }}
        />
      )}
      {!ownerActions && !canRemove && <T muted small>No actions available.</T>}
    </Screen>
  )
}
