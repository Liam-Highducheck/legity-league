// The in-between looks of the plants you grow from seed: the young stage and the growing stage. They are not shrunk copies
// of the finished plant. Flowers have only leaves and a green bud when young and a coloured, still-closed bud when growing;
// trees have a slim trunk and a puff of leaves; mushrooms start as one small cap. Evolved plants arrive fully grown, so only
// plants with a growth goal need these. Species without an entry fall back to a scaled copy of the mature art.
import type { ReactNode } from 'react'
import { Circle, Ellipse, G, Path } from 'react-native-svg'
import { HI, LEAF, LEAF_D, LEAF_L, Leaf, Mound, SH, STEM, Spark, line, stem, type ArtMode } from './artKit'

export interface StageArt {
  /** `skip` names parts drawn separately (a pot that must stay still while the plant sways). */
  young: (m: ArtMode, skip?: string[]) => ReactNode
  growing: (m: ArtMode, skip?: string[]) => ReactNode
  /** the part that never sways, drawn behind the plant */
  still?: (m: ArtMode) => ReactNode
}

/** A closed bud: a teardrop of colour (or all green while young) hugged by green sepals. */
const Bud = ({ x, y, rx, ry, a, b, green, m }: { x: number; y: number; rx: number; ry: number; a: string; b: string; green?: boolean; m: ArtMode }) => (
  <G transform={`translate(${x} ${y})`}>
    <Path d={`M0 ${-ry} C${-rx * 1.1} ${-ry * 0.3} ${-rx * 1.1} ${ry * 0.6} 0 ${ry * 0.7} C${rx * 1.1} ${ry * 0.6} ${rx * 1.1} ${-ry * 0.3} 0 ${-ry}Z`} fill={green ? '#8fc59c' : b} {...line(m)} />
    <Path d={`M0 ${-ry} C${-rx * 1.1} ${-ry * 0.3} ${-rx * 1.1} ${ry * 0.6} 0 ${ry * 0.7} C${-rx * 0.2} ${ry * 0.1} ${-rx * 0.2} ${-ry * 0.4} 0 ${-ry}Z`} fill={green ? '#b4dcbf' : a} />
    <Path d={`M${-rx * 0.95} ${ry * 0.3} C${-rx * 0.6} ${ry * 0.95} ${rx * 0.6} ${ry * 0.95} ${rx * 0.95} ${ry * 0.3} C${rx * 0.4} ${ry * 0.55} ${-rx * 0.4} ${ry * 0.55} ${-rx * 0.95} ${ry * 0.3}Z`} fill={LEAF_D} />
  </G>
)

interface BloomOpts {
  /** height of the finished bloom above the ground */
  h: number
  count?: 1 | 3 | 5
  rx: number
  ry: number
  /** bud colours: lit side and shaded side */
  a: string
  b: string
  leafA?: string
  leafB?: string
  leafLen?: number
}

/** Flowers: leaves and a short stem with a small green bud while young, a taller stem with a coloured closed bud while growing. */
const bloom = (o: BloomOpts): StageArt => {
  const offs = o.count === 5 ? [-18, -9, 0, 9, 18] : o.count === 3 ? [-13, 0, 13] : [0]
  const leafA = o.leafA ?? LEAF
  const leafB = o.leafB ?? LEAF_D
  const len = o.leafLen ?? 28
  const draw = (frac: number, size: number, green: boolean, leafScale: number) => (m: ArtMode) => (
    <>
      <Mound m={m} />
      <Leaf x={46} y={109} r={-40} len={len * leafScale} w={5.4} fill={leafA} m={m} />
      <Leaf x={54} y={108} r={38} len={len * leafScale * 0.92} w={5.4} fill={leafB} m={m} />
      {frac > 0.7 && <Leaf x={50} y={110} r={-4} len={len * leafScale * 0.7} w={4.6} fill={leafA} m={m} />}
      {offs.map((dx, i) => {
        const hh = o.h * frac * (i === Math.floor(offs.length / 2) ? 1 : 0.84)
        const topX = 50 + dx * 1.05
        return (
          <G key={dx}>
            <Path d={`M${50 + dx * 0.5} 111 C${50 + dx * 0.5} ${111 - hh * 0.55} ${topX} ${111 - hh * 0.7} ${topX} ${111 - hh}`} {...stem(m)} />
            <Bud x={topX} y={111 - hh - o.ry * size * 0.45} rx={o.rx * size} ry={o.ry * size} a={o.a} b={o.b} green={green} m={m} />
          </G>
        )
      })}
    </>
  )
  return { young: draw(0.5, 0.62, true, 0.8), growing: draw(0.82, 0.88, false, 1) }
}

