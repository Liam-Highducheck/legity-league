import { memo, useState } from 'react'
import { View } from 'react-native'
import Svg, { Polygon } from 'react-native-svg'
import { GRID, layoutFor, tileCenter, tilePoints } from './iso'
import { plantById, type ArtMode } from './plants'
import { Sway } from './Sway'

export interface GardenPalette {
  top: string
  topAlt: string
  edge: string
  selected: string
}

export const DAY: GardenPalette = { top: '#cfe5cf', topAlt: '#c3dfc6', edge: '#a9ccb0', selected: '#e8f4c8' }
export const DUSK: GardenPalette = { top: '#3a4a66', topAlt: '#34435e', edge: '#27334b', selected: '#53668a' }

/** 5x5 board of plant ids (or null), row-major. */
export type Cells = (string | null)[]

const PlantView = memo(function PlantView({ id, art, w, h, seed }: { id: string; art: ArtMode; w: number; h: number; seed: number }) {
  const def = plantById(id)
  if (!def) return null
  return (
    <Sway degrees={def.sway} seed={seed} width={w} height={h}>
      <Svg width={w} height={h} viewBox="0 0 100 120">
        {def.draw(art)}
      </Svg>
    </Sway>
  )
})

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
  const pw = l.tileW * 1.05
  const ph = pw * 1.2
  const tiles = Array.from({ length: GRID * GRID }, (_, i) => i)
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ width: '100%', height: width ? l.height : 0 }}>
      {width > 0 && (
        <>
          <Svg width={width} height={l.height}>
            {tiles.map((i) => {
              const r = Math.floor(i / GRID)
              const c = i % GRID
              return (
                <Polygon
                  key={i}
                  points={tilePoints(l, r, c)}
                  fill={selected === i ? palette.selected : (r + c) % 2 ? palette.topAlt : palette.top}
                  stroke={palette.edge}
                  strokeWidth={1}
                  strokeLinejoin="round"
                  onPress={() => onTile(i)}
                />
              )
            })}
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
        </>
      )}
    </View>
  )
}
