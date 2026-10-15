import { memo, useEffect, useRef } from 'react'
import { Animated, Easing, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle, Defs, Ellipse, G, Mask, RadialGradient, Rect, Stop } from 'react-native-svg'
import { hash } from './iso'

const Star = memo(function Star({ i, w, h, still }: { i: number; w: number; h: number; still?: boolean }) {
  const o = useRef(new Animated.Value(0)).current
  const size = 1.3 + hash(i, 33) * 1.4
  useEffect(() => {
    if (still) return
    const ms = 1600 + hash(i, 34) * 2600
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(o, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(o, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    const t = setTimeout(() => a.start(), hash(i, 35) * 3000)
    return () => {
      clearTimeout(t)
      a.stop()
    }
  }, [o, i, still])
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: hash(i, 31) * w * 0.94 + w * 0.03,
        top: hash(i, 32) * h * 0.4 + h * 0.02,
        width: size,
        height: size,
        borderRadius: size,
        backgroundColor: '#e8ecff',
        opacity: still ? 0.55 : o.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.95] }),
      }}
    />
  )
})

const Mist = memo(function Mist({ w, top, ms, still, from }: { w: number; top: number; ms: number; still?: boolean; from: number }) {
  const x = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (still) return
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(x, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    a.start()
    return () => a.stop()
  }, [x, ms, still])
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', left: -w * 0.2, top, width: w * 1.4, height: 46, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [from, from + w * 0.2] }) }] }}
    >
      <LinearGradient colors={['rgba(170,185,255,0)', 'rgba(170,185,255,0.11)', 'rgba(170,185,255,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1, borderRadius: 40 }} />
    </Animated.View>
  )
})

/** Night backdrop for the garden: twinkling stars, a crescent moon with a soft halo, and slow banks of mist. */
export const Sky = memo(function Sky({ width, height, still }: { width: number; height: number; still?: boolean }) {
  const moon = 30
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height }}>
      {Array.from({ length: 18 }, (_, i) => (
        <Star key={i} i={i + 1} w={width} h={height} still={still} />
      ))}
      <Svg width={moon * 3} height={moon * 3} style={{ position: 'absolute', left: width * 0.78 - moon, top: height * 0.03 - moon * 0.4 }}>
        <Defs>
          <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#dfe6ff" stopOpacity={0.35} />
            <Stop offset="1" stopColor="#dfe6ff" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={moon * 1.5} cy={moon * 1.5} r={moon * 1.45} fill="url(#halo)" />
        <Mask id="crescent">
          <Rect x={0} y={0} width={moon * 3} height={moon * 3} fill="black" />
          <Circle cx={moon * 1.5} cy={moon * 1.5} r={13} fill="white" />
          <Circle cx={moon * 1.5 + 6.5} cy={moon * 1.5 - 3.5} r={11} fill="black" />
        </Mask>
        <Circle cx={moon * 1.5} cy={moon * 1.5} r={13} fill="#f6f1d8" mask="url(#crescent)" />
      </Svg>
      <Mist w={width} top={height * 0.5} ms={14000} from={-width * 0.05} still={still} />
      <Mist w={width} top={height * 0.7} ms={19000} from={width * 0.1} still={still} />
    </View>
  )
})

/** A soft cloud drifting slowly back and forth. */
const Cloud = memo(function Cloud({ w, top, scale, ms, from, still }: { w: number; top: number; scale: number; ms: number; from: number; still?: boolean }) {
  const x = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (still) return
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(x, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    a.start()
    return () => a.stop()
  }, [x, ms, still])
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: from, top, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, w * 0.22] }) }, { scale }] }}>
      <Svg width={110} height={44}>
        <G fill="#ffffff" opacity={0.82}>
          <Ellipse cx={34} cy={28} rx={26} ry={12} />
          <Ellipse cx={58} cy={22} rx={24} ry={15} />
          <Ellipse cx={80} cy={29} rx={22} ry={11} />
        </G>
      </Svg>
    </Animated.View>
  )
})

/** Daytime backdrop: a warm sun with a halo and a few clouds sliding by. */
export const DaySky = memo(function DaySky({ width, height, still }: { width: number; height: number; still?: boolean }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height }}>
      <Svg width={150} height={150} style={{ position: 'absolute', left: width * 0.78 - 75 + 15, top: height * 0.03 - 50 }}>
        <Defs>
          <RadialGradient id="sunHalo" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#fff1b8" stopOpacity={0.9} />
            <Stop offset="0.35" stopColor="#ffe9a0" stopOpacity={0.45} />
            <Stop offset="1" stopColor="#ffe9a0" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={75} cy={75} r={72} fill="url(#sunHalo)" />
        <Circle cx={75} cy={75} r={11} fill="#ffe08a" />
      </Svg>
      <Cloud w={width} top={height * 0.05} scale={1} ms={30000} from={width * 0.05} still={still} />
      <Cloud w={width} top={height * 0.2} scale={0.7} ms={42000} from={width * 0.45} still={still} />
      <Cloud w={width} top={height * 0.11} scale={0.55} ms={36000} from={-width * 0.05} still={still} />
    </View>
  )
})
