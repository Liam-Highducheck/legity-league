import { Text, View } from 'react-native'
import { Moon } from 'lucide-react-native'
import { minutesToClock } from '@legity/core/format'
import type { BlackoutState } from '@legity/core/blackout'
import { Card, T } from './ui'
import { useColors } from '../lib/theme'

export function BlackoutCard({ state, what = 'Rankings and everyone else’s sleep' }: { state: BlackoutState; what?: string }) {
  const c = useColors()
  return (
    <Card style={{ alignItems: 'center' }}>
      <View style={{ alignItems: 'center', paddingVertical: 20, paddingHorizontal: 4, gap: 6 }}>
        <Moon size={44} strokeWidth={1.6} color={c.gold} />
        <Text style={{ color: c.text, fontSize: 20, fontWeight: '600', textAlign: 'center' }}>
          {what} {what.endsWith('s') ? 'are' : 'is'} resting
        </Text>
        <T muted style={{ textAlign: 'center' }}>
          {state.opensAt != null ? `Back at ${minutesToClock(state.opensAt)}. ` : ''}
          {state.reason === 'app'
            ? 'The whole league takes a break in the evening so nobody goes to bed stressing about a number.'
            : state.reason === 'group'
              ? 'This group takes a break in the evening so nobody goes to bed stressing about a number.'
              : 'This is your personal wind-down window. You can change it in Me → Blackout.'}
        </T>
      </View>
    </Card>
  )
}
