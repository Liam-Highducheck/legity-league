// Garden game types. Everything the game derives from sleep (growth, overgrown, achievements) is pure and lives here, so
// web, native and the tests share it. The server only stores state (coins, seeds, plants) and validates the moves.

export const GRID_SIZE = 5
export const GRID_CELLS = GRID_SIZE * GRID_SIZE

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic'
export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic']
export const RARITY_LABELS: Record<Rarity, string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic' }

/** What a goal can measure on one night. `bedtime` is minutes after local noon that sleep began (23:00 = 660). */
export type GoalMetric = 'duration' | 'score' | 'restorative' | 'deep' | 'rem' | 'awake' | 'wakes' | 'bedtime'
export type TotalMetric = 'duration' | 'restorative' | 'deep' | 'rem'

export interface Cond {
  metric: GoalMetric
  op: '>=' | '<='
  value: number
}

export type Goal =
  /** N nights (any, not necessarily consecutive) meeting the condition. */
  | { kind: 'nights'; cond: Cond; count: number }
  /** N consecutive calendar nights meeting the condition. */
  | { kind: 'streak'; cond: Cond; count: number }
  /** A running total of minutes of one metric. */
  | { kind: 'total'; metric: TotalMetric; minutes: number }

/** The fields of a night the game reads. A SleepNight satisfies this. */
export interface GardenNight {
  night_date: string
  duration_min: number
  restorative_min: number | null
  deep_min: number | null
  rem_min: number | null
  awake_min: number | null
  wake_count: number | null
  sleep_start: string | null
  timezone?: string | null
  sleep_score: number | null
}

export interface Progress {
  value: number
  target: number
  done: boolean
  /** The night_date the goal was first met on (null until done). Evolution goals start counting after it. */
  doneOn: string | null
}

export interface Reward {
  coins: number
  boxes: number
  /** A seed of this species is added to the inventory. */
  seed?: string
}

export interface Evolution {
  to: string
  goal: Goal
}

export interface Species {
  id: string
  name: string
  rarity: Rarity
  /** One line shown on the plant card. */
  blurb: string
  /** Sleep-themed plants get a small moon badge. */
  sleepy: boolean
  /** Growth goal for a seed planted by the player. Evolved plants skip it. */
  goal: Goal
  evolvesTo?: Evolution
  /** 'always' is in stock every day, 'rotating' appears on some days, null is never sold. */
  shop: 'always' | 'rotating' | null
  /** Can drop from a Dream Box. */
  droppable: boolean
}

export interface PlantRow {
  id: string
  species: string
  /** 0..GRID_CELLS-1 when planted in the garden, null while stored in the inventory. */
  cell: number | null
  planted_on: string
  /** Set once the plant has evolved; evolved plants count as fully grown. */
  evolved_from: string | null
  evolved_on: string | null
}

export interface GardenStats {
  /** Plants owned (planted or stored). */
  plants: number
  /** Distinct species owned or ever held. */
  species: number
  evolved: number
  mature: number
  boxesOpened: number
}

export interface AchievementDef {
  id: string
  name: string
  goal: Goal | { kind: 'stat'; stat: keyof GardenStats; target: number }
  reward: Reward
}
