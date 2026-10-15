import { describeGoal } from './goals.ts'
import { ACHIEVEMENTS } from './achievements.ts'
import { BOX_WEIGHTS, SEED_PRICES, SPECIES, STARTER_SEEDS, ROTATING_SLOTS, evolvesFrom, speciesById } from './species.ts'
import { RARITY_LABELS } from './types.ts'

export interface SeedSource {
  kind: 'starter' | 'shop' | 'box' | 'evolution' | 'goal'
  text: string
}

/** Chance that one Dream Box drops this species (the rarity's weight shared between its droppable species), in percent. */
export function boxChance(id: string): number {
  const s = speciesById(id)
  if (!s || !s.droppable) return 0
  const pool = SPECIES.filter((x) => x.droppable && x.rarity === s.rarity).length
  return BOX_WEIGHTS[s.rarity] / pool
}

/** Every way to get a species, in plain words: for the dev codex and anywhere that explains where a plant comes from. */
export function seedSources(id: string): SeedSource[] {
  const s = speciesById(id)
  if (!s) return []
  const out: SeedSource[] = []
  const starter = STARTER_SEEDS[id]
  if (starter) out.push({ kind: 'starter', text: `Starter seed${starter > 1 ? `s (×${starter})` : ''} for every new garden` })
  if (s.shop === 'always') out.push({ kind: 'shop', text: `Shop, always in stock · ${SEED_PRICES[s.rarity]} coins` })
  if (s.shop === 'rotating') {
    const n = SPECIES.filter((x) => x.shop === 'rotating').length
    out.push({ kind: 'shop', text: `Shop, rotating (${ROTATING_SLOTS} of ${n} appear each day) · ${SEED_PRICES[s.rarity]} coins` })
  }
  if (s.droppable) {
    const pct = boxChance(id)
    out.push({ kind: 'box', text: `Dream Box · about ${pct < 10 ? pct.toFixed(1) : Math.round(pct)}% per box (${RARITY_LABELS[s.rarity].toLowerCase()} pool)` })
  }
  const parent = evolvesFrom(id)
  if (parent) out.push({ kind: 'evolution', text: `Evolve a ${parent.name}: ${describeGoal(parent.evolvesTo!.goal)} after it is fully grown` })
  for (const a of ACHIEVEMENTS) if (a.reward.seed === id) out.push({ kind: 'goal', text: `Goal “${a.name}”` })
  return out
}
