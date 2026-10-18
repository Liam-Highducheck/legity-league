import { Circle, Defs, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg'
import { Glow, HI, LEAF, LEAF_D, LEAF_L, MID, Mound, SH, STEM, INK, line, star, stem, type ArtMode, type PlantDef } from './artKit'


/** The willow's hanging strands, in two interleaved sets so each set can swing on its own. */
const willowStrands = (m: ArtMode, parity: 0 | 1) =>
  [-34, -26, -18, -9, 0, 9, 18, 26, 34].map((dx, i) => {
    if (i % 2 !== parity) return null
    const x0 = 54 + dx
    const y0 = 40 + (Math.abs(dx) > 20 ? 6 : 0)
    const len = 30 + ((i * 7) % 5) * 6
    return (
      <G key={dx}>
        <Path d={`M${x0} ${y0} C${x0 - 3} ${y0 + len * 0.4} ${x0 + 3} ${y0 + len * 0.7} ${x0 - 1} ${y0 + len}`} stroke={i % 2 ? LEAF_D : LEAF} strokeWidth={2.2} fill="none" strokeLinecap="round" />
        {[0.45, 0.75].map((t) => (
          <Ellipse key={t} cx={x0 + (t > 0.5 ? 1 : -1.5)} cy={y0 + len * t} rx={2.6} ry={1.4} transform={`rotate(${i % 2 ? 40 : -40} ${x0} ${y0 + len * t})`} fill={LEAF_L} />
        ))}
      </G>
    )
  })


const dcHoop = (m: ArtMode) => (
  <>
        <Circle cx={50} cy={46} r={22} fill="none" stroke="#c9a77a" strokeWidth={3.2} />
        <Circle cx={50} cy={46} r={22} fill="none" stroke={HI} strokeWidth={1} strokeDasharray="5 9" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const a = (Math.PI / 4) * i
          const b = (Math.PI / 4) * (i + 3)
          return <Path key={i} d={`M${50 + 21 * Math.cos(a)} ${46 + 21 * Math.sin(a)} L${50 + 21 * Math.cos(b)} ${46 + 21 * Math.sin(b)}`} stroke="#e9dcc6" strokeWidth={0.9} opacity={0.8} />
        })}
        <Circle cx={50} cy={46} r={3} fill="#b9a8f0" {...line(m)} />
  </>
)

const dcFeathers = (m: ArtMode) => (
  <>
        {[-14, 0, 14].map((dx, i) => (
          <G key={dx}>
            <Path d={`M${50 + dx * 0.9} ${66 + Math.abs(dx) * 0.1} L${50 + dx} ${76 + (i === 1 ? 6 : 0)}`} stroke="#c9a77a" strokeWidth={1.2} />
            <Path d={`M${50 + dx} ${74 + (i === 1 ? 6 : 0)} C${50 + dx - 4} ${80 + (i === 1 ? 6 : 0)} ${50 + dx - 3} ${90 + (i === 1 ? 6 : 0)} ${50 + dx} ${94 + (i === 1 ? 6 : 0)} C${50 + dx + 3} ${90 + (i === 1 ? 6 : 0)} ${50 + dx + 4} ${80 + (i === 1 ? 6 : 0)} ${50 + dx} ${74 + (i === 1 ? 6 : 0)}Z`} fill={i === 1 ? '#a592e6' : '#f2a7b8'} {...line(m)} />
          </G>
        ))}
  </>
)



/** The terracotta pot: it stays put while the plant in it sways. */
const succulentPot = (m: ArtMode) => (
  <>
        <Path d="M33 98 L36 109 Q50 113 64 109 L67 98Z" fill="#c9764f" {...line(m)} />
        <Path d="M33 98 L36 109 Q40 111 43 111 L41 98Z" fill="rgba(255,255,255,0.18)" />
        <Path d="M58 98 L60 111 Q63 110 64 109 L67 98Z" fill="rgba(90,40,20,0.25)" />
        <Path d="M30 93 Q30 90 33 90 L67 90 Q70 90 70 93 L70 97 Q70 99 67 99 L33 99 Q30 99 30 97Z" fill="#d98e65" {...line(m)} />
  </>
)

/** Both bonsai share one shape: a shallow glazed pot, a twisting trunk and three cloud-pruned pads of foliage. */
const bonsaiPot = (m: ArtMode) => (
  <>
    <Path d="M30 99 L33 108 Q50 113 67 108 L70 99Z" fill="#6c8fb5" {...line(m)} />
    <Path d="M30 99 L33 108 Q38 110 41 110.5 L39 99Z" fill="rgba(255,255,255,0.2)" />
    <Path d="M60 99 L61 110 Q66 109 67 108 L70 99Z" fill="rgba(20,40,80,0.25)" />
    <Path d="M27 94 Q27 92 30 92 L70 92 Q73 92 73 94 L73 97 Q73 99 70 99 L30 99 Q27 99 27 97Z" fill="#86a8cc" {...line(m)} />
    <Path d="M30 94 L52 94" stroke="rgba(255,255,255,0.4)" strokeWidth={1.2} strokeLinecap="round" />
    <Ellipse cx={50} cy={92.4} rx={21} ry={2.6} fill="#6a5644" />
    <Ellipse cx={40} cy={92} rx={5.5} ry={1.5} fill="#7fae7a" />
    <Ellipse cx={59} cy={92.3} rx={4} ry={1.2} fill="#8dbb80" />
  </>
)

