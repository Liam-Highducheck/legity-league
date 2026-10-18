import { memo } from 'react'
import { View } from 'react-native'
import Svg, { Ellipse } from 'react-native-svg'
import type { Stage } from '@legity/core/garden/index'
import { useReducedMotion } from './motion'
import { Decal, MasteryRing } from './decals'
import { PlantFigure } from './PlantFigure'
import type { ArtMode } from './plants'
import { WindProvider } from './Sway'

/** One plant on its own little patch of ground, swaying and with its idle effects: for the codex and previews. */
export const LivePlant = memo(function LivePlant({
  species, stage = 3, overgrown = false, size = 120, art = 'soft', mastery = false,
}: { species: string; stage?: Stage; overgrown?: boolean; size?: number; art?: ArtMode; mastery?: boolean }) {
  const still = useReducedMotion()
  const w = size
  const h = size * 1.2
  return (
    <WindProvider still={still}>
      <View style={{ width: w, height: h }}>
        <Svg width={w} height={h} viewBox="0 0 100 120" style={{ position: 'absolute' }}>
          <Ellipse cx={50} cy={112} rx={40} ry={11} fill="#3a4a66" opacity={0.55} />
          <Ellipse cx={50} cy={111} rx={34} ry={8.5} fill="#4b5d7e" opacity={0.6} />
        </Svg>
        {mastery && <MasteryRing w={w} h={h} />}
        {stage === 3 && !overgrown && <Decal species={species} w={w} h={h} />}
        <PlantFigure species={species} stage={stage} overgrown={overgrown} art={art} w={w} h={h} phase={0} still={still} />
      </View>
    </WindProvider>
  )
})