/** A tree: a slim trunk and a puff of leaves, then a thicker trunk and a fuller crown. */
const tree = (o: { trunk: string; leafA: string; leafB: string; leafC: string; bend?: number; blossom?: string }): StageArt => ({
  young: (m) => (
    <>
      <Mound m={m} />
      <Path d={`M48 111 C49 100 ${48 + (o.bend ?? 0)} 92 ${50 + (o.bend ?? 0)} 82 L54 82 C${53 + (o.bend ?? 0)} 92 54 102 53 111Z`} fill={o.trunk} {...line(m)} />
      <Circle cx={52 + (o.bend ?? 0)} cy={74} r={13} fill={o.leafB} {...line(m)} />
      <Circle cx={49 + (o.bend ?? 0)} cy={71} r={9} fill={o.leafA} />
      <Circle cx={54 + (o.bend ?? 0)} cy={68} r={4} fill={o.leafC} opacity={0.7} />
      {o.blossom && [[46, 74], [57, 70]].map(([x, y], i) => <Circle key={i} cx={x + (o.bend ?? 0)} cy={y} r={1.8} fill={o.blossom} />)}
    </>
  ),
  growing: (m) => (
    <>
      <Mound m={m} />
      <Path d={`M46 111 C47 98 ${45 + (o.bend ?? 0)} 88 ${48 + (o.bend ?? 0)} 74 L55 74 C${54 + (o.bend ?? 0)} 88 55 100 55 111Z`} fill={o.trunk} {...line(m)} />
      <Path d="M49 108 C49 98 48 88 50 78" stroke={HI} strokeWidth={1.4} strokeLinecap="round" fill="none" />
      <Circle cx={38 + (o.bend ?? 0)} cy={66} r={11} fill={o.leafB} {...line(m)} />
      <Circle cx={64 + (o.bend ?? 0)} cy={62} r={12} fill={o.leafB} {...line(m)} />
      <Circle cx={51 + (o.bend ?? 0)} cy={55} r={15} fill={o.leafA} {...line(m)} />
      <Circle cx={47 + (o.bend ?? 0)} cy={51} r={9} fill={o.leafC} opacity={0.65} />
      {o.blossom && [[40, 62], [58, 50], [66, 60], [50, 66]].map(([x, y], i) => <Circle key={i} cx={x + (o.bend ?? 0)} cy={y} r={2.2} fill={o.blossom} />)}
    </>
  ),
})

/** A mushroom (or two): one small cap on a short stem, then a bigger cap with its spots. */
const mushroom = (o: { cap: string; capLight: string; second?: boolean; glow?: string }): StageArt => {
  const one = (x: number, base: number, top: number, r: number, spots: boolean, m: ArtMode, c = o.cap) => (
    <G key={x}>
      <Path d={`M${x - 4} ${base} C${x - 5} ${base - 8} ${x - 4} ${top + 4} ${x - 3.5} ${top + 1} L${x + 3.5} ${top + 1} C${x + 4} ${top + 4} ${x + 5} ${base - 8} ${x + 4} ${base}Z`} fill="#f1e8d8" {...line(m)} />
      <Path d={`M${x - r} ${top + 3} C${x - r} ${top - r * 0.9} ${x + r} ${top - r * 0.9} ${x + r} ${top + 3} C${x + r * 0.5} ${top + 6} ${x - r * 0.5} ${top + 6} ${x - r} ${top + 3}Z`} fill={c} {...line(m)} />
      <Path d={`M${x - r * 0.75} ${top + 1} C${x - r * 0.7} ${top - r * 0.4} ${x - r * 0.4} ${top - r * 0.58} ${x - r * 0.1} ${top - r * 0.6}`} stroke={HI} strokeWidth={1.6} strokeLinecap="round" fill="none" />
      {spots && <Circle cx={x - r * 0.35} cy={top - r * 0.1} r={r * 0.17} fill="#f4f0ff" />}
      {spots && <Circle cx={x + r * 0.3} cy={top - r * 0.25} r={r * 0.13} fill="#f4f0ff" />}
    </G>
  )
  return {
    young: (m) => (
      <>
        <Mound m={m} />
        {one(50, 110, 94, 10, false, m)}
      </>
    ),
    growing: (m) => (
      <>
        <Mound m={m} />
        {o.second && one(30, 110, 98, 9, true, m, o.capLight)}
        {one(52, 110, 80, 16, true, m)}
      </>
    ),
  }
}

