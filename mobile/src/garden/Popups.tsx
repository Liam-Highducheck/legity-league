import { useEffect, useMemo, useRef } from 'react'
import { Animated, Easing, View } from 'react-native'
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'
import { Coins, Gift, Sparkles, Trophy } from 'lucide-react-native'
import { ACHIEVEMENTS, speciesById, speciesName } from '@legity/core/garden/index'
import type { Haul } from '@legity/data/garden'
import { Button, Popup, Row, T } from '../components/ui'
import { useColors } from '../lib/theme'
import { PlantThumb } from './PlantArt'
import { Burst } from './Burst'
import { useReducedMotion } from './motion'
import { RARITY_COLOR, RarityChip, SleepyBadge } from './rarity'

/** The content of a reveal: the plant over a rarity-coloured glow, its name, rarity and blurb. Shared by evolutions and box drops. */
export function RevealCard({ species, title, line, onClose, button = 'Nice' }: { species: string; title: string; line: string; onClose: () => void; button?: string }) {
  const s = useRef(new Animated.Value(0.6)).current
  useEffect(() => {
    s.setValue(0.6)
    Animated.spring(s, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }).start()
  }, [species, s])
  const def = speciesById(species)
  const still = useReducedMotion()
  // A fresh key per reveal so the particles replay each time a new plant appears.
  const burstKey = useMemo(() => Date.now(), [species]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!def) return null
  return (
    <View style={{ alignItems: 'center', gap: 10 }}>
      <T muted small bold style={{ textTransform: 'uppercase', letterSpacing: 1 }}>{title}</T>
      <View style={{ width: 200, height: 170, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={200} height={170} style={{ position: 'absolute' }}>
          <Defs>
            <RadialGradient id="revealGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={RARITY_COLOR[def.rarity]} stopOpacity={0.45} />
              <Stop offset="1" stopColor={RARITY_COLOR[def.rarity]} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={100} cy={88} r={92} fill="url(#revealGlow)" />
        </Svg>
        <Animated.View style={{ transform: [{ scale: s }] }}>
          <PlantThumb species={def.id} size={132} />
        </Animated.View>
        {!still && <Burst key={burstKey} spec={{ key: burstKey, x: 100, y: 96, kind: def.rarity === 'common' || def.rarity === 'uncommon' ? 'plant' : 'evolve' }} onDone={() => {}} />}
      </View>
      <T bold style={{ fontSize: 20 }}>{def.name}</T>
      <Row gap={10}>
        <RarityChip rarity={def.rarity} />
        {def.sleepy && <SleepyBadge />}
      </Row>
      <T muted small style={{ textAlign: 'center' }}>{def.blurb}</T>
      <T small style={{ textAlign: 'center' }}>{line}</T>
      <Button title={button} onPress={onClose} style={{ alignSelf: 'stretch' }} />
    </View>
  )
}

/** A plant appearing in a popup: an evolution. */
export function RevealPopup({ species, title, line, onClose }: { species: string | null; title: string; line: string; onClose: () => void }) {
  return (
    <Popup visible={!!species} onClose={onClose}>
      {species && <RevealCard species={species} title={title} line={line} onClose={onClose} />}
    </Popup>
  )
}

/** Shakes while a box "opens", just long enough to build a little anticipation. */
export function ShakingBox({ active }: { active: boolean }) {
  const c = useColors()
  const r = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (!active) return
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(r, { toValue: 1, duration: 90, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(r, { toValue: -1, duration: 180, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(r, { toValue: 0, duration: 90, easing: Easing.linear, useNativeDriver: true }),
      ]),
    )
    a.start()
    return () => a.stop()
  }, [active, r])
  const rotate = r.interpolate({ inputRange: [-1, 1], outputRange: ['-12deg', '12deg'] })
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Gift size={44} color={c.accent} strokeWidth={1.6} />
    </Animated.View>
  )
}

/** What the sync just paid out: coins for new nights, boxes, finished achievements and their seeds. */
export function HaulPopup({ haul, onClose }: { haul: Haul | null; onClose: () => void }) {
  const c = useColors()
  const done = haul ? haul.achievements.map((id) => ACHIEVEMENTS.find((a) => a.id === id)).filter((a) => !!a) : []
  return (
    <Popup visible={!!haul} onClose={onClose}>
      {haul && (
        <View style={{ gap: 12 }}>
          <T bold style={{ fontSize: 20 }}>{haul.nights > 0 ? 'Fresh from your nights' : 'Rewards'}</T>
          {haul.coins > 0 && (
            <Row gap={10}>
              <Coins size={20} color={c.gold} />
              <T><T bold>+{haul.coins} coins</T>{haul.nights > 0 ? ` from ${haul.nights} night${haul.nights === 1 ? '' : 's'}` : ''}</T>
            </Row>
          )}
          {haul.boxes > 0 && (
            <Row gap={10}>
              <Gift size={20} color={c.accent} />
              <T><T bold>+{haul.boxes} Dream Box{haul.boxes === 1 ? '' : 'es'}</T></T>
            </Row>
          )}
          {done.length > 0 && (
            <View style={{ gap: 6 }}>
              <Row gap={10}>
                <Trophy size={20} color={c.gold} />
                <T bold>{done.length === 1 ? 'Goal reached' : `${done.length} goals reached`}</T>
              </Row>
              {done.slice(0, 8).map((a) => (
                <T key={a!.id} muted small>· {a!.name}</T>
              ))}
              {done.length > 8 && <T muted small>…and {done.length - 8} more</T>}
            </View>
          )}
          {haul.seeds.length > 0 && (
            <View style={{ gap: 6 }}>
              <Row gap={10}>
                <Sparkles size={20} color={c.accent} />
                <T bold>New seeds</T>
              </Row>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {haul.seeds.map((id, i) => (
                  <View key={id + i} style={{ alignItems: 'center', width: 70 }}>
                    <PlantThumb species={id} size={44} />
                    <T muted small numberOfLines={1}>{speciesName(id)}</T>
                  </View>
                ))}
              </View>
            </View>
          )}
          <Button title="Collect" onPress={onClose} />
        </View>
      )}
    </Popup>
  )
}
