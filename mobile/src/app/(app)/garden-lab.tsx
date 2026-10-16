// Art playground for the garden (dev only: not linked from the app, open it with /garden-lab). Tap a tile to cycle plants.
import { useEffect, useState } from 'react'
import { useLocalSearchParams } from 'expo-router'
import { View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Shuffle, Sun, Moon, Trash2, Sprout, CloudFog } from 'lucide-react-native'
import { achievementStatuses, gardenStats, plantStatus, type GardenNight, type PlantRow, type Stage } from '@legity/core/garden/index'
import { GoalsContent } from '../../garden/GardenSheets'
import { SkyThemed } from '../../garden/skyTheme'
import { PlantCard } from '../../garden/GardenChrome'
import { Button, Card, Screen, T } from '../../components/ui'
import { DAY, DUSK, GardenGrid, skyGradient, type Cells } from '../../garden/GardenGrid'
import { PLANT_IDS } from '../../garden/plants'
import type { ArtMode } from '../../garden/plants'

/** JS-thread frames per second (requestAnimationFrame ticks). The sway and fireflies run natively, so this only drops if JS is busy. */
function useJsFps() {
  const [fps, setFps] = useState(0)
  useEffect(() => {
    let frames = 0
    let last = performance.now()
    let raf = 0
    const tick = () => {
      frames++
      const now = performance.now()
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)))
        frames = 0
        last = now
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return fps
}

// A sprout that finished growing and has met its evolution goal, to eyeball the plant card.
const MOCK_NIGHTS: GardenNight[] = Array.from({ length: 12 }, (_, i) => ({
  night_date: `2026-10-${String(i + 1).padStart(2, '0')}`, duration_min: 480, restorative_min: 150, deep_min: 70, rem_min: 90,
  awake_min: 20, wake_count: 1, sleep_start: null, timezone: 'UTC', sleep_score: 82,
}))
const MOCK_PLANT: PlantRow = { id: 'mock', species: 'sprout', cell: 0, planted_on: '2026-09-30', evolved_from: null, evolved_on: null }

const STAGES: Stage[] = [0, 1, 2, 3]
const LAYOUT: [number, number][] = [[0, 2], [1, 1], [1, 3], [2, 0], [2, 2], [2, 4], [3, 1], [3, 3], [4, 2], [0, 0], [0, 4], [4, 0], [4, 4]]

export default function GardenLab() {
  // /garden-lab?goals=1 shows the goals list with a few goals finished and waiting to be collected
  const { goals } = useLocalSearchParams<{ goals?: string }>()
  if (goals) {
    return (
      <Screen>
        <SkyThemed>
          <GoalsContent statuses={achievementStatuses(MOCK_NIGHTS, gardenStats([MOCK_PLANT], MOCK_NIGHTS, 0))} claimed={new Set()} collecting={false} onCollect={() => {}} />
        </SkyThemed>
      </Screen>
    )
  }
  return <GardenLabBody />
}

function GardenLabBody() {
  const [cells, setCells] = useState<Cells>(() => {
    const c: Cells = Array(25).fill(null)
    LAYOUT.forEach(([r, col], k) => (c[r * 5 + col] = { id: `lab${k}`, species: PLANT_IDS[k % PLANT_IDS.length], stage: 3 }))
    return c
  })
  const [art, setArt] = useState<ArtMode>('soft')
  const [dusk, setDusk] = useState(true)
  const [over, setOver] = useState(false)
  const [stage, setStage] = useState<Stage>(3)
  const [sel, setSel] = useState<number | null>(null)
  const [fillMs, setFillMs] = useState<number | null>(null)
  const fps = useJsFps()

  const cycle = (i: number) => {
    setSel(i)
    setCells((prev) => {
      const next = [...prev]
      const at = next[i] ? PLANT_IDS.indexOf(next[i]!.species) : -1
      next[i] = at + 1 >= PLANT_IDS.length ? null : { id: `lab-${i}-${at + 1}`, species: PLANT_IDS[at + 1], stage: 3 }
      return next
    })
  }
  // The stage and overgrown switches apply to every plant at once so the art is easy to compare.
  const shown: Cells = cells.map((c) => (c ? { ...c, stage, overgrown: over } : null))
  const fill = () => {
    const t0 = performance.now()
    setCells(Array.from({ length: 25 }, (_, i) => ({ id: `fill${i}`, species: PLANT_IDS[i % PLANT_IDS.length], stage: 3 as Stage })))
    // two frames later the new board has been committed and drawn
    requestAnimationFrame(() => requestAnimationFrame(() => setFillMs(Math.round(performance.now() - t0))))
  }

  return (
    <Screen>
      <Card>
        <LinearGradient colors={skyGradient(dusk ? DUSK : DAY)} style={{ borderRadius: 16, paddingVertical: 8 }}>
          <GardenGrid cells={shown} art={art} palette={dusk ? DUSK : DAY} selected={sel} onTile={cycle} />
        </LinearGradient>
        <T muted small>Tap a tile to cycle plants. “Fill” puts 25 swaying plants down to check performance.</T>
        <T small>JS frames: {fps} fps{fillMs != null ? ` · 25 plants drawn in ${fillMs} ms` : ''}</T>
      </Card>
      <Button title={dusk ? 'Time: night' : 'Time: day'} variant="secondary" icon={dusk ? Moon : Sun} onPress={() => setDusk(!dusk)} />
      <Button title={`Growth stage: ${['seedling', 'young', 'growing', 'mature'][stage]}`} variant="secondary" icon={Sprout} onPress={() => setStage(STAGES[(stage + 1) % 4])} />
      <Button title={over ? 'Overgrown: on' : 'Overgrown: off'} variant="secondary" icon={CloudFog} onPress={() => setOver(!over)} />
      <Button title={art === 'soft' ? 'Style: soft fills' : 'Style: inked outline'} variant="secondary" onPress={() => setArt(art === 'soft' ? 'ink' : 'soft')} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Button title="Fill all 25" variant="secondary" icon={Shuffle} onPress={fill} /></View>
        <View style={{ flex: 1 }}><Button title="Clear" variant="secondary" icon={Trash2} onPress={() => setCells(Array(25).fill(null))} /></View>
      </View>
      <PlantCard plant={MOCK_PLANT} status={plantStatus(MOCK_PLANT, MOCK_NIGHTS)!} overgrown={over} busy={false} onMove={() => {}} onPickUp={() => {}} onEvolve={() => {}} onClose={() => {}} />
    </Screen>
  )
}
