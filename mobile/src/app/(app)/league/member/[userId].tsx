import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Settings2 } from 'lucide-react-native'
import { addDays, formatDay } from '@legity/core/dates'
import { buildCoverage, COVERAGE_DAYS } from '@legity/core/coverage'
import { formatMetric, formatPodiumValue, ordinal } from '@legity/core/format'
import { leaguePath } from '@legity/core/links'
import { deviceClassOf } from '@legity/core/league/device'
import { totalCounts, tallyKey, emptyCounts, type MedalEntry } from '@legity/core/league/podiums'
import { formatRecordValue } from '@legity/core/league/records'
import { DIVISION_LABELS, LEAGUE_KINDS, PODIUM_METRICS, type PodiumKind } from '@legity/core/league/types'
import { PERIOD_LABELS } from '@legity/core/periods'
import { METRIC_LABELS, metricValue, type Metric } from '@legity/core/stats'
import { useGroup } from '@legity/data/group'
import { useLeagueReport } from '@legity/data/league'
import { useGroupNights, useRoster } from '@legity/data/queries'
import { Avatar, Button, Card, Chip, Chips, ErrorText, ListItem, PageHead, Row, Screen, Segmented, Spinner, T, Value } from '../../../../components/ui'
import { BarChart, type BarPoint } from '../../../../components/BarChart'
import { CoverageGrid } from '../../../../components/CoverageGrid'
import { MedalCount, MedalLegend } from '../../../../components/medals'
import { SleepScoreCard } from '../../../../components/SleepScoreCard'
import { useColors } from '../../../../lib/theme'

