import { View } from 'react-native'
import { DEFAULT_GOAL_MIN, getFormula } from '@legity/core/score'
import type { SleepNight } from '@legity/core/types'
import { BigNum, Card, Chip, Meter, Row, T } from './ui'
import { HEALTH_NAME } from '../lib/health'

/** Score breakdown for one night, computed on the device from the stored night + the earlier nights. */
export function SleepScoreCard({ night, history, timezone }: { night: SleepNight; history: SleepNight[]; timezone: string }) {
  const formula = getFormula(null)
  const result = formula.compute(night, history, { timezone, goalMin: DEFAULT_GOAL_MIN })
  if (!result) {
    return (
      <Card title="Sleep score">
        <T muted small>Needs a night synced from {HEALTH_NAME} (manual entries have no bedtime or wake-up detail).</T>
      </Card>
    )
  }
  return (
    <Card title="Sleep score" gap={12} right={<Chip>{formula.name}</Chip>}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
        <BigNum>{result.score}</BigNum>
        <T muted>/ 100 · {result.band}</T>
      </View>
      <View style={{ gap: 10 }}>
        {result.parts.map((p) => (
          <View key={p.key} style={{ gap: 4 }}>
            <Row between>
              <T small bold>{p.label}</T>
              <T small>{p.points} / {p.max}</T>
            </Row>
            <Meter fraction={p.points / p.max} />
            <T muted small>{p.note}</T>
          </View>
        ))}
      </View>
      {result.caveats.map((cv) => (
        <T key={cv} muted small>{cv}</T>
      ))}
    </Card>
  )
}
