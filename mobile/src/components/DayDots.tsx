import { View } from 'react-native'
import { heat } from '@legity/core/heat'
import type { Metric } from '@legity/core/stats'
import { mixHex } from '../lib/color'
import { useColors } from '../lib/theme'

/**
 * One small bar per day of the period, as a heat map of how good that night was for the selected metric.
 * Faint outline = no night recorded, dashed = still to come (or today, not synced yet), gold ring = best of the group that day.
 */
export function DayDots({
  dates,
  values,
  metric,
  today,
  won,
}: {
  dates: string[]
  values: Map<string, number>
  metric: Metric
  today: string
  won: Set<string>
}) {
  const c = useColors()
  return (
    <View style={{ flexDirection: 'row', gap: 3, marginTop: 6 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {dates.map((d) => {
        const v = values.get(d)
        const future = d > today
        const pending = d === today && v == null
        const ahead = future || pending
        const none = !ahead && v == null
        return (
          <View
            key={d}
            style={{
              flex: 1,
              minWidth: 0,
              maxWidth: 22,
              height: 10,
              borderRadius: 3,
              borderWidth: ahead ? 1 : 1,
              borderStyle: ahead ? 'dashed' : 'solid',
              borderColor: won.has(d) ? c.gold : c.line,
              backgroundColor: none || ahead ? 'transparent' : v != null ? mixHex(c.accent, c.surface2, 0.18 + heat(metric, v) * 0.82) : c.surface2,
              ...(won.has(d) ? { borderWidth: 1.5 } : null),
            }}
          />
        )
      })}
    </View>
  )
}
