import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { Animated, Easing } from 'react-native'

/**
 * One slow "gust" shared by the whole garden: a value that swells and fades every few seconds. Each plant multiplies its
 * own sway by it, so the whole board leans in together a little harder now and then instead of every plant jittering on
 * its own. Everything here runs on the native driver, so it costs the JS thread nothing however many plants there are.
 */
const GustContext = createContext<Animated.Value | null>(null)

export function WindProvider({ children, still }: { children: ReactNode; still?: boolean }) {
  const gust = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (still) return
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(gust, { toValue: 1, duration: 5200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(gust, { toValue: 0, duration: 6800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    a.start()
    return () => a.stop()
  }, [gust, still])
  return <GustContext.Provider value={gust}>{children}</GustContext.Provider>
}

const HALF_CYCLE = 2300

/**
 * Idle sway for one plant: rotates around its roots, with a faint sideways drift and a slow "breathing" stretch.
 * `phase` (0..1) comes from the tile's position, so the sway travels across the board as a wave of wind rather than
 * every plant moving at random. `period` stretches heavy plants (trees) so they move slower than flowers.
 */
export function Sway({
  degrees, phase, period = 1, still, children, width, height,
}: { degrees: number; phase: number; period?: number; still?: boolean; children: ReactNode; width: number; height: number }) {
  const gust = useContext(GustContext)
  const t = useRef(new Animated.Value(0)).current
  const breathe = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (still) return
    const loop = (v: Animated.Value, ms: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      )
    const a = [loop(t, HALF_CYCLE * period), loop(breathe, 3100)]
    const timer = setTimeout(() => a.forEach((x) => x.start()), phase * 1600)
    return () => {
      clearTimeout(timer)
      a.forEach((x) => x.stop())
    }
  }, [t, breathe, phase, period, still])

  const wave = t.interpolate({ inputRange: [0, 1], outputRange: [-1, 1] })
  const gustFactor = gust ? gust.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.55] }) : null
  const lean = gustFactor ? Animated.multiply(wave, gustFactor) : wave
  const rotate = lean.interpolate({ inputRange: [-1.6, 1.6], outputRange: [`${-1.6 * degrees}deg`, `${1.6 * degrees}deg`] })
  const drift = lean.interpolate({ inputRange: [-1.6, 1.6], outputRange: [-width * 0.02, width * 0.02] })
  const stretch = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.988, 1.012] })

  return (
    <Animated.View pointerEvents="none" style={{ width, height, transformOrigin: '50% 93%', transform: [{ translateX: drift }, { rotate }, { scaleY: stretch }] }}>
      {children}
    </Animated.View>
  )
}

/** A short, springy pop when a plant is placed (or evolves), and a small bump each time it grows a stage. */
export function Appear({
  delay = 0, bump, still, children,
}: { delay?: number; bump: number; still?: boolean; children: ReactNode }) {
  const pop = useRef(new Animated.Value(still ? 1 : 0)).current
  const bounce = useRef(new Animated.Value(0)).current
  const first = useRef(true)

  useEffect(() => {
    if (still) return
    const t = setTimeout(() => Animated.spring(pop, { toValue: 1, friction: 5.5, tension: 120, useNativeDriver: true }).start(), delay)
    return () => clearTimeout(t)
  }, [pop, delay, still])

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (still) return
    Animated.sequence([
      Animated.timing(bounce, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(bounce, { toValue: 0, friction: 4, tension: 140, useNativeDriver: true }),
    ]).start()
  }, [bump, bounce, still])

  const scale = Animated.add(pop.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }), bounce.interpolate({ inputRange: [0, 1], outputRange: [0, 0.14] }))
  return (
    <Animated.View style={{ opacity: pop.interpolate({ inputRange: [0, 0.4], outputRange: [0, 1], extrapolate: 'clamp' }), transformOrigin: '50% 93%', transform: [{ scale }] }}>
      {children}
    </Animated.View>
  )
}
