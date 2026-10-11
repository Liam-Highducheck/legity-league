import { useGroup } from '../hooks/group'
import { useLeagueBase } from '../hooks/league'
import { ErrorNote, PageHead, Spinner } from '../components/ui'
import { RecordsBrowser } from '../components/RecordsBrowser'

/** Detailed statistics kept off the main Records page: best REM, best deep sleep, best interruptions score. */
export function AdvancedRecords() {
  const { group } = useGroup()
  const { base, isLoading, error } = useLeagueBase(group?.id)
  const head = <PageHead title="More statistics" back />
  if (isLoading) return <div className="screen stack">{head}<Spinner /></div>
  if (error || !base) return <div className="screen stack">{head}<ErrorNote error={error ?? new Error('Couldn’t load records')} /></div>
  return (
    <div className="screen stack">
      {head}
      <p className="muted small">
        Records for REM sleep, deep sleep and the interruptions score (0 to 20, higher means fewer wake-ups). They come from sleep-stage
        data, so they are Watch records.
      </p>
      <RecordsBrowser base={base} advanced />
    </div>
  )
}
