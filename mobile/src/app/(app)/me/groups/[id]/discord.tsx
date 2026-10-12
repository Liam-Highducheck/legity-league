import { useState } from 'react'
import { Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Send } from 'lucide-react-native'
import { PERIOD_LABELS, type PeriodKind } from '@legity/core/periods'
import { useGroup } from '@legity/data/group'
import { useClearWebhook, useGroupDiscord, useGroupSettings, useSaveGroupTimezone, useSendTestMessage, useSetWebhook, useUpdateDiscord } from '@legity/data/league'
import { confirm } from '../../../../../lib/confirm'
import { Button, Card, ErrorText, Field, Notice, PageHead, Row, Screen, SelectField, Spinner, StatusDot, T, Toggle } from '../../../../../components/ui'
import { useColors } from '../../../../../lib/theme'

const POST_KINDS: { kind: PeriodKind; label: string }[] = [
  { kind: 'week', label: `${PERIOD_LABELS.week}ly` },
  { kind: 'fortnight', label: `${PERIOD_LABELS.fortnight}ly` },
  { kind: 'month', label: `${PERIOD_LABELS.month}ly` },
  { kind: 'season', label: 'Seasonal' },
]

const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'am' : 'pm'}`

function timeZones(current: string | null): string[] {
  let all: string[] = []
  try {
    all = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
  } catch {
    all = []
  }
  const set = new Set(all)
  if (current) set.add(current)
  return [...set].sort()
}

export default function DiscordSettings() {
  const { id = '' } = useLocalSearchParams<{ id: string }>()
  const c = useColors()
  const { groups } = useGroup()
  const group = groups.find((g) => g.id === id)
  const isAdmin = group?.role === 'owner' || group?.role === 'admin'

  const discord = useGroupDiscord(id, isAdmin)
  const settings = useGroupSettings(id)
  const setWebhook = useSetWebhook()
  const clearWebhook = useClearWebhook()
  const update = useUpdateDiscord()
  const test = useSendTestMessage()
  const saveTz = useSaveGroupTimezone()
  const [url, setUrl] = useState('')
  const [tested, setTested] = useState(false)

  const head = <PageHead title="Discord" back />
  if (!group) return <Screen>{head}<T muted>You&apos;re not in this group.</T></Screen>
  if (!isAdmin) return <Screen>{head}<T muted>Only owners and admins can change Discord settings.</T></Screen>
  if (discord.isLoading || settings.isLoading) return <Screen>{head}<Spinner /></Screen>
  if (discord.error) return <Screen>{head}<ErrorText error={discord.error} /></Screen>

  if (!discord.data?.available) {
    return (
      <Screen>
        {head}
        <Notice>
          <T small>Discord posting isn&apos;t switched on for this app yet. The database update for it (migration 20261012090003) hasn&apos;t been applied, so ask Liam to run supabase db push.</T>
        </Notice>
      </Screen>
    )
  }

  const row = discord.data.row
  const configured = !!row?.webhook_configured
  const invalid = row?.webhook_status === 'invalid'
  const kinds = row?.period_kinds ?? (['week', 'fortnight', 'month', 'season'] as PeriodKind[])
  const tz = settings.data?.timezone ?? null
  const error = setWebhook.error ?? clearWebhook.error ?? update.error ?? saveTz.error

  function toggleKind(kind: PeriodKind, on: boolean) {
    const next = on ? [...new Set([...kinds, kind])] : kinds.filter((k) => k !== kind)
    update.mutate({ groupId: id, periodKinds: next })
  }

  return (
    <Screen>
      {head}
      <T muted>
        Post this group&apos;s standings and broken records to a Discord channel in <T bold>{group.name}</T>.
      </T>

      {invalid && <Notice><T small>Discord says this webhook doesn&apos;t work any more (it may have been deleted). Paste a new one below.</T></Notice>}

      <Card title="Webhook" gap={14}>
        <T muted small>
          In Discord: channel settings, Integrations, Webhooks, New Webhook, then Copy Webhook URL. Treat the URL like a password: anyone with it can post to that channel.
        </T>
        {configured && (
          <Row gap={0}>
            <StatusDot tone={invalid ? 'bad' : 'ok'} />
            <T>Saved, ending in <Text style={{ fontFamily: 'Menlo', fontSize: 13 }}>…{row?.webhook_hint}</Text></T>
          </Row>
        )}
        <Field value={url} onChangeText={setUrl} placeholder="https://discord.com/api/webhooks/…" autoCapitalize="none" autoCorrect={false} spellCheck={false} accessibilityLabel="Discord webhook URL" />
        <Row>
          <Button
            style={{ flex: 1 }}
            title={setWebhook.isPending ? 'Saving…' : configured ? 'Replace webhook' : 'Save webhook'}
            busy={setWebhook.isPending}
            disabled={!url.trim()}
            onPress={() => setWebhook.mutate({ groupId: id, url }, { onSuccess: () => setUrl('') })}
          />
          {configured && (
            <Button
              title="Remove"
              variant="danger"
              disabled={clearWebhook.isPending}
              onPress={async () => {
                if (await confirm('Remove the webhook?', 'This stops posting to Discord.', 'Remove')) clearWebhook.mutate(id)
              }}
            />
          )}
        </Row>
      </Card>

      <Card gap={10}>
        <Row between>
          <View style={{ flex: 1 }}>
            <T bold>Post to Discord</T>
            <T muted small>Existing records are noted quietly when you switch this on, so only new ones are announced.</T>
          </View>
          <Toggle on={!!row?.enabled} label="Post to Discord" onChange={(v) => configured && update.mutate({ groupId: id, enabled: v })} />
        </Row>
        {!configured && <T muted small>Save a webhook first.</T>}
      </Card>

      <Card title="What to post" gap={14}>
        {POST_KINDS.map(({ kind, label }) => (
          <Row key={kind} between>
            <T>{label} standings</T>
            <Toggle on={kinds.includes(kind)} label={`${label} standings`} onChange={(v) => toggleKind(kind, v)} />
          </Row>
        ))}
        <Row between>
          <T>Broken records</T>
          <Toggle on={row?.post_records ?? true} label="Broken records" onChange={(v) => update.mutate({ groupId: id, postRecords: v })} />
        </Row>
        <Row between>
          <T>Championship results</T>
          <Toggle on={row?.post_championships ?? true} label="Championship results" onChange={(v) => update.mutate({ groupId: id, postChampionships: v })} />
        </Row>
      </Card>

      <Card title="When" gap={14}>
        <SelectField
          label="Post standings at"
          value={row?.post_hour ?? 9}
          onChange={(h) => update.mutate({ groupId: id, postHour: h })}
          options={Array.from({ length: 24 }, (_, h) => ({ value: h, label: hourLabel(h) }))}
        />
        {tz == null ? (
          <T muted small>Group timezone: not available yet.</T>
        ) : (
          <SelectField
            label="Group timezone"
            value={tz}
            onChange={(z) => saveTz.mutate({ groupId: id, timezone: z })}
            options={timeZones(tz).map((z) => ({ value: z, label: z.replace(/_/g, ' ') }))}
          />
        )}
        <T muted small>
          A period is posted the day after it ends, at this hour in the group timezone. Everyone&apos;s phone syncs on its own, so nights that arrive after the post aren&apos;t added to it.
        </T>
      </Card>

      <Card title="Status" gap={10}>
        <T small>
          Last post: <T small bold>{row?.last_post_at ? new Date(row.last_post_at).toLocaleString('en-AU') : 'none yet'}</T>
        </T>
        {row?.last_error && (
          <Text style={{ color: c.danger, fontSize: 14 }}>
            Last problem{row.last_error_at ? ` (${new Date(row.last_error_at).toLocaleString('en-AU')})` : ''}: {row.last_error}
          </Text>
        )}
        <Button
          title={test.isPending ? 'Sending…' : 'Send a test message'}
          icon={Send}
          variant="secondary"
          disabled={!configured || test.isPending}
          onPress={() => {
            setTested(false)
            test.mutate(id, { onSuccess: () => setTested(true) })
          }}
        />
        {tested && !test.error && <T small color={c.teal}>Sent. Check the channel.</T>}
        <ErrorText error={test.error} />
        <T muted small>Posts are checked every 15 minutes.</T>
      </Card>

      <ErrorText error={error} />
    </Screen>
  )
}