/** A pot of terracotta, the same one the mature succulent sits in. */
const Pot = () => (
  <>
    <Path d="M33 98 L36 109 Q50 113 64 109 L67 98Z" fill="#c9764f" />
    <Path d="M33 98 L36 109 Q40 111 43 111 L41 98Z" fill="rgba(255,255,255,0.18)" />
    <Path d="M58 98 L60 111 Q63 110 64 109 L67 98Z" fill="rgba(90,40,20,0.25)" />
    <Path d="M30 93 Q30 90 33 90 L67 90 Q70 90 70 93 L70 97 Q70 99 67 99 L33 99 Q30 99 30 97Z" fill="#d98e65" />
  </>
)

const rosette = (n: number, s: number, m: ArtMode) => (
  <>
    {Array.from({ length: n }, (_, i) => {
      const a = n === 1 ? 0 : -60 + (i * 120) / (n - 1)
      return <Path key={i} d="M50 92 C38 84 38 66 50 58 C62 66 62 84 50 92Z" transform={`rotate(${a} 50 92) translate(50 92) scale(${s}) translate(-50 -92)`} fill={i % 2 ? '#8fcbb4' : '#7fbfa8'} {...line(m)} />
    })}
  </>
)

/** Frond leaflets along a curve (the fern's growing stage). */
const littleFrond = (n: number, top: number, m: ArtMode) => (
  <>
    <Path d={`M50 111 C48 96 50 ${top + 12} 54 ${top}`} stroke={m === 'ink' ? '#2f3d38' : STEM} strokeWidth={2.4} strokeLinecap="round" fill="none" />
    {Array.from({ length: n }, (_, i) => {
      const t = (i + 1) / (n + 1)
      const y = 100 - t * (100 - top)
      const x = 50 + 4 * t
      const s = 1 - t * 0.5
      return (
        <G key={i}>
          <Ellipse cx={x - 5 * s} cy={y} rx={6 * s} ry={2.6 * s} transform={`rotate(-30 ${x - 5 * s} ${y})`} fill={i % 2 ? LEAF : LEAF_D} {...line(m)} />
          <Ellipse cx={x + 5 * s} cy={y - 2} rx={6 * s} ry={2.6 * s} transform={`rotate(30 ${x + 5 * s} ${y - 2})`} fill={i % 2 ? LEAF_D : LEAF} {...line(m)} />
        </G>
      )
    })}
    <Ellipse cx={54} cy={top - 2} rx={3} ry={5.5} fill={LEAF} {...line(m)} />
  </>
)

const stalk = (x: number, top: number, w: number, m: ArtMode, leaves: boolean) => {
  const h = 112 - top
  const segs = Math.max(2, Math.round(h / 20))
  return (
    <G key={x}>
      <Path d={`M${x - w / 2} 111 L${x - w / 2} ${top} Q${x} ${top - 5} ${x + w / 2} ${top} L${x + w / 2} 111Z`} fill="#6aa86a" {...line(m)} />
      <Path d={`M${x - w / 2} 111 L${x - w / 2} ${top} L${x - w / 6} ${top} L${x - w / 6} 111Z`} fill={HI} />
      {Array.from({ length: segs }, (_, i) => {
        const y = 108 - (i + 1) * (h / (segs + 0.5))
        return (
          <G key={i}>
            <Path d={`M${x - w / 2 - 0.6} ${y} L${x + w / 2 + 0.6} ${y}`} stroke="#4f8d56" strokeWidth={1.8} strokeLinecap="round" />
            {leaves && i % 2 === 1 && <Leaf x={x} y={y} r={i % 4 === 1 ? 50 : -50} len={14} w={3} fill={LEAF} m={m} />}
          </G>
        )
      })}
      <Leaf x={x} y={top + 2} r={-18} len={16} w={3.2} fill={LEAF} m={m} />
      <Leaf x={x} y={top + 2} r={20} len={16} w={3.2} fill={LEAF_D} m={m} />
    </G>
  )
}

