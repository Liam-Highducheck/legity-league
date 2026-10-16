import { goalProgress } from './goals.ts'
import { speciesById } from './species.ts'
import type { GardenNight, Goal, PlantRow, Progress, Species } from './types.ts'

/** 0 seedling, 1 young, 2 growing, 3 mature. */
export type Stage = 0 | 1 | 2 | 3
export const STAGE_NAMES = ['Seedling', 'Young', 'Growing', 'Mature'] as const

export function stageFor(p: Progress): Stage {
  if (p.done) return 3
  const f = p.target ? p.value / p.target : 0
  return f >= 2 / 3 ? 2 : f >= 1 / 3 ? 1 : 0
}

export interface PlantStatus {
  species: Species
  stage: Stage
  /** Progress of the growth goal (always done for evolved plants). */
  growth: Progress
  /** Absent for evolution-only species, which arrive fully grown. */
  growthGoal: Goal | undefined
  mature: boolean
  /** Night the plant finished growing (null while it grows). Evolution is counted after it. */
  maturedOn: string | null
  evolution: { to: Species; goal: Goal; progress: Progress; ready: boolean } | null
}

/** Growth only counts nights after the plant went in the ground. Evolved plants are fully grown and count evolution from `evolved_on`. */
export function plantStatus(plant: PlantRow, nights: GardenNight[]): PlantStatus | null {
  const species = speciesById(plant.species)
  if (!species) return null
  const evolved = plant.evolved_from != null
  const growth: Progress =
    evolved || !species.goal
      ? { value: 1, target: 1, done: true, doneOn: plant.evolved_on ?? plant.planted_on }
      : goalProgress(species.goal, nights, plant.planted_on)
  const maturedOn = growth.done ? growth.doneOn ?? plant.planted_on : null
  const next = species.evolvesTo ? speciesById(species.evolvesTo.to) : undefined
  let evolution: PlantStatus['evolution'] = null
  if (species.evolvesTo && next) {
    const progress: Progress = growth.done
      ? goalProgress(species.evolvesTo.goal, nights, evolved ? plant.evolved_on ?? plant.planted_on : maturedOn ?? plant.planted_on)
      : { value: 0, target: 1, done: false, doneOn: null }
    evolution = { to: next, goal: species.evolvesTo.goal, progress, ready: growth.done && progress.done }
  }
  return { species, stage: stageFor(growth), growth, growthGoal: species.goal, mature: growth.done, maturedOn, evolution }
}
