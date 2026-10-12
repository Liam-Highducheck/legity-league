import { useState } from 'react'
import { View } from 'react-native'
import type { CoverageCell } from '@legity/core/coverage'
import { useColors } from '../lib/theme'
import { Row, T } from './ui'

/** One cell per day: synced, missing or today (pending). Used by the sync card and member profiles. */
export function CoverageGrid({ cells, label }: { cells: CoverageCell[]; label: string }) {
  const c = useColors()
  const [w, setW] = useState(0)
  const size = w > 0 ? Math.floor((w - 14 * 5) / 15) : 0
  const cellStyle = (state: string) => ({
    borderRadius: 5,
    borderWidth: state === 'pending' ? 1.5 : 1,
    borderStyle: state === 'pending' ? ('dashed' as const) : ('solid' as const),
    borderColor: state === 'synced' ? c.teal : state === 'pending' ? c.gold : c.line,
    backgroundColor: state === 'synced' ? c.teal : 'transparent',
  })
  return (
    <>
      <View accessibilityLabel={label} onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
        {size > 0 && cells.map((cell) => <View key={cell.date} style={[{ width: size, height: size }, cellStyle(cell.state)]} />)}
      </View>
      <Row gap={14}>
        {[['synced', 'Synced'], ['missing', 'No data'], ['pending', 'Today']].map(([state, text]) => (
          <Row key={state} gap={5}>
            <View style={[{ width: 10, height: 10, borderRadius: 3 }, cellStyle(state)]} />
            <T muted small>{text}</T>
          </Row>
        ))}
      </Row>
    </>
  )
}
