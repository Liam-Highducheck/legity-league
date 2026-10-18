import { dcAnchor, willowAnchor } from './plantsBase'
import { REED_BASES } from './plantsMore'

// How a mature plant moves beyond the whole thing leaning in the wind. Coordinates are the plant's own drawing (the 100x120
// canvas before the species scale, roots at 50,112).
//
//  - `still` layers never move (a pot).
//  - `swing` layers are drawn on their own and swing about `pivot` on top of the plant's own lean, so a tree's crown rocks
//    on a trunk that barely moves, and hanging strands or feathers swing from a body that is almost still.
// The whole plant's lean is `sway` in plants (small for trunks, larger for thin stems).
export interface SwingSpec {
  layer: string
  pivot: [x: number, y: number]
  /** degrees each way */
  amp: number
  /** slower (>1) or quicker (<1) than the plant's own rhythm */
  period?: number
  /** 0..1, shifts it against the other parts so they don't move in step */
  phase?: number
}
export interface Rig {
  still?: string[]
  swing?: SwingSpec[]
}

// every strand, feather and stalk swings alone about where it hangs or grows, a little differently from its neighbours
const spread = (i: number, n: number) => (i * 0.382) % 1 + 0 * n
const WILLOW_STRANDS: SwingSpec[] = Array.from({ length: 9 }, (_, i) => ({
  layer: `strand${i}`, pivot: willowAnchor(i), amp: 5 + (i % 3) * 1.5, period: 0.85 + (i % 4) * 0.12, phase: spread(i, 9),
}))
const DC_SWINGS: SwingSpec[] = Array.from({ length: 3 }, (_, i) => ({
  layer: `feather${i}`, pivot: dcAnchor(i), amp: 8 + i * 1.5, period: 0.8 + i * 0.12, phase: spread(i + 1, 3),
}))
const REED_SWINGS: SwingSpec[] = [
  ...REED_BASES.slice(0, 5).map((b, i): SwingSpec => ({ layer: `stalk${i}`, pivot: b, amp: 3.4 + (i % 2) * 0.6, period: 0.85 + i * 0.07, phase: spread(i, 5) })),
  ...REED_BASES.slice(5).map((b, i): SwingSpec => ({ layer: `cat${i}`, pivot: b, amp: 3.2, period: 0.95 + i * 0.1, phase: spread(i + 2, 2) })),
]

export const RIGS: Record<string, Rig> = {
  succulent: { still: ['pot'] },
  bloomsucc: { still: ['pot'] },
  bonsai: { still: ['pot'], swing: [{ layer: 'crown', pivot: [57, 58], amp: 1, period: 1, phase: 0.2 }] },
  sakura: { still: ['pot'], swing: [{ layer: 'crown', pivot: [57, 58], amp: 1, period: 1, phase: 0.2 }] },
  lotus: { still: ['water'] },
  moonlotus: { still: ['water'] },
  sapling: { swing: [{ layer: 'crown', pivot: [52, 66], amp: 2.8, period: 0.9, phase: 0.25 }] },
  moonwood: { swing: [{ layer: 'crown', pivot: [51, 62], amp: 1.8, period: 1, phase: 0.3 }] },
  aurora: { swing: [{ layer: 'crown', pivot: [51, 68], amp: 1.6, period: 1, phase: 0.3 }] },
  willow: { swing: WILLOW_STRANDS },
  wisteria: {
    swing: [
      { layer: 'cluster0', pivot: [38, 66], amp: 5, period: 0.95, phase: 0.1 },
      { layer: 'cluster1', pivot: [56, 44], amp: 4.5, period: 1, phase: 0.45 },
      { layer: 'cluster2', pivot: [74, 40], amp: 5, period: 1.05, phase: 0.8 },
    ],
  },
  dreamcatcher: { swing: DC_SWINGS },
  reed: { swing: REED_SWINGS },
}
