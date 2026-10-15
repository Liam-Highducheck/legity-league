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

export type TimeOfDay = 'day' | 'night'

/** Daylight 7:00-18:00 by the phone's clock. The garden looks out on a sunny sky by day and a starry one at night. */
export function useTimeOfDay(): TimeOfDay {
  const read = (): TimeOfDay => {
    const h = new Date().getHours()
    return h >= 7 && h < 18 ? 'day' : 'night'
  }
  const [t, setT] = useState<TimeOfDay>(read)
  useEffect(() => {
    const id = setInterval(() => setT(read()), 60_000)
    return () => clearInterval(id)
  }, [])
  return t
}
