import { memo } from 'react'
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg'

// Things that settle on the ground around a fully grown plant: fallen petals, a pool of light, spores, a few blades of grass.
// Drawn once, under the plant and outside its sway, in the same 100x120 canvas (roots at 50,112).
type Parts = React.ReactNode

const petals = (color: string, spots: [number, number, number][]): Parts =>
  spots.map(([x, y, r], i) => <Ellipse key={i} cx={x} cy={y} rx={2.6} ry={1.4} fill={color} opacity={0.85} transform={`rotate(${r} ${x} ${y})`} />)
const pool = (color: string, rx = 30, o = 0.22): Parts => (
  <>
    <Ellipse cx={50} cy={111} rx={rx} ry={rx * 0.28} fill={color} opacity={o} />
    <Ellipse cx={50} cy={111} rx={rx * 0.6} ry={rx * 0.17} fill={color} opacity={o * 1.2} />
  </>
)
const dots = (color: string, spots: [number, number, number][], o = 0.8): Parts => spots.map(([x, y, r], i) => <Circle key={i} cx={x} cy={y} r={r} fill={color} opacity={o} />)
const blades = (color: string, xs: number[]): Parts =>
  xs.map((x, i) => <Path key={i} d={`M${x} 113 Q${x + (i % 2 ? 2 : -2)} 108 ${x + (i % 2 ? 3 : -3)} 105.5`} stroke={color} strokeWidth={1.2} strokeLinecap="round" fill="none" opacity={0.7} />)

const FALLEN: [number, number, number][] = [[28, 112, 20], [70, 114, 160], [38, 116, 80], [64, 109, 40]]

const DECALS: Record<string, () => Parts> = {
  sakura: () => petals('#f7c1d4', [...FALLEN, [22, 114, 120], [78, 111, 10], [48, 117, 60]]),
  wisteria: () => petals('#b9a2e8', FALLEN),
  hydrangea: () => petals('#9fb4f0', FALLEN.slice(0, 3)),
  poppy: () => petals('#f06a58', FALLEN.slice(0, 3)),
  tulip: () => petals('#f58aa0', FALLEN.slice(0, 2)),
  bluebell: () => petals('#8fa6f0', FALLEN.slice(0, 3)),
  willow: () => petals('#a8c98a', FALLEN),
  bonsai: () => petals('#8dbb78', FALLEN.slice(0, 3)),
  sapling: () => petals('#9bc47f', FALLEN.slice(0, 3)),
  pine: () => dots('#6f9c70', [[30, 113, 1.2], [68, 114, 1.2], [42, 117, 1]]),
  frostpine: () => dots('#e6f3ff', [[28, 112, 1.4], [72, 113, 1.4], [40, 117, 1.1], [60, 118, 1.1]], 0.9),
  moonlily: () => pool('#bfd8ff'),
  moonlotus: () => pool('#cde0ff', 34),
  moonwood: () => pool('#b6d4ff', 34, 0.2),
  moonfern: () => pool('#bfe0ff', 26, 0.16),
  glimmerbud: () => pool('#ffe9a8', 24),
  starblossom: () => pool('#ffe08a', 28),
  lotus: () => pool('#ffd2e4', 30, 0.2),
  drowsycap: () => dots('#f5e6d0', [[32, 114, 1.2], [66, 115, 1.2], [44, 118, 1]], 0.8),
  dreamcap: () => pool('#d9b8ff', 28),
  dreamlavender: () => pool('#c8b2ff', 26, 0.18),
  dreamcatcher: () => pool('#ffd6ec', 30, 0.16),
  orchid: () => pool('#f2c8ff', 24, 0.18),
  crystalrose: () => dots('#ffd6ec', [[30, 113, 1.4], [70, 112, 1.6], [42, 117, 1.1], [60, 117, 1.2]], 0.9),
  aurora: () => pool('#8dffd0', 38, 0.2),
  celestial: () => (
    <>
      {pool('#ffe9a8', 38, 0.22)}
      {dots('#fff4c8', [[26, 112, 1.2], [74, 112, 1.2], [38, 117, 1], [62, 117, 1], [50, 119, 1.2]], 0.9)}
    </>
  ),
  luckyclover: () => dots('#7ed39a', [[28, 113, 1.6], [72, 112, 1.6], [40, 117, 1.3]], 0.7),
  wishdandelion: () => dots('#ffffff', [[30, 112, 1.4], [70, 113, 1.4], [46, 118, 1.1]], 0.85),
  dandelion: () => dots('#ffffff', [[30, 113, 1.2], [68, 114, 1.2]], 0.75),
  clover: () => blades('#6aa86e', [26, 74]),
  sprout: () => blades('#7ab87a', [28, 72]),
  chamomile: () => blades('#7ab87a', [27, 73]),
  goldchamomile: () => blades('#8cc07a', [27, 73]),
  reed: () => blades('#8cb878', [24, 76]),
  lavender: () => blades('#8aa86e', [27, 73]),
  fern: () => blades('#5f9a6a', [25, 75]),
  bamboo: () => blades('#9cc27a', [24, 76, 30]),
  succulent: () => dots('#b8a089', [[30, 114, 1.4], [70, 113, 1.2]], 0.6),
  bloomsucc: () => dots('#b8a089', [[30, 114, 1.4], [70, 113, 1.2]], 0.6),
  cactus: () => dots('#c7a77c', [[28, 114, 1.3], [72, 113, 1.1], [60, 118, 1]], 0.6),
  twilighttulip: () => petals('#a68ae8', FALLEN.slice(0, 2)),
  threadvine: () => petals('#9ccf8a', FALLEN.slice(0, 3)),
}

export const Decal = memo(function Decal({ species, w, h }: { species: string; w: number; h: number }) {
  const draw = DECALS[species]
  if (!draw) return null
  return (
    <Svg width={w} height={h} viewBox="0 0 100 120" style={{ position: 'absolute' }} pointerEvents="none">
      <G>{draw()}</G>
    </Svg>
  )
})

/** Lab-only "mastery" look under test: a gilded ring on the ground with a few drifting motes of gold. */
export const MasteryRing = memo(function MasteryRing({ w, h }: { w: number; h: number }) {
  return (
    <Svg width={w} height={h} viewBox="0 0 100 120" style={{ position: 'absolute' }} pointerEvents="none">
      <Ellipse cx={50} cy={111} rx={40} ry={11} fill="#ffe08a" opacity={0.16} />
      <Ellipse cx={50} cy={111} rx={37} ry={10} fill="none" stroke="#ffd36a" strokeWidth={1.2} opacity={0.85} />
      <Ellipse cx={50} cy={111} rx={31} ry={8} fill="none" stroke="#fff1b8" strokeWidth={0.7} opacity={0.6} strokeDasharray="2 4" />
      {dots('#fff1b8', [[16, 108, 1.2], [84, 109, 1.2], [30, 100, 1], [72, 98, 1]], 0.9)}
    </Svg>
  )
})
