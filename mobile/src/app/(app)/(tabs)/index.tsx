import { useState } from 'react'
import { Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Crown, DatabaseBackup, RefreshCw } from 'lucide-react-native'
import { addDays, formatDay, todayISO } from '@legity/core/dates'
import { formatDuration, formatMetric } from '@legity/core/format'
import { periodRange } from '@legity/core/periods'
import { daysSince } from '@legity/core/coverage'
import { LONG_SLEEP_MIN, leaderboard, nightsAtLeast } from '@legity/core/stats'
import { useGroup } from '@legity/data/group'
import { useBlackout } from '@legity/data/useBlackout'
import { useGroupNights, useMyNights, useProfile, useRoster } from '@legity/data/queries'
import { useUserId } from '@legity/data/auth'
import { BlackoutCard } from '../../../components/BlackoutCard'
import { SleepScoreCard } from '../../../components/SleepScoreCard'
import { GroupSwitcher } from '../../../components/GroupSwitcher'
import { BigNum, Button, Card, Chip, ChipText, Chips, ErrorText, Notice, Row, Screen, Spinner, T } from '../../../components/ui'
import { useColors } from '../../../lib/theme'
import { syncSleep } from '../../../lib/healthSync'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Still up?'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Today() {
  const router = useRouter()
  const c = useColors()
  const qc = useQueryClient()
  const uid = useUserId()
  const { group } = useGroup()
  const profile = useProfile()
  const blackout = useBlackout()
  const [syncing, setSyncing] = useState<'sync' | 'backfill' | null>(null)
  const [syncError, setSyncError] = useState<unknown>(null)

  const tz = profile.data?.timezone
  const today = todayISO(tz)
  const week = periodRange('week', 0, tz)
  const mine = useMyNights(addDays(today, -30), today)
  const roster = useRoster(group?.id)
  const weekNights = useGroupNights(group?.id, week.start, week.end)

  async function sync(kind: 'sync' | 'backfill') {
    setSyncing(kind)
    setSyncError(null)
    try {
      await syncSleep(kind === 'sync' ? 7 : 365, kind === 'sync' ? 'today-prompt' : 'backfill')
      await qc.invalidateQueries({ queryKey: ['my-nights'] })
      await qc.invalidateQueries({ queryKey: ['group-nights'] })
    } catch (e) {
      setSyncError(e)
    } finally {
      setSyncing(null)
    }
  }

  if (!profile.data || mine.isLoading) {
    return (
      <Screen tabs>
        <Spinner />
      </Screen>
    )
  }

  const nights = mine.data ?? []
  const latest = nights[nights.length - 1]
  const prior = nights.slice(-8, -1)
  const priorAvg = prior.length ? prior.reduce((s, n) => s + n.duration_min, 0) / prior.length : null
  const delta = latest && priorAvg != null ? latest.duration_min - priorAvg : null

  const members = (roster.data ?? []).map((m) => ({ user_id: m.user_id, name: m.display_name }))
  const board = leaderboard(members, weekNights.data ?? [], 'duration', week.start, week.end)
  const ranked = board.filter((r) => r.avg != null)
  const myRank = ranked.findIndex((r) => r.user_id === uid)
  const leader = ranked[0]
  const longNights = nightsAtLeast(members, weekNights.data ?? [], LONG_SLEEP_MIN, week.start, week.end)[0]

  return (
    <Screen
      tabs
      refreshing={mine.isRefetching}
      onRefresh={() => {
        void qc.invalidateQueries({ queryKey: ['my-nights'] })
        void qc.invalidateQueries({ queryKey: ['group-nights'] })
      }}
    >
      <Row between>
        <View>
          <T muted>{greeting()},</T>
          <Text style={{ color: c.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.56 }}>{profile.data.display_name}</Text>
        </View>
        <GroupSwitcher />
      </Row>

      {latest ? (
        <Card hero gap={10}>
          <T muted small>{latest.night_date === today ? 'Last night' : `Night ending ${formatDay(latest.night_date)}`}</T>
          <BigNum>{formatDuration(latest.duration_min)}</BigNum>
          <Chips>
            {latest.restorative_min != null && (
              <Chip>
                <ChipText label="Restorative" value={formatDuration(latest.restorative_min)} />
              </Chip>
            )}
            {latest.sleep_score != null && (
              <Chip>
                <ChipText label="Score" value={String(latest.sleep_score)} />
              </Chip>
            )}
            {delta != null && (
              <Chip>
                <ChipText
                  value={`${delta >= 0 ? '+' : '−'}${formatDuration(Math.abs(delta))}`}
                  valueColor={delta >= 0 ? c.teal : c.danger}
                />
                <T style={{ fontSize: 14 }}> vs last 7</T>
              </Chip>
            )}
          </Chips>
          {latest.night_date !== today && (
            <Row between>
              <T muted small style={{ flex: 1 }}>Today&apos;s sleep hasn&apos;t synced yet.</T>
              {profile.data.sleep_source !== 'manual' && (
                <Button title="Sync now" small variant="secondary" icon={RefreshCw} busy={syncing === 'sync'} onPress={() => sync('sync')} />
              )}
            </Row>
          )}
        </Card>
      ) : (
        <Card hero gap={10}>
          <T bold>No sleep yet</T>
          <T muted>Sync from Apple Health, or log last night by hand.</T>
          <Button title="Sync from Apple Health" icon={RefreshCw} busy={syncing === 'sync'} onPress={() => sync('sync')} />
        </Card>
      )}

      <ErrorText error={syncError} />

      {latest && profile.data.sleep_source !== 'manual' && daysSince(latest.night_date, today) > 5 && (
        <Notice>
          <T small>
            Your last synced night was <T small bold>{daysSince(latest.night_date, today)} days ago</T>. Catch up with Backfill to
            recover the nights in between.
          </T>
          <Row>
            <Button title="Run Backfill" small icon={DatabaseBackup} busy={syncing === 'backfill'} onPress={() => sync('backfill')} />
            <Button title="Details" small variant="secondary" onPress={() => router.push('/me/devices')} />
          </Row>
        </Notice>
      )}

      {latest && <SleepScoreCard night={latest} history={nights} timezone={tz ?? 'UTC'} />}

      {blackout.active ? (
        <BlackoutCard state={blackout} />
      ) : (
        <Card title={`This week · ${group?.name ?? ''}`}>
          {leader ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: c.text, fontSize: 16, lineHeight: 22 }}>
                <Crown size={18} color={c.gold} /> <Text style={{ fontWeight: '600' }}>{leader.name}</Text> leads with{' '}
                <Text style={{ fontWeight: '600' }}>{formatMetric('duration', leader.avg)}</Text> avg
              </Text>
              {myRank >= 0 ? (
                <T muted>
                  You&apos;re <T bold>#{myRank + 1}</T> of {ranked.length}
                </T>
              ) : (
                <T muted>Log a night to get on the board.</T>
              )}
              {longNights && longNights.value > 0 && (
                <T muted small>
                  Most 8h+ nights: {longNights.name} ({longNights.value})
                </T>
              )}
            </View>
          ) : (
            <T muted>No nights logged this week yet.</T>
          )}
          <Text onPress={() => router.push('/league')} style={{ color: c.accent, fontSize: 13, marginTop: 10 }}>
            Full rankings <ChevronRight size={14} color={c.accent} />
          </Text>
        </Card>
      )}

      <Button title="Log a night manually" variant="secondary" onPress={() => router.push('/log')} />
    </Screen>
  )
}
