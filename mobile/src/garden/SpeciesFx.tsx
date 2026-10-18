import { memo, useEffect, useRef } from 'react'
import { Animated, Easing, View } from 'react-native'
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'

/** Loops 0 -> 1 -> 0 (or 0 -> 1 restarting) after an optional delay. Everything below runs on the native driver. */
function useLoop(ms: number, delay: number, mode: 'pingpong' | 'restart' | 'fall', still?: boolean) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (still) return
    const step = (to: number) => Animated.timing(v, { toValue: to, duration: ms, easing: mode === 'restart' ? Easing.out(Easing.quad) : mode === 'fall' ? Easing.linear : Easing.inOut(Easing.sin), useNativeDriver: true })
    const a = Animated.loop(mode !== 'pingpong' ? step(1) : Animated.sequence([step(1), step(0)]))
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

/** A blossom petal that lets go of the canopy, tumbles down on the breeze and fades into the ground. */
function FallingPetal({ x, y, delay, w, h, still }: { x: number; y: number; delay: number; w: number; h: number; still?: boolean }) {
  const v = useLoop(7200, delay, 'fall', still)
  const s = Math.max(3, (3.6 / 100) * w)
  const px = (n: number) => (n / 100) * w
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: px(x), top: (y / 120) * h, width: s, height: s * 0.62, borderRadius: s, backgroundColor: '#ffd3df',
        opacity: v.interpolate({ inputRange: [0, 0.08, 0.85, 1], outputRange: [0, 0.95, 0.9, 0] }),
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, ((108 - y) / 120) * h] }) },
          { translateX: v.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: [0, px(5), px(-1), px(6), px(1), px(5)] }) },
          { rotate: v.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: ['0deg', '70deg', '150deg', '230deg', '320deg'] }) },
        ],
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
    case 'aurora':
      return (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }}>
          <Halo x={50} y={40} r={34} color="#8ff0d0" w={w} h={h} />
          <Glint x={22} y={30} size={5} delay={0} w={w} h={h} />
          <Glint x={80} y={26} size={4.5} delay={500} w={w} h={h} />
          <Glint x={50} y={10} size={4} delay={950} w={w} h={h} />
        </View>
      )
    case 'celestial':
      return (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }}>
          <Halo x={50} y={44} r={34} color="#a9b4ff" w={w} h={h} />
          <Glint x={26} y={20} size={4.5} delay={0} w={w} h={h} />
          <Glint x={76} y={24} size={4} delay={400} w={w} h={h} />
          <Glint x={64} y={64} size={3.5} delay={800} w={w} h={h} />
          <Glint x={36} y={62} size={3.5} delay={1200} w={w} h={h} />
        </View>
      )
    case 'moonwood':
      return (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }}>
          <Spore x={34} y={44} delay={0} color="#e8f1ff" w={w} h={h} />
          <Spore x={60} y={30} delay={1300} color="#fff4cf" w={w} h={h} />
          <Spore x={72} y={50} delay={2300} color="#e8f1ff" w={w} h={h} />
        </View>
      )
    case 'sakura':
      return (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }}>
          <FallingPetal x={34} y={50} delay={0} w={w} h={h} />
          <FallingPetal x={52} y={44} delay={1400} w={w} h={h} />
          <FallingPetal x={66} y={52} delay={2900} w={w} h={h} />
          <FallingPetal x={44} y={58} delay={4300} w={w} h={h} />
          <FallingPetal x={74} y={60} delay={5700} w={w} h={h} />
        </View>
      )
    case 'wishdandelion':
      return (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }}>
          <Spore x={70} y={30} delay={0} color="#fff6cf" w={w} h={h} />
          <Spore x={50} y={26} delay={1400} color="#fff6cf" w={w} h={h} />
        </View>
      )
    case 'dreamlavender':
      return (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }}>
          <Spore x={36} y={40} delay={0} color="#e6dcff" w={w} h={h} />
          <Spore x={62} y={34} delay={1700} color="#cdbfff" w={w} h={h} />
        </View>
      )
    case 'crystalrose':
      return (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }}>
          <Glint x={26} y={34} size={4.5} delay={0} w={w} h={h} />
          <Glint x={78} y={30} size={4} delay={600} w={w} h={h} />
          <Glint x={50} y={22} size={4.5} delay={1100} w={w} h={h} />
        </View>
      )
    default:
      return null
  }
})
