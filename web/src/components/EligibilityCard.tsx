import { DEFAULT_ELIGIBILITY, parseEligibility, type Eligibility } from '@legity/core/league/eligibility'
import { DIVISION_LABELS, PODIUM_METRICS, type Division } from '@legity/core/league/types'
import { METRIC_LABELS, type Metric } from '@legity/core/stats'
import { useGroupSettings, useSaveEligibility } from '../hooks/league'
import { ErrorNote, Spinner, Toggle } from './ui'

const DIVISIONS: Division[] = ['watch', 'phone']

/**
 * Admin-only: which device types may be ranked for each podium metric. Everything is on by default. Stored in
 * groups.settings (owners and admins can already write it), so it needs no migration.
 */
export function EligibilityCard({ groupId }: { groupId: string }) {
  const settings = useGroupSettings(groupId)
  const save = useSaveEligibility()

  if (settings.isLoading) return <div className="card"><Spinner /></div>
  const eligibility = parseEligibility(settings.data?.settings)
  const isDefault = PODIUM_METRICS.every((m) => DIVISIONS.every((d) => eligibility[m][d] === DEFAULT_ELIGIBILITY[m][d]))

  function change(metric: Metric, division: Division, on: boolean) {
    const next: Eligibility = { ...eligibility, [metric]: { ...eligibility[metric], [division]: on } }
    save.mutate({ groupId, current: settings.data?.settings, eligibility: next })
  }

  return (
    <div className="card stack">
      <h2 style={{ marginBottom: 0 }}>Who counts for podiums</h2>
      <p className="muted small">
        Choose which devices can place on each podium. Scores from different devices aren&apos;t directly comparable: phone-only
        scores skip the interruption penalty, so you may want phones off for Score. Records are always kept in separate
        Watch and Non-Watch divisions, and nights logged by hand never count.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 74px 74px', alignItems: 'center', rowGap: 12 }}>
        <span />
        {DIVISIONS.map((d) => <span key={d} className="muted small center">{DIVISION_LABELS[d]}</span>)}
        {PODIUM_METRICS.map((m) => (
          <Row key={m} label={METRIC_LABELS[m]}>
            {DIVISIONS.map((d) => (
              <div key={d} style={{ display: 'flex', justifyContent: 'center' }}>
                <Toggle on={eligibility[m][d]} label={`${METRIC_LABELS[m]} for ${DIVISION_LABELS[d]}`} onChange={(v) => !save.isPending && change(m, d, v)} />
              </div>
            ))}
          </Row>
        ))}
      </div>
      {!isDefault && <p className="muted small">Changed from the default (everything counts).</p>}
      <ErrorNote error={save.error} />
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <b>{label}</b>
      {children}
    </>
  )
}
