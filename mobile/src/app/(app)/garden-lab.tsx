// Art-style playground for the garden feature (temporary; reached from Me). Tap a tile to cycle plants.
import { useState } from 'react'
import { View } from 'react-native'
import { Shuffle, Sun, Moon, Trash2 } from 'lucide-react-native'
import { Button, Card, Screen, T } from '../../components/ui'
import { DAY, DUSK, GardenGrid, type Cells } from '../../garden/GardenGrid'
import { PLANT_IDS } from '../../garden/plants'
import type { ArtMode } from '../../garden/plants'

export default function GardenLab() {
  const [cells, setCells] = useState<Cells>(() => {
    const c: Cells = Array(25).fill(null)
    PLANT_IDS.forEach((id, k) => (c[6 + k + (k > 2 ? 2 : 0)] = id))
    return c
  })
  const [art, setArt] = useState<ArtMode>('soft')
  const [dusk, setDusk] = useState(false)
  const [sel, setSel] = useState<number | null>(null)

  const cycle = (i: number) => {
    setSel(i)
    setCells((prev) => {
      const next = [...prev]
      const at = next[i] ? PLANT_IDS.indexOf(next[i]!) : -1
      next[i] = at + 1 >= PLANT_IDS.length ? null : PLANT_IDS[at + 1]
      return next
    })
  }
  const fill = () => setCells(Array.from({ length: 25 }, (_, i) => PLANT_IDS[i % PLANT_IDS.length]))

  return (
    <Screen>
      <Card>
        <View style={{ backgroundColor: dusk ? '#1b2438' : '#eef6ee', borderRadius: 16, paddingVertical: 8 }}>
          <GardenGrid cells={cells} art={art} palette={dusk ? DUSK : DAY} selected={sel} onTile={cycle} />
        </View>
        <T muted small>Tap a tile to cycle plants. “Fill” puts 25 swaying plants down to check performance.</T>
      </Card>
      <Button title={art === 'soft' ? 'Style: soft fills' : 'Style: inked outline'} variant="secondary" onPress={() => setArt(art === 'soft' ? 'ink' : 'soft')} />
      <Button title={dusk ? 'Time: dusk' : 'Time: day'} variant="secondary" icon={dusk ? Moon : Sun} onPress={() => setDusk(!dusk)} />
      <Button title="Fill all 25" variant="secondary" icon={Shuffle} onPress={fill} />
      <Button title="Clear" variant="secondary" icon={Trash2} onPress={() => setCells(Array(25).fill(null))} />
    </Screen>
  )
}
