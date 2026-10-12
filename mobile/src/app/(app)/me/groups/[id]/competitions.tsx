import { useState } from 'react'
import { Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Flag, Pencil, Trash2 } from 'lucide-react-native'
import { formatShortDay, todayISO } from '@legity/core/dates'
import { formatPodiumValue, ordinal } from '@legity/core/format'
import { competitionDays, competitionStatus } from '@legity/core/league/report'
import type { Competition } from '@legity/core/league/types'
import { METRIC_LABELS } from '@legity/core/stats'
import { useGroup } from '@legity/data/group'
import { useCompetitions, useCreateCompetition, useDeleteCompetition, useGroupSettings, useLeagueReport, useUpdateCompetition } from '@legity/data/league'
import { useProfile } from '@legity/data/queries'
import { confirm } from '../../../../../lib/confirm'
import { Button, Card, Chip, DateField, ErrorText, Field, Notice, PageHead, Row, Screen, Spinner, T } from '../../../../../components/ui'
import { useColors } from '../../../../../lib/theme'

const STATUS_LABELS = { upcoming: 'Upcoming', active: 'Running', finished: 'Finished' }

function CompetitionForm({
  initial,
  busy,
  error,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: { name: string; startsOn: string; endsOn: string }
  busy: boolean
  error: unknown
  submitLabel: string
  onSubmit: (v: { name: string; startsOn: string; endsOn: string }) => void
  onCancel?: () => void
}) {
  const [name, setName] = useState(initial.name)
  const [startsOn, setStartsOn] = useState(initial.startsOn)
  const [endsOn, setEndsOn] = useState(initial.endsOn || initial.startsOn)
  const valid = name.trim().length > 0 && startsOn && endsOn && endsOn >= startsOn
  return (
    <View style={{ gap: 14 }}>
      <Field label="Name" value={name} onChangeText={setName} maxLength={60} placeholder="Spring Championship" />
      <Row>
        <DateField label="Starts" value={startsOn} onChange={setStartsOn} />
        <DateField label="Ends" value={endsOn} onChange={setEndsOn} />
      </Row>
      <ErrorText error={error} />
      <Row>
        <Button style={{ flex: 1 }} title={busy ? 'Saving…' : submitLabel} busy={busy} disabled={!valid} onPress={() => valid && onSubmit({ name: name.trim(), startsOn, endsOn })} />
        {onCancel && <Button title="Cancel" variant="secondary" onPress={onCancel} />}
      </Row>
    </View>
  )
}

export default function Competitions() {
  const { id = '' } = useLocalSearchParams<{ id: string }>()
  const c = useColors()
  const { groups } = useGroup()
  const group = groups.find((g) => g.id === id)
  const isAdmin = group?.role === 'owner' || group?.role === 'admin'
  const profile = useProfile()
  const settings = useGroupSettings(id)
  const list = useCompetitions(id)
  const { report } = useLeagueReport(id)
  const create = useCreateCompetition()
  const update = useUpdateCompetition()
  const remove = useDeleteCompetition()
  const [editing, setEditing] = useState<string | null>(null)

  const head = <PageHead title="Championships" back />
  if (!group) return <Screen>{head}<T muted>You&apos;re not in this group.</T></Screen>
  if (list.isLoading || settings.isLoading) return <Screen>{head}<Spinner /></Screen>
  if (list.error) return <Screen>{head}<ErrorText error={list.error} /></Screen>
  if (!list.data?.available) {
    return (
      <Screen>
        {head}
        <Notice>
          <T small>Championships aren&apos;t switched on for this app yet. The database update for them (migration 20261012090002) hasn&apos;t been applied, so ask Liam to run supabase db push.</T>
        </Notice>
      </Screen>
    )
  }

  const today = todayISO(settings.data?.timezone ?? profile.data?.timezone)
  const rows = list.data.rows
  const winnersOf = (comp: Competition) => (report?.podiums ?? []).filter((p) => p.competitionId === comp.id && p.medals.length > 0)

  return (
    <Screen>
      {head}
      <T muted>
        A championship is a date range set by an owner or admin. Whoever places in the top three over those dates, with a night on every day, earns a
        championship podium.
      </T>

      {rows.length === 0 && <T muted style={{ textAlign: 'center' }}>No championships yet.</T>}

      {rows.map((comp) => {
        const status = competitionStatus(comp, today)
        const winners = winnersOf(comp)
        return (
          <Card key={comp.id} gap={10}>
            {editing === comp.id ? (
              <CompetitionForm
                initial={{ name: comp.name, startsOn: comp.starts_on, endsOn: comp.ends_on }}
                busy={update.isPending}
                error={update.error}
                submitLabel="Save changes"
                onCancel={() => setEditing(null)}
                onSubmit={(v) => update.mutate({ id: comp.id, ...v }, { onSuccess: () => setEditing(null) })}
              />
            ) : (
              <>
                <Row between>
                  <Text style={{ color: c.text, fontSize: 18, fontWeight: '600', flexShrink: 1 }}>{comp.name}</Text>
                  <Chip>{STATUS_LABELS[status]}</Chip>
                </Row>
                <T muted small>{formatShortDay(comp.starts_on)} to {formatShortDay(comp.ends_on)} · {competitionDays(comp)} days</T>
                {status === 'finished' &&
                  (winners.length === 0 ? (
                    <T muted small>No podium: it needs at least two people with a night on every day.</T>
                  ) : (
                    winners.map((p) => (
                      <T key={p.metric} small>
                        <T small bold>{METRIC_LABELS[p.metric]}:</T>{' '}
                        {p.medals.map((m) => `${ordinal(m.rank)} ${m.name} (${formatPodiumValue(p.metric, m.value)})`).join(' · ')}
                      </T>
                    ))
                  ))}
                {isAdmin && (
                  <Row>
                    <Button small variant="secondary" icon={Pencil} title="Edit" onPress={() => setEditing(comp.id)} />
                    <Button
                      small
                      variant="danger"
                      icon={Trash2}
                      title="Delete"
                      disabled={remove.isPending}
                      onPress={async () => {
                        if (await confirm(`Delete ${comp.name}?`, 'Its championship podiums go with it.', 'Delete')) remove.mutate(comp.id)
                      }}
                    />
                  </Row>
                )}
              </>
            )}
          </Card>
        )
      })}
      <ErrorText error={remove.error} />

      {isAdmin && (
        <Card gap={14}>
          <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600', letterSpacing: 1.04, textTransform: 'uppercase' }}>
            <Flag size={14} color={c.muted} /> New championship
          </Text>
          <CompetitionForm
            key={rows.length}
            initial={{ name: '', startsOn: today, endsOn: today }}
            busy={create.isPending}
            error={create.error}
            submitLabel="Create championship"
            onSubmit={(v) => create.mutate({ groupId: id, ...v })}
          />
          <T muted small>Dates can be changed until the championship has finished.</T>
        </Card>
      )}
    </Screen>
  )
}
