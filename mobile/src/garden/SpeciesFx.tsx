import { memo, useEffect, useRef } from 'react'
import { Animated, Easing, View } from 'react-native'
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'

/** Loops 0 -> 1 -> 0 (or 0 -> 1 restarting) after an optional delay. Everything below runs on the native driver. */
function useLoop(ms: number, delay: number, mode: 'pingpong' | 'restart', still?: boolean) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (still) return
    const step = (to: number) => Animated.timing(v, { toValue: to, duration: ms, easing: mode === 'restart' ? Easing.out(Easing.quad) : Easing.inOut(Easing.sin), useNativeDriver: true })
    const a = Animated.loop(mode === 'restart' ? step(1) : Animated.sequence([step(1), step(0)]))
    const t = setTimeout(() => a.start(), delay)
    return () => {
      clearTimeout(t)
      a.stop()
    }
  }, [v, ms, delay, mode, still])
  return v
}

/** The flower's halo breathes. */
function Halo({ x, y, r, color, w, h, still }: { x: number; y: number; r: number; color: string; w: number; h: number; still?: boolean }) {
  const v = useLoop(2400, 0, 'pingpong', still)
  const px = (x / 100) * w
  const py = (y / 120) * h
  const rr = (r / 100) * w
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: px - rr, top: py - rr, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.1] }) }] }}>
      <Svg width={rr * 2} height={rr * 2}>
        <Defs>
          <RadialGradient id="fxHalo" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={0.55} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={rr} cy={rr} r={rr} fill="url(#fxHalo)" />
      </Svg>
    </Animated.View>
  )
}

/** A four-point glint that blinks on and off. */
function Glint({ x, y, size, delay, w, h, still }: { x: number; y: number; size: number; delay: number; w: number; h: number; still?: boolean }) {
  const v = useLoop(1100, delay, 'pingpong', still)
  const s = (size / 100) * w
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: (x / 100) * w - s / 2, top: (y / 120) * h - s / 2, width: s, height: s, borderRadius: 1.5, backgroundColor: '#fff6cf',
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
        transform: [{ rotate: '45deg' }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
      }}
    />
  )
}

/** A spore (or pollen speck) that drifts upward and fades, then starts again. */
function Spore({ x, y, delay, color, w, h, still }: { x: number; y: number; delay: number; color: string; w: number; h: number; still?: boolean }) {
  const v = useLoop(3200, delay, 'restart', still)
  const s = Math.max(2.5, (3.2 / 100) * w)
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: (x / 100) * w, top: (y / 120) * h, width: s, height: s, borderRadius: s, backgroundColor: color,
        opacity: v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.9, 0] }),
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -(h * 0.22)] }) }, { translateX: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 4, -2] }) }],
      }}
    />
  )
}

/**
 * Small idle effects for the species that glow or shed things, drawn over the plant (inside its sway, so they move with
 * it): the moon lily's halo breathes, the star blossom twinkles, the drowsy cap releases spores.
 */
export const SpeciesFx = memo(function SpeciesFx({ species, w, h, still }: { species: string; w: number; h: number; still?: boolean }) {
  if (still) return null
  switch (species) {
    case 'moonlily':
      return <Halo x={50} y={42} r={30} color="#cdd8ff" w={w} h={h} />
    case 'starblossom':
      return (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }}>
          <Halo x={50} y={44} r={26} color="#ffe9a0" w={w} h={h} />
          <Glint x={30} y={30} size={5} delay={0} w={w} h={h} />
          <Glint x={72} y={36} size={4} delay={450} w={w} h={h} />
          <Glint x={58} y={20} size={4.5} delay={820} w={w} h={h} />
        </View>
      )
    case 'drowsycap':
      return (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }}>
          <Spore x={38} y={52} delay={0} color="#e6dcff" w={w} h={h} />
          <Spore x={55} y={48} delay={1100} color="#cdbfff" w={w} h={h} />
          <Spore x={64} y={55} delay={2100} color="#e6dcff" w={w} h={h} />
        </View>
      )
    default:
      return null
  }
})
