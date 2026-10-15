// The Dream Box opening: a full-screen scene that builds anticipation, then reveals the seed.
//
// Timeline: BUILD (about 3 s, speeds up and intensifies; the box's rarity is "teased" by four pips lighting one after
// another, each adding a glow in that rarity's colour, up to the real one) -> CLIMAX (about 1 s, the box opens in a flash)
// -> REVEAL (the plant, over a glow of its rarity). The server call runs while the build plays; the climax waits for both
// the build and the answer. Tapping during the build skips the wait. Everything animated runs on the native driver.
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, Modal, Pressable, Text, View } from 'react-native'
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg'
import { RARITIES, RARITY_LABELS, speciesById, type Rarity } from '@legity/core/garden/index'
import { Burst } from './Burst'
import { buzz } from './feedback'
import { useReducedMotion } from './motion'
import { RevealCard } from './Popups'
import { RARITY_COLOR } from './rarity'

export type BoxVariant = 'gift' | 'seed' | 'stars' | 'lantern'

export const BOX_VARIANTS: { id: BoxVariant; label: string; blurb: string }[] = [
  { id: 'gift', label: 'Gift box', blurb: 'A ribboned box that rattles harder and harder, leaks light, then the lid bursts off.' },
  { id: 'seed', label: 'Seed orb', blurb: 'A glowing seed that beats like a heart, cracks, and blooms apart in a ring of petals.' },
  { id: 'stars', label: 'Constellation', blurb: 'Stars light up one by one and join into a shape, then rush together into a flash.' },
  { id: 'lantern', label: 'Lantern', blurb: 'A paper lantern floats up as its flame swells, then opens and lets the light loose.' },
]

const BUILD_MS = 3200
const CLIMAX_MS = 1000
const SIZE = 280
/** Build progress at which each rarity pip lights (build eases in, so these land at about 45, 65, 81 and 94% of the time). */
const PIP_AT = [0.2, 0.42, 0.66, 0.88]

const clamp = { extrapolate: 'clamp' as const }
// outR may be numbers or angle strings ('45deg'); Animated accepts both at runtime
const lerp = (v: Animated.Value, inR: number[], outR: (number | string)[]) => v.interpolate({ inputRange: inR, outputRange: outR as number[], ...clamp })

interface Ctx {
  /** 0..1 over the build, easing in */
  build: Animated.Value
  /** 0..1 over the climax */
  climax: Animated.Value
  /** fast 0..1..0 shake driver */
  osc: Animated.Value
  /** slow 0..1..0 breathing driver */
  slow: Animated.Value
  /** index of the real rarity, 0..3 */
  final: number
}

function useOsc(ms: number, still: boolean) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (still) return
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    a.start()
    return () => a.stop()
  }, [v, ms, still])
  return v
}

/** A looping spin, 0..1 repeating. */
function useSpin(ms: number, still: boolean) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (still) return
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: true }))
    a.start()
    return () => a.stop()
  }, [v, ms, still])
  return v
}

/** A soft round flash (radial falloff), so expanding bursts of light have no hard edge. */
function FlashGlow({ size, color = '#ffffff' }: { size: number; color?: string }) {
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id="flash" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={1} />
          <Stop offset="0.45" stopColor={color} stopOpacity={0.55} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#flash)" />
    </Svg>
  )
}

// ---- shared aura: rays and one glow layer per rarity reached ------------------------------------------------

