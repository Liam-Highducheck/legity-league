import { View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { addDays, todayISO } from '@legity/core/dates'
import { formatDuration } from '@legity/core/format'
import { SCORE_HISTORY_DAYS } from '@legity/core/score'
import { useMyNights, useNightSegments, useProfile } from '@legity/data/queries'
import { Hypnogram } from '../../../components/Hypnogram'
import { clockTime } from '../../../components/NightPeek'
import { SleepScoreCard } from '../../../components/SleepScoreCard'
import { BigNum, Card, Chip, ChipText, Chips, Kv, PageHead, Screen, Spinner, T } from '../../../components/ui'

const fullDate = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export default function NightDetail() {
  const { date = todayISO() } = useLocalSearchParams<{ date: string }>()
  const profile = useProfile()
  const nights = useMyNights(addDays(date, -SCORE_HISTORY_DAYS), date)
  const segs = useNightSegments(date)

  if (!profile.data || nights.isLoading) return <Screen><Spinner /></Screen>

  const history = nights.data ?? []
  const night = history.find((n) => n.night_date === date)
  if (!night) {
    return (
      <Screen>
        <PageHead title="Night" back />
        <T muted>No sleep recorded for {fullDate(date)}.</T>
      </Screen>
    )
  }

  const tz = night.timezone ?? profile.data.timezone
  const segments = segs.data ?? []
  const stageMin = (stage: string) => segments.filter((s) => s.stage === stage).reduce((a, s) => a + (Date.parse(s.end) - Date.parse(s.start)) / 60_000, 0)
  const inBed = night.sleep_start && night.sleep_end ? (Date.parse(night.sleep_end) - Date.parse(night.sleep_start)) / 60_000 : null
  const stages = (['deep', 'rem', 'core'] as const)
    .map((k) => ({ k, label: { deep: 'Deep', rem: 'REM', core: 'Core' }[k], min: stageMin(k) }))
    .filter((s) => s.min > 0)

  return (
    <Screen>
      <PageHead title={fullDate(date)} back />

      <Card hero gap={10}>
        <T muted small>Asleep</T>
        <BigNum>{formatDuration(night.duration_min)}</BigNum>
        <Chips>
          {night.sleep_score != null && <Chip><ChipText label="Score" value={String(night.sleep_score)} /></Chip>}
          {night.restorative_min != null && <Chip><ChipText label="Restorative" value={formatDuration(night.restorative_min)} /></Chip>}
        </Chips>
      </Card>

      {segments.length > 0 && (
        <Card title="Sleep stages" gap={10}>
          <Hypnogram segments={segments} timeZone={tz} />
          {stages.length > 0 && (
            <View>
              {stages.map((s, i) => (
                <Kv
                  key={s.k}
                  last={i === stages.length - 1}
                  label={s.label}
                  value={`${formatDuration(s.min)} · ${Math.round((s.min / night.duration_min) * 100)}%`}
                />
              ))}
            </View>
          )}
        </Card>
      )}

      <SleepScoreCard night={night} history={history} timezone={tz ?? 'UTC'} />

      <Card title="Details">
        {night.sleep_start && <Kv label="Fell asleep" value={clockTime(night.sleep_start, tz)} />}
        {night.sleep_end && <Kv label="Woke up" value={clockTime(night.sleep_end, tz)} />}
        {inBed != null && <Kv label="Start to finish" value={formatDuration(inBed)} />}
        {night.wake_count != null && <Kv label="Wake-ups" value={String(night.wake_count)} />}
        {night.awake_min != null && <Kv label="Time awake" value={formatDuration(night.awake_min)} />}
        {tz && <Kv label="Timezone" value={tz.replace('_', ' ')} />}
        <Kv last label="Source" value={night.source.replace('_', ' ')} />
      </Card>
    </Screen>
  )
}