const KINDS: PodiumKind[] = [...LEAGUE_KINDS, 'championship']
const KIND_LABELS: Record<PodiumKind, string> = { ...PERIOD_LABELS, championship: 'Champion' }
const DEVICE_LABELS = { watch: 'Watch', phone: DIVISION_LABELS.phone, manual: 'Manual' }
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function StatCard({ label, value }: { label: string; value: string }) {
  const c = useColors()
  return (
    <View style={{ flex: 1, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 18, padding: 16, alignItems: 'center' }}>
      <T muted small>{label}</T>
      <Text style={{ color: c.text, fontSize: 22, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  )
}

export default function MemberProfile() {
  const { userId = '' } = useLocalSearchParams<{ userId: string }>()
  const router = useRouter()
  const c = useColors()
  const { group } = useGroup()
  const roster = useRoster(group?.id)
  const nightsQuery = useGroupNights(group?.id)
  const { base, report, isLoading, error } = useLeagueReport(group?.id)
  const [days, setDays] = useState(30)
  const [metric, setMetric] = useState<Metric>('duration')
  const [open, setOpen] = useState<{ kind: PodiumKind; metric: Metric } | null>(null)

  const head = <PageHead title="Profile" back />
  if (isLoading || nightsQuery.isLoading || roster.isLoading) return <Screen>{head}<Spinner /></Screen>
  if (error || !base || !report) return <Screen>{head}<ErrorText error={error ?? new Error('Couldn’t load this profile')} /></Screen>

  const member = roster.data?.find((m) => m.user_id === userId)
  if (!group || !member) return <Screen>{head}<T muted>This person isn&apos;t in {group?.name ?? 'this group'}.</T></Screen>

  const today = base.asOf
  const mine = (nightsQuery.data ?? []).filter((n) => n.user_id === userId)
  const latest = mine[mine.length - 1]
  const scored = [...mine].reverse().find((n) => n.sleep_start)
  const device = latest ? deviceClassOf(latest) : null

  const start = addDays(today, -(days - 1))
  const byDate = new Map(mine.map((n) => [n.night_date, n]))
  const points: BarPoint[] = Array.from({ length: days }, (_, i) => {
    const d = addDays(start, i)
    const n = byDate.get(d)
    return { date: d, value: n ? metricValue(n, metric) : null }
  })
  const vals = points.map((p) => p.value).filter((v): v is number => v != null)
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  const best = vals.length ? Math.max(...vals) : null
  const fmt = (v: number) => formatMetric(metric, v)

  const cells = buildCoverage(mine.map((n) => n.night_date), today)
  const synced = cells.filter((cell) => cell.state === 'synced').length

  const medals = totalCounts(report.tally, userId)
  const cellCounts = (kind: PodiumKind, m: Metric) => report.tally.get(userId)?.get(tallyKey(kind, m)) ?? emptyCounts()
  const opened = open ? cellCounts(open.kind, open.metric) : null

  const userRecords = report.records.byUser.get(userId)
  const categories = new Map(report.records.categories.map((cat) => [cat.category.key, cat]))
  const isAdmin = group.role === 'owner' || group.role === 'admin'

  return (
    <Screen>
      {head}
      <Card hero>
        <Row gap={14}>
          <Avatar name={member.display_name} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontSize: 20, fontWeight: '600' }}>{member.display_name}</Text>
            <T muted small>{member.full_name ?? group.name}</T>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            {member.role !== 'member' && <Chip><T small style={{ textTransform: 'capitalize' }}>{member.role}</T></Chip>}
            {device && <Chip>{DEVICE_LABELS[device]}</Chip>}
          </View>
        </Row>
      </Card>

      <Row>
        <StatCard label="Podiums" value={String(medals.gold + medals.silver + medals.bronze)} />
        <StatCard label="Records held" value={String(userRecords?.held.length ?? 0)} />
        <StatCard label="Records set" value={String(userRecords?.setAllTime ?? 0)} />
      </Row>

      <Card title="Podiums" gap={12}>
        <T muted small>Each kind is counted separately. Tap a count to see which periods it came from.</T>
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <View style={{ width: 74 }} />
            {PODIUM_METRICS.map((m) => (
              <View key={m} style={{ flex: 1 }}>
                <T muted small bold style={{ textAlign: 'center', fontSize: 12 }}>{METRIC_LABELS[m]}</T>
              </View>
            ))}
          </View>
          {KINDS.map((kind) => (
            <View key={kind} style={{ flexDirection: 'row', gap: 6, alignItems: 'stretch' }}>
              <View style={{ width: 74, justifyContent: 'center' }}>
                <T small bold style={{ fontSize: 14 }}>{KIND_LABELS[kind]}</T>
              </View>
              {PODIUM_METRICS.map((m) => {
                const cc = cellCounts(kind, m)
                const any = cc.gold + cc.silver + cc.bronze > 0
                const selected = open?.kind === kind && open.metric === m
                const box = {
                  flex: 1,
                  minHeight: 46,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: selected ? c.accent : c.line,
                  backgroundColor: selected ? c.accentSoft : c.surface2,
                  alignItems: 'center' as const,
                  justifyContent: 'center' as const,
                }
                return any ? (
                  <Pressable key={m} style={box} onPress={() => setOpen(selected ? null : { kind, metric: m })}>
                    <MedalCount gold={cc.gold} silver={cc.silver} bronze={cc.bronze} compact />
                  </Pressable>
                ) : (
                  <View key={m} style={[box, { opacity: 0.45 }]}>
                    <T muted>–</T>
                  </View>
                )
              })}
            </View>
          ))}
        </View>
        <MedalLegend />
        {open && opened && (
          <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: 18, padding: 12, gap: 6 }}>
            <T bold>{KIND_LABELS[open.kind]} · {METRIC_LABELS[open.metric]}</T>
            {opened.entries.length === 0 ? (
              <T muted small>No podiums here yet.</T>
            ) : (
              <View>
                {opened.entries.map((e, i) => (
                  <EntryRow key={`${e.kind}-${e.start}-${e.metric}`} entry={e} last={i === opened.entries.length - 1} />
                ))}
              </View>
            )}
          </View>
        )}
      </Card>

      <Card title="Records" gap={10} right={<Text onPress={() => router.push('/records')} style={{ color: c.accent, fontSize: 13 }}>All records</Text>}>
        {userRecords && userRecords.held.length > 0 ? (
          <>
            <T muted small>
              Holds {plural(userRecords.held.length, 'record')}
              {userRecords.tied.length > 0 && ` (${userRecords.tied.length} tied)`}, set {plural(userRecords.setAllTime, 'record')} in total.
            </T>
            <View>
              {userRecords.held.map((key, i) => {
                const r = categories.get(key)
                if (!r?.current) return null
                return (
                  <ListItem key={key} chevron={false} last={i === userRecords.held.length - 1} style={{ alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <T bold>{r.category.label}</T>
                      <T muted small>
                        {DIVISION_LABELS[r.category.division]} · {r.current.holders[0]?.title ?? formatDay(r.current.achievedOn)} · {plural(r.current.stoodDays, 'day')}
                        {r.current.ties.some((t) => t.userId === userId) && ' · tied'}
                      </T>
                    </View>
                    <Value>{formatRecordValue(r.category.stat, r.current.value)}</Value>
                  </ListItem>
                )
              })}
            </View>
          </>
        ) : (
          <T muted small>No records held right now.</T>
        )}
      </Card>

      <Segmented value={days} onChange={setDays} options={[{ value: 30, label: '30 days' }, { value: 90, label: '90 days' }]} />
      <Segmented value={metric} onChange={setMetric} options={PODIUM_METRICS.map((m) => ({ value: m, label: METRIC_LABELS[m] }))} />
      <Card>
        {vals.length === 0 ? (
          <T muted style={{ textAlign: 'center' }}>No {METRIC_LABELS[metric].toLowerCase()} data in this range.</T>
        ) : (
          <BarChart data={points} goal={metric === 'duration' ? 480 : undefined} format={fmt} />
        )}
      </Card>
      <Row>
        <StatCard label="Average" value={avg == null ? '—' : fmt(avg)} />
        <StatCard label="Best" value={best == null ? '—' : fmt(best)} />
        <StatCard label="Nights" value={String(vals.length)} />
      </Row>

      {scored && <SleepScoreCard night={scored} history={mine} timezone={scored.timezone ?? base.timeZone} />}

      <Card title="Nights synced" gap={12}>
        <T>
          <T bold>{synced}</T> of the last {COVERAGE_DAYS} nights. A podium or average record needs a night on every day of the period.
        </T>
        <CoverageGrid cells={cells} label={`${synced} of ${COVERAGE_DAYS} nights synced`} />
      </Card>

      {isAdmin && <Button title="Manage member" variant="secondary" icon={Settings2} onPress={() => router.push(`/me/groups/${group.id}/members/${userId}` as never)} />}
    </Screen>
  )
}

function EntryRow({ entry, last }: { entry: MedalEntry; last: boolean }) {
  const router = useRouter()
  const kind = entry.kind
  const open = kind === 'championship' ? undefined : () => router.push(leaguePath(kind, entry.start, entry.metric) as never)
  return (
    <ListItem chevron={false} last={last} onPress={open}>
      <View style={{ flex: 1 }}>
        <T bold>{entry.title}</T>
        <T muted small>{ordinal(entry.rank)} place</T>
      </View>
      <Value>{formatPodiumValue(entry.metric, entry.value)}</Value>
    </ListItem>
  )
}
