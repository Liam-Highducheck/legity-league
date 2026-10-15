// Art playground for the garden (dev only: not linked from the app, open it with /garden-lab). Tap a tile to cycle plants.
import { useState } from 'react'
import { View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Shuffle, Sun, Moon, Trash2, Sprout, CloudFog } from 'lucide-react-native'
import type { Stage } from '@legity/core/garden/index'
import { Button, Card, Screen, T } from '../../components/ui'
import { DAY, DUSK, GardenGrid, type Cells } from '../../garden/GardenGrid'
import { PLANT_IDS } from '../../garden/plants'
import type { ArtMode } from '../../garden/plants'

const STAGES: Stage[] = [0, 1, 2, 3]
const LAYOUT: [number, number][] = [[0, 2], [1, 1], [1, 3], [2, 0], [2, 2], [2, 4], [3, 1], [3, 3], [4, 2], [0, 0], [0, 4], [4, 0], [4, 4]]

export default function GardenLab() {
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
  const fill = () => setCells(Array.from({ length: 25 }, (_, i) => ({ id: `fill${i}`, species: PLANT_IDS[i % PLANT_IDS.length], stage: 3 as Stage })))

  return (
    <Screen>
      <Card>
        <LinearGradient colors={dusk ? ['#141a30', '#2b3158'] : ['#f6faf1', '#dcebdc']} style={{ borderRadius: 16, paddingVertical: 8 }}>
          <GardenGrid cells={shown} art={art} palette={dusk ? DUSK : DAY} selected={sel} onTile={cycle} />
        </LinearGradient>
        <T muted small>Tap a tile to cycle plants. “Fill” puts 25 swaying plants down to check performance.</T>
      </Card>
      <Button title={`Growth stage: ${['seedling', 'young', 'growing', 'mature'][stage]}`} variant="secondary" icon={Sprout} onPress={() => setStage(STAGES[(stage + 1) % 4])} />
      <Button title={over ? 'Overgrown: on' : 'Overgrown: off'} variant="secondary" icon={CloudFog} onPress={() => setOver(!over)} />
      <Button title={art === 'soft' ? 'Style: soft fills' : 'Style: inked outline'} variant="secondary" onPress={() => setArt(art === 'soft' ? 'ink' : 'soft')} />
      <Button title={dusk ? 'Time: dusk' : 'Time: day'} variant="secondary" icon={dusk ? Moon : Sun} onPress={() => setDusk(!dusk)} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Button title="Fill all 25" variant="secondary" icon={Shuffle} onPress={fill} /></View>
        <View style={{ flex: 1 }}><Button title="Clear" variant="secondary" icon={Trash2} onPress={() => setCells(Array(25).fill(null))} /></View>
      </View>
    </Screen>
  )
}
