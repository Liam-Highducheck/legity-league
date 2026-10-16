import type { Cond, Goal, Rarity, Species } from './types.ts'

// Small goal builders keep the catalog readable.
const nights = (cond: Cond, count: number): Goal => ({ kind: 'nights', cond, count })
const streak = (cond: Cond, count: number): Goal => ({ kind: 'streak', cond, count })
const total = (metric: 'duration' | 'restorative' | 'deep' | 'rem', hours: number): Goal => ({ kind: 'total', metric, minutes: hours * 60 })
const dur = (hours: number): Cond => ({ metric: 'duration', op: '>=', value: hours * 60 })
const score = (v: number): Cond => ({ metric: 'score', op: '>=', value: v })
const restorative = (min: number): Cond => ({ metric: 'restorative', op: '>=', value: min })
const deep = (min: number): Cond => ({ metric: 'deep', op: '>=', value: min })
const bedtime = (afterNoonMin: number): Cond => ({ metric: 'bedtime', op: '<=', value: afterNoonMin })
const awake = (min: number): Cond => ({ metric: 'awake', op: '<=', value: min })
const wakes = (n: number): Cond => ({ metric: 'wakes', op: '<=', value: n })
const always = (price: number) => ({ stock: 'always' as const, price })
const rotating = (price: number) => ({ stock: 'rotating' as const, price })

export const BOX_PRICE = 500

/**
 * Dream Box drop weights (percent, summing to 100) and the pity rule: after this many boxes with nothing rare or better,
 * the next one is. Legendary plants never drop; they come only from goals.
 */
export const BOX_WEIGHTS: Record<Rarity, number> = { common: 50, uncommon: 30, rare: 17, epic: 3, legendary: 0 }
export const BOX_PITY = 6

/** How many rotating seeds the shop stocks on a given day. */
export const ROTATING_SLOTS = 3

/*
 * THE ROSTER. Rules (tests enforce them, `pace.ts` explains the timings):
 *  - A rare, epic or legendary plant has exactly ONE way to be obtained, so seeing it in someone's garden tells you how they
 *    got it. Common and uncommon plants may have two (shop + box, or starter + shop).
 *  - Ways to obtain: starter seed, shop, Dream Box, a goal that awards the seed, or evolving another plant.
 *  - Every way takes about as long as its rarity's band (RARITY_BANDS), measured in days for a typical sleeper.
 *  - An evolution is the same plant, grown up: the evolved art is the base art made richer.
 *  - Evolved plants arrive fully grown, so evolution-only species have no growth goal of their own.
 */
