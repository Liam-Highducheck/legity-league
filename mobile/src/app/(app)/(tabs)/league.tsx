import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { BedDouble, Box, ChevronLeft, ChevronRight, Crown, Flame } from 'lucide-react-native'
import { addDays, daysBetween, eachDay, formatDay, formatShortDay, todayISO } from '@legity/core/dates'
import { dailyWinners } from '@legity/core/heat'
import { formatMetric, formatSpread } from '@legity/core/format'
import { memberPath } from '@legity/core/links'
import { podiumFor } from '@legity/core/league/podiums'
import { DIVISION_LABELS } from '@legity/core/league/types'
import { formatRecordValue } from '@legity/core/league/records'
import { PERIOD_LABELS, SCALES, SCALE_PERIOD, periodOffset, periodRange, type PeriodKind, type Scale } from '@legity/core/periods'
import {
  LONG_SLEEP_MIN,
  METRIC_LABELS,
  leaderboard,
  longestStreak,
  metricValue,
  mostBox,
  nightsAtLeast,
  type Metric,
} from '@legity/core/stats'
import { useGroup } from '@legity/data/group'
import { useBlackout } from '@legity/data/useBlackout'
import { useGroupNights, useProfile, useRoster } from '@legity/data/queries'
import { useLeagueReport } from '@legity/data/league'
import { useUserId } from '@legity/data/auth'
import { BlackoutCard } from '../../../components/BlackoutCard'
import { GroupSwitcher } from '../../../components/GroupSwitcher'
import { DayDots } from '../../../components/DayDots'
import { PodiumCard } from '../../../components/PodiumCard'
import { Avatar, Card, DateField, IconButton, ListItem, PageHead, Rank, Row, Screen, Segmented, Spinner, T, Value } from '../../../components/ui'
import { useColors } from '../../../lib/theme'

const KINDS = Object.keys(PERIOD_LABELS) as PeriodKind[]
const isKind = (v: string | undefined): v is PeriodKind => !!v && (KINDS as string[]).includes(v)
const isMetric = (v: string | undefined): v is Metric => !!v && v in METRIC_LABELS
const KIND_SCALE = Object.fromEntries(Object.entries(SCALE_PERIOD).map(([sc, k]) => [k, sc])) as Partial<Record<PeriodKind, Scale>>

