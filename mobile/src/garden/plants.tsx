// Prototype plant art: flat, soft shapes on a 100x120 canvas with the roots at (50, 112).
// `mode` switches between plain soft fills and fills with a dark ink outline so we can compare looks.
import type { ReactNode } from 'react'
import { Circle, Defs, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg'

export type ArtMode = 'soft' | 'ink'

export interface PlantDef {
  id: string
  name: string
  /** sway amplitude in degrees; taller/lighter plants move more */
  sway: number
  /** size relative to its tile; tall plants shrink so they stay inside it */
  scale: number
  draw: (m: ArtMode) => ReactNode
}

const INK = '#2f3d38'
const LEAF = '#86c19a'
const LEAF_D = '#5f9f78'
const LEAF_L = '#a8d6b5'
const STEM = '#6aa883'
// Soft overlays: a cool shadow on the side away from the light (right/bottom) and a highlight on the lit side.
const SH = 'rgba(28, 64, 70, 0.22)'
const HI = 'rgba(255, 255, 255, 0.3)'
const MID = 'rgba(255, 255, 255, 0.35)'

const line = (m: ArtMode) => (m === 'ink' ? { stroke: INK, strokeWidth: 1.7, strokeLinejoin: 'round' as const } : {})
const stem = (m: ArtMode) => ({ stroke: m === 'ink' ? INK : STEM, strokeWidth: m === 'ink' ? 3.4 : 3, strokeLinecap: 'round' as const, fill: 'none' })

const Mound = ({ m }: { m: ArtMode }) => (
  <>
    <Ellipse cx={52} cy={112} rx={22} ry={7} fill="#1c2a30" opacity={0.12} />
    <Ellipse cx={51} cy={111.5} rx={16} ry={5} fill="#1c2a30" opacity={0.16} />
    <Ellipse cx={50} cy={111} rx={9} ry={3} fill="#7a6a58" opacity={0.5} {...(m === 'ink' ? { stroke: INK, strokeWidth: 1 } : {})} />
  </>
)

export const PLANTS: PlantDef[] = [
  {
    id: 'sprout',
    name: 'Sprout',
    scale: 1.05,
    sway: 3.5,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Path d="M50 111 C50 100 50 94 50 88" {...stem(m)} />
        <Path d="M50 90 C38 90 28 82 26 70 C40 69 49 77 50 90Z" fill={LEAF} {...line(m)} />
        <Path d="M50 90 C44 86 38 80 31 72 C40 72 48 78 50 90Z" fill={LEAF_L} />
        <Path d="M50 90 C42 88 34 82 28 72" stroke={MID} strokeWidth={1} fill="none" strokeLinecap="round" />
        <Path d="M50 86 C62 86 72 78 74 66 C60 65 51 73 50 86Z" fill={LEAF_D} {...line(m)} />
        <Path d="M50 86 C60 84 68 78 72 68 C70 78 62 86 50 86Z" fill={SH} />
        <Path d="M50 86 C58 82 64 76 70 68" stroke={MID} strokeWidth={1} fill="none" strokeLinecap="round" />
      </>
    ),
  },
  {
    id: 'fern',
    name: 'Soft fern',
    scale: 0.82,
    sway: 3,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Path d="M50 111 C48 90 52 64 62 40" {...stem(m)} />
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const t = i / 5
          const x = 50 + 12 * t * 1.0 + 0
          const y = 100 - t * 56
          const s = 1 - t * 0.55
          return (
            <G key={i}>
              <Ellipse cx={x - 9 * s} cy={y} rx={10 * s} ry={4.2 * s} rotation={-28} origin={`${x - 9 * s}, ${y}`} fill={i % 2 ? LEAF : LEAF_D} {...line(m)} />
              <Ellipse cx={x + 9 * s} cy={y - 3} rx={10 * s} ry={4.2 * s} rotation={28} origin={`${x + 9 * s}, ${y - 3}`} fill={i % 2 ? LEAF_D : LEAF} {...line(m)} />
              <Ellipse cx={x + 11 * s} cy={y - 1} rx={6 * s} ry={2 * s} rotation={28} origin={`${x + 11 * s}, ${y - 1}`} fill={SH} />
              <Ellipse cx={x - 11 * s} cy={y - 2} rx={5 * s} ry={1.6 * s} rotation={-28} origin={`${x - 11 * s}, ${y - 2}`} fill={HI} />
            </G>
          )
        })}
        <Ellipse cx={62} cy={38} rx={4} ry={7} fill={LEAF} {...line(m)} />
        <Ellipse cx={61} cy={36} rx={1.6} ry={4} fill={HI} />
      </>
    ),
  },
  {
    id: 'tulip',
    name: 'Blush tulip',
    scale: 1,
    sway: 3.5,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Path d="M50 111 L50 58" {...stem(m)} />
        <Path d="M50 108 C34 104 28 90 30 76 C42 82 49 94 50 108Z" fill={LEAF} {...line(m)} />
        <Path d="M50 104 C64 100 72 88 70 74 C58 80 51 90 50 104Z" fill={LEAF_D} {...line(m)} />
        <Path d="M36 40 C36 56 44 62 50 62 C56 62 64 56 64 40 L57 46 L50 36 L43 46Z" fill="#f2a7b8" {...line(m)} />
        <Path d="M50 36 L43 46 C44 56 47 60 50 62 C53 60 56 56 57 46Z" fill="#f7c3cf" {...line(m)} />
        <Path d="M57 46 L50 36 L64 40 C64 56 56 62 50 62 C56 56 57 52 57 46Z" fill="rgba(190, 80, 110, 0.28)" />
        <Path d="M38 42 C39 52 43 58 47 60 C43 54 41 48 41 44Z" fill={HI} />
        <Path d="M50 104 C64 100 72 88 70 74 C70 90 60 100 50 104Z" fill={SH} />
        <Path d="M50 108 C40 100 34 90 31 78" stroke={MID} strokeWidth={1} fill="none" strokeLinecap="round" />
      </>
    ),
  },
  {
    id: 'moonlily',
    name: 'Moon lily',
    scale: 0.95,
    sway: 2.6,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Defs>
          <RadialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#cdd8ff" stopOpacity={0.5} />
            <Stop offset="1" stopColor="#cdd8ff" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={50} cy={44} r={32} fill="url(#moonGlow)" />
        <Path d="M50 111 C50 90 50 76 50 60" {...stem(m)} />
        <Path d="M50 100 C38 98 30 90 28 80 C40 80 48 88 50 100Z" fill={LEAF} {...line(m)} />
        <Path d="M50 100 C44 96 36 90 30 82" stroke={MID} strokeWidth={1} fill="none" strokeLinecap="round" />
        {[-60, -30, 0, 30, 60].map((a) => (
          <Path key={a} d="M50 56 C41 48 41 34 50 24 C59 34 59 48 50 56Z" rotation={a} origin="50, 56" fill={a === 0 ? '#f4f1ff' : '#dfe6ff'} {...line(m)} />
        ))}
        <Path d="M50 56 C47 50 47 44 50 38 C53 44 53 50 50 56Z" fill="rgba(140, 150, 220, 0.3)" />
        <Circle cx={50} cy={50} r={4.2} fill="#ffd98a" {...line(m)} />
        <Circle cx={49} cy={48.8} r={1.4} fill="#fff3c7" />
      </>
    ),
  },
  {
    id: 'bonsai',
    name: 'Cloud bonsai',
    scale: 1,
    sway: 1.6,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Path d="M46 111 C47 98 42 90 46 80 C48 74 54 70 56 62 L60 64 C58 74 52 78 52 86 C52 96 56 102 56 111Z" fill="#8a6f5a" {...line(m)} />
        <Path d="M49 108 C50 98 46 90 49 82" stroke={HI} strokeWidth={1.6} fill="none" strokeLinecap="round" />
        <Circle cx={36} cy={60} r={14} fill="#4f8d68" {...line(m)} />
        <Circle cx={34.5} cy={58.5} r={12} fill={LEAF_D} />
        <Circle cx={64} cy={52} r={16} fill={LEAF_D} {...line(m)} />
        <Circle cx={62.5} cy={50.5} r={14} fill={LEAF} />
        <Circle cx={50} cy={40} r={15} fill={LEAF_D} {...line(m)} />
        <Circle cx={48.5} cy={38.5} r={13} fill={LEAF} />
        <Circle cx={54} cy={34} r={6} fill={LEAF_L} opacity={0.75} />
        <Circle cx={60} cy={47} r={4} fill={LEAF_L} opacity={0.5} />
      </>
    ),
  },
  {
    id: 'lavender',
    name: 'Dream lavender',
    scale: 0.85,
    sway: 3.2,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Path d="M50 111 C42 108 36 100 34 92 C42 94 48 100 50 111Z" fill={LEAF} />
        <Path d="M50 111 C58 108 64 100 66 92 C58 94 52 100 50 111Z" fill={LEAF_D} />
        {[-12, 0, 12].map((dx, k) => (
          <G key={dx}>
            <Path d={`M50 111 C50 96 ${50 + dx} 80 ${50 + dx * 1.4} ${56 - k * 0}`} {...stem(m)} />
            {[0, 1, 2, 3, 4].map((i) => (
              <G key={i}>
                <Ellipse cx={50 + dx * 1.4 + (i % 2 ? 2.4 : -2.4)} cy={60 - i * 6.5 - (k === 1 ? 6 : 0)} rx={3.4} ry={4.4} fill={i % 2 ? '#b9a8f0' : '#a592e6'} {...line(m)} />
                <Ellipse cx={50 + dx * 1.4 + (i % 2 ? 1.6 : -3.2)} cy={58.8 - i * 6.5 - (k === 1 ? 6 : 0)} rx={1.2} ry={2} fill={HI} />
              </G>
            ))}
          </G>
        ))}
      </>
    ),
  },
]

export const PLANT_IDS = PLANTS.map((p) => p.id)
export const plantById = (id: string) => PLANTS.find((p) => p.id === id)
