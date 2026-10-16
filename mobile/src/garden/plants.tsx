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
  sprout: 1.05, clover: 1.35, tulip: 0.95, chamomile: 0.95, dandelion: 0.9, reed: 0.9,
  // uncommon
  lavender: 0.9, fern: 0.9, succulent: 1.1, bluebell: 1, poppy: 1.05, cactus: 1.05, pine: 1, bonsai: 1.05,
  sapling: 1.05, twilighttulip: 1.05, goldchamomile: 1.05,
  // rare
  moonlily: 1.05, drowsycap: 1.1, lotus: 1.08, bamboo: 0.9, glimmerbud: 0.95, wisteria: 1, hydrangea: 1.1, threadvine: 0.98,
  dreamlavender: 0.95, moonfern: 1, sakura: 1.05, bloomsucc: 1.12, luckyclover: 1.25, wishdandelion: 1.05, frostpine: 1,
  // epic
  orchid: 1, dreamcap: 1.1, willow: 1, crystalrose: 1.08, starblossom: 1.12, dreamcatcher: 1.1, moonlotus: 1.1, moonwood: 1,
  // legendary
  aurora: 1.08, celestial: 1.05,
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