/** A cloud pad: a flat dark underside with a scalloped, lit top. */
const cloudPad = (cx: number, cy: number, r: number, dark: string, mid: string, light: string, m: ArtMode) => (
  <G>
    <Ellipse cx={cx} cy={cy + r * 0.2} rx={r} ry={r * 0.52} fill={dark} {...line(m)} />
    <Circle cx={cx - r * 0.5} cy={cy - r * 0.02} r={r * 0.5} fill={mid} {...line(m)} />
    <Circle cx={cx + r * 0.46} cy={cy - r * 0.04} r={r * 0.52} fill={mid} {...line(m)} />
    <Circle cx={cx} cy={cy - r * 0.26} r={r * 0.6} fill={mid} {...line(m)} />
    <Circle cx={cx - r * 0.18} cy={cy - r * 0.38} r={r * 0.4} fill={light} opacity={0.8} />
    <Circle cx={cx + r * 0.5} cy={cy - r * 0.14} r={r * 0.2} fill={light} opacity={0.55} />
    <Ellipse cx={cx} cy={cy + r * 0.34} rx={r * 0.8} ry={r * 0.2} fill="rgba(28,64,70,0.2)" />
  </G>
)

const bonsaiTrunk = (m: ArtMode, bark: string) => (
  <>
    <Path d="M45 95 C46 88 42 82 46 76 C49 70 53 66 54 58 C55 52 55 48 57 44 L61 45 C61 50 60 55 60 60 C60 68 56 72 54 78 C53 84 57 88 56 95Z" fill={bark} {...line(m)} />
    <Path d="M48 92 C49 86 46 82 49 77" stroke={HI} strokeWidth={1.4} fill="none" strokeLinecap="round" />
    <Path d="M47 80 C42 78 36 76 31 73 M58 62 C63 60 68 58 73 56" stroke={bark} strokeWidth={3.2} strokeLinecap="round" fill="none" />
  </>
)

const bonsaiCrown = (m: ArtMode) => (
  <>
    {cloudPad(30, 72, 15, LEAF_D, LEAF, LEAF_L, m)}
    {cloudPad(73, 57, 17, LEAF_D, LEAF, LEAF_L, m)}
    {cloudPad(54, 39, 19, LEAF_D, LEAF, LEAF_L, m)}
  </>
)

const SAKURA_BLOSSOMS: [number, number][] = [[24, 66], [34, 70], [42, 40], [58, 30], [66, 44], [78, 52], [70, 62], [52, 46], [48, 28], [30, 78]]
const sakuraCrown = (m: ArtMode) => (
  <>
    {cloudPad(30, 72, 15, '#e48fa6', '#f2a7b8', '#ffe3ea', m)}
    {cloudPad(73, 57, 17, '#e48fa6', '#f2a7b8', '#ffe3ea', m)}
    {cloudPad(54, 39, 19, '#e48fa6', '#f2a7b8', '#ffe3ea', m)}
    {SAKURA_BLOSSOMS.map(([x, y], i) => (
      <G key={i} transform={`translate(${x} ${y}) scale(${0.8 + (i % 3) * 0.2})`}>
        {[0, 72, 144, 216, 288].map((a) => (
          <Ellipse key={a} cx={0} cy={-2.8} rx={1.8} ry={2.8} transform={`rotate(${a})`} fill="#fff1f5" />
        ))}
        <Circle r={1} fill="#f2a7b8" />
      </G>
    ))}
  </>
)

const BONSAI_DEF: PlantDef = {
  id: 'bonsai',
  name: 'Cloud bonsai',
  scale: 1,
  sway: 0.6,
  period: 1.4,
  layers: { pot: bonsaiPot, crown: bonsaiCrown },
  draw: (m, skip) => (
    <>
      <Mound m={m} />
      {!skip?.includes('pot') && bonsaiPot(m)}
      {bonsaiTrunk(m, '#8a6f5a')}
      {!skip?.includes('crown') && bonsaiCrown(m)}
    </>
  ),
}

const SAKURA_DEF: PlantDef = {
  id: 'sakura',
  name: 'Sakura bonsai',
  scale: 1,
  sway: 0.6,
  period: 1.4,
  layers: { pot: bonsaiPot, crown: sakuraCrown },
  draw: (m, skip) => (
    <>
      <Mound m={m} />
      {!skip?.includes('pot') && bonsaiPot(m)}
      {bonsaiTrunk(m, '#7c6556')}
      {!skip?.includes('crown') && sakuraCrown(m)}
    </>
  ),
}

