// Dev only: the real garden scene (full-bleed sky, same board) with no account data. Tap a tile, then step through every plant.
// /garden-sandbox?sky=day|night
import { useState } from 'react'
import { Pressable, View, useWindowDimensions } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ArrowLeft, ChevronLeft, ChevronRight, CloudFog, Eye, EyeOff, Moon, Shuffle, Sprout, Sun, Trash2 } from 'lucide-react-native'
import type { Stage } from '@legity/core/garden/index'
import { speciesById } from '@legity/core/garden/index'
import { T } from '../../components/ui'
import { DAY, DUSK, GardenGrid, type Cells } from '../../garden/GardenGrid'
import { GlassIcon } from '../../garden/GardenChrome'
import { Glass } from '../../garden/Glass'
import { layoutFor } from '../../garden/iso'
import { useReducedMotion } from '../../garden/motion'
import { PLANT_IDS } from '../../garden/plants'
import { RarityChip } from '../../garden/rarity'
import { SceneBackdrop } from '../../garden/scenery'

const STAGE_LABEL = ['Seedling', 'Young', 'Growing', 'Mature']
const empty = (): Cells => Array(25).fill(null)

export default function GardenSandbox() {
  const { sky } = useLocalSearchParams<{ sky?: string }>()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { width, height } = useWindowDimensions()
  const still = useReducedMotion()
  const [dusk, setDusk] = useState(sky !== 'day')
  const [cells, setCells] = useState<Cells>(() => {
    const c = empty()
    c[12] = { id: 's12', species: PLANT_IDS[0], stage: 3 }
    return c
  })
  const [sel, setSel] = useState<number | null>(12)
  const [stage, setStage] = useState<Stage>(3)
  const [over, setOver] = useState(false)
  const [hidden, setHidden] = useState(false)

  const species = sel != null ? cells[sel]?.species : undefined
  const info = species ? speciesById(species) : undefined

  const put = (i: number, id: string | null) =>
    setCells((prev) => {
      const next = [...prev]
      next[i] = id ? { id: `s${i}-${id}`, species: id, stage: 3 } : null
      return next
    })
  const step = (d: number) => {
    if (sel == null) return
    const at = species ? PLANT_IDS.indexOf(species) : d > 0 ? -1 : 0
    put(sel, PLANT_IDS[(at + d + PLANT_IDS.length) % PLANT_IDS.length])
  }
  const fill = () => setCells(Array.from({ length: 25 }, (_, i) => ({ id: `f${i}`, species: PLANT_IDS[i % PLANT_IDS.length], stage: 3 as Stage })))

  const shown: Cells = cells.map((c) => (c ? { ...c, stage, overgrown: over } : null))
  const boardTop = Math.max(insets.top + 62, (height - insets.bottom - layoutFor(width).height) / 2 - 60)

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <SceneBackdrop width={width} height={height} dusk={dusk} still={still} topInset={insets.top + 44} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: boardTop }}>
        <GardenGrid cells={shown} art="soft" palette={dusk ? DUSK : DAY} scenery={false} selected={sel} onTile={setSel} />
      </View>

      <View style={{ position: 'absolute', left: 16, top: insets.top + 8 }}>
        <GlassIcon icon={ArrowLeft} label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/me'))} />
      </View>
      <View style={{ position: 'absolute', right: 16, top: insets.top + 8 }}>
        <GlassIcon icon={hidden ? Eye : EyeOff} label={hidden ? 'Show controls' : 'Hide controls'} onPress={() => setHidden(!hidden)} />
      </View>

      {!hidden && (
        <View style={{ position: 'absolute', left: 12, right: 12, bottom: insets.bottom + 12, gap: 8 }}>
          <Glass radius={22} style={{ padding: 12, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <GlassIcon icon={ChevronLeft} label="Previous plant" onPress={() => step(-1)} />
              <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <T bold style={{ color: '#eef0ff' }}>{info ? info.name : sel == null ? 'Tap a tile' : 'Empty tile'}</T>
                {info && <RarityChip rarity={info.rarity} />}
                <T small style={{ color: '#aab3e6' }}>{species ? `${PLANT_IDS.indexOf(species) + 1} of ${PLANT_IDS.length}` : 'Use the arrows to place a plant'}</T>
              </View>
              <GlassIcon icon={ChevronRight} label="Next plant" onPress={() => step(1)} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Chip icon={Sprout} label={STAGE_LABEL[stage]} onPress={() => setStage(((stage + 1) % 4) as Stage)} />
              <Chip icon={CloudFog} label={over ? 'Overgrown' : 'Healthy'} on={over} onPress={() => setOver(!over)} />
              <Chip icon={dusk ? Moon : Sun} label={dusk ? 'Night' : 'Day'} onPress={() => setDusk(!dusk)} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Chip icon={Shuffle} label="Fill all" onPress={fill} />
              <Chip icon={Trash2} label="Clear tile" onPress={() => sel != null && put(sel, null)} />
              <Chip icon={Trash2} label="Clear all" onPress={() => setCells(empty())} />
            </View>
          </Glass>
        </View>
      )}
    </View>
  )
}

function Chip({ icon: Icon, label, onPress, on }: { icon: typeof Sprout; label: string; onPress: () => void; on?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ flex: 1, marginHorizontal: 3 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 14, borderCurve: 'continuous', backgroundColor: on ? 'rgba(168,150,255,0.35)' : 'rgba(255,255,255,0.08)' }}>
        <Icon size={15} color="#eef0ff" strokeWidth={2} />
        <T small style={{ color: '#eef0ff' }}>{label}</T>
      </View>
    </Pressable>
  )
}
