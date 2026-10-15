import { useEffect, useRef } from 'react'
import { Animated, Easing, View } from 'react-native'

export type BurstKind = 'plant' | 'evolve' | 'pickup'

export interface BurstSpec {
  key: number
  /** where it goes off, in the grid's own pixel space */
  x: number
  y: number
  kind: BurstKind
}

const LOOK: Record<BurstKind, { colors: string[]; count: number; radius: number; lift: number; size: number }> = {
  plant: { colors: ['#a8d6b5', '#86c19a', '#fff3c7', '#8a7a6a'], count: 10, radius: 30, lift: 14, size: 4.5 },
  evolve: { colors: ['#ffe08a', '#fff3c7', '#f2a7b8', '#cdd8ff', '#ffffff'], count: 16, radius: 46, lift: 30, size: 5.5 },
  pickup: { colors: ['#ffffff', '#cdd8ff', '#a9b4ff'], count: 8, radius: 26, lift: 22, size: 3.5 },
}

/**
 * A one-shot puff of particles: leaf bits and dust for planting, a star shower for evolving, soft glints for picking up.
 * One animated value drives every particle, and it all runs natively.
 */
export function Burst({ spec, onDone }: { spec: BurstSpec; onDone: (key: number) => void }) {
  const p = useRef(new Animated.Value(0)).current
  const look = LOOK[spec.kind]
  useEffect(() => {
    Animated.timing(p, { toValue: 1, duration: spec.kind === 'evolve' ? 1100 : 750, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => onDone(spec.key))
  }, [p, spec.key, spec.kind, onDone])

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: spec.x, top: spec.y }}>
      {Array.from({ length: look.count }, (_, i) => {
        const a = (i / look.count) * Math.PI * 2 + (i % 2) * 0.3
        const r = look.radius * (0.65 + ((i * 37) % 10) / 20)
        const tx = p.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * r] })
        const ty = p.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * r * 0.55 - look.lift] })
        const opacity = p.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 0.9, 0] })
        const scale = p.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.3, 1.1, 0.4] })
        const color = look.colors[i % look.colors.length]
        const s = look.size * (0.8 + ((i * 13) % 5) / 10)
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: -s / 2,
              top: -s / 2,
              width: s,
              height: s,
              borderRadius: spec.kind === 'evolve' && i % 2 ? 1 : s / 2,
              backgroundColor: color,
              opacity,
              transform: [{ translateX: tx }, { translateY: ty }, { scale }, { rotate: spec.kind === 'evolve' ? '45deg' : '0deg' }],
            }}
          />
        )
      })}
    </View>
  )
}
