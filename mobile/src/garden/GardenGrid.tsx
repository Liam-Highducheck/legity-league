import { memo, useMemo, useState } from 'react'
import { View } from 'react-native'
import Svg, { Circle, Defs, G, LinearGradient, Path, Polygon, Polyline, Stop } from 'react-native-svg'
import { Ambient } from './Ambient'
import { GRID, hash, layoutFor, slabBand, tileCenter, tilePoints } from './iso'
import { plantById, type ArtMode } from './plants'
import { Sway } from './Sway'

export interface GardenPalette {
  top: string
  topAlt: string
  /** lighter / darker ends of the tile gradient */
  topHi: string
  topLo: string
  /** soil strata, light to dark, for the left (lit) and right (shaded) faces */
  soilL: [string, string, string]
  soilR: [string, string, string]
  tuft: string
  pebble: string
  selected: string
  dusk: boolean
}

export const DAY: GardenPalette = {
  top: '#cfe5cf', topAlt: '#c3dfc6', topHi: '#e2f1d9', topLo: '#b4d6bb',
  soilL: ['#c6ac8f', '#b39577', '#9e8265'], soilR: ['#b09478', '#9c8064', '#876c52'],
  tuft: '#8fc09c', pebble: '#b8b3a6', selected: '#e8f4c8', dusk: false,
}
export const DUSK: GardenPalette = {
  top: '#3a4a66', topAlt: '#34435e', topHi: '#4b5d7e', topLo: '#2d3a54',
  soilL: ['#544a64', '#473f57', '#3a3349'], soilR: ['#453d55', '#392f48', '#2d263b'],
  tuft: '#5f8f8a', pebble: '#6b7088', selected: '#53668a', dusk: true,
}

/** 5x5 board of plant ids (or null), row-major. */
export type Cells = (string | null)[]

const PlantView = memo(function PlantView({ id, art, w, h, seed }: { id: string; art: ArtMode; w: number; h: number; seed: number }) {
  const def = plantById(id)
  if (!def) return null
  return (
    <Sway degrees={def.sway} seed={seed} width={w} height={h}>
      <Svg width={w} height={h} viewBox="0 0 100 120">
        <G transform={`translate(50 112) scale(${def.scale}) translate(-50 -112)`}>{def.draw(art)}</G>
      </Svg>
    </Sway>
  )
})

/** Tuft strokes (one path string for the whole board) and pebble dots, placed per tile from a hash. */
function scatter(l: ReturnType<typeof layoutFor>) {
  let tufts = ''
  const pebbles: { x: number; y: number; r: number }[] = []
  for (let i = 0; i < GRID * GRID; i++) {
    const { x, y } = tileCenter(l, Math.floor(i / GRID), i % GRID)
    const t = 1 + Math.floor(hash(i, 1) * 3)
    for (let k = 0; k < t; k++) {
      const px = x + (hash(i, 10 + k) - 0.5) * l.tileW * 0.6
      const py = y + (hash(i, 20 + k) - 0.5) * l.tileH * 0.5
      const s = l.tileW * 0.045
      tufts += `M${px},${py} l${-s * 0.6},${-s * 1.3} M${px},${py} l0,${-s * 1.7} M${px},${py} l${s * 0.6},${-s * 1.3} `
    }
    if (hash(i, 3) > 0.55) pebbles.push({ x: x + (hash(i, 4) - 0.5) * l.tileW * 0.5, y: y + (hash(i, 5) - 0.5) * l.tileH * 0.4, r: 1.2 + hash(i, 6) * 1.2 })
  }
  return { tufts, pebbles }
}

export function GardenGrid({
  cells,
  art,
  palette,
  selected,
  onTile,
}: {
  cells: Cells
  art: ArtMode
  palette: GardenPalette
  selected: number | null
  onTile: (index: number) => void
}) {
  const [width, setWidth] = useState(0)
  const l = layoutFor(width || 1)
  const pw = l.tileW * 1.0
  const ph = pw * 1.2
  const tiles = Array.from({ length: GRID * GRID }, (_, i) => i)
  const { tufts, pebbles } = useMemo(() => scatter(l), [l.tileW, l.headroom]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ width: '100%', height: width ? l.height : 0 }}>
      {width > 0 && (
        <>
          <Svg width={width} height={l.height}>
            <Defs>
              {(['a', 'b'] as const).map((k) => (
                <LinearGradient key={k} id={`tile${k}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={palette.topHi} />
                  <Stop offset="1" stopColor={k === 'a' ? palette.top : palette.topAlt} />
                </LinearGradient>
              ))}
            </Defs>
            {(['left', 'right'] as const).map((side) => {
              const c = side === 'left' ? palette.soilL : palette.soilR
              return (
                <G key={side}>
                  <Polygon points={slabBand(l, side, 0, 0.42)} fill={c[0]} />
                  <Polygon points={slabBand(l, side, 0.42, 0.74)} fill={c[1]} />
                  <Polygon points={slabBand(l, side, 0.74, 1)} fill={c[2]} />
                </G>
              )
            })}
            {tiles.map((i) => {
              const r = Math.floor(i / GRID)
              const c = i % GRID
              const alt = (r + c) % 2
              const { x, y } = tileCenter(l, r, c)
              const hw = l.tileW / 2
              const hh = l.tileH / 2
              return (
                <G key={i}>
                  <Polygon
                    points={tilePoints(l, r, c)}
                    fill={selected === i ? palette.selected : `url(#tile${alt ? 'b' : 'a'})`}
                    stroke={selected === i ? palette.selected : alt ? palette.topAlt : palette.top}
                    strokeWidth={3}
                    strokeLinejoin="round"
                    onPress={() => onTile(i)}
                  />
                  {/* light catches the two back edges, the front edges fall into soft shade */}
                  <Polyline points={`${x - hw + 2},${y} ${x},${y - hh + 1} ${x + hw - 2},${y}`} stroke="#ffffff" strokeOpacity={palette.dusk ? 0.12 : 0.45} strokeWidth={1.2} fill="none" strokeLinecap="round" />
                  <Polyline points={`${x - hw + 2},${y} ${x},${y + hh - 1} ${x + hw - 2},${y}`} stroke={palette.soilR[2]} strokeOpacity={0.22} strokeWidth={1.2} fill="none" strokeLinecap="round" />
                </G>
              )
            })}
            {/* grass tufts and pebbles, scattered deterministically so they never jump between renders */}
            <Path d={tufts} stroke={palette.tuft} strokeWidth={1.3} strokeLinecap="round" fill="none" pointerEvents="none" />
            {pebbles.map((p, k) => (
              <Circle key={k} cx={p.x} cy={p.y} r={p.r} fill={palette.pebble} opacity={0.7} pointerEvents="none" />
            ))}
          </Svg>
          {/* Plants sit above the ground; drawing order = depth, so later rows overlap earlier ones. */}
          {tiles.map((i) => {
            const id = cells[i]
            if (!id) return null
            const { x, y } = tileCenter(l, Math.floor(i / GRID), i % GRID)
            return (
              <View key={i} pointerEvents="none" style={{ position: 'absolute', left: x - pw / 2, top: y - ph * (112 / 120) + l.tileH * 0.05 }}>
                <PlantView id={id} art={art} w={pw} h={ph} seed={i + 1} />
              </View>
            )
          })}
          <Ambient width={width} height={l.height} dusk={palette.dusk} />
        </>
      )}
    </View>
  )
}
