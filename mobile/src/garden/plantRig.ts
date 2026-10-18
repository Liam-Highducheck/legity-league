import { dcAnchor, willowAnchor } from './plantsBase'
import { REED_BASES } from './plantsMore'

// How a mature plant moves beyond the whole thing leaning in the wind. Coordinates are the plant's own drawing (the 100x120
// canvas before the species scale, roots at 50,112).
//
//  - `still` layers never move (a pot, the pond).
//  - `swing` layers are drawn on their own and swing about `pivot` on top of the plant's own lean, so a tree's foliage rocks
//    on a trunk that barely moves, and hanging strands or feathers swing from a body that is almost still. All of a plant's
//    parts share one beat (see `useSwingDrivers`); only the size of the swing differs.
// The whole plant's lean is `sway` in plants (small for trunks, larger for thin stems).
export interface SwingSpec {
  layer: string
  pivot: [x: number, y: number]
  /** degrees each way */
  amp: number
}
export interface Rig {
  still?: string[]
  swing?: SwingSpec[]
}

const WILLOW_STRANDS: SwingSpec[] = Array.from({ length: 9 }, (_, i) => ({ layer: `strand${i}`, pivot: willowAnchor(i), amp: 3 + (i % 3) * 0.7 }))
const DC_SWINGS: SwingSpec[] = Array.from({ length: 3 }, (_, i) => ({ layer: `feather${i}`, pivot: dcAnchor(i), amp: 7 + i * 1.2 }))
const REED_SWINGS: SwingSpec[] = [
  ...REED_BASES.slice(0, 5).map((b, i): SwingSpec => ({ layer: `stalk${i}`, pivot: b, amp: 3.4 + (i % 2) * 0.6 })),
  ...REED_BASES.slice(5).map((b, i): SwingSpec => ({ layer: `cat${i}`, pivot: b, amp: 3.2 })),
]
/** three clumps of foliage, each swaying from where it joins the wood */
const pads = (pivots: [number, number][], amp: number): SwingSpec[] => pivots.map((pivot, k) => ({ layer: `pad${k}`, pivot, amp }))
const BONSAI_PADS = pads([[31, 73], [73, 57], [57, 46]], 1.6)

export const RIGS: Record<string, Rig> = {
  succulent: { still: ['pot'] },
  bloomsucc: { still: ['pot'] },
  bonsai: { still: ['pot'], swing: BONSAI_PADS },
  sakura: { still: ['pot'], swing: BONSAI_PADS },
  lotus: { still: ['water'] },
  moonlotus: { still: ['water'] },
  sapling: { swing: [{ layer: 'leaf0', pivot: [35, 70], amp: 2.2 }, { layer: 'leaf1', pivot: [66, 62], amp: 2.4 }, { layer: 'leaf2', pivot: [52, 54], amp: 1.8 }] },
  moonwood: { swing: [{ layer: 'crown', pivot: [51, 62], amp: 1.8 }] },
  aurora: { swing: [{ layer: 'crown', pivot: [51, 68], amp: 1.6 }] },
  willow: { swing: WILLOW_STRANDS },
  wisteria: {
    swing: [
      { layer: 'cluster0', pivot: [38, 66], amp: 4 },
      { layer: 'cluster1', pivot: [56, 44], amp: 3.6 },
      { layer: 'cluster2', pivot: [74, 40], amp: 4 },
    ],
  },
  dreamcatcher: { swing: DC_SWINGS },
  reed: { swing: REED_SWINGS },
}
