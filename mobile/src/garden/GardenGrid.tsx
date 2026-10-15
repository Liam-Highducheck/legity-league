import { memo, useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'
import { Sparkles } from 'lucide-react-native'
import type { Stage } from '@legity/core/garden/index'
import Svg, { Circle, Defs, G, LinearGradient, Path, Polygon, Polyline, Stop } from 'react-native-svg'
import { Ambient } from './Ambient'
import { GRID, hash, layoutFor, slabBand, tileCenter, tilePoints } from './iso'
import { plantNodes } from './PlantArt'
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
  /** tint for tiles a plant can be placed or moved onto */
  target: string
  dusk: boolean
}

export const DAY: GardenPalette = {
  top: '#cfe5cf', topAlt: '#c3dfc6', topHi: '#e2f1d9', topLo: '#b4d6bb',
  soilL: ['#c6ac8f', '#b39577', '#9e8265'], soilR: ['#b09478', '#9c8064', '#876c52'],
  tuft: '#8fc09c', pebble: '#b8b3a6', selected: '#e8f4c8', target: '#d9ecb8', dusk: false,
}
export const DUSK: GardenPalette = {
  top: '#3a4a66', topAlt: '#34435e', topHi: '#4b5d7e', topLo: '#2d3a54',
  soilL: ['#544a64', '#473f57', '#3a3349'], soilR: ['#453d55', '#392f48', '#2d263b'],
  tuft: '#5f8f8a', pebble: '#6b7088', selected: '#53668a', target: '#4a6a78', dusk: true,
}

/** What stands on a tile. `id` keys the plant so moving it re-positions the same view instead of remounting it. */
export interface GridCell {
  id: string
  species: string
  stage: Stage
  overgrown?: boolean
  /** shows a sparkle: this plant can evolve */
  ready?: boolean
}
/** 5x5 board, row-major. */
export type Cells = (GridCell | null)[]

/** A stable small number per plant id, so each plant sways to its own rhythm. */
const seedOf = (id: string) => {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return (h % 997) + 1
}

const PlantView = memo(function PlantView({ cell, art, w, h }: { cell: GridCell; art: ArtMode; w: number; h: number }) {
  const def = plantById(cell.species)
  if (!def) return null
  // Young plants and neglected ones move less; the sway is a whisper, not a wave.
  const amp = def.sway * (cell.stage === 0 ? 0.6 : cell.stage === 3 ? 1 : 0.8) * (cell.overgrown ? 0.5 : 1)
  return (
    <Sway degrees={amp} seed={seedOf(cell.id)} width={w} height={h}>
      <Svg width={w} height={h} viewBox="0 0 100 120">
        {plantNodes(cell.species, cell.stage, !!cell.overgrown, art)}
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

/** Which tile a touch at (x, y) means. Standing plants win (front row first), then the diamond under the finger. */
export function hitTile(l: ReturnType<typeof layoutFor>, cells: Cells, x: number, y: number, pw: number, ph: number): number | null {
  for (let i = GRID * GRID - 1; i >= 0; i--) {
    if (!cells[i]) continue
    const { x: cx, y: cy } = tileCenter(l, Math.floor(i / GRID), i % GRID)
    const top = cy - ph * (112 / 120) * 0.85
    if (Math.abs(x - cx) < pw * 0.28 && y > top && y < cy + l.tileH * 0.4) return i
  }
  let best: number | null = null
  let bestD = 1
  for (let i = 0; i < GRID * GRID; i++) {
    const { x: cx, y: cy } = tileCenter(l, Math.floor(i / GRID), i % GRID)
    const d = Math.abs(x - cx) / (l.tileW / 2) + Math.abs(y - cy) / (l.tileH / 2)
    if (d <= bestD) {
      best = i
      bestD = d
    }
  }
  return best
}

export function GardenGrid({
  cells,
  art,
  palette,
  selected,
  targets,
  onTile,
}: {
  cells: Cells
  art: ArtMode
  palette: GardenPalette
  selected: number | null
  /** tiles to tint as valid destinations */
  targets?: Set<number> | null
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
                    fill={selected === i ? palette.selected : targets?.has(i) ? palette.target : `url(#tile${alt ? 'b' : 'a'})`}
                    stroke={selected === i ? palette.selected : targets?.has(i) ? palette.target : alt ? palette.topAlt : palette.top}
                    strokeWidth={3}
                    strokeLinejoin="round"
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
            const cell = cells[i]
            if (!cell) return null
            const { x, y } = tileCenter(l, Math.floor(i / GRID), i % GRID)
            return (
              <View key={cell.id} pointerEvents="none" style={{ position: 'absolute', left: x - pw / 2, top: y - ph * (112 / 120) + l.tileH * 0.05 }}>
                <PlantView cell={cell} art={art} w={pw} h={ph} />
                {cell.ready && (
                  <View style={{ position: 'absolute', left: pw / 2 - 9, top: ph * 0.02, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 224, 138, 0.9)' }}>
                    <Sparkles size={11} color="#7a5b12" strokeWidth={2.2} />
                  </View>
                )}
              </View>
            )
          })}
          <Ambient width={width} height={l.height} dusk={palette.dusk} />
          {/* One touch layer for the whole board: a tap on a plant selects its tile, even where it overlaps the tile behind. */}
          <Pressable
            onPress={(e) => {
              const { locationX: x, locationY: y } = e.nativeEvent
              const hit = hitTile(l, cells, x, y, pw, ph)
              if (hit != null) onTile(hit)
            }}
            style={{ position: 'absolute', left: 0, top: 0, width, height: l.height }}
          />
        </>
      )}
    </View>
  )
}
