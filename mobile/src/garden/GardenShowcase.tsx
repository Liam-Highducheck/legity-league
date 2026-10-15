import { useMemo, useState } from 'react'
import { View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { GRID_CELLS, STAGE_NAMES, overgrowth, plantStatus, type GardenNight, type PlantRow } from '@legity/core/garden/index'
import { Chip, Row, T } from '../components/ui'
import { useColors } from '../lib/theme'
import { DUSK, GardenGrid, type Cells } from './GardenGrid'
import { RarityChip } from './rarity'

/**
 * A read-only garden, for profiles. Growth and the overgrown state are worked out from the owner's nights, the same
 * as in their own garden, so what friends see matches what the owner sees.
 */
export function GardenShowcase({ plants, nights, today, empty }: { plants: PlantRow[]; nights: GardenNight[]; today: string; empty: string }) {
  const c = useColors()
  const [selected, setSelected] = useState<number | null>(null)
  const over = useMemo(() => overgrowth(nights, today), [nights, today])
  const statuses = useMemo(() => new Map(plants.map((p) => [p.id, plantStatus(p, nights)])), [plants, nights])
  const cells = useMemo<Cells>(() => {
    const out: Cells = Array(GRID_CELLS).fill(null)
    for (const p of plants) {
      const st = statuses.get(p.id)
      if (p.cell == null || !st) continue
      out[p.cell] = { id: p.id, species: p.species, stage: st.stage, overgrown: over.overgrown }
    }
    return out
  }, [plants, statuses, over.overgrown])

  const planted = plants.filter((p) => p.cell != null)
  if (planted.length === 0) return <T muted small>{empty}</T>

  const species = new Set(planted.map((p) => p.species)).size
  const evolved = planted.filter((p) => p.evolved_from).length
  const grown = planted.filter((p) => statuses.get(p.id)?.mature).length
  const sel = selected != null ? plants.find((p) => p.cell === selected) : undefined
  const selStatus = sel ? statuses.get(sel.id) : null

  return (
    <View style={{ gap: 10 }}>
      <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: c.line }}>
        <LinearGradient colors={['#141a30', '#2b3158']} style={{ paddingVertical: 8 }}>
          <GardenGrid cells={cells} art="soft" palette={DUSK} selected={selected} onTile={(i) => setSelected(i === selected ? null : i)} />
        </LinearGradient>
      </View>
      {selStatus ? (
        <Row gap={10} style={{ flexWrap: 'wrap' }}>
          <T bold>{selStatus.species.name}</T>
          <RarityChip rarity={selStatus.species.rarity} />
          <T muted small>{selStatus.mature ? (sel?.evolved_from ? 'Evolved' : 'Fully grown') : STAGE_NAMES[selStatus.stage]}</T>
        </Row>
      ) : (
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          <Chip><T small bold>{planted.length}</T><T small muted>plants</T></Chip>
          <Chip><T small bold>{species}</T><T small muted>species</T></Chip>
          <Chip><T small bold>{grown}</T><T small muted>fully grown</T></Chip>
          {evolved > 0 && <Chip><T small bold>{evolved}</T><T small muted>evolved</T></Chip>}
          {over.overgrown && <Chip><T small>Overgrown</T></Chip>}
        </Row>
      )}
    </View>
  )
}
