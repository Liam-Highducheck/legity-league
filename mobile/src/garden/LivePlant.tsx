import { memo } from 'react'
import { View } from 'react-native'
import Svg, { Ellipse } from 'react-native-svg'
import type { Stage } from '@legity/core/garden/index'
import { useReducedMotion } from './motion'
import { plantNodes } from './PlantArt'
import { plantById, type ArtMode } from './plants'
import { SpeciesFx } from './SpeciesFx'
import { Sway, WindProvider } from './Sway'

/** One plant on its own little patch of ground, swaying and with its idle effects: for the codex and previews. */
export const LivePlant = memo(function LivePlant({
  species, stage = 3, overgrown = false, size = 120, art = 'soft',
}: { species: string; stage?: Stage; overgrown?: boolean; size?: number; art?: ArtMode }) {
  const still = useReducedMotion()
  const def = plantById(species)
  if (!def) return null
  const w = size
  const h = size * 1.2
  const amp = def.sway * (stage === 0 ? 0.6 : stage === 3 ? 1 : 0.8) * (overgrown ? 0.5 : 1)
  return (
    <WindProvider still={still}>
      <View style={{ width: w, height: h }}>
        <Svg width={w} height={h} viewBox="0 0 100 120" style={{ position: 'absolute' }}>
          <Ellipse cx={50} cy={112} rx={40} ry={11} fill="#3a4a66" opacity={0.55} />
          <Ellipse cx={50} cy={111} rx={34} ry={8.5} fill="#4b5d7e" opacity={0.6} />
        </Svg>
        <Sway degrees={amp} phase={0} period={(def.period ?? 1) * (overgrown ? 1.3 : 1)} still={still} width={w} height={h}>
          <Svg width={w} height={h} viewBox="0 0 100 120">
            {plantNodes(species, stage, overgrown, art)}
          </Svg>
          {stage === 3 && !overgrown && <SpeciesFx species={species} w={w} h={h} still={still} />}
        </Sway>
      </View>
    </WindProvider>
  )
})
