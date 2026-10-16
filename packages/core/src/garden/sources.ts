import { ACHIEVEMENTS } from './achievements.ts'
import { describeGoal } from './goals.ts'
import { coinDays, goalDays } from './pace.ts'
import { BOX_PRICE, BOX_WEIGHTS, ROTATING_SLOTS, SPECIES, evolvesFrom, speciesById } from './species.ts'
import { RARITY_LABELS, type Species } from './types.ts'

export type RouteKind = 'starter' | 'shop' | 'box' | 'evolution' | 'goal'

export interface Route {
  kind: RouteKind
  text: string
  /** Expected days for a player who prioritises sleep (see pace.ts). 0 for the starter seed. */
  days: number
}

/** Chance that one Dream Box drops this species (its rarity's weight shared between that rarity's box plants), in percent. */
export function boxChance(id: string): number {
  const s = speciesById(id)
  if (!s || !s.box) return 0
  const pool = SPECIES.filter((x) => x.box && x.rarity === s.rarity).length
  return BOX_WEIGHTS[s.rarity] / pool
}

/** Days of growing a planted seed takes (0 for species that arrive fully grown). */
export function growthDays(s: Species): number {
  return s.goal ? goalDays(s.goal) : 0
}

/** The achievement that awards this species' seed, if any. */
export const goalFor = (id: string) => ACHIEVEMENTS.find((a) => a.reward.seed === id)

/** Every way to get a species, in plain words and in days. Rare and better plants should have exactly one. */
export function routesOf(id: string): Route[] {
  const s = speciesById(id)
  if (!s) return []
  const out: Route[] = []
  if (s.starter) out.push({ kind: 'starter', text: `Starter seed${s.starter > 1 ? `s (×${s.starter})` : ''} for every new garden`, days: 0 })
  if (s.shop) {
    const where = s.shop.stock === 'always' ? 'always in stock' : `rotating (${ROTATING_SLOTS} of ${SPECIES.filter((x) => x.shop?.stock === 'rotating').length} appear each day)`
    out.push({ kind: 'shop', text: `Shop, ${where} · ${s.shop.price} coins`, days: coinDays(s.shop.price) })
  }
  if (s.box) {
    const pct = boxChance(id)
    out.push({
      kind: 'box',
      text: `Dream Box · about ${pct < 10 ? pct.toFixed(1) : Math.round(pct)}% per box (${RARITY_LABELS[s.rarity].toLowerCase()} pool)`,
      days: coinDays((BOX_PRICE * 100) / pct),
    })
  }
  const parent = evolvesFrom(id)
  if (parent?.evolvesTo) {
    out.push({
      kind: 'evolution',
      text: `Evolve a ${parent.name}: ${describeGoal(parent.evolvesTo.goal)} after it is fully grown`,
      days: daysToObtain(parent.id) + growthDays(parent) + goalDays(parent.evolvesTo.goal),
    })
  }
  const goal = goalFor(id)
  if (goal && goal.goal.kind !== 'stat') out.push({ kind: 'goal', text: `Goal “${goal.name}”: ${describeGoal(goal.goal)}`, days: goalDays(goal.goal) })
  return out
}

/** Days to get a species by its quickest route. */
export function daysToObtain(id: string): number {
  const days = routesOf(id).map((r) => r.days)
  return days.length ? Math.min(...days) : Infinity
}

/** Back-compat name used by the codex: the routes as plain text lines. */
export const seedSources = routesOf
