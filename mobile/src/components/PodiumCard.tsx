import { useRouter } from 'expo-router'
import { formatPodiumValue } from '@legity/core/format'
import { memberPath } from '@legity/core/links'
import type { Podium } from '@legity/core/league/podiums'
import { METRIC_LABELS } from '@legity/core/stats'
import { Avatar, Card, ListItem, T, Value } from './ui'
import { MedalIcon } from './medals'
import { View } from 'react-native'

/** The official podium for a finished period: top three (ties share a place), plus who missed out and why. */
export function PodiumCard({ podium, title }: { podium: Podium; title?: string }) {
  const router = useRouter()
  const { placings, unranked, days } = podium.ranking
  return (
    <Card title={title ?? `Podium · ${METRIC_LABELS[podium.metric]}`} gap={10}>
      {podium.medals.length === 0 ? (
        <T muted small>
          {placings.length === 0
            ? `Nobody has a night on every one of the ${days} days.`
            : 'No podium: it needs at least two people with a night on every day.'}
        </T>
      ) : (
        <View>
          {podium.medals.map((p, i) => (
            <ListItem key={p.userId} chevron={false} last={i === podium.medals.length - 1} onPress={() => router.push(memberPath(p.userId) as never)}>
              <View style={{ width: 22, alignItems: 'center' }}>
                <MedalIcon rank={p.rank} />
              </View>
              <Avatar name={p.name} />
              <T bold style={{ flex: 1 }}>{p.name}</T>
              <Value>{formatPodiumValue(podium.metric, p.value)}</Value>
            </ListItem>
          ))}
        </View>
      )}
      {unranked.length > 0 && placings.length > 0 && (
        <T muted small>
          Not ranked (needs all {days} nights):{' '}
          {unranked.map((u) => `${u.name} (${u.nights >= days ? 'not eligible' : `${u.nights}/${days}`})`).join(', ')}
        </T>
      )}
    </Card>
  )
}