export const SPECIES: Species[] = [
  // ---- common ----------------------------------------------------------------------------------------------------
  {
    id: 'sprout', name: 'Sprout', rarity: 'common', sleepy: false, shop: always(90), box: false, starter: 2,
    blurb: 'A cheerful little seedling. It grows on a couple of decent nights.',
    goal: nights(score(60), 2),
    evolvesTo: { to: 'sapling', goal: nights(score(75), 3) },
  },
  {
    id: 'clover', name: 'Clover', rarity: 'common', sleepy: false, shop: always(120), box: true,
    blurb: 'A soft patch of three-leaf clover.',
    goal: nights(score(60), 3),
    evolvesTo: { to: 'luckyclover', goal: nights(score(90), 5) },
  },
  {
    id: 'tulip', name: 'Blush tulip', rarity: 'common', sleepy: false, shop: always(150), box: false, starter: 1,
    blurb: 'Opens a little more with every full night of sleep.',
    goal: nights(dur(7.5), 3),
    evolvesTo: { to: 'twilighttulip', goal: nights(dur(8), 4) },
  },
  {
    id: 'chamomile', name: 'Chamomile', rarity: 'common', sleepy: true, shop: always(190), box: false, starter: 1,
    blurb: 'A calming daisy that likes an early night.',
    goal: nights(bedtime(660), 3), // asleep by 11pm
    evolvesTo: { to: 'goldchamomile', goal: nights(bedtime(630), 5) },
  },
  {
    id: 'dandelion', name: 'Dandelion', rarity: 'common', sleepy: false, shop: always(230), box: true,
    blurb: 'A fluffy seed-head, ready to be blown away.',
    goal: total('duration', 24),
    evolvesTo: { to: 'wishdandelion', goal: nights(restorative(210), 8) },
  },
  {
    id: 'reed', name: 'Reed', rarity: 'common', sleepy: false, shop: rotating(310), box: true,
    blurb: 'Tall grass with a velvet tip, rustling softly.',
    goal: nights(wakes(2), 3),
  },

  // ---- uncommon ------------------------------------------------------------------------------------------------------
  {
    id: 'lavender', name: 'Lavender', rarity: 'uncommon', sleepy: true, shop: always(700), box: true,
    blurb: 'Smells like a good night. Feeds on REM sleep.',
    goal: total('rem', 12),
    evolvesTo: { to: 'dreamlavender', goal: streak(dur(8), 3) },
  },
  {
    id: 'fern', name: 'Soft fern', rarity: 'uncommon', sleepy: false, shop: always(880), box: true,
    blurb: 'Unfurls slowly, one deep night at a time.',
    goal: total('deep', 8),
    evolvesTo: { to: 'moonfern', goal: total('deep', 30) },
  },
  {
    id: 'succulent', name: 'Pillow succulent', rarity: 'uncommon', sleepy: true, shop: always(1050), box: true,
    blurb: 'Plump and sleepy. Thrives on calm, unbroken nights.',
    goal: nights(awake(30), 5),
    evolvesTo: { to: 'bloomsucc', goal: nights(awake(20), 10) },
  },
  {
    id: 'bluebell', name: 'Bluebell', rarity: 'uncommon', sleepy: true, shop: rotating(1250), box: true,
    blurb: 'Nodding blue bells that ring in your restorative sleep.',
    goal: nights(restorative(180), 4),
  },
  {
    id: 'poppy', name: 'Poppy', rarity: 'uncommon', sleepy: true, shop: rotating(1500), box: true,
    blurb: 'The sleepy flower. It opens for an early bedtime.',
    goal: nights(bedtime(630), 4),
  },
  {
    id: 'cactus', name: 'Sleepy cactus', rarity: 'uncommon', sleepy: false, shop: rotating(1800), box: true,
    blurb: 'Prickly outside, snoozy inside. Wants full nights.',
    goal: nights(dur(8), 5),
  },
  {
    id: 'pine', name: 'Pine', rarity: 'uncommon', sleepy: false, shop: always(2100), box: false,
    blurb: 'A neat little evergreen that grows with your sleep.',
    goal: total('duration', 60),
    evolvesTo: { to: 'frostpine', goal: nights(score(85), 6) },
  },
  {
    id: 'bonsai', name: 'Cloud bonsai', rarity: 'uncommon', sleepy: false, shop: always(2400), box: false,
    blurb: 'Patient and slow. Grows with your total sleep.',
    goal: total('duration', 80),
    evolvesTo: { to: 'sakura', goal: streak(dur(8), 3) },
  },
  // evolved uncommons
  {
    id: 'sapling', name: 'Sapling', rarity: 'uncommon', sleepy: false, shop: null, box: false,
    blurb: 'The sprout, grown into a young tree with a real trunk.',
    evolvesTo: { to: 'moonwood', goal: total('duration', 800) },
  },
  {
    id: 'twilighttulip', name: 'Twilight tulip', rarity: 'uncommon', sleepy: false, shop: null, box: false,
    blurb: 'The blush tulip at dusk: a deeper bloom, now in threes.',
  },
  {
    id: 'goldchamomile', name: 'Golden chamomile', rarity: 'uncommon', sleepy: true, shop: null, box: false,
    blurb: 'The chamomile, ripened to gold and fuller than before.',
  },

  // ---- rare ---------------------------------------------------------------------------------------------------------------
  {
    id: 'moonlily', name: 'Moon lily', rarity: 'rare', sleepy: true, shop: rotating(4200), box: false,
    blurb: 'Blooms by moonlight on restorative nights.',
    goal: total('restorative', 40),
  },
  {
    id: 'drowsycap', name: 'Drowsy cap', rarity: 'rare', sleepy: true, shop: rotating(3600), box: false,
    blurb: 'A mushroom that glows softly in deep sleep.',
    goal: nights(deep(75), 6),
  },
  {
    id: 'lotus', name: 'Lotus', rarity: 'rare', sleepy: true, shop: rotating(5200), box: false,
    blurb: 'A pink lotus resting on its pad, opening with your best recoveries.',
    goal: nights(restorative(210), 5),
    evolvesTo: { to: 'moonlotus', goal: nights(restorative(210), 12) },
  },
  {
    id: 'bamboo', name: 'Bamboo', rarity: 'rare', sleepy: false, shop: always(4600), box: false,
    blurb: 'Quick, upright and calm. Grows on a run of good nights.',
    goal: streak(score(75), 5),
  },
  {
    id: 'glimmerbud', name: 'Glimmer bud', rarity: 'rare', sleepy: true, shop: rotating(4000), box: false,
    blurb: 'A tight golden bud with a spark inside, waiting to open.',
    goal: nights(score(80), 5),
    evolvesTo: { to: 'starblossom', goal: nights(score(90), 8) },
  },
  {
    id: 'wisteria', name: 'Wisteria', rarity: 'rare', sleepy: true, shop: null, box: true,
    blurb: 'Cascading violet blossoms. Only ever found in a Dream Box.',
    goal: nights(wakes(1), 8),
  },
  {
    id: 'hydrangea', name: 'Hydrangea', rarity: 'rare', sleepy: false, shop: null, box: true,
    blurb: 'Big round blue blooms. Only ever found in a Dream Box.',
    goal: nights(score(85), 6),
  },
  {
    id: 'threadvine', name: 'Thread vine', rarity: 'rare', sleepy: true, shop: null, box: true,
    blurb: 'A loose silver vine that coils as it grows. Only found in a Dream Box.',
    goal: nights(deep(60), 6),
    evolvesTo: { to: 'dreamcatcher', goal: nights(wakes(0), 6) },
  },
  // evolved rares
  {
    id: 'dreamlavender', name: 'Dream lavender', rarity: 'rare', sleepy: true, shop: null, box: false,
    blurb: 'The lavender grown tall and luminous, drifting with sleepy motes.',
  },
  {
    id: 'moonfern', name: 'Moon fern', rarity: 'rare', sleepy: true, shop: null, box: false,
    blurb: 'The soft fern turned silver, with tips that glow.',
  },
  {
    id: 'sakura', name: 'Sakura bonsai', rarity: 'rare', sleepy: false, shop: null, box: false,
    blurb: 'The cloud bonsai in blossom.',
  },
  {
    id: 'bloomsucc', name: 'Blooming succulent', rarity: 'rare', sleepy: true, shop: null, box: false,
    blurb: 'The pillow succulent, finally flowering.',
  },
  {
    id: 'luckyclover', name: 'Lucky clover', rarity: 'rare', sleepy: false, shop: null, box: false,
    blurb: 'The clover with a fourth leaf and a golden shimmer.',
  },
  {
    id: 'wishdandelion', name: 'Wishing dandelion', rarity: 'rare', sleepy: true, shop: null, box: false,
    blurb: 'The dandelion, glowing, its seeds drifting up as wishes.',
  },
  {
    id: 'frostpine', name: 'Frost pine', rarity: 'rare', sleepy: false, shop: null, box: false,
    blurb: 'The pine in winter, dusted with snow and a little taller.',
  },

  // ---- epic ----------------------------------------------------------------------------------------------------------------------
  {
    id: 'orchid', name: 'Dream orchid', rarity: 'epic', sleepy: true, shop: rotating(13500), box: false,
    blurb: 'A rare orchid that sleeps in the most expensive corner of the shop.',
    goal: streak(score(80), 4),
  },
  {
    id: 'dreamcap', name: 'Dream cap', rarity: 'epic', sleepy: true, shop: null, box: true,
    blurb: 'A cluster of huge glowing mushrooms. Only ever found in a Dream Box.',
    goal: nights(deep(90), 8),
  },
  {
    id: 'willow', name: 'Lullaby willow', rarity: 'epic', sleepy: true, shop: null, box: false,
    blurb: 'Its branches sway to a lullaby. A reward for sixty full nights.',
    goal: nights(dur(7.5), 15),
  },
  {
    id: 'crystalrose', name: 'Crystal rose', rarity: 'epic', sleepy: true, shop: null, box: false,
    blurb: 'A rose of frosted glass, grown from hundreds of hours of restorative sleep.',
    goal: nights(restorative(180), 20),
  },
  // evolved epics
  {
    id: 'starblossom', name: 'Star blossom', rarity: 'epic', sleepy: true, shop: null, box: false,
    blurb: 'The glimmer bud, opened into a flower that holds a little starlight.',
  },
  {
    id: 'dreamcatcher', name: 'Dreamcatcher vine', rarity: 'epic', sleepy: true, shop: null, box: false,
    blurb: 'The thread vine, coiled into a hoop that catches the restless nights.',
  },
  {
    id: 'moonlotus', name: 'Moon lotus', rarity: 'epic', sleepy: true, shop: null, box: false,
    blurb: 'The lotus under moonlight: white and blue, with a halo of its own.',
  },
  {
    id: 'moonwood', name: 'Moonwood tree', rarity: 'epic', sleepy: true, shop: null, box: false,
    blurb: 'The sapling, now an old tree hung with moon-blossoms.',
  },

  // ---- legendary (goals only) -----------------------------------------------------------------------------------------
  {
    id: 'aurora', name: 'Aurora tree', rarity: 'legendary', sleepy: true, shop: null, box: false,
    blurb: 'A tree with ribbons of northern light in its branches. A reward for a full year of sleep.',
    goal: nights(score(80), 40),
  },
  {
    id: 'celestial', name: 'Celestial bloom', rarity: 'legendary', sleepy: true, shop: null, box: false,
    blurb: 'A flower that is also a small galaxy. A reward for two and a half thousand hours of sleep.',
    goal: total('rem', 200),
  },
]

const byId = new Map(SPECIES.map((s) => [s.id, s]))
export const speciesById = (id: string): Species | undefined => byId.get(id)
export const speciesName = (id: string) => byId.get(id)?.name ?? id

/** The species that evolves into `id`, if any. */
export const evolvesFrom = (id: string): Species | undefined => SPECIES.find((s) => s.evolvesTo?.to === id)

/** What a seed costs in the shop, or null when it isn't sold. */
export const seedPrice = (id: string): number | null => byId.get(id)?.shop?.price ?? null

/** Seeds every new garden starts with. */
export const STARTER_SEEDS: Record<string, number> = Object.fromEntries(SPECIES.filter((s) => s.starter).map((s) => [s.id, s.starter as number]))
