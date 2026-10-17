import { memo } from 'react'
import { View } from 'react-native'
import Svg from 'react-native-svg'
import type { Stage } from '@legity/core/garden/index'
import { plantNodes } from './PlantArt'
import type { ArtMode } from './plants'
import { SpeciesFx } from './SpeciesFx'

/** One plant drawn for the garden: the picture plus its idle effects. The whole plant sways as one (see `Sway`). */
export const PlantFigure = memo(function PlantFigure({
  species, stage, overgrown, art, w, h, still,
}: { species: string; stage: Stage; overgrown: boolean; art: ArtMode; w: number; h: number; still: boolean }) {
  return (
    <View style={{ width: w, height: h }}>
      <Svg width={w} height={h} viewBox="0 0 100 120">
        {plantNodes(species, stage, overgrown, art)}
      </Svg>
      {stage === 3 && !overgrown && <SpeciesFx species={species} w={w} h={h} still={still} />}
    </View>
  )
})