export default function League() {
  const router = useRouter()
  const c = useColors()
  const uid = useUserId()
  const { group } = useGroup()
  const profile = useProfile()
  const blackout = useBlackout()
  const params = useLocalSearchParams<{ kind?: string; p?: string; metric?: string }>()
  const [scale, setScale] = useState<Scale>('W')
  // A deep link can land on a period the selector has no button for (fortnight, season): keep it here, unhighlighted.
  const [linkedKind, setLinkedKind] = useState<PeriodKind | null>(null)
  const [offset, setOffset] = useState(0)
  const [metric, setMetric] = useState<Metric>('duration')
  const tz = profile.data?.timezone
  const today = todayISO(tz)
  const [custom, setCustom] = useState({ from: addDays(today, -29), to: today })

  const kind: PeriodKind | null = linkedKind ?? SCALE_PERIOD[scale] ?? null
  const roster = useRoster(group?.id)

  // Deep links (from Discord posts and profiles): /league?kind=week&p=2026-09-28&metric=duration
  const linked = `${params.kind}|${params.p}|${params.metric}`
  useEffect(() => {
    const k = params.kind
    const p = params.p
    if (!isKind(k) || !p || !profile.data) return
    const off = periodOffset(k, p, todayISO(profile.data.timezone))
    if (off == null) return
    const sc = KIND_SCALE[k]
    if (sc) {
      setScale(sc)
      setLinkedKind(null)
    } else {
      setLinkedKind(k)
    }
    setOffset(off)
    if (isMetric(params.metric)) setMetric(params.metric)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linked, profile.data?.timezone])

  // All time and Custom are plain date ranges; the others step through whole calendar periods.
  const periodRangeNow = kind ? periodRange(kind, offset, tz) : null
  const queryStart = scale === 'All' && !kind ? undefined : !kind ? custom.from : periodRangeNow!.start
  const queryEnd = scale === 'All' && !kind ? undefined : !kind ? custom.to : periodRangeNow!.end
  const periodNights = useGroupNights(group?.id, queryStart, queryEnd)
  const firstDate = (periodNights.data ?? []).reduce((m, n) => (n.night_date < m ? n.night_date : m), today)
  const range =
    periodRangeNow ??
    (scale === 'All'
      ? { start: firstDate, end: today, label: 'All time', isCurrent: false }
      : (() => {
          const start = custom.from <= custom.to ? custom.from : custom.to
          const end = custom.from <= custom.to ? custom.to : custom.from
          return { start, end, label: `${formatShortDay(start)} – ${formatShortDay(end)}`, isCurrent: false }
        })())
  const { base, report } = useLeagueReport(group?.id)

  const members = (roster.data ?? []).map((m) => ({ user_id: m.user_id, name: m.display_name }))

  if (!blackout.ready || roster.isLoading) {
    return (
      <Screen tabs>
        <Spinner />
      </Screen>
    )
  }

  const head = <PageHead title="League" right={<GroupSwitcher />} />
  if (blackout.active) {
    return (
      <Screen tabs>
        {head}
        <BlackoutCard state={blackout} />
      </Screen>
    )
  }

  const nights = periodNights.data ?? []
  const board = leaderboard(members, nights, metric, range.start, range.end)
  const withData = board.filter((r) => r.avg != null)
  const without = board.filter((r) => r.avg == null)
  const long = nightsAtLeast(members, nights, LONG_SLEEP_MIN, range.start, range.end)[0]
  const streak = longestStreak(members, nights, LONG_SLEEP_MIN, range.start, range.end)[0]
  const box = mostBox(members, nights, metric, range.start, range.end)[0]

  // Day-by-day heat strip per person (only for periods short enough to read, up to a month).
  const dotDates = daysBetween(range.start, range.end) < 31 ? eachDay(range.start, range.end) : null
  const dayValues = new Map<string, Map<string, number>>()
  for (const n of nights) {
    const v = metricValue(n, metric)
    if (v == null || n.night_date < range.start || n.night_date > range.end) continue
    let byDate = dayValues.get(n.user_id)
    if (!byDate) dayValues.set(n.user_id, (byDate = new Map()))
    byDate.set(n.night_date, v)
  }
  const winners = dailyWinners(dayValues)
  const wonBy = (userId: string) => new Set([...winners].filter(([, users]) => users.has(userId)).map(([d]) => d))
  const daysLeft = range.isCurrent ? Math.max(0, daysBetween(today, range.end)) : 0

  // The official podium needs a finished period and a night on every day (the live ranking below doesn't).
  const podium = kind && base && !range.isCurrent ? podiumFor(kind, range, metric, base.members, base.index, base.eligibility) : null
  const kindLabel = kind ? PERIOD_LABELS[kind].toLowerCase() : 'period'

  const names = new Map(members.map((m) => [m.user_id, m.name]))
  const latestRecords = report
    ? report.records.categories
        .flatMap((cat) => cat.events.map((event) => ({ category: cat.category, event })))
        .sort((a, b) => b.event.achievedOn.localeCompare(a.event.achievedOn))
        .slice(0, 3)
    : []

  return (
    <Screen tabs>
      {head}

      <Segmented
        value={linkedKind && !KIND_SCALE[linkedKind] ? ('' as Scale) : scale}
        onChange={(v) => {
          setScale(v)
          setLinkedKind(null)
          setOffset(0)
        }}
        options={SCALES.map((v) => ({ value: v, label: v }))}
      />

      {kind ? (
        <Row between>
          <IconButton icon={ChevronLeft} label="Previous period" onPress={() => setOffset((o) => o - 1)} />
          <View style={{ alignItems: 'center' }}>
            <T bold>{range.label}</T>
            <T muted small>
              {range.isCurrent
                ? `In progress${daysLeft > 0 ? ` · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : ' · last day'}`
                : offset === -1
                  ? 'Last one'
                  : 'Final'}
            </T>
          </View>
          <IconButton icon={ChevronRight} label="Next period" disabled={offset >= 0} onPress={() => setOffset((o) => Math.min(0, o + 1))} />
        </Row>
      ) : scale === 'Custom' ? (
        <Row>
          <DateField label="From" value={custom.from} max={today} onChange={(v) => setCustom({ ...custom, from: v })} />
          <DateField label="To" value={custom.to} max={today} onChange={(v) => setCustom({ ...custom, to: v })} />
        </Row>
      ) : (
        <View style={{ alignItems: 'center' }}>
          <T bold>All time</T>
        </View>
      )}

      <Segmented value={metric} onChange={setMetric} options={(Object.keys(METRIC_LABELS) as Metric[]).map((m) => ({ value: m, label: METRIC_LABELS[m] }))} />

      {metric === 'score' && (
        <T muted small>
          An Apple-style estimate from Apple Health sleep data. Nights logged by hand have no score and aren&apos;t ranked. Scores
          from different devices aren&apos;t directly comparable.
        </T>
      )}

      {kind &&
        (podium ? (
          <PodiumCard podium={podium} />
        ) : (
          <T muted small>
            The official podium is awarded when this {kindLabel} ends, and needs a night on every day.
          </T>
        ))}

      <Card title="Average ranking">
        {periodNights.isLoading ? (
          <Spinner />
        ) : withData.length === 0 ? (
          <T muted style={{ textAlign: 'center' }}>Nobody has {METRIC_LABELS[metric].toLowerCase()} data for this period.</T>
        ) : (
          <View>
            {withData.map((r, idx) => (
              <ListItem key={r.user_id} me={r.user_id === uid} last={idx === withData.length - 1 && without.length === 0} onPress={() => router.push(memberPath(r.user_id) as never)} style={{ alignItems: 'center' }}>
                <View style={{ width: 22, alignItems: 'center' }}>
                  {idx === 0 ? <Crown size={18} color={c.gold} /> : <Rank n={idx + 1} />}
                </View>
                <Avatar name={r.name} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T bold numberOfLines={1}>{r.name}</T>
                  <T muted small>{r.nights} night{r.nights === 1 ? '' : 's'}</T>
                  {dotDates && <DayDots dates={dotDates} values={dayValues.get(r.user_id) ?? new Map()} metric={metric} today={today} won={wonBy(r.user_id)} />}
                </View>
                <Value>{formatMetric(metric, r.avg)}</Value>
              </ListItem>
            ))}
            {without.map((r, idx) => (
              <ListItem key={r.user_id} last={idx === without.length - 1} onPress={() => router.push(memberPath(r.user_id) as never)} chevron={false} style={{ opacity: 0.5 }}>
                <View style={{ width: 22, alignItems: 'center' }}><T muted>–</T></View>
                <Avatar name={r.name} />
                <View style={{ flex: 1 }}>
                  <T bold>{r.name}</T>
                  {dotDates && <DayDots dates={dotDates} values={new Map()} metric={metric} today={today} won={new Set()} />}
                </View>
                <T muted small>no data</T>
              </ListItem>
            ))}
          </View>
        )}
      </Card>

      {(long?.value > 0 || streak?.value > 1 || box) && (
        <Card title="Highlights" gap={8}>
          {long?.value > 0 && (
            <Text style={{ color: c.text, fontSize: 16, lineHeight: 22 }}>
              <BedDouble size={16} color={c.muted} /> Most 8h+ nights: <Text style={{ fontWeight: '600' }}>{long.name}</Text> ({long.value})
            </Text>
          )}
          {streak?.value > 1 && (
            <Text style={{ color: c.text, fontSize: 16, lineHeight: 22 }}>
              <Flame size={16} color={c.gold} /> Longest 8h+ streak: <Text style={{ fontWeight: '600' }}>{streak.name}</Text> ({streak.value} in a row)
            </Text>
          )}
          {box && (
            <Text style={{ color: c.text, fontSize: 16, lineHeight: 22 }}>
              <Box size={16} color={c.muted} /> Most BOX {kindLabel}: <Text style={{ fontWeight: '600' }}>{box.name}</Text> (±{formatSpread(metric, box.value)}{' '}
              {METRIC_LABELS[metric].toLowerCase()})
            </Text>
          )}
        </Card>
      )}

      {latestRecords.length > 0 && (
        <Card title="Latest records" gap={10} right={<Text onPress={() => router.push('/records')} style={{ color: c.accent, fontSize: 13 }}>See all</Text>}>
          {latestRecords.map(({ category, event }) => (
            <View key={`${category.key}-${event.achievedOn}`}>
              <T muted small>{category.label} · {DIVISION_LABELS[category.division]}</T>
              <T>
                <T bold>{event.holders.map((h) => names.get(h.userId) ?? 'Someone').join(' and ')}</T> · {formatRecordValue(category.stat, event.value)}{' '}
                <T muted small>· {event.holders[0]?.title ?? formatDay(event.achievedOn)}</T>
              </T>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  )
}