function Aura({ ctx, still }: { ctx: Ctx; still: boolean }) {
  const spin = useSpin(9000, still)
  const fade = lerp(ctx.climax, [0.55, 1], [1, 0])
  return (
    <View pointerEvents="none" style={{ position: 'absolute', width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      {/* soft rays that fade in as the build goes on */}
      <Animated.View style={{ position: 'absolute', opacity: Animated.multiply(lerp(ctx.build, [0.2, 1], [0, 0.55]), fade), transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
        <Svg width={SIZE} height={SIZE} viewBox="-140 -140 280 280">
          <Defs>
            <RadialGradient id="ray" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#ffffff" stopOpacity={0.5} />
              <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          {Array.from({ length: 12 }, (_, i) => (
            <Path key={i} d="M0 0 L-9 -138 L9 -138 Z" fill="url(#ray)" transform={`rotate(${i * 30})`} />
          ))}
        </Svg>
      </Animated.View>
      {/* one coloured glow per rarity, each switching on at its pip, up to the real rarity */}
      {RARITIES.map((r, k) => {
        if (k > ctx.final) return null
        const color = RARITY_COLOR[r]
        const radius = 70 + k * 18
        return (
          <Animated.View key={r} style={{ position: 'absolute', opacity: Animated.multiply(lerp(ctx.build, [PIP_AT[k], PIP_AT[k] + 0.14], [0, 1]), fade) }}>
            <Svg width={radius * 2} height={radius * 2}>
              <Defs>
                <RadialGradient id={`aura${k}`} cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={color} stopOpacity={0.55} />
                  <Stop offset="1" stopColor={color} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={radius} cy={radius} r={radius} fill={`url(#aura${k})`} />
            </Svg>
          </Animated.View>
        )
      })}
    </View>
  )
}

// ---- variant 1: gift box ----------------------------------------------------------------------------------------

function GiftVariant({ ctx }: { ctx: Ctx }) {
  const amp = lerp(ctx.build, [0, 0.3, 1], [0, 0.25, 1])
  const wobble = Animated.multiply(ctx.osc.interpolate({ inputRange: [0, 1], outputRange: [-1, 1] }), amp)
  const wobbleDeg = wobble.interpolate({ inputRange: [-1, 1], outputRange: [-12, 12] })
  const rotate = wobbleDeg.interpolate({ inputRange: [-60, 60], outputRange: ['-60deg', '60deg'] })
  const shakeX = wobble.interpolate({ inputRange: [-1, 1], outputRange: [-7, 7] })
  const scale = Animated.add(lerp(ctx.build, [0, 1], [1, 1.16]), lerp(ctx.climax, [0, 0.3, 1], [0, 0.22, 0.45]))
  const baseOpacity = lerp(ctx.climax, [0.65, 1], [1, 0])
  return (
    <View style={{ width: 130, height: 130 }}>
      <Animated.View style={{ width: 130, height: 130, opacity: baseOpacity, transform: [{ translateX: shakeX }, { rotate }, { scale }] }}>
        <Svg width={130} height={130} viewBox="0 0 130 130">
          <Ellipse cx={65} cy={118} rx={44} ry={7} fill="#000" opacity={0.3} />
          <Rect x={20} y={62} width={90} height={52} rx={8} fill="#5a4ccf" />
          <Rect x={20} y={62} width={90} height={14} rx={7} fill="#6b5bd6" />
          <Rect x={58} y={62} width={14} height={52} fill="#ffd166" />
          <Path d="M20 100 L110 100 L110 106 Q110 114 102 114 L28 114 Q20 114 20 106 Z" fill="rgba(0,0,0,0.18)" />
        </Svg>
      </Animated.View>
      {/* the lid rides on top and is thrown off at the climax */}
      <Animated.View
        style={{
          position: 'absolute', left: 0, top: 0, width: 130, height: 130,
          opacity: lerp(ctx.climax, [0.45, 1], [1, 0]),
          transform: [
            { translateX: Animated.add(shakeX, lerp(ctx.climax, [0, 1], [0, 46])) },
            { translateY: lerp(ctx.climax, [0, 0.3, 1], [0, -8, -150]) },
            { rotate: Animated.add(wobbleDeg, lerp(ctx.climax, [0, 1], [0, -40])).interpolate({ inputRange: [-60, 60], outputRange: ['-60deg', '60deg'] }) },
            { scale },
          ],
        }}
      >
        <Svg width={130} height={130} viewBox="0 0 130 130">
          <Rect x={14} y={44} width={102} height={24} rx={8} fill="#8b7cff" />
          <Rect x={14} y={44} width={102} height={8} rx={4} fill="rgba(255,255,255,0.22)" />
          <Rect x={58} y={44} width={14} height={24} fill="#ffd166" />
          <Path d="M65 44 C48 22 28 30 40 42 C48 48 60 46 65 44Z" fill="#ffd166" />
          <Path d="M65 44 C82 22 102 30 90 42 C82 48 70 46 65 44Z" fill="#ffc247" />
          <Circle cx={65} cy={44} r={6} fill="#ffe39a" />
        </Svg>
      </Animated.View>
      {/* light spilling from under the lid, then the burst */}
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 25, top: 56, width: 80, height: 10, borderRadius: 6, backgroundColor: '#fff6cf', opacity: Animated.multiply(lerp(ctx.build, [0.3, 1], [0, 0.95]), lerp(ctx.climax, [0, 0.25], [1, 0])), transform: [{ translateX: shakeX }, { rotate }, { scale }] }} />
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', left: 35, top: 35, opacity: lerp(ctx.climax, [0, 0.12, 1], [0, 1, 0]), transform: [{ scale: lerp(ctx.climax, [0, 1], [0.6, 7]) }] }}
      >
        <FlashGlow size={60} />
      </Animated.View>
    </View>
  )
}

// ---- variant 2: seed orb --------------------------------------------------------------------------------------------

const CRACKS: string[][] = [
  ['M0 -52 L-6 -34 L5 -22 L-4 -8', 'M-50 -14 L-34 -10 L-28 2 L-12 4'],
  ['M0 52 L7 36 L-4 24 L4 8', 'M50 -10 L36 -2 L38 12 L22 16'],
  ['M-30 -44 L-22 -30 L-30 -18', 'M34 42 L24 30 L32 18', 'M-44 34 L-30 28 L-34 14'],
]

function SeedVariant({ ctx, color }: { ctx: Ctx; color: string }) {
  const beat = Animated.add(Animated.multiply(ctx.slow, lerp(ctx.build, [0, 1], [0.05, 0.1])), Animated.multiply(ctx.osc, lerp(ctx.build, [0.5, 1], [0, 0.04])))
  const scale = Animated.add(Animated.add(1, beat), Animated.add(lerp(ctx.build, [0, 1], [0, 0.18]), lerp(ctx.climax, [0, 0.35, 1], [0, 0.1, 0.8])))
  const orbOpacity = lerp(ctx.climax, [0.3, 0.8], [1, 0])
  const ring = lerp(ctx.climax, [0, 1], [0.5, 3.2])
  return (
    <View style={{ width: 150, height: 150, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ opacity: orbOpacity, transform: [{ scale }] }}>
        <Svg width={140} height={140} viewBox="-70 -70 140 140">
          <Defs>
            <RadialGradient id="orb" cx="40%" cy="35%" r="70%">
              <Stop offset="0" stopColor="#fff6cf" />
              <Stop offset="0.5" stopColor="#a9b4ff" />
              <Stop offset="1" stopColor="#5b4bd6" />
            </RadialGradient>
          </Defs>
          <Circle r={52} fill="url(#orb)" />
          <Ellipse cx={-16} cy={-22} rx={14} ry={8} fill="#fff" opacity={0.35} transform="rotate(-30 -16 -22)" />
        </Svg>
      </Animated.View>
      {/* cracks open up in three stages, glowing from inside */}
      {CRACKS.map((paths, k) => (
        <Animated.View key={k} pointerEvents="none" style={{ position: 'absolute', opacity: Animated.multiply(lerp(ctx.build, [0.3 + k * 0.22, 0.42 + k * 0.22], [0, 1]), orbOpacity), transform: [{ scale }] }}>
          <Svg width={140} height={140} viewBox="-70 -70 140 140">
            {paths.map((d) => (
              <G key={d}>
                <Path d={d} stroke="#fff3b0" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.45} />
                <Path d={d} stroke="#ffffff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </G>
            ))}
          </Svg>
        </Animated.View>
      ))}
      {/* shockwave */}
      <Animated.View pointerEvents="none" style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: color, opacity: lerp(ctx.climax, [0, 0.1, 1], [0, 0.9, 0]), transform: [{ scale: ring }] }} />
      {/* petals fly out */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2
        const r = 100 + (i % 3) * 22
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute', width: 16, height: 8, borderRadius: 8, backgroundColor: i % 2 ? color : '#ffd5df',
              opacity: lerp(ctx.climax, [0, 0.1, 0.8, 1], [0, 1, 1, 0]),
              transform: [
                { translateX: lerp(ctx.climax, [0, 1], [0, Math.cos(a) * r]) },
                { translateY: lerp(ctx.climax, [0, 1], [0, Math.sin(a) * r]) },
                { rotate: lerp(ctx.climax, [0, 1], [`${(a * 180) / Math.PI}deg`, `${(a * 180) / Math.PI + 220}deg`]) },
                { scale: lerp(ctx.climax, [0, 0.2, 1], [0.2, 1, 0.7]) },
              ],
            }}
          />
        )
      })}
    </View>
  )
}

