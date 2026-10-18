import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, Pressable, View } from 'react-native'
import { ChevronDown, Sparkles } from 'lucide-react-native'
import type { Stage } from '@legity/core/garden/index'
import Svg, { Circle, Defs, G, LinearGradient, Path, Polygon, Polyline, Stop } from 'react-native-svg'
import { Fireflies, Petals } from './Ambient'
import { Burst, type BurstKind, type BurstSpec } from './Burst'
import { useReducedMotion } from './motion'
import { DaySky, Sky } from './Sky'
import { GRID, hash, layoutFor, slabBand, tileCenter, tilePoints } from './iso'
import { Decal } from './decals'
import { PlantFigure } from './PlantFigure'
import { plantById, type ArtMode } from './plants'
import { Appear, WindProvider } from './Sway'

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
/** Backdrop gradient behind the board for a palette. */
export const skyGradient = (p: GardenPalette): [string, string] => (p.dusk ? ['#141a30', '#2b3158'] : ['#bfe0f5', '#eef6e6'])

/** 5x5 board, row-major. */
export type Cells = (GridCell | null)[]

/** A stable small number per plant id, so each plant sways to its own rhythm. */
const seedOf = (id: string) => {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return (h % 997) + 1
}

const PlantView = memo(function PlantView({ cell, art, w, h, phase, still }: { cell: GridCell; art: ArtMode; w: number; h: number; phase: number; still: boolean }) {
  return (
    <>
      {cell.stage === 3 && !cell.overgrown && <Decal species={cell.species} w={w} h={h} />}
      <PlantFigure species={cell.species} stage={cell.stage} overgrown={!!cell.overgrown} art={art} w={w} h={h} phase={phase} still={still} />
    </>
  )
})

/** Soft breathing glow over the tiles that matter right now (the selected one, or every valid destination). */
function TilePulse({ l, tiles, color, still }: { l: ReturnType<typeof layoutFor>; tiles: number[]; color: string; still: boolean }) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (still) return
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    a.start()
    return () => a.stop()
  }, [v, still])
  if (tiles.length === 0) return null
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, opacity: still ? 0.3 : v.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.42] }) }}>
      <Svg width={l.width} height={l.height}>
        {tiles.map((i) => (
          <Polygon key={i} points={tilePoints(l, Math.floor(i / GRID), i % GRID, 2)} fill={color} />
        ))}
      </Svg>
    </Animated.View>
  )
}

/** A chevron bobbing above the selected tile so it's obvious what the panel below is about. */
function SelectionMarker({ x, y, still }: { x: number; y: number; still: boolean }) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (still) return
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    )
    a.start()
    return () => a.stop()
  }, [v, still])
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: x - 9, top: y - 9, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-2, 4] }) }] }}>
      <ChevronDown size={18} color="#ffffff" strokeWidth={2.6} />
    </Animated.View>
  )
}

/** The "can evolve" sparkle: a small gold badge that bobs and pulses. */
function ReadyBadge({ x, y, still }: { x: number; y: number; still: boolean }) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (still) return
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    a.start()
    return () => a.stop()
  }, [v, still])
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: x - 10, top: y - 10, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(255, 224, 138, 0.95)',
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }],
      }}
    >
      <Sparkles size={12} color="#7a5b12" strokeWidth={2.2} />
    </Animated.View>
  )
}

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
  bursts,
  onBurstDone,
  scenery = true,
  onTile,
}: {
  cells: Cells
  art: ArtMode
  palette: GardenPalette
  selected: number | null
  /** tiles to tint as valid destinations */
  targets?: Set<number> | null
  /** one-shot particle effects to play, by tile */
  bursts?: { key: number; cell: number; kind: BurstKind }[]
  onBurstDone?: (key: number) => void
  /** draw the sky (stars/moon or sun/clouds) and petals behind the board; the full-screen garden draws its own */
  scenery?: boolean
  onTile: (index: number) => void
}) {
  const still = useReducedMotion()
  const mountedAt = useRef(Date.now()).current
  const [width, setWidth] = useState(0)
  const l = layoutFor(width || 1)
  const pw = l.tileW * 1.0
  const ph = pw * 1.2
  const tiles = Array.from({ length: GRID * GRID }, (_, i) => i)
  const { tufts, pebbles } = useMemo(() => scatter(l), [l.tileW, l.headroom]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ width: '100%', height: width ? l.height : 0 }}>
      {width > 0 && (
        <WindProvider still={still}>
          {scenery && (palette.dusk ? <Sky width={width} height={l.height} still={still} /> : <DaySky width={width} height={l.height} still={still} />)}
          {scenery && <Petals width={width} height={l.height} still={still} />}
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
          <TilePulse l={l} tiles={targets ? [...targets] : selected != null ? [selected] : []} color={palette.dusk ? '#bcd0ff' : '#ffffff'} still={still} />
          {/* Plants sit above the ground; drawing order = depth, so later rows overlap earlier ones. */}
          {tiles.map((i) => {
            const cell = cells[i]
            if (!cell) return null
            const r = Math.floor(i / GRID)
            const c = i % GRID
            const { x, y } = tileCenter(l, r, c)
            // The first draw staggers the plants so the garden grows in; later ones pop straight away.
            const delay = Date.now() - mountedAt < 600 ? i * 28 : 0
            return (
              <View key={`${i}-${cell.species}`} pointerEvents="none" style={{ position: 'absolute', left: x - pw / 2, top: y - ph * (112 / 120) + l.tileH * 0.05 }}>
                <Appear delay={delay} bump={cell.stage} still={still}>
                  <PlantView cell={cell} art={art} w={pw} h={ph} phase={(r + c) / (2 * (GRID - 1))} still={still} />
                </Appear>
              </View>
            )
          })}
          {tiles.map((i) => {
            const cell = cells[i]
            if (!cell?.ready) return null
            const { x, y } = tileCenter(l, Math.floor(i / GRID), i % GRID)
            return <ReadyBadge key={'r' + i} x={x} y={y - ph * 0.82} still={still} />
          })}
          {selected != null && (() => {
            const { x, y } = tileCenter(l, Math.floor(selected / GRID), selected % GRID)
            const cell = cells[selected]
            // Float just above the plant's top at its current size (a seedling is a lot shorter than a tree).
            const top = cell ? ph * ([0.4, 0.55, 0.78, 0.98][cell.stage] ?? 0.98) * (plantById(cell.species)?.scale ?? 1) : l.tileH * 1.1
            return <SelectionMarker x={x} y={y - top} still={still} />
          })()}
          {!still && (bursts ?? []).map((b) => {
            const { x, y } = tileCenter(l, Math.floor(b.cell / GRID), b.cell % GRID)
            const spec: BurstSpec = { key: b.key, x, y: y - l.tileH * 0.1, kind: b.kind }
            return <Burst key={b.key} spec={spec} onDone={(k) => onBurstDone?.(k)} />
          })}
          <Fireflies l={l} dusk={palette.dusk} still={still} />
          {/* One touch layer for the whole board: a tap on a plant selects its tile, even where it overlaps the tile behind. */}
          <Pressable
            onPress={(e) => {
              const { locationX: x, locationY: y } = e.nativeEvent
              const hit = hitTile(l, cells, x, y, pw, ph)
              if (hit != null) onTile(hit)
            }}
            style={{ position: 'absolute', left: 0, top: 0, width, height: l.height }}
          />
        </WindProvider>
      )}
    </View>
  )
}
