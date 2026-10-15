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
  /** sway period multiplier: trees move slowly, flowers quicker */
  period?: number
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

/** Soft round glow behind a flower or cap; ids only need to be unique inside one plant's Svg. */
const Glow = ({ id, color, cx, cy, r, a = 0.5 }: { id: string; color: string; cx: number; cy: number; r: number; a?: number }) => (
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

/** Five-point star path centred on (cx, cy). */
const star = (cx: number, cy: number, ro: number, ri: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2
    const r = i % 2 ? ri : ro
    return `${i ? 'L' : 'M'}${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`
  }).join(' ') + 'Z'

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
          <Path key={a} d="M50 56 C41 48 41 34 50 24 C59 34 59 48 50 56Z" rotation={a} origin="50, 56" fill={a === 0 ? '#f4f1ff' : '#dfe6ff'} {...(m === 'ink' ? line(m) : { stroke: 'rgba(130, 140, 215, 0.5)', strokeWidth: 0.8 })} />
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
    period: 1.4,
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
  {
    id: 'willow',
    name: 'Lullaby willow',
    scale: 0.9,
    sway: 1.8,
    period: 1.6,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Path d="M47 111 C48 98 45 86 48 70 C49 62 53 56 56 50 L60 52 C57 60 54 66 54 76 C54 90 57 100 55 111Z" fill="#8a6f5a" {...line(m)} />
        <Path d="M49 108 C50 96 47 84 50 70" stroke={HI} strokeWidth={1.4} fill="none" strokeLinecap="round" />
        <Ellipse cx={56} cy={42} rx={26} ry={14} fill={LEAF_D} {...line(m)} />
        <Ellipse cx={54} cy={40} rx={22} ry={11} fill={LEAF} />
        {[-22, -13, -4, 5, 14, 22].map((dx, i) => (
          <Path key={dx} d={`M${56 + dx} ${46 + (i % 2) * 1} C${56 + dx - 4} ${62 + i * 1.5} ${56 + dx + 3} ${74 + (i % 3) * 5} ${56 + dx - 1} ${86 - (i % 2) * 6}`} stroke={i % 2 ? LEAF_D : LEAF} strokeWidth={2.4} fill="none" strokeLinecap="round" />
        ))}
        <Ellipse cx={46} cy={36} rx={9} ry={3.6} fill={LEAF_L} opacity={0.7} />
      </>
    ),
  },
  {
    id: 'starblossom',
    name: 'Star blossom',
    scale: 0.95,
    sway: 3,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Glow id="starGlow" color="#ffe9a0" cx={50} cy={44} r={30} />
        <Path d="M50 111 C50 92 50 74 50 56" {...stem(m)} />
        <Path d="M50 98 C38 96 30 88 28 78 C40 78 48 86 50 98Z" fill={LEAF} {...line(m)} />
        <Path d="M50 90 C62 88 70 80 72 70 C60 70 52 78 50 90Z" fill={LEAF_D} {...line(m)} />
        <Path d="M50 90 C60 86 68 80 71 72 C70 80 62 88 50 90Z" fill={SH} />
        <Path d={star(50, 44, 17, 7.5)} fill="#ffe08a" {...line(m)} />
        <Path d={star(50, 44, 17, 7.5)} fill="rgba(214, 150, 60, 0.28)" transform="translate(1.5 2) scale(0.92)" origin="50, 44" />
        <Path d="M50 30 L53 40 L50 44Z" fill={HI} />
        <Circle cx={50} cy={44} r={4.5} fill="#fff4cf" {...line(m)} />
      </>
    ),
  },
  {
    id: 'dreamcatcher',
    name: 'Dreamcatcher vine',
    scale: 0.92,
    sway: 2.4,
    period: 1.2,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Path d="M50 111 L50 70" {...stem(m)} />
        <Path d="M50 100 C40 98 33 92 31 84 C41 85 48 91 50 100Z" fill={LEAF} {...line(m)} />
        <Circle cx={50} cy={46} r={22} fill="none" stroke="#c9a77a" strokeWidth={3.2} />
        <Circle cx={50} cy={46} r={22} fill="none" stroke={HI} strokeWidth={1} strokeDasharray="5 9" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const a = (Math.PI / 4) * i
          const b = (Math.PI / 4) * (i + 3)
          return <Path key={i} d={`M${50 + 21 * Math.cos(a)} ${46 + 21 * Math.sin(a)} L${50 + 21 * Math.cos(b)} ${46 + 21 * Math.sin(b)}`} stroke="#e9dcc6" strokeWidth={0.9} opacity={0.8} />
        })}
        <Circle cx={50} cy={46} r={3} fill="#b9a8f0" {...line(m)} />
        {[-14, 0, 14].map((dx, i) => (
          <G key={dx}>
            <Path d={`M${50 + dx * 0.9} ${66 + Math.abs(dx) * 0.1} L${50 + dx} ${76 + (i === 1 ? 6 : 0)}`} stroke="#c9a77a" strokeWidth={1.2} />
            <Path d={`M${50 + dx} ${74 + (i === 1 ? 6 : 0)} C${50 + dx - 4} ${80 + (i === 1 ? 6 : 0)} ${50 + dx - 3} ${90 + (i === 1 ? 6 : 0)} ${50 + dx} ${94 + (i === 1 ? 6 : 0)} C${50 + dx + 3} ${90 + (i === 1 ? 6 : 0)} ${50 + dx + 4} ${80 + (i === 1 ? 6 : 0)} ${50 + dx} ${74 + (i === 1 ? 6 : 0)}Z`} fill={i === 1 ? '#a592e6' : '#f2a7b8'} {...line(m)} />
          </G>
        ))}
      </>
    ),
  },
  {
    id: 'drowsycap',
    name: 'Drowsy cap',
    scale: 1,
    sway: 1.2,
    period: 1.5,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Glow id="capGlow" color="#c8b8ff" cx={46} cy={74} r={34} a={0.35} />
        <Path d="M44 111 C42 100 43 92 44 84 L54 84 C55 92 56 100 54 111Z" fill="#f1e8d8" {...line(m)} />
        <Path d="M50 111 C51 100 51 92 50 84 L54 84 C55 92 56 100 54 111Z" fill="rgba(150,120,90,0.22)" />
        <Path d="M22 86 C22 60 36 50 49 50 C62 50 76 60 76 86 C62 90 36 90 22 86Z" fill="#a592e6" {...line(m)} />
        <Path d="M62 56 C72 62 76 74 76 86 C70 88 64 89 58 89 C66 80 66 66 62 56Z" fill="rgba(60,40,120,0.22)" />
        <Path d="M30 66 C34 58 40 55 46 54 C40 58 35 63 33 70Z" fill={HI} />
        <Circle cx={38} cy={74} r={4} fill="#f7f1ff" />
        <Circle cx={54} cy={64} r={3} fill="#f7f1ff" />
        <Circle cx={62} cy={78} r={3.4} fill="#f7f1ff" />
        <Path d="M26 98 C26 90 32 86 36 86 C40 86 44 90 44 98 C40 100 30 100 26 98Z" fill="#c8b8ff" {...line(m)} transform="translate(-4 12) scale(0.9)" />
      </>
    ),
  },
  {
    id: 'chamomile',
    name: 'Chamomile',
    scale: 0.95,
    sway: 3.4,
    draw: (m) => (
      <>
        <Mound m={m} />
        {[
          { x: 36, y: 60, r: 9, s: 'M50 111 C48 96 40 78 36 68' },
          { x: 62, y: 52, r: 11, s: 'M50 111 C52 92 58 72 62 62' },
          { x: 50, y: 78, r: 8, s: 'M50 111 C50 100 50 90 50 84' },
        ].map((f, k) => (
          <G key={k}>
            <Path d={f.s} {...stem(m)} />
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Ellipse key={i} cx={f.x} cy={f.y - f.r * 0.75} rx={f.r * 0.32} ry={f.r * 0.62} rotation={i * 45} origin={`${f.x}, ${f.y}`} fill={i % 2 ? '#fbf7ee' : '#ffffff'} {...line(m)} />
            ))}
            <Circle cx={f.x} cy={f.y} r={f.r * 0.38} fill="#ffcf5a" {...line(m)} />
            <Circle cx={f.x - f.r * 0.1} cy={f.y - f.r * 0.12} r={f.r * 0.14} fill="#fff0b3" />
          </G>
        ))}
        <Path d="M50 104 C38 102 30 94 28 86 C40 86 48 94 50 104Z" fill={LEAF} {...line(m)} />
        <Path d="M50 104 C62 102 70 96 72 88 C60 88 52 94 50 104Z" fill={LEAF_D} {...line(m)} />
      </>
    ),
  },
  {
    id: 'pillowsucc',
    name: 'Pillow succulent',
    scale: 1,
    sway: 0.8,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Path d="M30 108 C26 96 32 90 50 90 C68 90 74 96 70 108 C60 112 40 112 30 108Z" fill="#c9a77a" {...line(m)} />
        <Path d="M60 92 C70 94 72 100 70 108 C66 110 62 111 58 111 C64 104 64 98 60 92Z" fill="rgba(90,60,30,0.25)" />
        {[-70, -35, 0, 35, 70].map((a, i) => (
          <Path key={a} d="M50 92 C38 84 38 66 50 58 C62 66 62 84 50 92Z" rotation={a} origin="50, 92" fill={i % 2 ? '#8fcbb4' : '#7fbfa8'} {...line(m)} />
        ))}
        <Path d="M50 92 C42 84 42 70 50 62 C58 70 58 84 50 92Z" fill="#a9dcc6" {...line(m)} />
        <Path d="M46 80 C45 74 46 68 49 64" stroke={MID} strokeWidth={1.2} fill="none" strokeLinecap="round" />
        <Circle cx={50} cy={70} r={2.2} fill="#f6b8c8" />
      </>
    ),
  },
  {
    id: 'sakura',
    name: 'Sakura bonsai',
    scale: 1,
    sway: 1.6,
    period: 1.4,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Path d="M46 111 C47 98 42 90 46 80 C48 74 54 70 56 62 L60 64 C58 74 52 78 52 86 C52 96 56 102 56 111Z" fill="#7c6556" {...line(m)} />
        <Path d="M49 108 C50 98 46 90 49 82" stroke={HI} strokeWidth={1.6} fill="none" strokeLinecap="round" />
        <Circle cx={36} cy={60} r={14} fill="#e48fa6" {...line(m)} />
        <Circle cx={34.5} cy={58.5} r={12} fill="#f2a7b8" />
        <Circle cx={64} cy={52} r={16} fill="#ea9aaf" {...line(m)} />
        <Circle cx={62.5} cy={50.5} r={14} fill="#f6b6c5" />
        <Circle cx={50} cy={40} r={15} fill="#ea9aaf" {...line(m)} />
        <Circle cx={48.5} cy={38.5} r={13} fill="#f8bccb" />
        <Circle cx={54} cy={34} r={6} fill="#ffe3ea" opacity={0.8} />
        <Circle cx={60} cy={47} r={4} fill="#ffe3ea" opacity={0.55} />
        <Circle cx={30} cy={92} r={2.2} fill="#f6b6c5" />
        <Circle cx={68} cy={98} r={2} fill="#f6b6c5" />
      </>
    ),
  },
]

export const PLANT_IDS = PLANTS.map((p) => p.id)
export const plantById = (id: string) => PLANTS.find((p) => p.id === id)
