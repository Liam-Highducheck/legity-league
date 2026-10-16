// Draws one plant at a growth stage, optionally overgrown, on the shared 100x120 canvas (roots at 50,112).
import { memo } from 'react'
import Svg, { Ellipse, G, Path } from 'react-native-svg'
import type { Stage } from '@legity/core/garden/index'
import { plantById, type ArtMode } from './plants'
import { STAGE_ART } from './plantStages'

/** How large the finished art is drawn at each stage (stage 0 is its own seedling drawing). */
const STAGE_SCALE: Record<Stage, number> = { 0: 1, 1: 0.58, 2: 0.8, 3: 1 }

function Seedling() {
  return (
    <>
      <Ellipse cx={51} cy={112} rx={20} ry={6} fill="#1c2a30" opacity={0.12} />
      <Ellipse cx={50} cy={111} rx={11} ry={3.4} fill="#7a6a58" opacity={0.6} />
      <Ellipse cx={50} cy={108.5} rx={5.5} ry={3.6} fill="#a98763" />
      <Ellipse cx={48.6} cy={107.4} rx={2} ry={1.2} fill="rgba(255,255,255,0.35)" />
      <Path d="M50 106 C50 100 50 96 50 92" stroke="#6aa883" strokeWidth={2.4} strokeLinecap="round" fill="none" />
      <Path d="M50 94 C43 94 37 90 35 83 C43 83 49 87 50 94Z" fill="#86c19a" />
      <Path d="M50 92 C57 92 63 88 65 81 C57 81 51 85 50 92Z" fill="#5f9f78" />
      <Path d="M50 92 C56 90 61 86 63 82 C61 88 56 92 50 92Z" fill="rgba(28,64,70,0.22)" />
    </>
  )
}

/** Weeds and thorny vines drawn over a neglected plant. */
function Overgrowth() {
  const vine = '#5d6b34'
  const leaf = '#7f8a42'
  return (
    <G>
      {[-20, -12, 14, 22].map((dx, i) => (
        <Path key={dx} d={`M${50 + dx} 112 C${50 + dx - 3} ${104 - i} ${50 + dx + 2} ${98 - i * 2} ${50 + dx + (i % 2 ? 5 : -5)} ${90 - i * 3}`} stroke={i % 2 ? leaf : vine} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      ))}
      <Path d="M30 112 C34 96 62 92 56 76 C52 64 70 62 66 44" stroke={vine} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      <Path d="M70 112 C68 98 42 88 48 72 C52 60 36 54 40 40" stroke={vine} strokeWidth={2.2} strokeLinecap="round" fill="none" />
      {[[40, 96], [58, 86], [50, 70], [60, 56], [44, 80], [38, 58]].map(([x, y], i) => (
        <G key={i}>
          <Ellipse cx={x} cy={y} rx={4.4} ry={2.2} rotation={i % 2 ? 35 : -35} origin={`${x}, ${y}`} fill={leaf} />
          <Path d={`M${x + 3} ${y + 2} l2 3 l-4 -1Z`} fill="#4a5530" />
        </G>
      ))}
      <Ellipse cx={50} cy={110} rx={22} ry={5} fill="#5d6b34" opacity={0.25} />
    </G>
  )
}

export function plantNodes(species: string, stage: Stage, overgrown: boolean, art: ArtMode, skip?: string[]) {
  const def = plantById(species)
  if (!def) return null
  if (stage === 0) {
    return (
      <>
        <Seedling />
        {overgrown && <Overgrowth />}
      </>
    )
  }
  // Plants grown from seed have their own young and growing drawings (buds, slim trunks, a single cap...); the rest scale up.
  const own = stage === 1 || stage === 2 ? STAGE_ART[species] : undefined
  const s = own ? (stage === 1 ? 0.7 : 0.88) : def.scale * STAGE_SCALE[stage]
  return (
    <>
      {own ? (
        <G opacity={overgrown ? 0.82 : 1}>{(stage === 1 ? own.young : own.growing)(art)}</G>
      ) : (
        <G opacity={overgrown ? 0.82 : 1} transform={`translate(50 112) scale(${s}) translate(-50 -112)`}>{def.draw(art, skip)}</G>
      )}
      {overgrown && (
        // vines scale with the plant so a small flower isn't buried under a tree-sized tangle
        <G transform={`translate(50 112) scale(${Math.max(0.62, Math.min(1, s * 1.05))}) translate(-50 -112)`}>
          <Overgrowth />
        </G>
      )}
    </>
  )
}

/** A static (non-swaying) picture of a plant, for lists, cards and the shop. */
export const PlantThumb = memo(function PlantThumb({
  species, stage = 3, overgrown = false, size = 56, art = 'soft',
}: { species: string; stage?: Stage; overgrown?: boolean; size?: number; art?: ArtMode }) {
  return (
    // Cropped tighter than the board canvas: thumbnails should fill their box, not float in empty margin.
    <Svg width={size} height={size * 1.3} viewBox="10 12 80 104">
      {plantNodes(species, stage, overgrown, art)}
    </Svg>
  )
})
