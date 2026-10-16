// Which parts of each mature plant swing on their own, on top of the whole plant's sway. Coordinates are in the 100x120 art
// canvas. A part is either a `region` of the finished drawing (a rectangle that is cut out and rotated about `pivot`, so no
// plant needs redrawing) or a named `layer` the plant draws separately (strands, feathers, clusters).
//
// Keep a region's cut line across something thin (a stem or trunk) and the pivot on that line, so the seam never shows.
export interface PartSpec {
  region?: [x: number, y: number, w: number, h: number]
  layer?: string
  pivot: [x: number, y: number]
  /** swing in degrees each way */
  amp: number
  /** slower (>1) or quicker (<1) than the base rhythm */
  period?: number
  /** 0..1, offsets this part from the others */
  phase?: number
}

const head = (cutY: number, x: number, amp: number, period = 1, phase = 0): PartSpec[] => [{ region: [0, 0, 100, cutY], pivot: [x, cutY], amp, period, phase }]
const sides = (cutY: number, cx: number, amp: number, left = 44, right = 56): PartSpec[] => [
  { region: [0, 0, left, cutY], pivot: [cx, cutY], amp, period: 1, phase: 0 },
  { region: [right, 0, 100 - right, cutY], pivot: [cx, cutY], amp: amp * 1.15, period: 1, phase: 0.5 },
]

export const PARTS: Record<string, PartSpec[]> = {
  sprout: head(90, 50, 5, 0.8),
  clover: [
    { region: [0, 0, 40, 104], pivot: [30, 104], amp: 4, phase: 0 },
    { region: [40, 0, 20, 104], pivot: [52, 104], amp: 4.5, phase: 0.33 },
    { region: [60, 0, 40, 104], pivot: [73, 104], amp: 4, phase: 0.66 },
  ],
  luckyclover: [
    { region: [0, 0, 36, 104], pivot: [28, 104], amp: 4, phase: 0 },
    { region: [36, 0, 28, 104], pivot: [50, 104], amp: 4.5, phase: 0.33 },
    { region: [64, 0, 36, 104], pivot: [72, 104], amp: 4, phase: 0.66 },
  ],
  tulip: head(66, 50, 4, 0.85),
  twilighttulip: head(72, 50, 3.6, 0.9),
  chamomile: head(76, 50, 3.5),
  goldchamomile: head(84, 50, 3.4),
  dandelion: head(58, 56, 5, 1.1),
  wishdandelion: head(62, 56, 5, 1.1),
  reed: [
    { region: [0, 0, 50, 100], pivot: [45, 104], amp: 3.2, phase: 0 },
    { region: [50, 0, 50, 100], pivot: [55, 104], amp: 3.6, phase: 0.5 },
  ],
  lavender: sides(104, 50, 3),
  dreamlavender: sides(104, 50, 3.2),
  fern: head(82, 49, 3.5, 0.9),
  moonfern: [
    { region: [0, 0, 40, 100], pivot: [48, 104], amp: 3, phase: 0 },
    { region: [60, 0, 40, 100], pivot: [52, 104], amp: 3.4, phase: 0.5 },
  ],
  bluebell: head(88, 50, 4, 0.9),
  poppy: head(64, 50, 3.5),
  moonlily: head(60, 50, 3.5),
  glimmerbud: head(64, 50, 3),
  starblossom: head(54, 50, 5, 0.8),
  crystalrose: head(78, 50, 2.6, 1.2),
  celestial: head(58, 50, 3),
  orchid: head(88, 52, 3.4, 1.1),
  hydrangea: head(86, 50, 3, 1.1),
  lotus: head(80, 50, 2.4, 1.2),
  moonlotus: head(80, 50, 2.4, 1.2),
  bloomsucc: head(66, 50, 3),
  bamboo: head(60, 50, 2.4, 1.2),
  bonsai: head(68, 55, 2.2, 1.4),
  sakura: head(68, 55, 2.2, 1.4),
  sapling: head(64, 51, 2.5, 1.2),
  moonwood: head(68, 51, 1.8, 1.5),
  aurora: head(62, 50, 3, 1.3),
  willow: [
    { layer: 'strandsA', pivot: [54, 42], amp: 4.5, period: 0.9, phase: 0 },
    { layer: 'strandsB', pivot: [54, 42], amp: 5.5, period: 1.05, phase: 0.5 },
  ],
  wisteria: [
    { layer: 'cluster0', pivot: [38, 66], amp: 5, period: 0.95, phase: 0 },
    { layer: 'cluster1', pivot: [56, 44], amp: 4.5, period: 1, phase: 0.35 },
    { layer: 'cluster2', pivot: [74, 40], amp: 5, period: 1.05, phase: 0.7 },
  ],
  dreamcatcher: [
    { layer: 'hoop', pivot: [50, 70], amp: 4, period: 1.2, phase: 0 },
    { layer: 'feathers', pivot: [50, 68], amp: 8, period: 0.8, phase: 0.3 },
  ],
}