// ---- variant 3: constellation -----------------------------------------------------------------------------------------

const STARS: [number, number][] = [[-96, 30], [-62, -44], [-14, -86], [40, -52], [92, -70], [78, 10], [24, 52], [-34, 72]]

function StarsVariant({ ctx }: { ctx: Ctx }) {
  const at = (i: number) => 0.06 + i * 0.1
  const gather = (v: number) => lerp(ctx.climax, [0, 0.6], [v, 0])
  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      {/* lines join the stars one by one */}
      {STARS.slice(0, -1).map(([x1, y1], i) => {
        const [x2, y2] = STARS[i + 1]
        const len = Math.hypot(x2 - x1, y2 - y1)
        const angle = Math.atan2(y2 - y1, x2 - x1)
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute', width: len, height: 2, borderRadius: 1, backgroundColor: '#cdd8ff',
              opacity: Animated.multiply(lerp(ctx.build, [at(i + 1), at(i + 1) + 0.08], [0, 0.7]), lerp(ctx.climax, [0, 0.4], [1, 0])),
              transform: [{ translateX: (x1 + x2) / 2 }, { translateY: (y1 + y2) / 2 }, { rotate: `${angle}rad` }],
            }}
          />
        )
      })}
      {STARS.map(([x, y], i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute', width: 12, height: 12, borderRadius: 2, backgroundColor: '#fff6cf',
            opacity: lerp(ctx.build, [at(i), at(i) + 0.07], [0, 1]),
            transform: [
              { translateX: gather(x) },
              { translateY: gather(y) },
              { rotate: '45deg' },
              { scale: Animated.multiply(lerp(ctx.build, [at(i), at(i) + 0.07, at(i) + 0.14], [0, 1.6, 1]), Animated.add(1, Animated.multiply(ctx.osc, 0.25))) },
              { scale: lerp(ctx.climax, [0.45, 0.65, 1], [1, 2.2, 0]) },
            ],
          }}
        />
      ))}
      {/* the gathered light */}
      <Animated.View pointerEvents="none" style={{ position: 'absolute', opacity: lerp(ctx.climax, [0.4, 0.62, 1], [0, 1, 0]), transform: [{ scale: lerp(ctx.climax, [0.4, 1], [0.5, 6]) }] }}>
        <FlashGlow size={60} />
      </Animated.View>
    </View>
  )
}

