import { useState } from 'react'
import { Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { ChartColumn } from 'lucide-react-native'
import { formatPodiumValue, ordinal } from '@legity/core/format'
import { leaguePath, memberPath } from '@legity/core/links'
import { LEAGUE_KINDS, PODIUM_METRICS, type Division } from '@legity/core/league/types'
import { emptyCounts, medalTally, tallyKey, type Podium } from '@legity/core/league/podiums'
import { type RecordScope, type RecordsReport } from '@legity/core/league/records'
import { PERIOD_LABELS, type PeriodKind } from '@legity/core/periods'
import { METRIC_LABELS, type Metric } from '@legity/core/stats'
import { useGroup } from '@legity/data/group'
import { useLeagueReport } from '@legity/data/league'
import { Avatar, Button, Card, ErrorText, ListItem, PageHead, Pill, PillScroller, Rank, Screen, Segmented, Spinner, T, Value } from '../../../components/ui'
import { GroupSwitcher } from '../../../components/GroupSwitcher'
import { MedalCount, MedalIcon } from '../../../components/medals'
import { DivisionPills, EventLine, RecordsBrowser, SCOPE_LABELS, type Names } from '../../../components/RecordsBrowser'

type Tab = 'records' | 'history' | 'holders' | 'medals'

function HistoryTab({ records, names }: { records: RecordsReport; names: Names }) {
  const [division, setDivision] = useState<Division>('watch')
  const [limit, setLimit] = useState(40)
  const events = records.categories
    .filter((c) => c.category.division === division)
    .flatMap((c) => c.events.map((event) => ({ category: c.category, event })))
    .sort((a, b) => b.event.achievedOn.localeCompare(a.event.achievedOn) || a.category.key.localeCompare(b.category.key))
  return (
    <>
      <DivisionPills value={division} onChange={setDivision} />
      <Card>
        {events.length === 0 ? (
          <T muted style={{ textAlign: 'center' }}>No records have been set yet.</T>
        ) : (
          <View>
            {events.slice(0, limit).map(({ category, event }, i, arr) => (
              <View key={`${category.key}-${event.achievedOn}-${event.value}`}>
                <T muted small style={{ paddingTop: 10 }}>{category.label}</T>
                <EventLine category={category} event={event} names={names} last={i === arr.length - 1} />
              </View>
            ))}
          </View>
        )}
      </Card>
      {events.length > limit && <Button title="Show more" variant="secondary" onPress={() => setLimit((l) => l + 40)} />}
    </>
  )
}

function HoldersTab({ records, members }: { records: RecordsReport; members: { user_id: string; name: string }[] }) {
  const router = useRouter()
  const rows = members
    .map((m) => ({ m, u: records.byUser.get(m.user_id) }))
    .sort((a, b) => (b.u?.held.length ?? 0) - (a.u?.held.length ?? 0) || (b.u?.setAllTime ?? 0) - (a.u?.setAllTime ?? 0) || a.m.name.localeCompare(b.m.name))
  return (
    <Card>
      <View>
        {rows.map(({ m, u }, i) => {
          const byScope = new Map<string, number>()
          for (const key of u?.held ?? []) byScope.set(key.split(':')[0], (byScope.get(key.split(':')[0]) ?? 0) + 1)
          return (
            <ListItem key={m.user_id} chevron={false} last={i === rows.length - 1} onPress={() => router.push(memberPath(m.user_id) as never)}>
              <Avatar name={m.name} />
              <View style={{ flex: 1 }}>
                <T bold>{m.name}</T>
                <T muted small>
                  {u && u.held.length > 0
                    ? [...byScope].map(([scope, n]) => `${SCOPE_LABELS[scope as RecordScope] ?? scope} ${n}`).join(' · ')
                    : 'No current records'}
                </T>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Value>{u?.held.length ?? 0} held</Value>
                <T muted small>{u?.setAllTime ?? 0} set all-time</T>
              </View>
            </ListItem>
          )
        })}
      </View>
    </Card>
  )
}

const MEDAL_KINDS: (PeriodKind | 'championship')[] = [...LEAGUE_KINDS, 'championship']
const KIND_LABELS: Record<PeriodKind | 'championship', string> = { ...PERIOD_LABELS, championship: 'Championship' }

function MedalsTab({ podiums, members }: { podiums: Podium[]; members: { user_id: string; name: string }[] }) {
  const router = useRouter()
  const [kind, setKind] = useState<PeriodKind | 'championship'>('week')
  const [metric, setMetric] = useState<Metric>('duration')
  const tally = medalTally(podiums)
  const rows = members
    .map((m) => ({ m, c: tally.get(m.user_id)?.get(tallyKey(kind, metric)) ?? emptyCounts() }))
    .filter((r) => r.c.gold + r.c.silver + r.c.bronze > 0)
    .sort((a, b) => b.c.gold - a.c.gold || b.c.silver - a.c.silver || b.c.bronze - a.c.bronze || a.m.name.localeCompare(b.m.name))
  const recent = podiums.filter((p) => p.kind === kind && p.metric === metric && p.medals.length > 0).slice(0, 12)
  return (
    <>
      <PillScroller>
        {MEDAL_KINDS.map((k) => (
          <Pill key={k} label={KIND_LABELS[k]} on={k === kind} onPress={() => setKind(k)} />
        ))}
      </PillScroller>
      <Segmented value={metric} onChange={setMetric} options={PODIUM_METRICS.map((m) => ({ value: m, label: METRIC_LABELS[m] }))} />
      <T muted small>{KIND_LABELS[kind]} podiums are counted on their own: a weekly gold is not a monthly gold.</T>
      <Card>
        {rows.length === 0 ? (
          <T muted style={{ textAlign: 'center' }}>No {KIND_LABELS[kind].toLowerCase()} medals yet. A podium needs a night on every day of a finished period.</T>
        ) : (
          <View>
            {rows.map(({ m, c }, i) => (
              <ListItem key={m.user_id} chevron={false} last={i === rows.length - 1} onPress={() => router.push(memberPath(m.user_id) as never)}>
                <Rank n={i + 1} />
                <Avatar name={m.name} />
                <T bold style={{ flex: 1 }}>{m.name}</T>
                <MedalCount gold={c.gold} silver={c.silver} bronze={c.bronze} />
              </ListItem>
            ))}
          </View>
        )}
      </Card>
      {recent.length > 0 && (
        <Card title={kind === 'championship' ? 'Championships' : 'Recent podiums'}>
          <View>
            {recent.map((p, i) => {
              const pk = p.kind
              const open = pk === 'championship' ? undefined : () => router.push(leaguePath(pk, p.start, p.metric) as never)
              return (
              <ListItem key={p.kind + p.start + p.title} chevron={false} last={i === recent.length - 1} onPress={open}>
                <View style={{ flex: 1 }}>
                  <T bold>{p.title}</T>
                  <T muted small>{p.medals.map((m) => `${ordinal(m.rank)} ${m.name} (${formatPodiumValue(metric, m.value)})`).join(' · ')}</T>
                </View>
                <MedalIcon rank={1} />
              </ListItem>
              )
            })}
          </View>
        </Card>
      )}
    </>
  )
}

export default function Records() {
  const router = useRouter()
  const { group } = useGroup()
  const { base, report, isLoading, error } = useLeagueReport(group?.id)
  const [tab, setTab] = useState<Tab>('records')

  const head = <PageHead title="Records" right={<GroupSwitcher />} />
  if (isLoading) return <Screen tabs>{head}<Spinner /></Screen>
  if (error || !base || !report) return <Screen tabs>{head}<ErrorText error={error ?? new Error('Couldn’t load records')} /></Screen>
  const names: Names = new Map(base.members.map((m) => [m.user_id, m.name]))

  return (
    <Screen tabs>
      {head}
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'records', label: 'Records' },
          { value: 'history', label: 'History' },
          { value: 'holders', label: 'Holders' },
          { value: 'medals', label: 'Medals' },
        ]}
      />
      {tab === 'records' && (
        <>
          <Button title="More statistics: REM, deep sleep, interruptions" variant="secondary" icon={ChartColumn} onPress={() => router.push('/records/advanced')} />
          <RecordsBrowser base={base} mainReport={report.records} />
        </>
      )}
      {tab === 'history' && <HistoryTab records={report.records} names={names} />}
      {tab === 'holders' && <HoldersTab records={report.records} members={base.members} />}
      {tab === 'medals' && <MedalsTab podiums={report.podiums} members={base.members} />}
    </Screen>
  )
}
