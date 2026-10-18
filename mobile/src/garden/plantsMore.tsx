// The rest of the roster. Each evolved plant is its base plant made richer (more blooms, a glow, a new colour), so an
// evolution always reads as "the same plant, grown up". Canvas is 100x120 with the roots at (50, 112).
import type { ReactNode } from 'react'
import { Circle, Ellipse, G, Path } from 'react-native-svg'
import { Glow, HI, INK, LEAF, LEAF_D, LEAF_L, Leaf, MID, Mound, SH, STEM, Spark, line, stem, type ArtMode, type PlantDef } from './artKit'
import { BASE_PLANTS } from './plantsBase'

/** A spiky seed-head: radial strokes with a dot at each tip. */
const Puff = ({ x, y, r, n, color }: { x: number; y: number; r: number; n: number; color: string }) => (
  <G>
    {Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2
      const x2 = x + Math.cos(a) * r
      const y2 = y + Math.sin(a) * r
      return (
        <G key={i}>
          <Path d={`M${x + Math.cos(a) * r * 0.2} ${y + Math.sin(a) * r * 0.2} L${x2} ${y2}`} stroke={color} strokeWidth={0.9} strokeLinecap="round" />
          <Circle cx={x2} cy={y2} r={1.4} fill="#ffffff" />
        </G>
      )
    })}
  </G>
)

/** One flower of a tulip, centred on (x, y) with its base at y + h. */
const TulipBloom = ({ x, y, s = 1, light, dark, m }: { x: number; y: number; s?: number; light: string; dark: string; m: ArtMode }) => (
  <G transform={`translate(${x} ${y}) scale(${s})`}>
    <Path d="M-14 -6 C-14 10 -6 16 0 16 C6 16 14 10 14 -6 L7 0 L0 -10 L-7 0Z" fill={dark} {...line(m)} />
    <Path d="M0 -10 L-7 0 C-6 10 -3 14 0 16 C3 14 6 10 7 0Z" fill={light} {...line(m)} />
    <Path d="M7 0 L0 -10 L14 -6 C14 10 6 16 0 16 C6 10 7 6 7 0Z" fill="rgba(40,20,90,0.25)" />
    <Path d="M-12 -3 C-11 6 -7 12 -3 14 C-7 8 -9 2 -9 -2Z" fill={HI} />
  </G>
)

/** A daisy: petals around a centre. */
const Daisy = ({ x, y, r, n = 8, petal, petalAlt, center, m }: { x: number; y: number; r: number; n?: number; petal: string; petalAlt: string; center: string; m: ArtMode }) => (
  <G>
    {Array.from({ length: n }, (_, i) => (
      <Ellipse key={i} cx={x} cy={y - r * 0.72} rx={r * 0.3} ry={r * 0.62} transform={`rotate(${(i * 360) / n} ${x} ${y})`} fill={i % 2 ? petalAlt : petal} {...line(m)} />
    ))}
    <Circle cx={x} cy={y} r={r * 0.4} fill={center} {...line(m)} />
    <Circle cx={x - r * 0.1} cy={y - r * 0.12} r={r * 0.14} fill="rgba(255,255,255,0.7)" />
  </G>
)

