import { Text, View } from 'react-native'
import { Medal } from 'lucide-react-native'
import { useColors } from '../lib/theme'
import { TABULAR } from './ui'

function useMedalColors() {
  const c = useColors()
  return [c.gold, c.silver, c.bronze] as const
}

/** Gold / silver / bronze counts with coloured medal icons. */
export function MedalCount({ gold, silver, bronze, compact = false }: { gold: number; silver: number; bronze: number; compact?: boolean }) {
  const colors = useMedalColors()
  const counts = [gold, silver, bronze]
  return (
    <View
      accessibilityLabel={`${gold} gold, ${silver} silver, ${bronze} bronze`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: compact ? 7 : 10 }}
    >
      {counts.map((n, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          {!compact && <Medal size={15} color={colors[i]} />}
          <Text style={[{ color: colors[i], fontWeight: '600', fontSize: compact ? 14 : 16 }, TABULAR]}>{n}</Text>
        </View>
      ))}
    </View>
  )
}

export function MedalIcon({ rank, size = 18 }: { rank: number; size?: number }) {
  const colors = useMedalColors()
  return <Medal size={size} color={colors[Math.min(3, Math.max(1, rank)) - 1]} />
}

export function MedalLegend() {
  const colors = useMedalColors()
  const c = useColors()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      {['Gold', 'Silver', 'Bronze'].map((l, i) => (
        <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Medal size={14} color={colors[i]} />
          <Text style={{ color: c.muted, fontSize: 13 }}>{l}</Text>
        </View>
      ))}
    </View>
  )
}
