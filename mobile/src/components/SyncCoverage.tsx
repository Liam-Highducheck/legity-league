import { addDays, todayISO } from '@legity/core/dates'
import { COVERAGE_DAYS, REGULAR_WINDOW_DAYS, buildCoverage, missingBeyondWindow } from '@legity/core/coverage'
import { useMyNights, useProfile } from '@legity/data/queries'
import { CoverageGrid } from './CoverageGrid'
import { Card, Notice, Row, T } from './ui'
import { Button } from './ui'
import { DatabaseBackup } from 'lucide-react-native'

/** Which of the last 30 nights have data, plus a backfill option for anything the regular sync can't reach. */
export function SyncCoverage({ onBackfill, backfilling }: { onBackfill: () => void; backfilling: boolean }) {
  const profile = useProfile()
  const today = todayISO(profile.data?.timezone)
  const nights = useMyNights(addDays(today, -(COVERAGE_DAYS - 1)), today)

  if (!profile.data || nights.isLoading) return null

  const cells = buildCoverage((nights.data ?? []).map((n) => n.night_date), today)
  const synced = cells.filter((c) => c.state === 'synced').length
  const missing = cells.filter((c) => c.state === 'missing').length
  const old = missingBeyondWindow(cells, today)

  return (
    <Card title="Sync coverage" gap={12}>
      <T>
        <T bold>{synced}</T> of the last {COVERAGE_DAYS} nights synced
        {missing > 0 && <T muted> · {missing} without data</T>}
      </T>
      <CoverageGrid cells={cells} label={`${synced} of ${COVERAGE_DAYS} nights synced`} />

      {old.length > 0 ? (
        <Notice>
          <T small>
            <T small bold>{old.length} night{old.length === 1 ? '' : 's'}</T> older than {REGULAR_WINDOW_DAYS} days {old.length === 1 ? 'has' : 'have'} no data. The regular
            sync only reaches back {REGULAR_WINDOW_DAYS} days, so run Backfill to pull the rest from Health.
          </T>
          <Row>
            <Button title="Run Backfill" small icon={DatabaseBackup} busy={backfilling} onPress={onBackfill} />
          </Row>
        </Notice>
      ) : (
        <T muted small>
          Nights without data are usually nights without your watch. The regular sync covers the last {REGULAR_WINDOW_DAYS} days automatically.
        </T>
      )}
    </Card>
  )
}
