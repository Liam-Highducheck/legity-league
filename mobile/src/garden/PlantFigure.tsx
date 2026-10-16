import { memo } from 'react'
import { View } from 'react-native'
import Svg, { ClipPath, Defs, G, Path, Rect } from 'react-native-svg'
import type { Stage } from '@legity/core/garden/index'
import { plantNodes } from './PlantArt'
import { PARTS, type PartSpec } from './plantParts'
import { plantById, type ArtMode } from './plants'
import { SpeciesFx } from './SpeciesFx'
import { Swing } from './Sway'

/**
 * One plant drawn for the garden: the whole picture, plus (for mature plants that have them) parts that swing on their own,
 * plus its idle effects. Without parts it is a single drawing, exactly like the thumbnails.
 */
export const PlantFigure = memo(function PlantFigure({
  species, stage, overgrown, art, w, h, still,
}: { species: string; stage: Stage; overgrown: boolean; art: ArtMode; w: number; h: number; still: boolean }) {
  const def = plantById(species)
  const parts: PartSpec[] | undefined = stage === 3 && !still ? PARTS[species] : undefined
  const fx = stage === 3 && !overgrown ? <SpeciesFx species={species} w={w} h={h} still={still} /> : null

  if (!def || !parts) {
    return (
      <View style={{ width: w, height: h }}>
        <Svg width={w} height={h} viewBox="0 0 100 120">
          {plantNodes(species, stage, overgrown, art)}
        </Svg>
        {fx}
      </View>
    )
  }

  const layers = parts.flatMap((p) => (p.layer ? [p.layer] : []))
  const regions = parts.filter((p) => p.region)
  // everything outside the cut-out regions stays put; each region is drawn again inside its own swinging layer
  const outside = `M0 0H100V120H0Z ${regions.map((p) => { const [x, y, rw, rh] = p.region!; return `M${x} ${y}h${rw}v${rh}h${-rw}Z` }).join(' ')}`
  const amp = overgrown ? 0.5 : 1
  return (
    <View style={{ width: w, height: h }}>
      <Svg width={w} height={h} viewBox="0 0 100 120" style={{ position: 'absolute' }}>
        {regions.length > 0 && (
          <Defs>
            <ClipPath id="outside">
              <Path d={outside} clipRule="evenodd" />
            </ClipPath>
          </Defs>
        )}
        <G clipPath={regions.length > 0 ? 'url(#outside)' : undefined}>{plantNodes(species, stage, overgrown, art, layers)}</G>
      </Svg>
      {parts.map((p, i) => (
        <Swing key={i} degrees={p.amp * amp} period={p.period} phase={p.phase} pivot={[p.pivot[0], p.pivot[1]]} width={w} height={h}>
          <Svg width={w} height={h} viewBox="0 0 100 120">
            {p.region ? (
              <>
                <Defs>
                  <ClipPath id={`part${i}`}>
                    <Rect x={p.region[0]} y={p.region[1]} width={p.region[2]} height={p.region[3]} />
                  </ClipPath>
                </Defs>
                <G clipPath={`url(#part${i})`}>{plantNodes(species, stage, overgrown, art, layers)}</G>
              </>
            ) : (
              def.layers?.[p.layer!]?.(art)
            )}
          </Svg>
        </Swing>
      ))}
      {fx}
    </View>
  )
})