/** Leaflets along a curved frond, used by the fern family. */
const Frond = ({ x0, y0, x1, y1, cx, cy, n, size, a, b, tip, m }: { x0: number; y0: number; x1: number; y1: number; cx: number; cy: number; n: number; size: number; a: string; b: string; tip?: string; m: ArtMode }) => {
  const at = (t: number) => ({ x: (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1, y: (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1 })
  return (
    <G>
      <Path d={`M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}`} stroke={m === 'ink' ? INK : STEM} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      {Array.from({ length: n }, (_, i) => {
        const t = 0.18 + (i / (n - 1)) * 0.78
        const p = at(t)
        const s = size * (1 - t * 0.6)
        return (
          <G key={i}>
            <Ellipse cx={p.x - 5 * s} cy={p.y} rx={7 * s} ry={3 * s} transform={`rotate(-30 ${p.x - 5 * s} ${p.y})`} fill={i % 2 ? a : b} {...line(m)} />
            <Ellipse cx={p.x + 5 * s} cy={p.y - 2} rx={7 * s} ry={3 * s} transform={`rotate(30 ${p.x + 5 * s} ${p.y - 2})`} fill={i % 2 ? b : a} {...line(m)} />
          </G>
        )
      })}
      {tip && <Circle cx={x1} cy={y1 - 1} r={2.8} fill={tip} />}
    </G>
  )
}


const WISTERIA_CLUSTERS: [number, number, number][] = [[38, 66, 32], [56, 44, 42], [74, 40, 36]]

/** One hanging cluster of the wisteria; each swings from where it hangs off the branch. */
const wisteriaCluster = (m: ArtMode, k: number) => {
  const [x, y, len] = WISTERIA_CLUSTERS[k]
  return (
    <G key={k}>
            <Path d={`M${x} ${y} L${x} ${y + 4}`} stroke={STEM} strokeWidth={1.6} />
            {Array.from({ length: 7 }, (_, i) => {
              const t = i / 6
              const yy = y + 6 + t * (len as number)
              const w = 5.6 - t * 3.6
              return (
                <G key={i}>
                  <Ellipse cx={x - w * 0.5} cy={yy} rx={w} ry={4.2 - t} fill={i % 2 ? '#a58bd9' : '#b79ee6'} {...line(m)} />
                  <Ellipse cx={x + w * 0.6} cy={yy + 1.4} rx={w * 0.9} ry={4 - t} fill={i % 2 ? '#8f76cf' : '#a58bd9'} {...line(m)} />
                </G>
              )
            })}
          </G>
  )
}

interface LotusPalette { water: string; ripple: string; pad: string; padBack: string; vein: string; back: string; mid: string; front: string; core: string; bud: string }
const LOTUS: LotusPalette = { water: '#8fc7e0', ripple: '#b6e0ef', pad: '#5fa882', padBack: '#4c966f', vein: 'rgba(255,255,255,0.35)', back: '#f29bb8', mid: '#f7b6cb', front: '#ffe1ea', core: '#ffd36a', bud: '#f4a9c1' }
const MOON_LOTUS: LotusPalette = { water: '#a9c9f0', ripple: '#d6e6ff', pad: '#5a9aa8', padBack: '#4a8896', vein: 'rgba(255,255,255,0.4)', back: '#b9c9f4', mid: '#d3dffd', front: '#f4f6ff', core: '#ffe08a', bud: '#dfe6ff' }

/** The pond: ripples and two lily pads, one with the classic notch. Never moves; the flower stands in it. */
const lotusWater = (m: ArtMode, p: LotusPalette) => (
  <>
    <Ellipse cx={50} cy={106} rx={44} ry={8} fill={p.water} opacity={0.35} />
    <Ellipse cx={50} cy={106} rx={32} ry={5} fill={p.ripple} opacity={0.35} />
    <Path d="M54 103 C56 97 72 95 84 98 C92 101 91 107 80 109 C68 111 54 109 54 103Z" fill={p.padBack} {...line(m)} />
    <Path d="M56 103 L88 102" stroke={p.vein} strokeWidth={1} strokeLinecap="round" />
    <Path d="M30 103 L46 98 C47 94 40 92 29 92 C16 92 8 97 8 103 C8 109 16 113 29 113 C40 113 47 110 46 107Z" fill={p.pad} {...line(m)} />
    <Path d="M12 100 C14 95 22 93 30 93 C24 97 22 103 28 112 C18 111 10 107 12 100Z" fill="rgba(255,255,255,0.18)" />
    <Path d="M30 103 L12 98 M30 103 L11 104 M30 103 L16 110 M30 103 L24 94" stroke={p.vein} strokeWidth={1} strokeLinecap="round" />
  </>
)

/** The bloom: three rows of petals (deep outside, pale in front) around a golden seed pod, on a stem rising from the pond. */
const lotusBloom = (m: ArtMode, p: LotusPalette, sideBuds: boolean) => (
  <>
    {sideBuds && (
      <>
        <Path d="M70 104 C70 94 72 86 76 78" {...stem(m)} strokeWidth={2.4} />
        <Ellipse cx={76} cy={72} rx={4.4} ry={7.5} fill={p.bud} {...line(m)} transform="rotate(14 76 72)" />
        <Path d="M76 80 C72 78 72 76 74 74 M76 80 C80 78 80 76 78 74" stroke={LEAF_D} strokeWidth={1.4} strokeLinecap="round" fill="none" />
      </>
    )}
    <Path d="M50 104 C49 92 51 78 50 68" {...stem(m)} />
    {[-80, -56, 56, 80].map((a) => (
      <Path key={a} d="M50 68 C35 64 30 48 50 32 C70 48 65 64 50 68Z" transform={`rotate(${a} 50 68)`} fill={p.back} {...line(m)} />
    ))}
    {[-36, -14, 14, 36].map((a) => (
      <Path key={a} d="M50 68 C37 64 34 48 50 30 C66 48 63 64 50 68Z" transform={`rotate(${a} 50 68)`} fill={p.mid} {...line(m)} />
    ))}
    {[-22, 22].map((a) => (
      <Path key={a} d="M50 69 C41 65 40 51 50 36 C60 51 59 65 50 69Z" transform={`rotate(${a} 50 69)`} fill={p.front} {...line(m)} />
    ))}
    <Path d="M50 70 C41 66 41 52 50 34 C59 52 59 66 50 70Z" fill={p.front} {...line(m)} />
    <Path d="M50 70 C45 64 45 52 50 40 C55 52 55 64 50 70Z" fill="rgba(255,255,255,0.45)" />
    <Path d="M46 66 C42 58 43 50 47 44" stroke={HI} strokeWidth={1.4} strokeLinecap="round" fill="none" />
    <Ellipse cx={50} cy={66} rx={4.2} ry={2.4} fill={p.core} />
    {[-5, -2.5, 0, 2.5, 5].map((dx) => (
      <Circle key={dx} cx={50 + dx} cy={63.4 - Math.abs(dx) * 0.2} r={0.9} fill="#fff4cf" />
    ))}
  </>
)

/** The reed's stalks and cattails, each its own layer: every one rises from its own spot and sways about it. */
const REED_STALKS: [string, string][] = [
  ['M44 111 C42 88 38 64 28 46', LEAF_D], ['M47 111 C46 84 46 58 44 34', LEAF], ['M52 111 C54 86 60 62 70 42', LEAF_D],
  ['M56 111 C60 90 70 74 82 64', LEAF], ['M40 111 C34 96 26 86 16 82', LEAF],
]
/** [flower x, y, base x, control x] */
const REED_CATTAILS: [number, number, number, number][] = [[62, 60, 54, 58], [40, 48, 48, 44]]
export const REED_BASES: [number, number][] = [[44, 111], [47, 111], [52, 111], [56, 111], [40, 111], [54, 111], [48, 111]]
const reedStalk = (m: ArtMode, i: number) => <Path key={i} d={REED_STALKS[i][0]} stroke={REED_STALKS[i][1]} strokeWidth={3.4} strokeLinecap="round" fill="none" />
const reedCattail = (m: ArtMode, i: number) => {
  const [x, y, bx, cx] = REED_CATTAILS[i]
  return (
    <G key={i}>
      <Path d={`M${bx} 111 C${cx} 90 ${x} ${y + 14} ${x} ${y + 8}`} stroke={STEM} strokeWidth={2} strokeLinecap="round" fill="none" />
      <Ellipse cx={x} cy={y} rx={3.8} ry={10} fill="#8a5a3c" {...line(m)} />
      <Ellipse cx={x - 1.2} cy={y - 2} rx={1.2} ry={6} fill="rgba(255,255,255,0.28)" />
      <Path d={`M${x} ${y - 10} L${x} ${y - 16}`} stroke={STEM} strokeWidth={1.4} strokeLinecap="round" />
    </G>
  )
}
const REED_LAYERS: Record<string, (m: ArtMode) => ReactNode> = {
  ...Object.fromEntries(REED_STALKS.map((_, i) => [`stalk${i}`, (m: ArtMode) => reedStalk(m, i)])),
  ...Object.fromEntries(REED_CATTAILS.map((_, i) => [`cat${i}`, (m: ArtMode) => reedCattail(m, i)])),
}

const succulentDraw = BASE_PLANTS.find((p) => p.id === 'succulent')!.draw
const WHITE = '#ffffff'

/** The sapling's three balls of foliage, each its own layer so each sways on its own where it meets the wood. */
const saplingLeaf = (m: ArtMode, k: number) =>
  k === 0 ? (
    <G key={k}>
      <Circle cx={36} cy={62} r={10} fill={LEAF_D} {...line(m)} />
      <Circle cx={37} cy={60} r={5} fill={LEAF_L} opacity={0.4} />
    </G>
  ) : k === 1 ? (
    <G key={k}>
      <Circle cx={67} cy={55} r={11} fill={LEAF_D} {...line(m)} />
      <Circle cx={64} cy={52} r={6} fill={LEAF_L} opacity={0.4} />
      <Path d="M62 62 C68 62 74 58 74 52 C72 62 68 66 62 66Z" fill={SH} />
    </G>
  ) : (
    <G key={k}>
      <Circle cx={51} cy={46} r={15} fill={LEAF} {...line(m)} />
      <Circle cx={47} cy={42} r={10} fill={LEAF_L} opacity={0.6} />
    </G>
  )
const SAPLING_LAYERS: Record<string, (m: ArtMode) => ReactNode> = Object.fromEntries([0, 1, 2].map((k) => [`leaf${k}`, (m: ArtMode) => saplingLeaf(m, k)]))

/** Drawn on its own so it can swing apart from the moonwood's trunk. */
const moonwoodCrown = (m: ArtMode) => (
  <>
        <Circle cx={30} cy={52} r={16} fill="#3f8a78" {...line(m)} />
        <Circle cx={72} cy={46} r={17} fill="#3f8a78" {...line(m)} />
        <Circle cx={50} cy={32} r={21} fill="#4d9d89" {...line(m)} />
        <Circle cx={44} cy={52} r={14} fill="#4d9d89" {...line(m)} />
        <Circle cx={60} cy={54} r={12} fill="#3f8a78" {...line(m)} />
        <Circle cx={44} cy={26} r={11} fill="#5fb09b" opacity={0.75} />
        <Circle cx={27} cy={47} r={7} fill="#5fb09b" opacity={0.55} />
        {/* moon-blossoms */}
        {[[36, 36], [58, 24], [74, 44], [22, 56], [52, 50], [66, 60], [46, 14]].map(([x, y], i) => (
          <G key={i}>
            <Circle cx={x} cy={y} r={4.8} fill="rgba(232,241,255,0.35)" />
            <Circle cx={x} cy={y} r={2.8} fill="#f2f6ff" />
            <Circle cx={x - 0.6} cy={y - 0.6} r={1} fill="#ffffff" />
          </G>
        ))}
        <Path d="M64 22 A5 5 0 1 0 64 32 A3.8 3.8 0 1 1 64 22Z" fill="#fff4cf" />
  </>
)

/** Drawn on its own so it can swing apart from the aurora's trunk. */
const auroraCrown = (m: ArtMode) => (
  <>
        {/* the canopy is ribbons of light */}
        {[
          ['M24 60 C30 20 62 10 76 40', '#6ee7b7', 8],
          ['M30 66 C34 30 60 24 70 50', '#5eead4', 7],
          ['M22 48 C26 14 70 6 80 36', '#a78bfa', 6],
          ['M34 56 C38 34 58 30 64 52', '#f0abfc', 5],
          ['M18 70 C16 40 34 22 52 24', '#7dd3fc', 5],
        ].map(([d, c, w], i) => (
          <G key={i}>
            <Path d={d as string} stroke={c as string} strokeWidth={(w as number) + 5} strokeLinecap="round" fill="none" opacity={0.18} />
            <Path d={d as string} stroke={c as string} strokeWidth={w as number} strokeLinecap="round" fill="none" opacity={0.85} />
            <Path d={d as string} stroke="#ffffff" strokeWidth={1.2} strokeLinecap="round" fill="none" opacity={0.5} />
          </G>
        ))}
  </>
)

export const MORE_PLANTS: PlantDef[] = [
  // ---------------------------------------------------------------------------------------------------- common --------
  {
    id: 'clover', name: 'Clover', scale: 1.05, sway: 2.2,
    draw: (m) => (
      <>
        <Mound m={m} />
        {[[30, 97, -10], [52, 86, 4], [73, 98, 12]].map(([x, y, r], k) => (
          <G key={k}>
            <Path d={`M${x < 50 ? 44 : x > 60 ? 58 : 50} 110 Q${x} 104 ${x} ${y + 6}`} {...stem(m)} strokeWidth={2} />
            <G transform={`translate(${x} ${y}) rotate(${r})`}>
              {[-90, 30, 150].map((a, i) => (
                <G key={a}>
                  <Ellipse cx={Math.cos((a * Math.PI) / 180) * 6.4} cy={Math.sin((a * Math.PI) / 180) * 6.4} rx={6.2} ry={5.4} transform={`rotate(${a + 90} ${Math.cos((a * Math.PI) / 180) * 6.4} ${Math.sin((a * Math.PI) / 180) * 6.4})`} fill={i === 1 ? LEAF_D : LEAF} {...line(m)} />
                </G>
              ))}
              <Path d="M0 -4 L0 3 M-3 -3 L0 0 L3 -3" stroke="rgba(255,255,255,0.5)" strokeWidth={1} strokeLinecap="round" fill="none" />
              <Circle cx={0} cy={0} r={1.4} fill={LEAF_L} />
            </G>
          </G>
        ))}
      </>
    ),
  },
  {
    id: 'luckyclover', name: 'Lucky clover', scale: 1, sway: 2.2,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Glow id="lcGlow" color="#ffe9a0" cx={50} cy={74} r={30} a={0.4} />
        {[[28, 98, -12, 0.8], [72, 99, 14, 0.8], [50, 80, 0, 1.25]].map(([x, y, r, s], k) => (
          <G key={k}>
            <Path d={`M50 110 Q${x} 104 ${x} ${y + 8 * s}`} {...stem(m)} strokeWidth={2} />
            <G transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
              {[0, 90, 180, 270].map((a, i) => (
                <Ellipse key={a} cx={Math.cos((a * Math.PI) / 180) * 7} cy={Math.sin((a * Math.PI) / 180) * 7} rx={6.8} ry={5.8} transform={`rotate(${a} ${Math.cos((a * Math.PI) / 180) * 7} ${Math.sin((a * Math.PI) / 180) * 7})`} fill={i % 2 ? '#62b67c' : '#7ccf93'} stroke="rgba(255, 214, 102, 0.9)" strokeWidth={1} />
              ))}
              <Path d="M-5 -5 L0 0 L5 -5 M-5 5 L0 0 L5 5" stroke="rgba(255,255,255,0.55)" strokeWidth={1} strokeLinecap="round" fill="none" />
              <Circle r={1.8} fill="#ffe08a" />
            </G>
          </G>
        ))}
      </>
    ),
  },
  {
    id: 'dandelion', name: 'Dandelion', scale: 1, sway: 3.4,
    draw: (m) => (
      <>
        <Mound m={m} />
        {[-26, 0, 24].map((dx, i) => (
          <Path key={dx} d={`M${50 + dx * 0.3} 111 L${50 + dx * 0.9} 100 L${50 + dx * 0.5} 98 L${50 + dx * 1.2} 90 L${50 + dx * 0.3} 94 L50 111Z`} fill={i === 1 ? LEAF : LEAF_D} {...line(m)} />
        ))}
        <Path d="M50 110 C50 90 54 66 56 48" {...stem(m)} />
        <Circle cx={56} cy={40} r={16} fill="#f6f4ec" opacity={0.92} />
        <Path d="M62 54 A16 16 0 0 0 72 40" stroke="rgba(120,130,160,0.2)" strokeWidth={4} fill="none" strokeLinecap="round" />
        <Puff x={56} y={40} r={16} n={22} color="#cfcabb" />
        <Circle cx={56} cy={40} r={3.2} fill="#b9a98f" />
        <Circle cx={52} cy={35} r={4} fill="rgba(255,255,255,0.7)" />
      </>
    ),
  },
  {
    id: 'wishdandelion', name: 'Wishing dandelion', scale: 0.98, sway: 3.2,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Glow id="wdGlow" color="#fff3c0" cx={56} cy={38} r={40} a={0.55} />
        {[-26, 0, 24].map((dx, i) => (
          <Path key={dx} d={`M${50 + dx * 0.3} 111 L${50 + dx * 0.9} 100 L${50 + dx * 0.5} 98 L${50 + dx * 1.2} 90 L${50 + dx * 0.3} 94 L50 111Z`} fill={i === 1 ? '#7ccf93' : LEAF_D} {...line(m)} />
        ))}
        <Path d="M50 110 C50 90 54 66 56 52" {...stem(m)} />
        <Circle cx={56} cy={42} r={20} fill="#fff9e0" opacity={0.95} />
        <Puff x={56} y={42} r={20} n={26} color="#f1dfa0" />
        <Circle cx={56} cy={42} r={4} fill="#ffd98a" />
      </>
    ),
  },
  {
    id: 'reed', name: 'Reed', scale: 0.95, sway: 0, period: 0.9,
    layers: REED_LAYERS,
    draw: (m, skip) => (
      <>
        <Mound m={m} />
        {REED_STALKS.map((_, i) => !skip?.includes(`stalk${i}`) && reedStalk(m, i))}
        {REED_CATTAILS.map((_, i) => !skip?.includes(`cat${i}`) && reedCattail(m, i))}
      </>
    ),
  },
  {
    id: 'bluebell', name: 'Bluebell', scale: 1, sway: 3,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Leaf x={50} y={108} r={-40} len={32} w={5} fill={LEAF} m={m} />
        <Leaf x={50} y={105} r={38} len={28} w={5} fill={LEAF_D} m={m} />
        <Path d="M50 111 C50 88 46 68 52 52 C56 40 66 34 76 38" {...stem(m)} />
        {[[48, 84, 0.9], [51, 68, 0.95], [55, 54, 0.95], [63, 44, 0.9], [73, 40, 0.85]].map(([x, y, s], i) => (
          <G key={i} transform={`translate(${x} ${y}) scale(${s})`}>
            <Path d="M0 -6 L0 0" stroke={STEM} strokeWidth={1.4} strokeLinecap="round" />
            <Path d="M0 0 C-5 2 -6 9 -8 13 C-4 15 4 15 8 13 C6 9 5 2 0 0Z" fill={i % 2 ? '#7f8cf0' : '#6f7ce6'} {...line(m)} />
            <Path d="M0 0 C-3 2 -4 8 -5 12 C-3 9 -1 4 0 0Z" fill={HI} />
            <Path d="M-8 13 C-4 16 4 16 8 13" stroke="#8d97f5" strokeWidth={2} strokeLinecap="round" fill="none" />
          </G>
        ))}
      </>
    ),
  },
  {
    id: 'poppy', name: 'Poppy', scale: 1, sway: 3.2,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Path d="M50 111 C48 90 52 70 50 52" {...stem(m)} />
        <Leaf x={49} y={102} r={-48} len={26} w={6.5} fill={LEAF_D} m={m} />
        <Leaf x={51} y={92} r={50} len={24} w={6} fill={LEAF} m={m} />
        {/* the nodding bud */}
        <Path d="M49.5 80 C43 77 35 75 30 70" stroke={STEM} strokeWidth={2} strokeLinecap="round" fill="none" />
        <Ellipse cx={28.5} cy={63} rx={5} ry={7.5} fill="#d9534d" {...line(m)} />
        <Ellipse cx={27} cy={61} rx={1.6} ry={4.6} fill={HI} />
        {/* the bloom */}
        <G>
          <Ellipse cx={42} cy={46} rx={11} ry={10} fill="#ee6a5b" {...line(m)} />
          <Ellipse cx={59} cy={46} rx={11} ry={10} fill="#e85a52" {...line(m)} />
          <Ellipse cx={50} cy={38} rx={11} ry={9.5} fill="#f58a7c" {...line(m)} />
          <Ellipse cx={50} cy={54} rx={11} ry={8} fill="#d9494a" {...line(m)} />
          <Ellipse cx={46} cy={36} rx={5} ry={3.4} fill={HI} />
          <Ellipse cx={61} cy={50} rx={6} ry={5} fill="rgba(80,10,40,0.2)" />
          <Circle cx={50} cy={46} r={5} fill="#3a2b3b" />
          {Array.from({ length: 9 }, (_, i) => (
            <Circle key={i} cx={50 + Math.cos((i / 9) * 6.28) * 7} cy={46 + Math.sin((i / 9) * 6.28) * 7} r={0.9} fill="#2a1c2c" />
          ))}
        </G>
      </>
    ),
  },
  {
    id: 'cactus', name: 'Sleepy cactus', scale: 0.98, sway: 0.8, period: 1.6,
    draw: (m) => (
      <>
        <Ellipse cx={50} cy={111} rx={24} ry={6} fill="#d7c29a" />
        <Ellipse cx={50} cy={109} rx={18} ry={4} fill="#e6d3ab" />
        <Path d="M38 108 L38 56 Q38 40 50 40 Q62 40 62 56 L62 108Z" fill="#78b99a" {...line(m)} />
        <Path d="M38 108 L38 56 Q38 42 46 40 Q42 52 43 108Z" fill={HI} />
        <Path d="M62 108 L62 56 Q62 42 56 41 Q58 56 57 108Z" fill={SH} />
        <Path d="M38 90 L26 90 Q18 90 18 82 L18 58 Q18 50 25 50 Q32 50 32 58 L32 76 Q32 78 38 78Z" fill="#6fb090" {...line(m)} />
        <Path d="M23 56 Q22 66 23 76" stroke={HI} strokeWidth={1.6} strokeLinecap="round" fill="none" />
        <Path d="M62 80 L74 80 Q82 80 82 72 L82 46 Q82 38 75 38 Q68 38 68 46 L68 66 Q68 68 62 68Z" fill="#6fb090" {...line(m)} />
        <Path d="M72 44 Q71 54 72 64" stroke={HI} strokeWidth={1.6} strokeLinecap="round" fill="none" />
        {[44, 50, 56].map((x) => (
          <Path key={x} d={`M${x} 46 L${x} 106`} stroke="rgba(30,80,60,0.2)" strokeWidth={1} />
        ))}
        {[[44, 60], [56, 66], [44, 80], [56, 90], [50, 72], [50, 98], [25, 62], [75, 52]].map(([x, y], i) => (
          <Path key={i} d={`M${x} ${y} l-1.6 -2 M${x} ${y} l1.6 -2`} stroke="#f2f8e4" strokeWidth={0.9} strokeLinecap="round" />
        ))}
        <G>
          {[0, 72, 144, 216, 288].map((a) => (
            <Ellipse key={a} cx={50} cy={36} rx={2.6} ry={5} transform={`rotate(${a} 50 40)`} fill="#f2a7b8" />
          ))}
          <Circle cx={50} cy={40} r={2.4} fill="#ffd98a" />
        </G>
      </>
    ),
  },
  {
    id: 'pine', name: 'Pine', scale: 0.92, sway: 1.0, period: 1.5,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Path d="M46 111 L46 92 L54 92 L54 111Z" fill="#8a6f5a" {...line(m)} />
        {/* each tier is finished (shade, highlight) before the one above covers its tip */}
        <Path d="M50 52 L78 94 Q50 100 22 94Z" fill="#4f8d68" {...line(m)} />
        <Path d="M50 52 L78 94 Q66 97 60 97 Q64 78 50 52Z" fill={SH} />
        <Path d="M50 58 L30 88" stroke={HI} strokeWidth={1.6} strokeLinecap="round" fill="none" />
        <Path d="M50 34 L72 70 Q50 76 28 70Z" fill="#5f9f78" {...line(m)} />
        <Path d="M50 34 L72 70 Q64 72 60 73 Q62 56 50 34Z" fill={SH} />
        <Path d="M50 38 L36 66" stroke={HI} strokeWidth={1.6} strokeLinecap="round" fill="none" />
        <Path d="M50 14 L66 48 Q50 53 34 48Z" fill="#6aae85" {...line(m)} />
        <Path d="M50 14 L66 48 Q60 50 57 51 Q58 34 50 14Z" fill={SH} />
        <Path d="M50 18 L40 44" stroke={HI} strokeWidth={1.6} strokeLinecap="round" fill="none" />
      </>
    ),
  },
  {
    id: 'frostpine', name: 'Frost pine', scale: 0.88, sway: 1.0, period: 1.6,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Path d="M46 111 L46 96 L54 96 L54 111Z" fill="#7a6a5a" {...line(m)} />
        {/* tier by tier, bottom to top, each with its shade and the snow that settles on it */}
        <Path d="M50 62 L82 100 Q50 107 18 100Z" fill="#4b8a86" {...line(m)} />
        <Path d="M50 62 L82 100 Q70 103 64 103 Q68 84 50 62Z" fill={SH} />
        <Path d="M50 68 L28 96" stroke={HI} strokeWidth={1.6} strokeLinecap="round" fill="none" />
        <Path d="M50 62 L36 79 Q40 76 44 80 Q48 76 52 80 Q56 76 60 79 Q56 73 50 62Z" fill="#f4fbff" />
        <Path d="M50 44 L76 80 Q50 86 24 80Z" fill="#5a9c97" {...line(m)} />
        <Path d="M50 44 L76 80 Q68 82 64 83 Q66 64 50 44Z" fill={SH} />
        <Path d="M50 50 L34 76" stroke={HI} strokeWidth={1.6} strokeLinecap="round" fill="none" />
        <Path d="M50 44 L40 59 Q44 56 47 59 Q50 55 53 59 Q56 56 60 59 Q55 52 50 44Z" fill="#f4fbff" />
        <Path d="M50 26 L70 60 Q50 65 30 60Z" fill="#6aaca6" {...line(m)} />
        <Path d="M50 26 L70 60 Q64 62 60 63 Q62 46 50 26Z" fill={SH} />
        <Path d="M50 32 L38 56" stroke={HI} strokeWidth={1.6} strokeLinecap="round" fill="none" />
        <Path d="M50 26 L42 38 Q46 36 50 39 Q54 36 58 38 Q54 33 50 26Z" fill="#f4fbff" />
        <Path d="M50 8 L64 38 Q50 42 36 38Z" fill="#7cbbb5" {...line(m)} />
        <Path d="M50 8 L64 38 Q58 40 55 41 Q56 24 50 8Z" fill={SH} />
        <Path d="M50 12 L42 32" stroke={HI} strokeWidth={1.6} strokeLinecap="round" fill="none" />
        <Path d="M50 8 L45 17 Q48 16 50 18 Q52 16 55 17 Q52 13 50 8Z" fill="#ffffff" />
        <Path d="M22 98 L24 104 M34 100 L35 106 M66 100 L65 106 M78 98 L76 104" stroke="#dff3ff" strokeWidth={1.6} strokeLinecap="round" />
      </>
    ),
  },
  {
    id: 'sapling', name: 'Sapling', scale: 0.95, sway: 1.0, period: 1.2,
    layers: SAPLING_LAYERS,
    draw: (m, skip) => (
      <>
        <Mound m={m} />
        <Path d="M47 111 C48 94 47 80 50 50 L55 50 C55 80 54 94 54 111Z" fill="#8a6f5a" {...line(m)} />
        <Path d="M50 84 C44 80 38 76 35 70" stroke="#8a6f5a" strokeWidth={3} strokeLinecap="round" fill="none" />
        <Path d="M53 76 C58 72 63 68 66 62" stroke="#8a6f5a" strokeWidth={2.6} strokeLinecap="round" fill="none" />
        <Path d="M49 108 C50 94 49 82 51 56" stroke={HI} strokeWidth={1.2} strokeLinecap="round" fill="none" />
        {[0, 1, 2].map((k) => !skip?.includes(`leaf${k}`) && saplingLeaf(m, k))}
      </>
    ),
  },
  {
    id: 'moonwood', name: 'Moonwood tree', scale: 0.86, sway: 0.5, period: 1.8,
    layers: { crown: moonwoodCrown },
    draw: (m, skip) => (
      <>
        <Mound m={m} />
        <Glow id="mwGlow" color="#cdd8ff" cx={50} cy={46} r={50} a={0.3} />
        <Path d="M40 111 C44 100 44 88 45 56 L57 56 C58 88 58 100 64 111 Q52 114 40 111Z" fill="#7c6556" {...line(m)} />
        <Path d="M45 108 C46 96 46 80 47 58" stroke={HI} strokeWidth={1.6} strokeLinecap="round" fill="none" />
        <Path d="M48 72 C40 68 32 62 28 54 M56 68 C64 64 72 58 76 50" stroke="#7c6556" strokeWidth={3.4} strokeLinecap="round" fill="none" />
        {!skip?.includes('crown') && moonwoodCrown(m)}
      </>
    ),
  },
  {
    id: 'twilighttulip', name: 'Twilight tulip', scale: 0.98, sway: 3.4,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Glow id="ttGlow" color="#b4a4ef" cx={50} cy={50} r={42} a={0.35} />
        <Leaf x={46} y={110} r={-30} len={44} w={7} fill="#5a9a86" m={m} />
        <Leaf x={54} y={110} r={28} len={40} w={7} fill="#4c8a78" m={m} />
        <Path d="M50 110 L50 52" {...stem(m)} />
        <Path d="M41 108 C38 90 32 74 30 66" {...stem(m)} />
        <Path d="M59 108 C62 92 68 78 70 70" {...stem(m)} />
        <TulipBloom x={30} y={58} s={0.8} light="#b8a7f0" dark="#8d7bd8" m={m} />
        <TulipBloom x={70} y={62} s={0.8} light="#b8a7f0" dark="#8d7bd8" m={m} />
        <TulipBloom x={50} y={42} s={1.05} light="#c8baf7" dark="#9a88e4" m={m} />
      </>
    ),
  },
  {
    id: 'goldchamomile', name: 'Golden chamomile', scale: 0.98, sway: 3.4,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Glow id="gcGlow" color="#ffe08a" cx={50} cy={56} r={44} a={0.35} />
        <Leaf x={50} y={108} r={-40} len={26} w={5} fill={LEAF} m={m} />
        <Leaf x={52} y={108} r={42} len={26} w={5} fill={LEAF_D} m={m} />
        {[
          { x: 30, y: 66, r: 10, d: 'M48 111 C46 94 38 78 31 70' },
          { x: 72, y: 60, r: 11.5, d: 'M52 111 C54 94 64 76 71 66' },
          { x: 50, y: 46, r: 13, d: 'M50 111 C50 90 50 66 50 54' },
          { x: 38, y: 86, r: 8.5, d: 'M46 111 C44 100 41 94 39 90' },
          { x: 62, y: 88, r: 8.5, d: 'M54 111 C56 102 60 96 61 92' },
        ].map((f, k) => (
          <G key={k}>
            <Path d={f.d} {...stem(m)} />
            <Daisy x={f.x} y={f.y} r={f.r} n={9} petal="#ffd36a" petalAlt="#ffe29a" center="#e8923a" m={m} />
          </G>
        ))}
      </>
    ),
  },

  // ----------------------------------------------------------------------------------------------------- rare ----------
  {
    id: 'lotus', name: 'Lotus', scale: 0.96, sway: 1.2, period: 1.7,
    layers: { water: (m) => lotusWater(m, LOTUS) },
    draw: (m, skip) => (
      <>
        {!skip?.includes('water') && lotusWater(m, LOTUS)}
        {lotusBloom(m, LOTUS, false)}
      </>
    ),
  },
  {
    id: 'moonlotus', name: 'Moon lotus', scale: 0.92, sway: 1.1, period: 1.9,
    layers: { water: (m) => lotusWater(m, MOON_LOTUS) },
    draw: (m, skip) => (
      <>
        <Glow id="mlGlow" color="#cdd8ff" cx={50} cy={50} r={50} a={0.55} />
        {!skip?.includes('water') && lotusWater(m, MOON_LOTUS)}
        {lotusBloom(m, MOON_LOTUS, true)}
      </>
    ),
  },
  {
    id: 'bamboo', name: 'Bamboo', scale: 0.78, sway: 1.6, period: 1.3,
    draw: (m) => (
      <>
        <Mound m={m} />
        {[[40, 40, 5.4], [52, 14, 6], [63, 52, 5]].map(([x, top, w], k) => {
          const h = 112 - top
          const segs = Math.round(h / 22)
          return (
            <G key={k}>
              <Path d={`M${x - w / 2} 111 L${x - w / 2} ${112 - h} Q${x} ${106 - h} ${x + w / 2} ${112 - h} L${x + w / 2} 111Z`} fill={k === 1 ? '#7fb87a' : '#6aa86a'} {...line(m)} />
              <Path d={`M${x - w / 2} 111 L${x - w / 2} ${112 - h} L${x - w / 6} ${112 - h} L${x - w / 6} 111Z`} fill={HI} />
              {Array.from({ length: segs }, (_, i) => {
                const y = 108 - (i + 1) * (h / (segs + 0.5))
                return (
                  <G key={i}>
                    <Path d={`M${x - w / 2 - 0.6} ${y} L${x + w / 2 + 0.6} ${y}`} stroke="#4f8d56" strokeWidth={1.8} strokeLinecap="round" />
                    {i % 2 === 1 && <Leaf x={x} y={y} r={k % 2 ? 52 : -52} len={20} w={3.4} fill={LEAF} m={m} />}
                    {i % 2 === 0 && i > 0 && <Leaf x={x} y={y} r={k % 2 ? -46 : 46} len={16} w={3} fill={LEAF_D} m={m} />}
                  </G>
                )
              })}
              <Leaf x={x} y={112 - h + 2} r={-18} len={22} w={3.6} fill={LEAF} m={m} />
              <Leaf x={x} y={112 - h + 2} r={22} len={22} w={3.6} fill={LEAF_D} m={m} />
            </G>
          )
        })}
      </>
    ),
  },
  {
    id: 'glimmerbud', name: 'Glimmer bud', scale: 1, sway: 3,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Glow id="gbGlow" color="#ffe9a0" cx={50} cy={50} r={32} a={0.45} />
        <Leaf x={50} y={102} r={-38} len={32} w={5.5} fill={LEAF} m={m} />
        <Leaf x={50} y={98} r={36} len={28} w={5.5} fill={LEAF_D} m={m} />
        <Path d="M50 111 C50 92 50 78 50 62" {...stem(m)} />
        {/* the closed bud: three golden petals pressed together */}
        <Path d="M50 20 C34 32 34 56 50 64 C66 56 66 32 50 20Z" fill="#f3b94a" {...line(m)} />
        <Path d="M50 20 C42 32 42 54 50 64 C44 52 44 32 50 20Z" fill="#ffd36a" />
        <Path d="M50 20 C58 32 58 54 50 64 C56 50 56 32 50 20Z" fill="rgba(160,90,10,0.28)" />
        <Path d="M50 24 C50 38 50 52 50 62" stroke="rgba(120,60,0,0.25)" strokeWidth={1} />
        <Path d="M42 36 C40 44 42 52 46 58" stroke={HI} strokeWidth={1.6} strokeLinecap="round" fill="none" />
        <Path d="M42 62 C44 68 56 68 58 62 C54 64 46 64 42 62Z" fill={LEAF_D} />
      </>
    ),
  },
  {
    id: 'wisteria', name: 'Wisteria', scale: 0.85, sway: 0.8, period: 1.4,
    layers: { cluster0: (m) => wisteriaCluster(m, 0), cluster1: (m) => wisteriaCluster(m, 1), cluster2: (m) => wisteriaCluster(m, 2) },
    draw: (m, skip) => (
      <>
        <Mound m={m} />
        <Path d="M34 111 C34 96 36 80 40 66 C44 54 52 44 64 40 C72 38 80 42 84 50" stroke="#7c6556" strokeWidth={5} strokeLinecap="round" fill="none" />
        <Path d="M34 108 C34 96 36 80 40 68" stroke={HI} strokeWidth={1.2} strokeLinecap="round" fill="none" />
        {[[44, 64, -30], [54, 48, 10], [70, 40, 30], [80, 46, 50], [38, 78, -50]].map(([x, y, r], i) => (
          <Leaf key={i} x={x} y={y} r={r} len={16} w={4.4} fill={i % 2 ? LEAF : LEAF_D} m={m} />
        ))}
        {[0, 1, 2].map((k) => !skip?.includes(`cluster${k}`) && wisteriaCluster(m, k))}
      </>
    ),
  },
  {
    id: 'hydrangea', name: 'Hydrangea', scale: 0.95, sway: 1.3, period: 1.3,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Leaf x={36} y={108} r={-58} len={30} w={9} fill={LEAF_D} m={m} />
        <Leaf x={64} y={108} r={58} len={30} w={9} fill={LEAF} m={m} />
        <Leaf x={50} y={108} r={0} len={22} w={8} fill={LEAF} m={m} />
        {[[32, 60, 19], [64, 46, 21], [74, 82, 16]].map(([x, y, r], k) => (
          <G key={k}>
            <Path d={`M50 108 C50 96 ${x} ${y + r} ${x} ${y + r * 0.2}`} {...stem(m)} strokeWidth={2.4} />
            {Array.from({ length: 16 }, (_, i) => {
              const a = (i / 16) * 6.283 * 2.2
              const rr = (i / 16) * r * 0.72
              return <Circle key={i} cx={x + Math.cos(a) * rr} cy={y + Math.sin(a) * rr * 0.8} r={r * 0.27} fill={['#8fb2f0', '#a6c1f5', '#7f9fe6', '#b9c9f7'][i % 4]} {...line(m)} />
            })}
            <Circle cx={x} cy={y} r={r * 0.2} fill="#d6e1ff" />
          </G>
        ))}
      </>
    ),
  },
  {
    id: 'threadvine', name: 'Thread vine', scale: 0.95, sway: 2.6,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Path d="M50 111 L50 26" stroke="#8a6f5a" strokeWidth={2.4} strokeLinecap="round" />
        <Path d="M50 108 C74 100 74 90 50 84 C26 78 26 68 50 62 C74 56 74 46 50 40 C34 36 34 28 46 24" stroke="#a5c9b4" strokeWidth={3} strokeLinecap="round" fill="none" />
        <Path d="M50 108 C74 100 74 90 50 84 C26 78 26 68 50 62" stroke={HI} strokeWidth={1} strokeLinecap="round" fill="none" />
        {[[66, 98, 30], [34, 74, -150], [64, 52, 20], [38, 32, -140], [60, 90, 80]].map(([x, y, r], i) => (
          <Ellipse key={i} cx={x} cy={y} rx={5} ry={2.6} transform={`rotate(${r} ${x} ${y})`} fill={i % 2 ? LEAF : LEAF_L} {...line(m)} />
        ))}
        <Path d="M46 24 C42 20 44 15 49 16" stroke="#a5c9b4" strokeWidth={1.8} strokeLinecap="round" fill="none" />
        <Circle cx={50} cy={22} r={1.6} fill="#ffffff" />
      </>
    ),
  },
  {
    id: 'dreamlavender', name: 'Dream lavender', scale: 0.8, sway: 3.2,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Glow id="dlGlow" color="#b9a8f0" cx={50} cy={48} r={44} a={0.5} />
        <Path d="M50 111 C42 108 36 100 34 92 C42 94 48 100 50 111Z" fill={LEAF} />
        <Path d="M50 111 C58 108 64 100 66 92 C58 94 52 100 50 111Z" fill={LEAF_D} />
        {[-22, -11, 0, 11, 22].map((dx, k) => {
          const top = 22 + Math.abs(dx) * 0.9
          return (
            <G key={dx}>
              <Path d={`M50 111 C50 90 ${50 + dx} 70 ${50 + dx * 1.2} ${top + 6}`} {...stem(m)} strokeWidth={2.4} />
              {Array.from({ length: 8 }, (_, i) => (
                <G key={i}>
                  <Ellipse cx={50 + dx * 1.2 + (i % 2 ? 2.4 : -2.4)} cy={top + 6 + i * 5.4} rx={3.2} ry={4.2} fill={['#cdbdff', '#b9a8f0', '#a592e6'][(i + k) % 3]} {...line(m)} />
                  <Ellipse cx={50 + dx * 1.2 + (i % 2 ? 1.6 : -3.2)} cy={top + 5 + i * 5.4} rx={1} ry={1.8} fill={HI} />
                </G>
              ))}
              <Circle cx={50 + dx * 1.2} cy={top + 2} r={2.2} fill="#f1ecff" />
            </G>
          )
        })}
      </>
    ),
  },
  {
    id: 'moonfern', name: 'Moon fern', scale: 0.82, sway: 2.8,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Glow id="mfGlow" color="#cfe8ff" cx={50} cy={52} r={46} a={0.5} />
        <Frond x0={48} y0={111} x1={26} y1={44} cx={36} cy={80} n={7} size={1.05} a="#9fc6d6" b="#b9dbe8" tip="#eef9ff" m={m} />
        <Frond x0={52} y0={111} x1={76} y1={46} cx={66} cy={82} n={7} size={1.05} a="#b9dbe8" b="#9fc6d6" tip="#eef9ff" m={m} />
        <Frond x0={50} y0={111} x1={52} y1={14} cx={46} cy={64} n={9} size={1.25} a="#a9cfe0" b="#c4e3ef" tip="#ffffff" m={m} />
      </>
    ),
  },
  {
    id: 'bloomsucc', name: 'Blooming succulent', scale: 0.98, sway: 0.9, period: 1.6,
    layers: { pot: BASE_PLANTS.find((p) => p.id === 'succulent')!.layers!.pot },
    draw: (m, skip) => (
      <>
        {succulentDraw(m, skip)}
        {[[38, 52, 0.9], [60, 44, 1.05], [76, 58, 0.8]].map(([x, y, s], i) => (
          <G key={i}>
            <Path d={`M${i === 0 ? 46 : i === 1 ? 52 : 58} 70 C${x} 66 ${x} 62 ${x} ${y + 4}`} stroke={STEM} strokeWidth={1.8} strokeLinecap="round" fill="none" />
            <G transform={`translate(${x} ${y}) scale(${s})`}>
              {[0, 72, 144, 216, 288].map((a) => (
                <Ellipse key={a} cx={0} cy={-5} rx={3.2} ry={5.2} transform={`rotate(${a})`} fill={a % 144 ? '#f6a8c0' : '#f9bdd0'} {...line(m)} />
              ))}
              <Circle r={2.6} fill="#ffd98a" />
            </G>
          </G>
        ))}
      </>
    ),
  },

  // ----------------------------------------------------------------------------------------------------- epic -----------
  {
    id: 'orchid', name: 'Dream orchid', scale: 0.92, sway: 2.4, period: 1.3,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Glow id="orGlow" color="#f6c1e6" cx={56} cy={46} r={44} a={0.35} />
        <Leaf x={44} y={110} r={-52} len={36} w={9} fill={LEAF_D} m={m} />
        <Leaf x={54} y={110} r={48} len={34} w={9} fill={LEAF} m={m} />
        <Leaf x={49} y={110} r={-8} len={30} w={8} fill={LEAF} m={m} />
        <Path d="M50 108 C50 84 50 56 60 40 C64 34 72 32 78 38" stroke="#7aa07a" strokeWidth={2.6} strokeLinecap="round" fill="none" />
        {[[52, 76, 0.9], [56, 58, 1.05], [64, 42, 1.1], [76, 38, 0.9]].map(([x, y, s], i) => (
          <G key={i} transform={`translate(${x} ${y}) scale(${s})`}>
            <Ellipse cx={-9} cy={-3} rx={9} ry={6} transform="rotate(-20 -9 -3)" fill="#fbf2f7" {...line(m)} />
            <Ellipse cx={9} cy={-3} rx={9} ry={6} transform="rotate(20 9 -3)" fill="#f6e4ef" {...line(m)} />
            <Ellipse cx={0} cy={-10} rx={5.4} ry={7.4} fill="#fffafc" {...line(m)} />
            <Path d="M-4 0 C-6 7 -2 11 0 11 C2 11 6 7 4 0 C2 3 -2 3 -4 0Z" fill="#c2418f" {...line(m)} />
            <Circle cx={0} cy={-1} r={2} fill="#ffd36a" />
            <Path d="M-14 -5 C-12 -1 -9 1 -6 1" stroke={HI} strokeWidth={1.2} strokeLinecap="round" fill="none" />
          </G>
        ))}
        <Ellipse cx={84} cy={44} rx={3.4} ry={5} fill="#e9b1d6" {...line(m)} />
      </>
    ),
  },
  {
    id: 'dreamcap', name: 'Dream cap', scale: 0.92, sway: 0.8, period: 1.7,
    draw: (m) => (
      <>
        <Glow id="dcGlow" color="#a9b4ff" cx={50} cy={78} r={52} a={0.5} />
        <Mound m={m} />
        {[
          { x: 50, base: 110, top: 58, r: 25, c: '#8d7bd8', c2: '#a592ea' },
          { x: 22, base: 110, top: 80, r: 15, c: '#7a8be0', c2: '#97a6f0' },
          { x: 78, base: 110, top: 84, r: 13, c: '#9a7bd8', c2: '#b296ec' },
        ].map((c, i) => (
          <G key={i}>
            <Path d={`M${c.x - 5} ${c.base} C${c.x - 6} ${c.base - 14} ${c.x - 5} ${c.top + 8} ${c.x - 4} ${c.top + 2} L${c.x + 4} ${c.top + 2} C${c.x + 5} ${c.top + 8} ${c.x + 6} ${c.base - 14} ${c.x + 5} ${c.base}Z`} fill="#f1e8d8" {...line(m)} />
            <Path d={`M${c.x} ${c.base} C${c.x + 1} ${c.base - 14} ${c.x + 1} ${c.top + 8} ${c.x + 0.5} ${c.top + 2} L${c.x + 4} ${c.top + 2} C${c.x + 5} ${c.top + 8} ${c.x + 6} ${c.base - 14} ${c.x + 5} ${c.base}Z`} fill="rgba(150,120,90,0.22)" />
            <Path d={`M${c.x - c.r} ${c.top + 6} C${c.x - c.r} ${c.top - c.r * 0.9} ${c.x + c.r} ${c.top - c.r * 0.9} ${c.x + c.r} ${c.top + 6} C${c.x + c.r * 0.5} ${c.top + 10} ${c.x - c.r * 0.5} ${c.top + 10} ${c.x - c.r} ${c.top + 6}Z`} fill={c.c} {...line(m)} />
            <Path d={`M${c.x + c.r} ${c.top + 6} C${c.x + c.r} ${c.top - c.r * 0.9} ${c.x + c.r * 0.3} ${c.top - c.r * 0.7} ${c.x + c.r * 0.35} ${c.top - c.r * 0.5} C${c.x + c.r * 0.8} ${c.top - c.r * 0.2} ${c.x + c.r * 0.9} ${c.top + 4} ${c.x + c.r * 0.5} ${c.top + 9}Z`} fill="rgba(40,20,110,0.25)" />
            <Path d={`M${c.x - c.r * 0.78} ${c.top + 1} C${c.x - c.r * 0.72} ${c.top - c.r * 0.4} ${c.x - c.r * 0.4} ${c.top - c.r * 0.58} ${c.x - c.r * 0.08} ${c.top - c.r * 0.6}`} stroke={HI} strokeWidth={2} strokeLinecap="round" fill="none" />
            {[[-0.45, -0.1, 0.17], [0.15, -0.5, 0.13], [0.5, 0.0, 0.15], [-0.1, 0.1, 0.1]].map(([dx, dy, rr], k) => (
              <Circle key={k} cx={c.x + dx * c.r} cy={c.top + dy * c.r * 0.7} r={rr * c.r} fill="#f4f0ff" opacity={0.92} />
            ))}
          </G>
        ))}
      </>
    ),
  },
  {
    id: 'crystalrose', name: 'Crystal rose', scale: 0.95, sway: 1.4, period: 1.4,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Glow id="crGlow" color="#bfe6ff" cx={50} cy={46} r={44} a={0.55} />
        <Path d="M50 111 C50 92 52 78 50 62" stroke="#7fb8c0" strokeWidth={3} strokeLinecap="round" fill="none" />
        {[[48, 96, -1], [52, 86, 1], [49, 76, -1]].map(([x, y, d], i) => (
          <Path key={i} d={`M${x} ${y} l${d * 5} -1.5 l${-d * 0.2} 4Z`} fill="#5e9aa2" />
        ))}
        <Leaf x={48} y={100} r={-56} len={26} w={6.4} fill="#9fd8d6" m={m} />
        <Leaf x={52} y={92} r={54} len={26} w={6.4} fill="#8fcccc" m={m} />
        {/* the rose: faceted petals of ice */}
        <Path d="M50 30 L72 40 L76 58 L62 72 L38 72 L24 58 L28 40Z" fill="#9cd3f7" {...line(m)} />
        <Path d="M50 30 L28 40 L24 58 L38 72 L50 56Z" fill="#bfe6ff" />
        <Path d="M50 30 L72 40 L76 58 L62 72 L50 56Z" fill="#7fc0ee" />
        <Path d="M50 38 L64 46 L66 58 L56 66 L44 66 L34 58 L36 46Z" fill="#cdeeff" {...line(m)} />
        <Path d="M50 38 L36 46 L34 58 L44 66 L50 54Z" fill="#e9f8ff" />
        <Path d="M50 38 L64 46 L66 58 L56 66 L50 54Z" fill="#a8dcf8" />
        <Path d="M50 46 L58 52 L56 60 L50 62 L44 60 L42 52Z" fill="#f4fcff" {...line(m)} />
        <Path d="M50 46 L42 52 L44 60 L50 56Z" fill="#ffffff" />
        <Path d="M30 44 L36 48 M70 44 L64 48 M32 62 L38 60 M68 62 L62 60" stroke="rgba(255,255,255,0.7)" strokeWidth={1} strokeLinecap="round" />
      </>
    ),
  },
  // --------------------------------------------------------------------------------------------------- legendary -------
  {
    id: 'aurora', name: 'Aurora tree', scale: 0.82, sway: 0.5, period: 1.9,
    layers: { crown: auroraCrown },
    draw: (m, skip) => (
      <>
        <Mound m={m} />
        <Glow id="auGlow" color="#8ff0d0" cx={50} cy={46} r={56} a={0.4} />
        <Path d="M42 111 C46 100 46 88 47 68 L55 68 C56 88 56 100 62 111 Q52 114 42 111Z" fill="#4a5a68" {...line(m)} />
        <Path d="M46 108 C47 96 47 84 48 70" stroke={HI} strokeWidth={1.6} strokeLinecap="round" fill="none" />
        <Path d="M49 80 C40 74 32 64 30 52 M54 76 C64 70 72 60 74 48" stroke="#4a5a68" strokeWidth={3.4} strokeLinecap="round" fill="none" />
        {!skip?.includes('crown') && auroraCrown(m)}
      </>
    ),
  },
  {
    id: 'celestial', name: 'Celestial bloom', scale: 0.92, sway: 1.6, period: 1.6,
    draw: (m) => (
      <>
        <Mound m={m} />
        <Glow id="ceGlow" color="#a9b4ff" cx={50} cy={44} r={56} a={0.6} />
        <Glow id="ceGlow2" color="#efe6ff" cx={50} cy={44} r={30} a={0.5} />
        <Path d="M50 111 C50 94 50 78 50 62" stroke="#6aa8a6" strokeWidth={3} strokeLinecap="round" fill="none" />
        <Path d="M49.2 108 C49.2 94 49.2 80 49.4 66" stroke="rgba(255,255,255,0.3)" strokeWidth={0.9} strokeLinecap="round" fill="none" />
        <Leaf x={49} y={100} r={-54} len={26} w={7} fill="#4f9a98" m={m} />
        <Leaf x={51} y={94} r={52} len={26} w={7} fill="#5fb0ad" m={m} />
        {/* outer ring: deep night-blue petals, a gold star at each tip */}
        {Array.from({ length: 8 }, (_, i) => (
          <G key={i} transform={`rotate(${i * 45} 50 44)`}>
            <Path d="M50 44 C37 40 36 20 50 8 C64 20 63 40 50 44Z" fill={i % 2 ? '#2f3a9a' : '#27307f'} {...line(m)} />
            <Path d="M50 44 C42 38 41 22 50 12" stroke="rgba(180,190,255,0.35)" strokeWidth={1} strokeLinecap="round" fill="none" />
            <Circle cx={50} cy={9.5} r={1.5} fill="#ffe9a8" />
          </G>
        ))}
        {/* middle ring, offset so each petal sits between two outer ones */}
        {Array.from({ length: 8 }, (_, i) => (
          <G key={i} transform={`rotate(${i * 45 + 22.5} 50 44)`}>
            <Path d="M50 44 C41 40 40 26 50 16 C60 26 59 40 50 44Z" fill={i % 2 ? '#6c7cf2' : '#5b6fe0'} {...line(m)} />
            <Path d="M50 44 C46 38 46 28 50 20" stroke="rgba(255,255,255,0.35)" strokeWidth={1} strokeLinecap="round" fill="none" />
          </G>
        ))}
        {/* inner ring: pale lilac, catching the light */}
        {Array.from({ length: 8 }, (_, i) => (
          <Path key={i} d="M50 44 C44 41 44 32 50 25 C56 32 56 41 50 44Z" transform={`rotate(${i * 45} 50 44)`} fill={i % 2 ? '#c9bcff' : '#b4a6fb'} opacity={0.95} />
        ))}
        {/* the heart: a little galaxy */}
        <Circle cx={50} cy={44} r={11} fill="#15183f" {...line(m)} />
        <Circle cx={50} cy={44} r={11} fill="none" stroke="rgba(196,181,255,0.5)" strokeWidth={1} />
        <Path d="M50 44 C50 38 57 36 59 41 M50 44 C50 50 43 52 41 47 M50 44 C45 44 44 38 48 36 M50 44 C55 44 56 50 52 52" stroke="#c4b5ff" strokeWidth={1.1} strokeLinecap="round" fill="none" />
        <Circle cx={50} cy={44} r={5} fill="rgba(255,244,207,0.45)" />
        <Circle cx={50} cy={44} r={2.4} fill="#fff4cf" />
      </>
    ),
  },
]
