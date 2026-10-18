// The plant drawings, assembled. Species ids here must match packages/core/src/garden/species.ts exactly: a plant with no
// drawing here is invisible in the garden (a dev-build check below shouts about it).
import { SPECIES } from '@legity/core/garden/index'
import type { ArtMode, PlantDef } from './artKit'
import { BASE_PLANTS } from './plantsBase'
import { MORE_PLANTS } from './plantsMore'

export type { ArtMode, PlantDef }

/**
 * How large each plant is drawn on its tile (multiplies the drawing). Two rules, checked by eye in the codex (`/garden-dex?sizes=1`):
 * an evolution is at least as big as the plant it grows from, and rarer plants tend to be larger. A drawing that reaches
 * near the top of the canvas cannot scale past about 1.1, so the tallest drawings (celestial, frost pine) are capped there.
 */
const SCALES: Record<string, number> = {
  // common
  sprout: 1.28, clover: 1.39, tulip: 1, chamomile: 1, dandelion: 0.91, reed: 0.95,
  // uncommon
  lavender: 0.92, fern: 0.94, succulent: 1.27, bluebell: 1.03, poppy: 1.04, cactus: 1.05, pine: 0.96, bonsai: 1.02,
  sapling: 1.05, twilighttulip: 0.99, goldchamomile: 1.04,
  // rare
  moonlily: 1.02, drowsycap: 1.18, lotus: 0.78, bamboo: 0.84, glimmerbud: 0.94, wisteria: 0.99, hydrangea: 1.08, threadvine: 0.95,
  dreamlavender: 0.94, moonfern: 0.95, sakura: 1.01, bloomsucc: 1.1, luckyclover: 1.39, wishdandelion: 1.01, frostpine: 0.94,
  // epic
  orchid: 0.98, dreamcap: 1.13, willow: 0.97, crystalrose: 1.06, starblossom: 1.08, dreamcatcher: 1.06, moonlotus: 0.9, moonwood: 0.95,
  // legendary
  aurora: 0.97, celestial: 0.94,
}

export const PLANTS: PlantDef[] = [...BASE_PLANTS, ...MORE_PLANTS].map((p) => ({ ...p, scale: SCALES[p.id] ?? p.scale }))

export const PLANT_IDS = PLANTS.map((p) => p.id)
export const plantById = (id: string) => PLANTS.find((p) => p.id === id)

if (__DEV__) {
  const missing = SPECIES.filter((s) => !plantById(s.id)).map((s) => s.id)
  const stray = PLANTS.filter((p) => !SPECIES.some((s) => s.id === p.id)).map((p) => p.id)
  if (missing.length) console.error(`[garden] species without a drawing (they will not render): ${missing.join(', ')}`)
  if (stray.length) console.error(`[garden] drawings for unknown species: ${stray.join(', ')}`)
}
