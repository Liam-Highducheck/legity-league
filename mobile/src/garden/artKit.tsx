// Shared pieces for the plant drawings: flat, soft shapes on a 100x120 canvas with the roots at (50, 112).
// `mode` switches between plain soft fills and fills with a dark ink outline so we can compare looks.
import type { ReactNode } from 'react'
import { Circle, Defs, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg'

export type ArtMode = 'soft' | 'ink'

export interface PlantDef {
  id: string
  name: string
  /** sway amplitude in degrees; taller/lighter plants move more */
  sway: number
  /** sway period multiplier: trees move slowly, flowers quicker */
  period?: number
  /** size relative to its tile; tall plants shrink so they stay inside it */
  scale: number
  draw: (m: ArtMode) => ReactNode
}

export const INK = '#2f3d38'
export const LEAF = '#86c19a'
export const LEAF_D = '#5f9f78'
export const LEAF_L = '#a8d6b5'
export const STEM = '#6aa883'
// Soft overlays: a cool shadow on the side away from the light (right/bottom) and a highlight on the lit side.
export const SH = 'rgba(28, 64, 70, 0.22)'
export const HI = 'rgba(255, 255, 255, 0.3)'
export const MID = 'rgba(255, 255, 255, 0.35)'

export const line = (m: ArtMode) => (m === 'ink' ? { stroke: INK, strokeWidth: 1.7, strokeLinejoin: 'round' as const } : {})
export const stem = (m: ArtMode) => ({ stroke: m === 'ink' ? INK : STEM, strokeWidth: m === 'ink' ? 3.4 : 3, strokeLinecap: 'round' as const, fill: 'none' })

export const Mound = ({ m }: { m: ArtMode }) => (
  <>
    <Ellipse cx={52} cy={112} rx={22} ry={7} fill="#1c2a30" opacity={0.12} />
    <Ellipse cx={51} cy={111.5} rx={16} ry={5} fill="#1c2a30" opacity={0.16} />
    <Ellipse cx={50} cy={111} rx={9} ry={3} fill="#7a6a58" opacity={0.5} {...(m === 'ink' ? { stroke: INK, strokeWidth: 1 } : {})} />
  </>
)

/** Soft round glow behind a flower or cap; ids only need to be unique inside one plant's Svg. */
export const Glow = ({ id, color, cx, cy, r: wanted, a = 0.5 }: { id: string; color: string; cx: number; cy: number; r: number; a?: number }) => {
  // A glow is clipped hard by its Svg: keep it inside the area thumbnails show (x 10-90, y 12-116) so it never ends in a straight edge.
  const r = Math.max(6, Math.min(wanted, cx - 10, 90 - cx, cy - 12, 116 - cy))
  return (
  <>
    <Defs>
      <RadialGradient id={id} cx="50%" cy="50%" r="50%">
        <Stop offset="0" stopColor={color} stopOpacity={a} />
        <Stop offset="1" stopColor={color} stopOpacity={0} />
      </RadialGradient>
    </Defs>
    <Circle cx={cx} cy={cy} r={r} fill={`url(#${id})`} />
  </>
  )
}

/** Five-point star path centred on (cx, cy). */
export const star = (cx: number, cy: number, ro: number, ri: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2
    const r = i % 2 ? ri : ro
    return `${i ? 'L' : 'M'}${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`
  }).join(' ') + 'Z'

