import { memo } from 'react'
import { View } from 'react-native'
import Svg from 'react-native-svg'
import type { Stage } from '@legity/core/garden/index'
import { plantLayer, plantNodes } from './PlantArt'
import { plantById, type ArtMode } from './plants'
import { RIGS } from './plantRig'
import { SpeciesFx } from './SpeciesFx'
import { STAGE_ART } from './plantStages'
import { Sway, Swing, useSwingDrivers } from './Sway'

/** Plants are drawn a touch smaller in the garden than on the 100x120 canvas, so a full board has room to breathe. */
const GARDEN_SCALE = 0.84

/**
 * One plant as it stands in the garden: it leans in the wind about its roots (never sliding along the ground), with the parts
 * that should stay put drawn apart (a pot) and the parts that should move most swinging on their own (a tree's crown, a
 * willow's strands). Idle effects ride along. See `plantRig.ts`.
 */
export const PlantFigure = memo(function PlantFigure({
  species, stage, overgrown, art, w, h, phase, still,
}: { species: string; stage: Stage; overgrown: boolean; art: ArtMode; w: number; h: number; phase: number; still: boolean }) {
  const def = plantById(species)
  const drivers = useSwingDrivers((def?.period ?? 1) * (overgrown ? 1.3 : 1), phase, still)
  if (!def) return null
  const rig = stage === 3 ? RIGS[species] : undefined
  const stillLayers = rig?.still ?? []
  const swings = rig?.swing ?? []
  const skip = [...stillLayers, ...swings.map((s) => s.layer)]
  const stageStill = stage === 1 || stage === 2 ? STAGE_ART[species]?.still : undefined
  const skipAll = stageStill ? ['pot'] : skip.length ? skip : undefined

  // trunks and stems lean less than thin ones (the plants' own `sway`), young ones less still, neglected ones barely
  const amp = def.sway * (stage === 0 ? 0.6 : stage === 3 ? 1 : 0.8) * (overgrown ? 0.5 : 1)
  const s = def.scale
  const pivotPx = (x: number, y: number): [number, number] => [((50 + (x - 50) * s) / 100) * w, ((112 + (y - 112) * s) / 120) * h]

  return (
    <View style={{ width: w, height: h, transform: [{ translateY: h * (112 / 120 - 0.5) }, { scale: GARDEN_SCALE }, { translateY: -h * (112 / 120 - 0.5) }] }}>
      {(stillLayers.length > 0 || stageStill) && (
        <Svg width={w} height={h} viewBox="0 0 100 120" style={{ position: 'absolute' }}>
          {stageStill ? stageStill(art) : stillLayers.map((id) => <PlantLayer key={id} species={species} id={id} art={art} />)}
        </Svg>
      )}
      <Sway degrees={amp} phase={phase} period={(def.period ?? 1) * (overgrown ? 1.3 : 1)} still={still} width={w} height={h}>
        <Svg width={w} height={h} viewBox="0 0 100 120">
          {plantNodes(species, stage, overgrown, art, skipAll)}
        </Svg>
        {swings.map((p, i) => (
          <Swing key={p.layer} degrees={p.amp * (overgrown ? 0.5 : 1)} driver={drivers[i % 3]} pivot={pivotPx(p.pivot[0], p.pivot[1])} width={w} height={h}>
            <Svg width={w} height={h} viewBox="0 0 100 120">
              <PlantLayer species={species} id={p.layer} art={art} />
            </Svg>
          </Swing>
        ))}
        {stage >= 1 && !overgrown && <SpeciesFx species={species} w={w} h={h} still={still} scale={def.scale} stage={stage} />}
      </Sway>
    </View>
  )
})

const PlantLayer = ({ species, id, art }: { species: string; id: string; art: ArtMode }) => <>{plantLayer(species, id, art)}</>
