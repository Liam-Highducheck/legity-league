import { memo, useEffect, useRef } from 'react'
import { Animated, Easing, View } from 'react-native'
import { hash } from './iso'

/**
 * Drifting motes over the garden: fireflies at dusk, pollen by day. Every value runs on the native driver
 * (translate + opacity only), so the JS thread stays idle however many there are.
 */
const Mote = memo(function Mote({ seed, w, h, color, size }: { seed: number; w: number; h: number; color: string; size: number }) {
  const x = useRef(new Animated.Value(0)).current
  const y = useRef(new Animated.Value(0)).current
  const glow = useRef(new Animated.Value(0)).current
  const left = hash(seed, 1) * w * 0.9 + w * 0.05
  const top = h * 0.2 + hash(seed, 2) * h * 0.65
  const dx = (hash(seed, 3) - 0.5) * w * 0.28
  const dy = (hash(seed, 4) - 0.5) * h * 0.2

  useEffect(() => {
    const loop = (v: Animated.Value, to: number, ms: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: to, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      )
    const a = [loop(x, dx, 5000 + hash(seed, 5) * 4000), loop(y, dy, 4200 + hash(seed, 6) * 4000), loop(glow, 1, 1400 + hash(seed, 7) * 1800)]
    const t = setTimeout(() => a.forEach((an) => an.start()), hash(seed, 8) * 2500)
    return () => {
      clearTimeout(t)
      a.forEach((an) => an.stop())
    }
  }, [x, y, glow, dx, dy, seed])

  const opacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] })
  const halo = size * 3
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left, top, opacity, transform: [{ translateX: x }, { translateY: y }] }}>
      <View style={{ position: 'absolute', left: -halo / 2 + size / 2, top: -halo / 2 + size / 2, width: halo, height: halo, borderRadius: halo / 2, backgroundColor: color, opacity: 0.14 }} />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </Animated.View>
  )
})

/** A petal drifting down and across the board, turning as it goes, then starting over from the top. */
const Petal = memo(function Petal({ seed, w, h, color }: { seed: number; w: number; h: number; color: string }) {
  const drift = useRef(new Animated.Value(0)).current
  const wobble = useRef(new Animated.Value(0)).current
  const startX = w * (0.35 + hash(seed, 41) * 0.65)
  const startY = h * (0.02 + hash(seed, 42) * 0.2)
  const dx = -w * (0.25 + hash(seed, 43) * 0.3)
  const dy = h * (0.45 + hash(seed, 44) * 0.3)

  useEffect(() => {
    const fall = Animated.loop(Animated.timing(drift, { toValue: 1, duration: 11000 + hash(seed, 45) * 7000, easing: Easing.linear, useNativeDriver: true }))
    const sway = Animated.loop(
      Animated.sequence([
        Animated.timing(wobble, { toValue: 1, duration: 1700 + hash(seed, 46) * 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(wobble, { toValue: 0, duration: 1700 + hash(seed, 46) * 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    const t = setTimeout(() => {
      fall.start()
      sway.start()
    }, hash(seed, 47) * 9000)
    return () => {
      clearTimeout(t)
      fall.stop()
      sway.stop()
    }
  }, [drift, wobble, seed])

  const tx = Animated.add(drift.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }), wobble.interpolate({ inputRange: [0, 1], outputRange: [-9, 9] }))
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: startX,
        top: startY,
        width: 8,
        height: 5,
        borderRadius: 4,
        backgroundColor: color,
        opacity: drift.interpolate({ inputRange: [0, 0.08, 0.85, 1], outputRange: [0, 0.85, 0.85, 0] }),
        transform: [
          { translateX: tx },
          { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
          { rotate: drift.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${400 + hash(seed, 48) * 300}deg`] }) },
        ],
      }}
    />
  )
})

export function Ambient({ width, height, dusk, still }: { width: number; height: number; dusk: boolean; still?: boolean }) {
  if (still) return null
  const count = dusk ? 9 : 6
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height }}>
      {Array.from({ length: count }, (_, i) => (
        <Mote key={i} seed={i + 1} w={width} h={height} color={dusk ? '#ffe9a0' : '#ffffff'} size={dusk ? 3.5 : 2.5} />
      ))}
      {Array.from({ length: 4 }, (_, i) => (
        <Petal key={'p' + i} seed={i + 1} w={width} h={height} color={i % 2 ? '#f6b6c5' : '#ffd5df'} />
      ))}
    </View>
  )
}
