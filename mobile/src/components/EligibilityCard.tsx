import { View } from 'react-native'
import { DEFAULT_ELIGIBILITY, parseEligibility, type Eligibility } from '@legity/core/league/eligibility'
import { DIVISION_LABELS, PODIUM_METRICS, type Division } from '@legity/core/league/types'
import { METRIC_LABELS, type Metric } from '@legity/core/stats'
import { useGroupSettings, useSaveEligibility } from '@legity/data/league'
import { Card, ErrorText, Spinner, T, Toggle } from './ui'

const DIVISIONS: Division[] = ['watch', 'phone']

/**
 * Admin-only: which device types may be ranked for each podium metric. Everything is on by default. Stored in
 * groups.settings (owners and admins can already write it), so it needs no migration.
 */
export function EligibilityCard({ groupId }: { groupId: string }) {
  const settings = useGroupSettings(groupId)
  const save = useSaveEligibility()

  if (settings.isLoading) return <Card><Spinner /></Card>
  const eligibility = parseEligibility(settings.data?.settings)
  const isDefault = PODIUM_METRICS.every((m) => DIVISIONS.every((d) => eligibility[m][d] === DEFAULT_ELIGIBILITY[m][d]))

  function change(metric: Metric, division: Division, on: boolean) {
    const next: Eligibility = { ...eligibility, [metric]: { ...eligibility[metric], [division]: on } }
    save.mutate({ groupId, current: settings.data?.settings, eligibility: next })
  }

  return (
    <Card title="Who counts for podiums" gap={14}>
      <T muted small>
        Choose which devices can place on each podium. Scores from different devices aren&apos;t directly comparable: phone-only scores
        skip the interruption penalty, so you may want phones off for Score. Records are always kept in separate Watch and Non-Watch
        divisions, and nights logged by hand never count.
      </T>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }} />
          {DIVISIONS.map((d) => (
            <View key={d} style={{ width: 74, alignItems: 'center' }}>
              <T muted small>{DIVISION_LABELS[d]}</T>
            </View>
          ))}
        </View>
        {PODIUM_METRICS.map((m) => (
          <View key={m} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <T bold style={{ flex: 1 }}>{METRIC_LABELS[m]}</T>
            {DIVISIONS.map((d) => (
              <View key={d} style={{ width: 74, alignItems: 'center' }}>
                <Toggle on={eligibility[m][d]} label={`${METRIC_LABELS[m]} for ${DIVISION_LABELS[d]}`} onChange={(v) => !save.isPending && change(m, d, v)} />
              </View>
            ))}
          </View>
        ))}
      </View>
      {!isDefault && <T muted small>Changed from the default (everything counts).</T>}
      <ErrorText error={save.error} />
    </Card>
  )
}
