import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

/** True when the system asks for less motion: the garden then stands still (no sway, motes or bursts). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    let live = true
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => live && setReduced(v))
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced)
    return () => {
      live = false
      sub.remove()
    }
  }, [])
  return reduced
}
