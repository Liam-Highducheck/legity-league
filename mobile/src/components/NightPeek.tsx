import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { X } from 'lucide-react-native'
import { formatDuration, formatMetric } from '@legity/core/format'
import type { Metric } from '@legity/core/stats'
import type { SleepNight } from '@legity/core/types'
import { BigNum, Button, IconButton, Popup, Row, StatTile, T } from './ui'
import { useColors } from '../lib/theme'

export type PeekRange = { from: string; to: string }

export const longDate = (iso: string, withYear = true) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) })

export function clockTime(iso: string | null, tz?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz ?? undefined })
}

export const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x != null)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

const HERO_LABEL: Record<Metric, string> = { duration: 'Asleep', restorative: 'Restorative', score: 'Sleep score' }
const heroValue = (n: SleepNight, m: Metric) => (m === 'duration' ? n.duration_min : m === 'restorative' ? n.restorative_min : n.sleep_score)

export function PopupHeader({ kicker, title, onClose }: { kicker: string; title: string; onClose: () => void }) {
  return (
    <Row between style={{ alignItems: 'flex-start' }}>
      <View style={{ flex: 1 }}>
        <T muted small>{kicker}</T>
        <T bold style={{ fontSize: 24, lineHeight: 30 }}>{title}</T>
      </View>
      <IconButton icon={X} label="Close" onPress={onClose} />
    </Row>
  )
}

/** A small popup for a tapped bar: one night's headline numbers, or a summary when the bar covers several nights. */
export function NightPeek({ range, nights, metric, onClose, onZoom }: { range: PeekRange | null; nights: SleepNight[]; metric: Metric; onClose: () => void; onZoom: (r: PeekRange) => void }) {
  const router = useRouter()
  const c = useColors()
  const inRange = range ? nights.filter((n) => n.night_date >= range.from && n.night_date <= range.to) : []
  const single = range && range.from === range.to ? inRange[0] : undefined
  const others = (['duration', 'restorative', 'score'] as Metric[]).filter((m) => m !== metric)

  return (
    <Popup visible={!!range} onClose={onClose}>
      {range && single && (
        <View style={{ gap: 14 }}>
          <PopupHeader kicker="Night ending" title={longDate(single.night_date)} onClose={onClose} />
          <View>
            <T muted small>{HERO_LABEL[metric]}</T>
            <BigNum style={{ fontSize: 40, lineHeight: 44 }}>{formatMetric(metric, heroValue(single, metric))}</BigNum>
            {metric === 'restorative' && single.deep_min != null && single.rem_min != null && (
              <View style={{ gap: 6, marginTop: 8 }}>
                <View style={{ flexDirection: 'row', height: 8, borderRadius: 8, overflow: 'hidden', gap: 2 }}>
                  <View style={{ flex: single.deep_min, backgroundColor: c.chartDeep }} />
                  <View style={{ flex: single.rem_min, backgroundColor: c.chartRem }} />
                </View>
                <T muted small>
                  <T small color={c.chartDeep}>■</T> Deep {formatDuration(single.deep_min)} · <T small color={c.chartRem}>■</T> REM {formatDuration(single.rem_min)}
                </T>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {others.map((m) => (
              <StatTile key={m} label={HERO_LABEL[m]} value={formatMetric(m, heroValue(single, m))} />
            ))}
            {single.sleep_start && <StatTile wide label="Slept" value={`${clockTime(single.sleep_start, single.timezone)} – ${clockTime(single.sleep_end, single.timezone)}`} />}
            {single.wake_count != null && <StatTile label="Wake-ups" value={String(single.wake_count)} />}
          </View>
          <Button title="Full details" onPress={() => { onClose(); router.push(`/night/${single.night_date}`) }} />
        </View>
      )}
      {range && !single && (
        <View style={{ gap: 14 }}>
          <PopupHeader kicker={`${inRange.length} night${inRange.length === 1 ? '' : 's'}`} title={`${longDate(range.from, false)} – ${longDate(range.to)}`} onClose={onClose} />
          <View>
            <T muted small>Average {HERO_LABEL[metric].toLowerCase()}</T>
            <BigNum style={{ fontSize: 40, lineHeight: 44 }}>{formatMetric(metric, avg(inRange.map((n) => heroValue(n, metric))))}</BigNum>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {others.map((m) => (
              <StatTile key={m} label={`Avg. ${HERO_LABEL[m].toLowerCase()}`} value={formatMetric(m, avg(inRange.map((n) => heroValue(n, m))))} />
            ))}
          </View>
          <Button title="Zoom into this period" onPress={() => { onClose(); onZoom(range) }} />
        </View>
      )}
    </Popup>
  )
}
