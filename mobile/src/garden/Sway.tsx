import { useEffect, useRef, type ReactNode } from 'react'
import { Animated, Easing } from 'react-native'

/**
 * Gentle idle sway: rotates its children around the bottom centre. Runs on the native driver, so it costs the JS thread
 * nothing no matter how many plants are on screen. `seed` offsets the phase and speed so neighbours don't move in lockstep.
 */
export function Sway({ degrees, seed, children, width, height }: { degrees: number; seed: number; children: ReactNode; width: number; height: number }) {
  const t = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const duration = 2600 + ((seed * 379) % 1400)
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    // Start part-way through the cycle so the garden never sways in unison.
    const delay = setTimeout(() => anim.start(), (seed * 173) % 1800)
    return () => {
      clearTimeout(delay)
      anim.stop()
    }
  }, [t, seed])
  const rotate = t.interpolate({ inputRange: [0, 1], outputRange: [`${-degrees}deg`, `${degrees}deg`] })
  return (
    <Animated.View pointerEvents="none" style={{ width, height, transformOrigin: '50% 93%', transform: [{ rotate }] }}>
      {children}
    </Animated.View>
  )
}
