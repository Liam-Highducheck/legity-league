import type { Cond, Goal, Rarity, Species } from './types.ts'

// Small goal builders keep the catalog readable.
const nights = (cond: Cond, count: number): Goal => ({ kind: 'nights', cond, count })
const streak = (cond: Cond, count: number): Goal => ({ kind: 'streak', cond, count })
const total = (metric: 'duration' | 'restorative' | 'deep' | 'rem', hours: number): Goal => ({ kind: 'total', metric, minutes: hours * 60 })
const dur = (hours: number): Cond => ({ metric: 'duration', op: '>=', value: hours * 60 })
const score = (v: number): Cond => ({ metric: 'score', op: '>=', value: v })
const restorative = (hours: number): Cond => ({ metric: 'restorative', op: '>=', value: hours * 60 })
const deep = (min: number): Cond => ({ metric: 'deep', op: '>=', value: min })
const bedtime = (afterNoonMin: number): Cond => ({ metric: 'bedtime', op: '<=', value: afterNoonMin })
const awake = (min: number): Cond => ({ metric: 'awake', op: '<=', value: min })
const wakes = (n: number): Cond => ({ metric: 'wakes', op: '<=', value: n })

/** Seed prices in coins by rarity (what the shop charges). Box odds and pity live in `boxes` below. */
export const SEED_PRICES: Record<Rarity, number> = { common: 150, uncommon: 400, rare: 1000, epic: 2500 }
export const BOX_PRICE = 500

/** Dream Box drop weights (percent) and the pity rule: after this many boxes with nothing rare or better, the next one is. */
export const BOX_WEIGHTS: Record<Rarity, number> = { common: 50, uncommon: 30, rare: 15, epic: 5 }
export const BOX_PITY = 6

/** How many rotating seeds the shop stocks on a given day. */
export const ROTATING_SLOTS = 2

export const STARTER_SEEDS: Record<string, number> = { sprout: 2, tulip: 1, chamomile: 1 }

export const SPECIES: Species[] = [
  {
    id: 'sprout', name: 'Sprout', rarity: 'common', sleepy: false, shop: 'always', droppable: true,
    blurb: 'A cheerful little seedling. It grows on a couple of decent nights.',
    goal: nights(score(60), 2),
    evolvesTo: { to: 'fern', goal: nights(score(75), 3) },
  },
  {
    id: 'tulip', name: 'Blush tulip', rarity: 'common', sleepy: false, shop: 'always', droppable: true,
    blurb: 'Opens a little more with every full night of sleep.',
    goal: nights(dur(8), 3),
  },
  {
    id: 'chamomile', name: 'Chamomile', rarity: 'common', sleepy: true, shop: 'always', droppable: true,
    blurb: 'A calming daisy that likes an early night.',
    goal: nights(bedtime(630), 3), // asleep by 10:30pm
    evolvesTo: { to: 'starblossom', goal: streak(score(80), 5) },
  },
  {
    id: 'fern', name: 'Soft fern', rarity: 'uncommon', sleepy: false, shop: 'rotating', droppable: true,
    blurb: 'Unfurls slowly, one deep night at a time.',
    goal: total('deep', 4),
    evolvesTo: { to: 'dreamcatcher', goal: total('deep', 8) },
  },
  {
    id: 'lavender', name: 'Dream lavender', rarity: 'uncommon', sleepy: true, shop: 'always', droppable: true,
    blurb: 'Smells like a good night. Feeds on REM sleep.',
    goal: total('rem', 5),
    evolvesTo: { to: 'moonlily', goal: nights(restorative(3), 5) },
  },
  {
    id: 'succulent', name: 'Pillow succulent', rarity: 'uncommon', sleepy: true, shop: 'always', droppable: true,
    blurb: 'Plump and sleepy. Thrives on calm, unbroken nights.',
    goal: nights(awake(30), 4),
  },
  {
    id: 'bonsai', name: 'Cloud bonsai', rarity: 'uncommon', sleepy: false, shop: 'rotating', droppable: true,
    blurb: 'Patient and slow. Grows with your total sleep.',
    goal: total('duration', 40),
    evolvesTo: { to: 'sakura', goal: streak(dur(8), 3) },
  },
  {
    id: 'drowsycap', name: 'Drowsy cap', rarity: 'rare', sleepy: true, shop: 'rotating', droppable: true,
    blurb: 'A mushroom that glows softly in deep sleep.',
    goal: nights(deep(75), 4),
  },
  {
    id: 'moonlily', name: 'Moon lily', rarity: 'rare', sleepy: true, shop: 'rotating', droppable: true,
    blurb: 'Blooms by moonlight on restorative nights.',
    goal: total('restorative', 15),
  },
  {
    id: 'sakura', name: 'Sakura bonsai', rarity: 'rare', sleepy: false, shop: null, droppable: false,
    blurb: 'The blossoming form of the Cloud bonsai. Only grown, never found.',
    goal: streak(dur(8), 3),
  },
  {
    id: 'starblossom', name: 'Star blossom', rarity: 'epic', sleepy: true, shop: null, droppable: true,
    blurb: 'A flower that holds a little starlight. Loves a streak of great nights.',
    goal: streak(score(85), 7),
  },
  {
    id: 'dreamcatcher', name: 'Dreamcatcher vine', rarity: 'epic', sleepy: true, shop: null, droppable: true,
    blurb: 'Catches the restless nights and lets the good ones through.',
    goal: nights(wakes(1), 6),
  },
  {
    id: 'willow', name: 'Lullaby willow', rarity: 'epic', sleepy: true, shop: null, droppable: true,
    blurb: 'Its branches sway to a lullaby. Needs a long run of full nights.',
    goal: nights(dur(7.5), 10),
  },
]

const byId = new Map(SPECIES.map((s) => [s.id, s]))
export const speciesById = (id: string): Species | undefined => byId.get(id)
export const speciesName = (id: string) => byId.get(id)?.name ?? id

/** The species that evolves into `id`, if any. */
export const evolvesFrom = (id: string): Species | undefined => SPECIES.find((s) => s.evolvesTo?.to === id)

export const seedPrice = (id: string): number | null => {
  const s = byId.get(id)
  return s && s.shop ? SEED_PRICES[s.rarity] : null
}
