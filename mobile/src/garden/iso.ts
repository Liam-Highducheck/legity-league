// Isometric grid maths. Tile (row 0, col 0) is the back corner; rows/cols grow toward the viewer.
export const GRID = 5

export interface Layout {
  tileW: number
  tileH: number
  /** x of the grid's top corner */
  originX: number
  /** extra space above the grid so tall plants don't clip */
  headroom: number
  width: number
  height: number
  /** thickness of the soil slab under the tiles */
  depth: number
}

export function layoutFor(width: number): Layout {
  const tileW = width / GRID
  const tileH = tileW / 2
  const headroom = tileW * 1.0
  const depth = tileH * 0.6
  return { tileW, tileH, originX: width / 2, headroom, width, depth, height: headroom + GRID * tileH + depth + 4 }
}

/** Screen position of a tile's centre. */
export function tileCenter(l: Layout, row: number, col: number) {
  return {
    x: l.originX + ((col - row) * l.tileW) / 2,
    y: l.headroom + ((col + row) * l.tileH) / 2 + l.tileH / 2,
  }
}

/** Diamond corner points as an SVG `points` string. */
export function tilePoints(l: Layout, row: number, col: number, inset = 0) {
  const { x, y } = tileCenter(l, row, col)
  const hw = l.tileW / 2 - inset
  const hh = l.tileH / 2 - inset / 2
  return `${x},${y - hh} ${x + hw},${y} ${x},${y + hh} ${x - hw},${y}`
}

/** Outer side faces of the whole slab (left, right) as `points` strings. */
export function slabFaces(l: Layout) {
  const left = { x: l.originX - (GRID * l.tileW) / 2, y: l.headroom + (GRID * l.tileH) / 2 }
  const right = { x: l.originX + (GRID * l.tileW) / 2, y: left.y }
  const bottom = { x: l.originX, y: l.headroom + GRID * l.tileH }
  const d = l.depth
  return {
    left: `${left.x},${left.y} ${bottom.x},${bottom.y} ${bottom.x},${bottom.y + d} ${left.x},${left.y + d}`,
    right: `${right.x},${right.y} ${bottom.x},${bottom.y} ${bottom.x},${bottom.y + d} ${right.x},${right.y + d}`,
  }
}