// ---- variant 4: lantern ---------------------------------------------------------------------------------------------------

function Spark({ i, ctx }: { i: number; ctx: Ctx }) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1800 + (i % 4) * 400, easing: Easing.out(Easing.quad), useNativeDriver: true }))
    const t = setTimeout(() => a.start(), i * 260)
    return () => {
      clearTimeout(t)
      a.stop()
    }
  }, [v, i])
  const x = -46 + ((i * 37) % 92)
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: '#ffd98a',
        opacity: Animated.multiply(v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] }), lerp(ctx.build, [0.15, 0.6], [0, 1])),
        transform: [{ translateX: Animated.add(x, v.interpolate({ inputRange: [0, 1], outputRange: [0, (i % 2 ? 14 : -14)] })) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [30, -90] }) }],
      }}
    />
  )
}

function LanternVariant({ ctx }: { ctx: Ctx }) {
  const rise = Animated.add(lerp(ctx.build, [0, 1], [10, -22]), ctx.slow.interpolate({ inputRange: [0, 1], outputRange: [-5, 5] }))
  const flicker = Animated.add(0.85, Animated.multiply(ctx.osc, 0.15))
  const bodyOpacity = lerp(ctx.climax, [0.35, 0.8], [1, 0])
  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: 9 }, (_, i) => (
        <Spark key={i} i={i} ctx={ctx} />
      ))}
      <Animated.View style={{ alignItems: 'center', transform: [{ translateY: rise }, { scale: Animated.add(lerp(ctx.build, [0, 1], [1, 1.12]), lerp(ctx.climax, [0, 1], [0, 0.35])) }] }}>
        {/* the flame's glow swells with the build */}
        <Animated.View style={{ position: 'absolute', top: 6, opacity: Animated.multiply(Animated.multiply(lerp(ctx.build, [0, 1], [0.25, 1]), flicker), bodyOpacity), transform: [{ scale: lerp(ctx.build, [0, 1], [0.7, 1.5]) }] }}>
          <Svg width={150} height={150} viewBox="-75 -75 150 150">
            <Defs>
              <RadialGradient id="flame" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#fff1b8" stopOpacity={0.95} />
                <Stop offset="0.4" stopColor="#ffb85c" stopOpacity={0.5} />
                <Stop offset="1" stopColor="#ff8a3d" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle r={74} fill="url(#flame)" />
          </Svg>
        </Animated.View>
        <Animated.View style={{ opacity: bodyOpacity }}>
          <Svg width={110} height={150} viewBox="0 0 110 150">
            <Path d="M55 4 L55 18" stroke="#d9b779" strokeWidth={3} strokeLinecap="round" />
            <Rect x={34} y={16} width={42} height={10} rx={4} fill="#c0904a" />
            <Path d="M30 30 Q8 70 30 112 L80 112 Q102 70 80 30 Z" fill="#e8543d" />
            <Path d="M30 30 Q8 70 30 112 L44 112 Q26 70 44 30 Z" fill="#f0735a" opacity={0.7} />
            {[44, 55, 66].map((x) => (
              <Path key={x} d={`M${x} 28 Q${x + (x - 55) * 0.9} 70 ${x} 114`} stroke="#b8402e" strokeWidth={1.6} fill="none" />
            ))}
            <Rect x={32} y={110} width={46} height={10} rx={4} fill="#c0904a" />
            <Path d="M55 120 L55 142" stroke="#d9b779" strokeWidth={2.4} strokeLinecap="round" />
            <Circle cx={55} cy={146} r={4} fill="#ffd166" />
            <Ellipse cx={55} cy={74} rx={12} ry={20} fill="#fff1b8" opacity={0.85} />
          </Svg>
        </Animated.View>
      </Animated.View>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', opacity: lerp(ctx.climax, [0, 0.2, 1], [0, 1, 0]), transform: [{ scale: lerp(ctx.climax, [0, 1], [0.7, 7]) }] }}>
        <FlashGlow size={60} color="#ffe2a0" />
      </Animated.View>
    </View>
  )
}

