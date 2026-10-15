import { Text, View } from 'react-native'
import { Moon } from 'lucide-react-native'
import { RARITY_LABELS, type Rarity } from '@legity/core/garden/index'

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#9db4a9',
  uncommon: '#6ee7b7',
  rare: '#a78bfa',
  epic: '#fbbf24',
}

/** Small coloured rarity label. Same box in every state. */
export function RarityChip({ rarity }: { rarity: Rarity }) {
  const color = RARITY_COLOR[rarity]
  return (
    <View style={{ borderRadius: 999, paddingVertical: 2, paddingHorizontal: 9, borderWidth: 1, borderColor: color, backgroundColor: color + '22' }}>
      <Text style={{ color, fontSize: 12, fontWeight: '700', letterSpacing: 0.3 }}>{RARITY_LABELS[rarity]}</Text>
    </View>
  )
}

/** Marks sleep-themed plants. */
export function SleepyBadge() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Moon size={12} color="#a9b4ff" strokeWidth={2} />
      <Text style={{ color: '#a9b4ff', fontSize: 12, fontWeight: '600' }}>Sleepy</Text>
    </View>
  )
}