export const BASE_PLANTS: PlantDef[] = [
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
        <Path d="M57 46 L50 36 L64 40 C64 56 56 62 50 62 C56 56 57 52 57 46Z" fill="rgba(200, 90, 130, 0.14)" />
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
  BONSAI_DEF,
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
    sway: 0.6,
    period: 1.6,
    layers: { strandsA: (m) => <>{willowStrands(m, 0)}</>, strandsB: (m) => <>{willowStrands(m, 1)}</> },
    draw: (m, skip) => (
      <>
        <Mound m={m} />
        <Path d="M47 111 C48 98 45 86 48 70 C49 58 52 46 55 36 L60 38 C58 50 54 62 54 76 C54 90 57 100 55 111Z" fill="#8a6f5a" {...line(m)} />
        <Path d="M49 108 C50 96 47 84 50 66" stroke={HI} strokeWidth={1.4} fill="none" strokeLinecap="round" />
        <Path d="M54 66 C46 60 38 56 32 50 M56 62 C64 56 72 52 78 46" stroke="#8a6f5a" strokeWidth={3} strokeLinecap="round" fill="none" />
        <Ellipse cx={34} cy={42} rx={16} ry={10} fill={LEAF_D} {...line(m)} />
        <Ellipse cx={74} cy={40} rx={16} ry={10} fill={LEAF_D} {...line(m)} />
        <Ellipse cx={54} cy={34} rx={24} ry={14} fill={LEAF_D} {...line(m)} />
        <Ellipse cx={52} cy={31} rx={19} ry={10} fill={LEAF} />
        <Ellipse cx={40} cy={37} rx={10} ry={5} fill={LEAF} />
        <Ellipse cx={70} cy={36} rx={10} ry={5} fill={LEAF} />
        {!skip?.includes('strandsA') && willowStrands(m, 0)}
        {!skip?.includes('strandsB') && willowStrands(m, 1)}
        <Ellipse cx={44} cy={27} rx={9} ry={3.4} fill={LEAF_L} opacity={0.7} />
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
    sway: 0.7,
    period: 1.2,
    layers: { hoop: (m) => <>{dcHoop(m)}</>, feathers: (m) => <>{dcFeathers(m)}</> },
    draw: (m, skip) => (
      <>
        <Mound m={m} />
        <Path d="M50 111 L50 70" {...stem(m)} />
        <Path d="M50 108 C64 102 64 94 50 88 C36 82 36 76 48 70" stroke="#a5c9b4" strokeWidth={2.6} strokeLinecap="round" fill="none" />
        {[[58, 100, 30], [40, 80, -150], [56, 91, 70]].map(([x, y, r], i) => (
          <Ellipse key={i} cx={x} cy={y} rx={4.6} ry={2.4} transform={`rotate(${r} ${x} ${y})`} fill={i % 2 ? LEAF : LEAF_L} {...line(m)} />
        ))}
        <Path d="M30 52 C26 40 30 30 40 26" stroke="#a5c9b4" strokeWidth={2.2} strokeLinecap="round" fill="none" />
        <Ellipse cx={29} cy={42} rx={4} ry={2.2} transform="rotate(-70 29 42)" fill={LEAF_L} {...line(m)} />
        {!skip?.includes('hoop') && dcHoop(m)}
        {!skip?.includes('feathers') && dcFeathers(m)}
      </>
    ),
  },
  {
    id: 'drowsycap',
    name: 'Drowsy cap',
    scale: 1,
    sway: 0.9,
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
    id: 'succulent',
    name: 'Pillow succulent',
    scale: 1,
    sway: 0.8,
    layers: { pot: (m) => succulentPot(m) },
    draw: (m, skip) => (
      <>
        <Mound m={m} />
        {!skip?.includes('pot') && succulentPot(m)}
        <Path d="M32 92 L50 92" stroke="rgba(255,255,255,0.35)" strokeWidth={1.2} strokeLinecap="round" />
        {[-70, -35, 0, 35, 70].map((a, i) => (
          <Path key={a} d="M50 92 C38 84 38 66 50 58 C62 66 62 84 50 92Z" rotation={a} origin="50, 92" fill={i % 2 ? '#8fcbb4' : '#7fbfa8'} {...line(m)} />
        ))}
        <Path d="M50 92 C42 84 42 70 50 62 C58 70 58 84 50 92Z" fill="#a9dcc6" {...line(m)} />
        <Path d="M46 80 C45 74 46 68 49 64" stroke={MID} strokeWidth={1.2} fill="none" strokeLinecap="round" />
        <Circle cx={50} cy={70} r={2.2} fill="#f6b8c8" />
      </>
    ),
  },
  SAKURA_DEF,
]

