import { useEffect, useState } from 'react'
import { blackoutState, type BlackoutState } from '@legity/core/blackout'
import { getConfig } from './client'
import { useGroup } from './group'
import { useForcedBlackout, useMyGroups, useProfile } from './queries'

/** Re-evaluates every 30s so the screen unlocks itself when the window ends. */
export function useBlackout(): BlackoutState & { ready: boolean } {
  const profile = useProfile()
  const forced = useForcedBlackout()
  const groups = useMyGroups()
  const { group } = useGroup()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    const offForeground = getConfig().onForeground?.(() => setNow(new Date()))
    return () => {
      clearInterval(id)
      offForeground?.()
    }
  }, [])

  const ready = profile.isSuccess && !forced.isLoading && !groups.isLoading
  // Until all three have loaded, hide comparisons: safer to briefly over-hide than flash rankings.
  if (!ready) return { active: true, reason: null, opensAt: null, ready: false }
  return { ...blackoutState(profile.data, forced.data, group?.blackout, now), ready: true }
}
