// The plant drawings, assembled. Species ids here must match packages/core/src/garden/species.ts exactly: a plant with no
// drawing here is invisible in the garden (a dev-build check below shouts about it).
import { SPECIES } from '@legity/core/garden/index'
import type { ArtMode, PlantDef } from './artKit'
import { BASE_PLANTS } from './plantsBase'
import { MORE_PLANTS } from './plantsMore'

export type { ArtMode, PlantDef }

export const PLANTS: PlantDef[] = [...BASE_PLANTS, ...MORE_PLANTS]

export const PLANT_IDS = PLANTS.map((p) => p.id)
export const plantById = (id: string) => PLANTS.find((p) => p.id === id)

if (__DEV__) {
  const missing = SPECIES.filter((s) => !plantById(s.id)).map((s) => s.id)
  const stray = PLANTS.filter((p) => !SPECIES.some((s) => s.id === p.id)).map((p) => p.id)
  if (missing.length) console.error(`[garden] species without a drawing (they will not render): ${missing.join(', ')}`)
  if (stray.length) console.error(`[garden] drawings for unknown species: ${stray.join(', ')}`)
}
