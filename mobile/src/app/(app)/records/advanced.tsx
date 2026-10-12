import { useGroup } from '@legity/data/group'
import { useLeagueBase } from '@legity/data/league'
import { ErrorText, PageHead, Screen, Spinner, T } from '../../../components/ui'
import { RecordsBrowser } from '../../../components/RecordsBrowser'

/** Detailed statistics kept off the main Records page: best REM, best deep sleep, best interruptions score. */
export default function AdvancedRecords() {
  const { group } = useGroup()
  const { base, isLoading, error } = useLeagueBase(group?.id)
  const head = <PageHead title="More statistics" back />
  if (isLoading) return <Screen>{head}<Spinner /></Screen>
  if (error || !base) return <Screen>{head}<ErrorText error={error ?? new Error('Couldn’t load records')} /></Screen>
  return (
    <Screen>
      {head}
      <T muted small>
        Records for REM sleep, deep sleep and the interruptions score (0 to 20, higher means fewer wake-ups). They come from sleep-stage data, so
        they are Watch records.
      </T>
      <RecordsBrowser base={base} advanced />
    </Screen>
  )
}
