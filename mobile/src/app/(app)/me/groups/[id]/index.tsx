import { useState } from 'react'
import { Share, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { Check, Flag, Moon, Share2, Webhook } from 'lucide-react-native'
import { formatShortDay } from '@legity/core/dates'
import { hhmm, minutesToClock } from '@legity/core/format'
import { toMinutes } from '@legity/core/blackout'
import { useGroup } from '@legity/data/group'
import { useUserId } from '@legity/data/auth'
import { useCreateInvite, useInvites, useLeaveGroup, useRenameGroup, useRevokeInvite, useRoster, useSetGroupBlackout } from '@legity/data/queries'
import { supabase } from '../../../../../lib/supabase'
import { confirm } from '../../../../../lib/confirm'
import { inviteLink } from '../../../../../lib/links'
import { Avatar, Button, Card, Chip, CopyButton, ErrorText, Field, ListItem, Notice, PageHead, Row, Screen, Spinner, T, TimeField, Toggle } from '../../../../../components/ui'
import { EligibilityCard } from '../../../../../components/EligibilityCard'
import { useColors } from '../../../../../lib/theme'

export default function GroupManage() {
  const { id = '' } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const c = useColors()
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

  if (!group) return <Screen><PageHead title="Group" back /><T muted>You&apos;re not in this group.</T></Screen>

  const liveInvites = (invites.data ?? []).filter((i) => !i.revoked_at && new Date(i.expires_at) > new Date() && i.uses < i.max_uses)

  return (
    <Screen>
      <PageHead title={group.name} back />

      <Card title={`Members · ${roster.data?.length ?? 0}`}>
        {roster.isLoading ? (
          <Spinner />
        ) : (
          <View>
            {(roster.data ?? []).map((m, i, arr) => (
              <ListItem key={m.user_id} last={i === arr.length - 1} onPress={() => router.push(`/me/groups/${id}/members/${m.user_id}`)}>
                <Avatar name={m.display_name} />
                <View style={{ flex: 1 }}>
                  <T bold>{m.display_name}{m.user_id === uid ? ' (you)' : ''}</T>
                  <T muted small>{m.full_name ?? 'No name set'}</T>
                </View>
                {m.role !== 'member' && <Chip><T small style={{ textTransform: 'capitalize' }}>{m.role}</T></Chip>}
              </ListItem>
            ))}
          </View>
        )}
      </Card>

      {isAdmin && (
        <Card title="Invites" gap={14}>
          <Button title={createInvite.isPending ? 'Creating…' : 'New invite link'} busy={createInvite.isPending} onPress={() => createInvite.mutate({ groupId: id, days: 7, maxUses: 25 })} />
          <T muted small>Links last 7 days and work for up to 25 people. New members always join as regular members.</T>
          <ErrorText error={createInvite.error ?? revokeInvite.error} />
          {liveInvites.map((i) => (
            <View key={i.id} style={{ borderWidth: 1, borderColor: c.line, borderRadius: 18, padding: 12, gap: 8 }}>
              <Row between>
                <Text style={{ color: c.text, fontFamily: 'Menlo', fontSize: 13 }}>{i.code}</Text>
                <T muted small>{i.uses}/{i.max_uses} used · until {formatShortDay(i.expires_at.slice(0, 10))}</T>
              </Row>
              <Row style={{ flexWrap: 'wrap' }}>
                <Button small variant="secondary" icon={Share2} title="Share" onPress={() => Share.share({ message: `Join ${group.name} on Legity League: ${inviteLink(i.code)}` })} />
                <CopyButton text={i.code} label="Copy code" />
                <Button small variant="danger" title="Revoke" onPress={() => revokeInvite.mutate(i.id)} />
              </Row>
            </View>
          ))}
        </Card>
      )}

      <Card flush>
        <View>
          <ListItem last={!isAdmin} onPress={() => router.push(`/me/groups/${id}/competitions`)}>
            <Flag size={20} color={c.muted} />
            <T bold style={{ flex: 1 }}>Championships</T>
          </ListItem>
          {isAdmin && (
            <ListItem last onPress={() => router.push(`/me/groups/${id}/discord`)}>
              <Webhook size={20} color={c.muted} />
              <T bold style={{ flex: 1 }}>Discord</T>
            </ListItem>
          )}
        </View>
      </Card>

      {isAdmin && <EligibilityCard groupId={id} />}

      {isAdmin && (
        <Card title="Group name" gap={14}>
          <Field value={name ?? group.name} onChangeText={setName} maxLength={60} />
          <ErrorText error={rename.error} />
          <Button
            title="Rename"
            variant="secondary"
            busy={rename.isPending}
            disabled={name == null || !name.trim()}
            onPress={async () => {
              await rename.mutateAsync({ groupId: id, name: name ?? group.name })
              setName(null)
            }}
          />
        </Card>
      )}

      {isOwner ? (
        <GroupBlackoutForm key={`${group.blackout.enabled}${group.blackout.start}${group.blackout.end}`} groupId={id} initial={group.blackout} />
      ) : (
        group.blackout.enabled && (
          <Notice>
            <Text style={{ color: c.text, fontSize: 14, lineHeight: 20 }}>
              <Moon size={16} color={c.text} /> This group rests from <Text style={{ fontWeight: '600' }}>{minutesToClock(toMinutes(group.blackout.start))}</Text> to{' '}
              <Text style={{ fontWeight: '600' }}>{minutesToClock(toMinutes(group.blackout.end))}</Text> (your local time). Only the owner can change it.
            </Text>
          </Notice>
        )
      )}

      {!isOwner && (
        <>
          <ErrorText error={leave.error} />
          <Button
            title="Leave group"
            variant="danger"
            onPress={async () => {
              if (!(await confirm(`Leave ${group.name}?`, "You'll stop seeing the group's data.", 'Leave'))) return
              await leave.mutateAsync(id)
              router.replace('/me/groups')
            }}
          />
        </>
      )}

      {isOwner && (
        <>
          <ErrorText error={deleteError} />
          <Button
            title="Delete group"
            variant="danger"
            onPress={async () => {
              if (!(await confirm(`Delete ${group.name} for everyone?`, "This can't be undone. Nobody's sleep data is deleted.", 'Delete'))) return
              const { error } = await supabase.from('groups').delete().eq('id', id)
              if (error) return setDeleteError(error.message)
              await qc.invalidateQueries({ queryKey: ['groups'] })
              router.replace('/me/groups')
            }}
          />
        </>
      )}
    </Screen>
  )
}

function GroupBlackoutForm({ groupId, initial }: { groupId: string; initial: { enabled: boolean; start: string; end: string } }) {
  const set = useSetGroupBlackout()
  const [enabled, setEnabled] = useState(initial.enabled)
  const [start, setStart] = useState(hhmm(initial.start))
  const [end, setEnd] = useState(hhmm(initial.end))
  const [saved, setSaved] = useState(false)

  return (
    <Card gap={14}>
      <Row between>
        <View style={{ flex: 1 }}>
          <T bold>Group blackout</T>
          <T muted small>Hides rankings and everyone else&apos;s sleep for the whole group</T>
        </View>
        <Toggle on={enabled} onChange={(v) => { setEnabled(v); setSaved(false) }} label="Group blackout" />
      </Row>
      {enabled && (
        <>
          <Row>
            <TimeField label="Hide from" value={start} onChange={(v) => { setStart(v); setSaved(false) }} />
            <TimeField label="Until" value={end} onChange={(v) => { setEnd(v); setSaved(false) }} />
          </Row>
          <T muted small>Times are in each member&apos;s own timezone.</T>
        </>
      )}
      <ErrorText error={set.error} />
      <Button
        title={set.isPending ? 'Saving…' : saved ? 'Saved' : 'Save blackout'}
        icon={saved && !set.isPending ? Check : undefined}
        variant="secondary"
        busy={set.isPending}
        disabled={!start || !end}
        onPress={async () => {
          await set.mutateAsync({ groupId, enabled, start, end })
          setSaved(true)
        }}
      />
    </Card>
  )
}
