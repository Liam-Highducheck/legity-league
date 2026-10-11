import { useEffect, useState } from 'react'
import { blackoutState, type BlackoutState } from '../lib/blackout'
import { useForcedBlackout, useProfile } from './queries'

/** Re-evaluates every 30s so the screen unlocks itself when the window ends. */
export function useBlackout(): BlackoutState & { ready: boolean } {
  const profile = useProfile()
  const forced = useForcedBlackout()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    const onVisible = () => document.visibilityState === 'visible' && setNow(new Date())
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const ready = profile.isSuccess && !forced.isLoading
  // Until both have loaded, hide comparisons: safer to briefly over-hide than flash rankings.
  if (!ready) return { active: true, reason: null, opensAt: null, ready: false }
  return { ...blackoutState(profile.data, forced.data, now), ready: true }
}
