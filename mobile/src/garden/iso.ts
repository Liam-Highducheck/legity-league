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
}

export function layoutFor(width: number): Layout {
  const tileW = width / GRID
  const tileH = tileW / 2
  const headroom = tileW * 1.1
  return { tileW, tileH, originX: width / 2, headroom, width, height: headroom + GRID * tileH + tileH * 0.3 }
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
