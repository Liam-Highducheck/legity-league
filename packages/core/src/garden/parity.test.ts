import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, BOX_PITY, BOX_PRICE, BOX_WEIGHTS, SEED_PRICES, SPECIES } from './index.ts'

// The garden catalog lives twice: in TypeScript (names, art, sleep goals) and in the database (prices, odds, rewards)
// so the server can price and pay without trusting the client. This keeps the two from drifting.
const dir = fileURLToPath(new URL('../../../../supabase/migrations/', import.meta.url))
const sql = readdirSync(dir)
  .filter((f) => f.endsWith('_garden.sql'))
  .sort()
  .map((f) => readFileSync(dir + f, 'utf8'))
  .join('\n')

const rows = (table: string) => {
  const block = sql.match(new RegExp(`insert into public\\.${table} \\([^)]*\\) values\\n([\\s\\S]*?)\\non conflict`))
  expect(block, `insert block for ${table}`).not.toBeNull()
  return block![1].split('\n').map((line) => {
    const m = line.match(/^\((.*)\),?$/)
    expect(m, line).not.toBeNull()
    return m![1].split(',').map((v) => v.trim().replace(/^'|'$/g, ''))
  })
}
const nullable = (v: string) => (v === 'null' ? null : v)

describe('garden catalog matches the migration', () => {
  it('species', () => {
    const db = rows('garden_species')
    expect(db.map((r) => r[0]).sort()).toEqual(SPECIES.map((s) => s.id).sort())
    for (const [id, rarity, price, shop, droppable, evolvesFrom] of db) {
      const s = SPECIES.find((x) => x.id === id)!
      expect(rarity, id).toBe(s.rarity)
      expect(nullable(shop), id).toBe(s.shop)
      expect(nullable(price) == null ? null : Number(price), id).toBe(s.shop ? SEED_PRICES[s.rarity] : null)
      expect(droppable === 'true', id).toBe(s.droppable)
      expect(nullable(evolvesFrom), id).toBe(SPECIES.find((p) => p.evolvesTo?.to === id)?.id ?? null)
    }
  })

  it('achievement rewards', () => {
    const db = rows('garden_achievements')
    expect(db.map((r) => r[0]).sort()).toEqual(ACHIEVEMENTS.map((a) => a.id).sort())
    for (const [id, coins, boxes, seed] of db) {
      const a = ACHIEVEMENTS.find((x) => x.id === id)!
      expect([Number(coins), Number(boxes), nullable(seed)], id).toEqual([a.reward.coins, a.reward.boxes, a.reward.seed ?? null])
    }
  })

  it('box price, odds and pity', () => {
    const prices = [...sql.matchAll(/box_price constant integer := (\d+)/g)].map((m) => Number(m[1]))
    expect(prices.length).toBeGreaterThan(0)
    for (const p of prices) expect(p).toBe(BOX_PRICE)
    const w = (name: string) => Number(sql.match(new RegExp(`w_${name} constant integer := (\\d+)`))![1])
    expect({ common: w('common'), uncommon: w('uncommon'), rare: w('rare'), epic: w('epic') }).toEqual(BOX_WEIGHTS)
    expect(Number(sql.match(/pity_after constant integer := (\d+)/)![1])).toBe(BOX_PITY)
  })

  it('starter seeds', () => {
    const grants = [...sql.matchAll(/garden_add_seed\(v_uid, '(\w+)', (\d+)\)/g)].map((m) => [m[1], Number(m[2])])
    expect(Object.fromEntries(grants)).toEqual({ sprout: 2, tulip: 1, chamomile: 1 })
  })
})