// ---- the scene ------------------------------------------------------------------------------------------------------------------

/**
 * Full-screen opening. Show it (`visible`) the moment the player taps Open, then hand it `species` as soon as the server
 * answers; it plays the build, waits for the answer, does the climax and shows the reveal. `onClose` is the reveal's button.
 */
export const BoxScene = memo(function BoxScene({
  visible, variant, species, onClose, buttonLabel = 'Nice', timeScale = 1,
}: { visible: boolean; variant: BoxVariant; species: string | null; onClose: () => void; buttonLabel?: string; /** 1 = normal; 0.25 plays in slow motion (the lab uses it to study the animation) */ timeScale?: number }) {
  const still = useReducedMotion()
  const build = useRef(new Animated.Value(0)).current
  const climax = useRef(new Animated.Value(0)).current
  const osc = useOsc(65, still)
  const slow = useOsc(520, still)
  const [phase, setPhase] = useState<'build' | 'climax' | 'reveal'>('build')
  const [built, setBuilt] = useState(false)
  const def = species ? speciesById(species) : undefined
  const final = def ? RARITIES.indexOf(def.rarity) : 0
  const color = RARITY_COLOR[RARITIES[final] as Rarity]

  // start over every time the scene opens
  useEffect(() => {
    if (!visible) return
    setPhase('build')
    setBuilt(false)
    build.setValue(0)
    climax.setValue(0)
    Animated.timing(build, { toValue: 1, duration: still ? 400 : BUILD_MS / timeScale, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(({ finished }) => finished && setBuilt(true))
    return () => build.stopAnimation()
  }, [visible, build, climax, still, timeScale])

  // haptic heartbeat that speeds up as the build goes on, and a stronger tick as each rarity pip lights
  useEffect(() => {
    if (!visible || still) return
    const timers: ReturnType<typeof setTimeout>[] = []
    const N = 13
    for (let i = 1; i <= N; i++) timers.push(setTimeout(buzz.light, (BUILD_MS / timeScale) * (1 - Math.pow(1 - i / N, 1.8))))
    PIP_AT.forEach((p, k) => timers.push(setTimeout(k >= 2 ? buzz.place : buzz.select, (BUILD_MS / timeScale) * Math.sqrt(p))))
    return () => timers.forEach(clearTimeout)
  }, [visible, still, timeScale])

  // climax once the build is done and the server has answered
  useEffect(() => {
    if (!visible || !built || !species || phase !== 'build') return
    setPhase('climax')
    buzz.heavy()
    Animated.timing(climax, { toValue: 1, duration: still ? 200 : CLIMAX_MS / timeScale, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (!finished) return
      buzz.success()
      if (final >= 2) setTimeout(buzz.success, 160)
      setPhase('reveal')
    })
  }, [visible, built, species, phase, climax, final, still, timeScale])

  const skip = () => {
    if (phase !== 'build' || built) return
    build.stopAnimation()
    build.setValue(1)
    setBuilt(true)
  }

  const ctx = useMemo<Ctx>(() => ({ build, climax, osc, slow, final }), [build, climax, osc, slow, final])
  const flashColor = RARITY_COLOR[RARITIES[final] as Rarity]

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(5, 8, 20, 0.985)', alignItems: 'center', justifyContent: 'center' }}>
        {phase !== 'reveal' && (
          <Pressable onPress={skip} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
              <Aura ctx={ctx} still={still} />
              {variant === 'gift' && <GiftVariant ctx={ctx} />}
              {variant === 'seed' && <SeedVariant ctx={ctx} color={color} />}
              {variant === 'stars' && <StarsVariant ctx={ctx} />}
              {variant === 'lantern' && <LanternVariant ctx={ctx} />}
              {phase === 'climax' && !still && (
                <Burst spec={{ key: 1, x: SIZE / 2, y: SIZE / 2, kind: final >= 2 ? 'evolve' : 'plant' }} onDone={() => {}} />
              )}
            </View>
            {/* the rarity "tease": four pips light up in turn, up to the real one */}
            <View style={{ flexDirection: 'row', gap: 14, marginTop: 8, height: 18, alignItems: 'center' }}>
              {RARITIES.map((r, k) => (
                <View key={r} style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                  {k <= final && (
                    <Animated.View
                      style={{
                        width: 14, height: 14, borderRadius: 7, backgroundColor: RARITY_COLOR[r],
                        opacity: lerp(build, [PIP_AT[k], PIP_AT[k] + 0.04], [0, 1]),
                        transform: [{ scale: lerp(build, [PIP_AT[k], PIP_AT[k] + 0.05, PIP_AT[k] + 0.12], [0.4, 1.5, 1]) }],
                      }}
                    />
                  )}
                </View>
              ))}
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 14 }}>
              {built && !species ? 'Almost there…' : phase === 'climax' ? '' : 'Opening your Dream Box…'}
            </Text>
            {phase === 'build' && !built && <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 4 }}>Tap to skip the wait</Text>}
            {/* white-out at the climax, tinted by the real rarity */}
            <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: flashColor, opacity: lerp(climax, [0, 0.12, 0.45], [0, 0.55, 0]) }} />
            <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#ffffff', opacity: lerp(climax, [0, 0.1, 0.5], [0, 0.85, 0]) }} />
          </Pressable>
        )}
        {phase === 'reveal' && species && (
          <View style={{ width: '88%', maxWidth: 360 }}>
            <RevealCard species={species} title={`${RARITY_LABELS[RARITIES[final] as Rarity]} find`} line="Added to your seeds." onClose={onClose} button={buttonLabel} />
          </View>
        )}
      </View>
    </Modal>
  )
})
