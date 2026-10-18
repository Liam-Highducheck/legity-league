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

export const RIGS: Record<string, Rig> = {
  succulent: { still: ['pot'] },
  bloomsucc: { still: ['pot'] },
  bonsai: { swing: [{ layer: 'crown', pivot: [58, 64], amp: 2.4, period: 1, phase: 0.25 }] },
  sakura: { swing: [{ layer: 'crown', pivot: [58, 64], amp: 2.4, period: 1, phase: 0.25 }] },
  sapling: { swing: [{ layer: 'crown', pivot: [52, 66], amp: 2.8, period: 0.9, phase: 0.25 }] },
  moonwood: { swing: [{ layer: 'crown', pivot: [51, 62], amp: 1.8, period: 1, phase: 0.3 }] },
  aurora: { swing: [{ layer: 'crown', pivot: [51, 68], amp: 1.6, period: 1, phase: 0.3 }] },
  willow: {
    swing: [
      { layer: 'strandsA', pivot: [54, 42], amp: 4.5, period: 0.9, phase: 0.2 },
      { layer: 'strandsB', pivot: [54, 42], amp: 5.5, period: 1.05, phase: 0.6 },
    ],
  },
  wisteria: {
    swing: [
      { layer: 'cluster0', pivot: [38, 66], amp: 5, period: 0.95, phase: 0.1 },
      { layer: 'cluster1', pivot: [56, 44], amp: 4.5, period: 1, phase: 0.45 },
      { layer: 'cluster2', pivot: [74, 40], amp: 5, period: 1.05, phase: 0.8 },
    ],
  },
  dreamcatcher: { swing: [{ layer: 'feathers', pivot: [50, 68], amp: 8, period: 0.8, phase: 0.35 }] },
}