const trefoil = (x: number, y: number, r: number, s: number, m: ArtMode) => (
  <G key={`${x}-${y}`}>
    <Path d={`M50 110 Q${x} 104 ${x} ${y + 6 * s}`} {...stem(m)} strokeWidth={2} />
    <G transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      {[-90, 30, 150].map((a, i) => (
        <Ellipse key={a} cx={Math.cos((a * Math.PI) / 180) * 6.4} cy={Math.sin((a * Math.PI) / 180) * 6.4} rx={6.2} ry={5.4} transform={`rotate(${a + 90} ${Math.cos((a * Math.PI) / 180) * 6.4} ${Math.sin((a * Math.PI) / 180) * 6.4})`} fill={i === 1 ? LEAF_D : LEAF} {...line(m)} />
      ))}
      <Path d="M0 -4 L0 3 M-3 -3 L0 0 L3 -3" stroke="rgba(255,255,255,0.5)" strokeWidth={1} strokeLinecap="round" fill="none" />
    </G>
  </G>
)

const pad = (cx: number, rx: number, fill: string, m: ArtMode) => (
  <>
    <Ellipse cx={cx} cy={105} rx={rx + 6} ry={7} fill="#8fc7e0" opacity={0.35} />
    <Path d={`M${cx - rx} 100 C${cx - rx} 94 ${cx - rx * 0.6} 92 ${cx} 92 C${cx + rx * 0.6} 92 ${cx + rx} 94 ${cx + rx} 100 C${cx + rx} 107 ${cx + rx * 0.6} 110 ${cx} 110 C${cx - rx * 0.6} 110 ${cx - rx} 107 ${cx - rx} 100Z`} fill={fill} {...line(m)} />
    <Path d={`M${cx - rx} 100 C${cx - rx} 94 ${cx - rx * 0.6} 92 ${cx} 92 C${cx - rx * 0.4} 98 ${cx - rx * 0.4} 104 ${cx} 110 C${cx - rx * 0.6} 110 ${cx - rx} 107 ${cx - rx} 100Z`} fill={HI} />
  </>
)

const pineTier = (top: number, base: number, half: number, fill: string, m: ArtMode, snow?: boolean) => (
  <G key={top}>
    <Path d={`M50 ${top} L${50 + half} ${base} Q50 ${base + 5} ${50 - half} ${base}Z`} fill={fill} {...line(m)} />
    <Path d={`M50 ${top} L${50 + half} ${base} Q${50 + half * 0.5} ${base + 2} ${50 + half * 0.2} ${base + 2} Q${50 + half * 0.2} ${top + (base - top) * 0.5} 50 ${top}Z`} fill={SH} />
    {snow && <Path d={`M50 ${top} L${50 - half * 0.45} ${top + (base - top) * 0.45} Q${50 - half * 0.15} ${top + (base - top) * 0.38} 50 ${top + (base - top) * 0.5} Q${50 + half * 0.15} ${top + (base - top) * 0.38} ${50 + half * 0.45} ${top + (base - top) * 0.45}Z`} fill="#f4fbff" />}
  </G>
)

