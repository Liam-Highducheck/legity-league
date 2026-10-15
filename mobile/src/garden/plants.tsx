// Prototype plant art: flat, soft shapes on a 100x120 canvas with the roots at (50, 112).
// `mode` switches between plain soft fills and fills with a dark ink outline so we can compare looks.
import type { ReactNode } from 'react'
import { Circle, Ellipse, G, Path } from 'react-native-svg'

export type ArtMode = 'soft' | 'ink'

export interface PlantDef {
  id: string
  name: string
  /** sway amplitude in degrees; taller/lighter plants move more */
  sway: number
  draw: (m: ArtMode) => ReactNode
}

const INK = '#2f3d38'
const LEAF = '#86c19a'
const LEAF_D = '#5f9f78'
const STEM = '#6aa883'

const line = (m: ArtMode) => (m === 'ink' ? { stroke: INK, strokeWidth: 1.7, strokeLinejoin: 'round' as const } : {})
const stem = (m: ArtMode) => ({ stroke: m === 'ink' ? INK : STEM, strokeWidth: m === 'ink' ? 3.4 : 3, strokeLinecap: 'round' as const, fill: 'none' })

const Mound = ({ m }: { m: ArtMode }) => <Ellipse cx={50} cy={111} rx={17} ry={5} fill="#8a7a6a" opacity={0.35} {...(m === 'ink' ? { stroke: INK, strokeWidth: 1, opacity: 0.5 } : {})} />

export const PLANTS: PlantDef[] = [
  {
    id: 'sprout',
    name: 'Sprout',
    sway: 3.5,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Path d="M50 111 C50 100 50 94 50 88" {...stem(m)} />
        <Path d="M50 90 C38 90 28 82 26 70 C40 69 49 77 50 90Z" fill={LEAF} {...line(m)} />
        <Path d="M50 86 C62 86 72 78 74 66 C60 65 51 73 50 86Z" fill={LEAF_D} {...line(m)} />
      </>
    ),
  },
  {
    id: 'fern',
    name: 'Soft fern',
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
            </G>
          )
        })}
        <Ellipse cx={62} cy={38} rx={4} ry={7} fill={LEAF} {...line(m)} />
      </>
    ),
  },
  {
    id: 'tulip',
    name: 'Blush tulip',
    sway: 3.5,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Path d="M50 111 L50 58" {...stem(m)} />
        <Path d="M50 108 C34 104 28 90 30 76 C42 82 49 94 50 108Z" fill={LEAF} {...line(m)} />
        <Path d="M50 104 C64 100 72 88 70 74 C58 80 51 90 50 104Z" fill={LEAF_D} {...line(m)} />
        <Path d="M36 40 C36 56 44 62 50 62 C56 62 64 56 64 40 L57 46 L50 36 L43 46Z" fill="#f2a7b8" {...line(m)} />
        <Path d="M50 36 L43 46 C44 56 47 60 50 62 C53 60 56 56 57 46Z" fill="#f7c3cf" {...line(m)} />
      </>
    ),
  },
  {
    id: 'moonlily',
    name: 'Moon lily',
    sway: 2.6,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Circle cx={50} cy={46} r={26} fill="#cdd8ff" opacity={m === 'ink' ? 0.0 : 0.22} />
        <Path d="M50 111 C50 90 50 76 50 60" {...stem(m)} />
        <Path d="M50 100 C38 98 30 90 28 80 C40 80 48 88 50 100Z" fill={LEAF} {...line(m)} />
        {[-60, -30, 0, 30, 60].map((a) => (
          <Path key={a} d="M50 56 C41 48 41 34 50 24 C59 34 59 48 50 56Z" rotation={a} origin="50, 56" fill={a === 0 ? '#f4f1ff' : '#dfe6ff'} {...line(m)} />
        ))}
        <Circle cx={50} cy={50} r={4.2} fill="#ffd98a" {...line(m)} />
      </>
    ),
  },
  {
    id: 'bonsai',
    name: 'Cloud bonsai',
    sway: 1.6,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Path d="M46 111 C47 98 42 90 46 80 C48 74 54 70 56 62 L60 64 C58 74 52 78 52 86 C52 96 56 102 56 111Z" fill="#8a6f5a" {...line(m)} />
        <Circle cx={36} cy={60} r={14} fill={LEAF_D} {...line(m)} />
        <Circle cx={64} cy={52} r={16} fill={LEAF} {...line(m)} />
        <Circle cx={50} cy={40} r={15} fill={LEAF} {...line(m)} />
        <Circle cx={56} cy={36} r={6} fill="#a8d6b5" opacity={0.7} />
      </>
    ),
  },
  {
    id: 'lavender',
    name: 'Dream lavender',
    sway: 3.2,
    draw: (m) => (
      <>
        <Mound m={m} />
        {[-12, 0, 12].map((dx, k) => (
          <G key={dx}>
            <Path d={`M50 111 C50 96 ${50 + dx} 80 ${50 + dx * 1.4} ${56 - k * 0}`} {...stem(m)} />
            {[0, 1, 2, 3, 4].map((i) => (
              <Ellipse key={i} cx={50 + dx * 1.4 + (i % 2 ? 2.4 : -2.4)} cy={60 - i * 6.5 - (k === 1 ? 6 : 0)} rx={3.4} ry={4.4} fill={i % 2 ? '#b9a8f0' : '#a592e6'} {...line(m)} />
            ))}
          </G>
        ))}
      </>
    ),
  },
]

export const PLANT_IDS = PLANTS.map((p) => p.id)
export const plantById = (id: string) => PLANTS.find((p) => p.id === id)