export const STAGE_ART: Record<string, StageArt> = {
  // --- sprouts, leaves and tufts ---------------------------------------------------------------------------------
  sprout: {
    young: (m) => (
      <>
        <Mound m={m} />
        <Path d="M50 111 C50 104 50 100 50 96" {...stem(m)} />
        <Leaf x={50} y={98} r={-28} len={20} w={6} fill={LEAF} m={m} />
      </>
    ),
    growing: (m) => (
      <>
        <Mound m={m} />
        <Path d="M50 111 C50 102 50 96 50 90" {...stem(m)} />
        <Leaf x={50} y={92} r={-44} len={24} w={7} fill={LEAF} m={m} />
        <Leaf x={50} y={88} r={44} len={22} w={6.4} fill={LEAF_D} m={m} />
      </>
    ),
  },
  clover: {
    young: (m) => (
      <>
        <Mound m={m} />
        {trefoil(50, 94, 0, 1, m)}
      </>
    ),
    growing: (m) => (
      <>
        <Mound m={m} />
        {trefoil(36, 98, -10, 0.95, m)}
        {trefoil(62, 90, 8, 1.05, m)}
      </>
    ),
  },
  reed: {
    young: (m) => (
      <>
        <Mound m={m} />
        <Path d="M47 111 C46 102 45 94 43 86" stroke={LEAF} strokeWidth={3.2} strokeLinecap="round" fill="none" />
        <Path d="M53 111 C55 103 58 97 63 91" stroke={LEAF_D} strokeWidth={3.2} strokeLinecap="round" fill="none" />
        <Path d="M50 111 C50 100 50 92 50 82" stroke={LEAF} strokeWidth={3.2} strokeLinecap="round" fill="none" />
      </>
    ),
    growing: (m) => (
      <>
        <Mound m={m} />
        {[['M44 111 C42 94 38 78 30 64', LEAF_D], ['M47 111 C46 90 46 74 44 54', LEAF], ['M52 111 C54 92 60 76 68 62', LEAF_D], ['M56 111 C60 98 68 88 78 80', LEAF]].map(([d, c], i) => (
          <Path key={i} d={d} stroke={c} strokeWidth={3.4} strokeLinecap="round" fill="none" />
        ))}
        <Ellipse cx={45} cy={50} rx={2.6} ry={6} fill="#9a7a52" />
      </>
    ),
  },
  bamboo: {
    young: (m) => (
      <>
        <Mound m={m} />
        {stalk(52, 74, 5.2, m, false)}
      </>
    ),
    growing: (m) => (
      <>
        <Mound m={m} />
        {stalk(44, 52, 5.4, m, true)}
        {stalk(58, 66, 5, m, true)}
      </>
    ),
  },
  fern: {
    young: (m) => (
      <>
        <Mound m={m} />
        <Path d="M50 111 C50 98 50 88 51 78 C52 68 60 64 63 70 C65 75 59 78 57 74" stroke={m === 'ink' ? '#2f3d38' : STEM} strokeWidth={3.2} strokeLinecap="round" fill="none" />
        <Ellipse cx={46} cy={96} rx={6} ry={2.6} transform="rotate(-28 46 96)" fill={LEAF} {...line(m)} />
        <Ellipse cx={55} cy={90} rx={6} ry={2.6} transform="rotate(26 55 90)" fill={LEAF_D} {...line(m)} />
      </>
    ),
    growing: (m) => (
      <>
        <Mound m={m} />
        {littleFrond(5, 54, m)}
      </>
    ),
  },
  threadvine: {
    young: (m) => (
      <>
        <Mound m={m} />
        <Path d="M50 111 L50 74" stroke="#8a6f5a" strokeWidth={2.4} strokeLinecap="round" />
        <Path d="M50 108 C68 102 68 94 50 88" stroke="#a5c9b4" strokeWidth={2.8} strokeLinecap="round" fill="none" />
        <Ellipse cx={61} cy={99} rx={4.4} ry={2.3} transform="rotate(30 61 99)" fill={LEAF_L} {...line(m)} />
      </>
    ),
    growing: (m) => (
      <>
        <Mound m={m} />
        <Path d="M50 111 L50 48" stroke="#8a6f5a" strokeWidth={2.4} strokeLinecap="round" />
        <Path d="M50 108 C74 100 74 90 50 84 C26 78 26 68 50 62" stroke="#a5c9b4" strokeWidth={3} strokeLinecap="round" fill="none" />
        {[[64, 97, 30], [36, 73, -150]].map(([x, y, r], i) => (
          <Ellipse key={i} cx={x} cy={y} rx={4.8} ry={2.5} transform={`rotate(${r} ${x} ${y})`} fill={i % 2 ? LEAF : LEAF_L} {...line(m)} />
        ))}
        <Path d="M50 62 C60 58 62 52 54 48" stroke="#a5c9b4" strokeWidth={2} strokeLinecap="round" fill="none" />
      </>
    ),
  },

  // --- succulents and cacti ----------------------------------------------------------------------------------------
  succulent: {
    still: () => <Pot />,
    young: (m, skip) => (
      <>
        <Mound m={m} />
        {!skip?.includes('pot') && <Pot />}
        {rosette(3, 0.62, m)}
      </>
    ),
    growing: (m, skip) => (
      <>
        <Mound m={m} />
        {!skip?.includes('pot') && <Pot />}
        {rosette(5, 0.85, m)}
      </>
    ),
  },
  cactus: {
    young: (m) => (
      <>
        <Ellipse cx={50} cy={111} rx={20} ry={5} fill="#d7c29a" />
        <Ellipse cx={50} cy={109} rx={14} ry={3.4} fill="#e6d3ab" />
        <Ellipse cx={50} cy={96} rx={13} ry={14} fill="#78b99a" {...line(m)} />
        <Path d="M42 90 Q41 98 45 106 Q38 98 42 90Z" fill={HI} />
        <Path d="M50 83 L50 109 M44 85 L45 107 M56 85 L55 107" stroke="rgba(30,80,60,0.2)" strokeWidth={1} />
        {[[46, 92], [54, 98], [50, 104]].map(([x, y], i) => (
          <Path key={i} d={`M${x} ${y} l-1.4 -1.8 M${x} ${y} l1.4 -1.8`} stroke="#f2f8e4" strokeWidth={0.9} strokeLinecap="round" />
        ))}
      </>
    ),
    growing: (m) => (
      <>
        <Ellipse cx={50} cy={111} rx={22} ry={5.5} fill="#d7c29a" />
        <Ellipse cx={50} cy={109} rx={16} ry={3.6} fill="#e6d3ab" />
        <Path d="M40 108 L40 72 Q40 58 50 58 Q60 58 60 72 L60 108Z" fill="#78b99a" {...line(m)} />
        <Path d="M40 108 L40 72 Q40 60 46 58 Q43 70 44 108Z" fill={HI} />
        <Path d="M60 108 L60 72 Q60 60 55 58 Q57 70 56 108Z" fill={SH} />
        {[45, 50, 55].map((x) => (
          <Path key={x} d={`M${x} 64 L${x} 106`} stroke="rgba(30,80,60,0.2)" strokeWidth={1} />
        ))}
        {[[45, 72], [55, 80], [45, 90], [55, 98], [50, 84]].map(([x, y], i) => (
          <Path key={i} d={`M${x} ${y} l-1.6 -2 M${x} ${y} l1.6 -2`} stroke="#f2f8e4" strokeWidth={0.9} strokeLinecap="round" />
        ))}
        <Ellipse cx={50} cy={56} rx={3} ry={2.2} fill="#f2a7b8" />
      </>
    ),
  },

  // --- flowers: leaves and a bud, then a bigger coloured bud -----------------------------------------------------
  tulip: bloom({ h: 60, rx: 6.5, ry: 10, a: '#f7c3cf', b: '#f2a7b8', leafLen: 32 }),
  chamomile: bloom({ h: 58, count: 3, rx: 5, ry: 6, a: '#ffffff', b: '#f3e7b4' }),
  dandelion: bloom({ h: 66, rx: 6, ry: 6.5, a: '#ffe17a', b: '#f0b83c', leafLen: 30 }),
  lavender: bloom({ h: 60, count: 3, rx: 3.2, ry: 10, a: '#cdbdff', b: '#a592e6', leafLen: 26 }),
  bluebell: bloom({ h: 66, rx: 5, ry: 8, a: '#8d97f5', b: '#6f7ce6', leafLen: 34 }),
  poppy: bloom({ h: 62, rx: 6.5, ry: 8, a: '#f58a7c', b: '#d9494a', leafLen: 28 }),
  moonlily: bloom({ h: 66, rx: 6, ry: 9, a: '#f4f1ff', b: '#dfe6ff' }),
  glimmerbud: bloom({ h: 52, rx: 8, ry: 14, a: '#ffd36a', b: '#f3b94a', leafLen: 32 }),
  crystalrose: bloom({ h: 62, rx: 7, ry: 9, a: '#e9f8ff', b: '#9cd3f7', leafA: '#9fd8d6', leafB: '#8fcccc' }),
  celestial: bloom({ h: 66, rx: 7, ry: 10, a: '#5b6fe0', b: '#2f3a8e', leafA: '#4f9a98', leafB: '#5fb0ad' }),
  orchid: {
    young: (m) => (
      <>
        <Mound m={m} />
        <Leaf x={44} y={110} r={-52} len={26} w={8} fill={LEAF_D} m={m} />
        <Leaf x={54} y={110} r={48} len={24} w={8} fill={LEAF} m={m} />
        <Leaf x={49} y={110} r={-6} len={20} w={7} fill={LEAF} m={m} />
      </>
    ),
    growing: (m) => (
      <>
        <Mound m={m} />
        <Leaf x={44} y={110} r={-52} len={34} w={9} fill={LEAF_D} m={m} />
        <Leaf x={54} y={110} r={48} len={32} w={9} fill={LEAF} m={m} />
        <Leaf x={49} y={110} r={-8} len={28} w={8} fill={LEAF} m={m} />
        <Path d="M50 108 C50 88 52 72 60 60 C64 55 70 54 74 58" stroke="#7aa07a" strokeWidth={2.4} strokeLinecap="round" fill="none" />
        {[[52, 84], [55, 72], [62, 62], [72, 57]].map(([x, y], i) => (
          <Ellipse key={i} cx={x} cy={y} rx={3.2 - i * 0.3} ry={4.2 - i * 0.3} fill={i === 0 ? '#e9b1d6' : '#f3dcea'} {...line(m)} />
        ))}
      </>
    ),
  },
  hydrangea: {
    young: (m) => (
      <>
        <Mound m={m} />
        <Leaf x={40} y={108} r={-56} len={22} w={8} fill={LEAF_D} m={m} />
        <Leaf x={60} y={108} r={56} len={22} w={8} fill={LEAF} m={m} />
        <Leaf x={50} y={108} r={0} len={16} w={7} fill={LEAF} m={m} />
      </>
    ),
    growing: (m) => (
      <>
        <Mound m={m} />
        <Leaf x={36} y={108} r={-58} len={28} w={9} fill={LEAF_D} m={m} />
        <Leaf x={64} y={108} r={58} len={28} w={9} fill={LEAF} m={m} />
        <Leaf x={50} y={108} r={0} len={20} w={8} fill={LEAF} m={m} />
        {[[40, 76, 7], [60, 70, 8], [52, 86, 6]].map(([x, y, r], i) => (
          <G key={i}>
            <Path d={`M50 108 Q${x} 100 ${x} ${y + r}`} {...stem(m)} strokeWidth={2.2} />
            {[0, 1, 2, 3, 4].map((k) => (
              <Circle key={k} cx={x + Math.cos(k * 1.25) * r * 0.5} cy={y + Math.sin(k * 1.25) * r * 0.45} r={r * 0.36} fill={k % 2 ? '#b4dcc8' : '#9fc9b4'} {...line(m)} />
            ))}
          </G>
        ))}
      </>
    ),
  },
  wisteria: {
    young: (m) => (
      <>
        <Mound m={m} />
        <Path d="M36 111 C36 102 38 94 41 86" stroke="#7c6556" strokeWidth={4} strokeLinecap="round" fill="none" />
        <Leaf x={41} y={88} r={-30} len={16} w={4.4} fill={LEAF} m={m} />
        <Leaf x={41} y={90} r={36} len={14} w={4} fill={LEAF_D} m={m} />
      </>
    ),
    growing: (m) => (
      <>
        <Mound m={m} />
        <Path d="M34 111 C34 98 36 84 40 72 C44 62 50 56 58 52" stroke="#7c6556" strokeWidth={4.4} strokeLinecap="round" fill="none" />
        {[[42, 74, -40], [50, 62, 8], [58, 53, 34], [38, 88, -56]].map(([x, y, r], i) => (
          <Leaf key={i} x={x} y={y} r={r} len={14} w={4} fill={i % 2 ? LEAF : LEAF_D} m={m} />
        ))}
        {[[44, 66], [56, 54]].map(([x, y], i) => (
          <G key={i}>
            {[0, 1, 2].map((k) => (
              <Ellipse key={k} cx={x + (k % 2 ? 1 : -1)} cy={y + 5 + k * 4} rx={3.2 - k * 0.5} ry={2.4} fill={k % 2 ? '#9fc9a0' : '#b7a0e6'} {...line(m)} />
            ))}
          </G>
        ))}
      </>
    ),
  },

  // --- water ---------------------------------------------------------------------------------------------------------------
  lotus: {
    young: (m) => (
      <>
        {pad(50, 24, '#5fa882', m)}
        <Path d="M50 98 C50 92 50 88 50 84" {...stem(m)} />
        <Bud x={50} y={78} rx={4} ry={7} a="#b4dcbf" b="#8fc59c" green m={m} />
      </>
    ),
    growing: (m) => (
      <>
        {pad(50, 32, '#5fa882', m)}
        <Path d="M50 98 C50 88 50 80 50 72" {...stem(m)} />
        <Bud x={50} y={64} rx={7} ry={11} a="#ffdce6" b="#f7b6cb" m={m} />
      </>
    ),
  },

  // --- trees ---------------------------------------------------------------------------------------------------------------
  bonsai: tree({ trunk: '#8a6f5a', leafA: LEAF, leafB: LEAF_D, leafC: LEAF_L, bend: 3 }),
  willow: {
    young: (m) => (
      <>
        <Mound m={m} />
        <Path d="M48 111 C49 100 48 90 50 80 L54 80 C53 90 54 102 53 111Z" fill="#8a6f5a" {...line(m)} />
        <Ellipse cx={52} cy={74} rx={13} ry={8} fill={LEAF_D} {...line(m)} />
        <Ellipse cx={51} cy={72} rx={10} ry={5} fill={LEAF} />
        {[-9, -3, 3, 9].map((dx, i) => (
          <Path key={dx} d={`M${52 + dx} 78 C${51 + dx} ${84 + i} ${53 + dx} ${88 + i} ${52 + dx} ${92 - i}`} stroke={i % 2 ? LEAF_D : LEAF} strokeWidth={2} fill="none" strokeLinecap="round" />
        ))}
      </>
    ),
    growing: (m) => (
      <>
        <Mound m={m} />
        <Path d="M47 111 C48 98 46 88 49 72 L55 72 C54 88 55 100 55 111Z" fill="#8a6f5a" {...line(m)} />
        <Ellipse cx={34} cy={58} rx={12} ry={7} fill={LEAF_D} {...line(m)} />
        <Ellipse cx={70} cy={56} rx={12} ry={7} fill={LEAF_D} {...line(m)} />
        <Ellipse cx={52} cy={52} rx={19} ry={11} fill={LEAF_D} {...line(m)} />
        <Ellipse cx={50} cy={49} rx={14} ry={7} fill={LEAF} />
        {[-24, -16, -8, 0, 8, 16, 24].map((dx, i) => (
          <Path key={dx} d={`M${52 + dx} ${58 + (Math.abs(dx) > 18 ? 2 : 0)} C${50 + dx} ${70 + i} ${54 + dx} ${80 + (i % 3) * 3} ${52 + dx} ${92 - (i % 2) * 4}`} stroke={i % 2 ? LEAF_D : LEAF} strokeWidth={2} fill="none" strokeLinecap="round" />
        ))}
      </>
    ),
  },
  aurora: {
    young: (m) => (
      <>
        <Mound m={m} />
        <Path d="M47 111 C48 100 47 92 49 82 L54 82 C53 92 54 102 54 111Z" fill="#4a5a68" {...line(m)} />
        <Path d="M38 80 C40 66 60 62 64 78" stroke="#6ee7b7" strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.85} />
        <Path d="M42 80 C44 70 58 68 60 78" stroke="#a78bfa" strokeWidth={3.4} strokeLinecap="round" fill="none" opacity={0.85} />
        <Spark x={34} y={70} s={0.5} fill="#ffffff" />
      </>
    ),
    growing: (m) => (
      <>
        <Mound m={m} />
        <Path d="M45 111 C47 100 46 90 48 74 L55 74 C54 90 55 100 57 111Z" fill="#4a5a68" {...line(m)} />
        <Path d="M30 74 C32 48 66 44 72 70" stroke="#6ee7b7" strokeWidth={7} strokeLinecap="round" fill="none" opacity={0.85} />
        <Path d="M36 74 C38 54 62 52 66 72" stroke="#5eead4" strokeWidth={5.5} strokeLinecap="round" fill="none" opacity={0.85} />
        <Path d="M26 70 C26 38 76 36 78 66" stroke="#a78bfa" strokeWidth={4.5} strokeLinecap="round" fill="none" opacity={0.85} />
        <Spark x={26} y={44} s={0.6} fill="#ffffff" />
        <Spark x={74} y={40} s={0.5} fill="#ffffff" />
      </>
    ),
  },
  pine: {
    young: (m) => (
      <>
        <Mound m={m} />
        <Path d="M47 111 L47 100 L53 100 L53 111Z" fill="#8a6f5a" {...line(m)} />
        {pineTier(74, 102, 14, '#5f9f78', m)}
      </>
    ),
    growing: (m) => (
      <>
        <Mound m={m} />
        <Path d="M46 111 L46 98 L54 98 L54 111Z" fill="#8a6f5a" {...line(m)} />
        {pineTier(62, 102, 20, '#4f8d68', m)}
        {pineTier(44, 78, 14, '#6aae85', m)}
      </>
    ),
  },

  // --- mushrooms -----------------------------------------------------------------------------------------------------------
  drowsycap: mushroom({ cap: '#8d7bd8', capLight: '#a592ea' }),
  dreamcap: mushroom({ cap: '#8d7bd8', capLight: '#7a8be0', second: true }),
}
