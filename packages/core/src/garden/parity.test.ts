import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, BOX_PITY, BOX_PRICE, BOX_WEIGHTS, ROTATING_SLOTS, SPECIES, STARTER_SEEDS, evolvesFrom } from './index.ts'

// The garden catalog lives twice: in TypeScript (names, art, sleep goals) and in the database (prices, odds, rewards)
// so the server can price and pay without trusting the client. This keeps the two from drifting.
//
// Catalog changes ship as new migrations that upsert rows (an applied migration is never edited), so the database's
// catalog is "every garden migration replayed in order": later rows win by id, and deletes remove them.
const dir = fileURLToPath(new URL('../../../../supabase/migrations/', import.meta.url))
const files = readdirSync(dir)
  .filter((f) => /_garden.*\.sql$/.test(f))
  .sort()
const sqls = files.map((f) => readFileSync(dir + f, 'utf8'))
const all = sqls.join('\n')

const nullable = (v: string) => (v === 'null' ? null : v)

/**
 * The catalog table `table` after replaying every garden migration in order: each `insert ... on conflict` upserts its rows (later
 * rows win by id) and each `delete from public.<table> where id in (...)` removes them, in the order they appear in the file.
 */
function replay(table: string) {
  const merged = new Map<string, string[]>()
  for (const sql of sqls) {
    const events: { at: number; rows?: string[][]; ids?: string[] }[] = []
    for (const m of sql.matchAll(new RegExp(`insert into public\\.${table} \\([^)]*\\) values\\n([\\s\\S]*?)\\non conflict`, 'g'))) {
      const rows = m[1].split('\n').map((line) => {
        const row = line.match(/^\((.*)\),?$/)
        expect(row, line).not.toBeNull()
        return row![1].split(',').map((v) => v.trim().replace(/^'|'$/g, ''))
      })
      events.push({ at: m.index ?? 0, rows })
    }
    for (const m of sql.matchAll(new RegExp(`delete from public\\.${table}\\s+where id in \\(([^)]*)\\)`, 'g'))) {
      events.push({ at: m.index ?? 0, ids: [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) })
    }
    for (const e of events.sort((x, y) => x.at - y.at)) {
      for (const row of e.rows ?? []) merged.set(row[0], row)
      for (const id of e.ids ?? []) merged.delete(id)
    }
  }
  return merged
}

/** The last declared value of a `constant integer` in the migrations (later migrations redefine functions). */
const lastConstant = (name: string) => {
  const found = [...all.matchAll(new RegExp(`${name} constant integer := (\\d+)`, 'g'))]
  expect(found.length, name).toBeGreaterThan(0)
  return Number(found[found.length - 1][1])
}

describe('garden catalog matches the migrations', () => {
  it('species', () => {
    const db = replay('garden_species')
    expect([...db.keys()].sort()).toEqual(SPECIES.map((s) => s.id).sort())
    for (const [id, rarity, price, shop, droppable, evolvesFromId] of db.values()) {
      const s = SPECIES.find((x) => x.id === id)!
      expect(rarity, id).toBe(s.rarity)
      expect(nullable(shop), id).toBe(s.shop?.stock ?? null)
      expect(nullable(price) == null ? null : Number(price), id).toBe(s.shop?.price ?? null)
      expect(droppable === 'true', id).toBe(s.box)
      expect(nullable(evolvesFromId), id).toBe(evolvesFrom(id)?.id ?? null)
    }
  })

  it('achievement rewards', () => {
    const db = replay('garden_achievements')
    expect([...db.keys()].sort()).toEqual(ACHIEVEMENTS.map((a) => a.id).sort())
    for (const [id, coins, boxes, seed] of db.values()) {
      const a = ACHIEVEMENTS.find((x) => x.id === id)!
      expect([Number(coins), Number(boxes), nullable(seed)], id).toEqual([a.reward.coins, a.reward.boxes, a.reward.seed ?? null])
    }
  })

  it('box price, odds and pity', () => {
    const prices = [...all.matchAll(/box_price constant integer := (\d+)/g)].map((m) => Number(m[1]))
    expect(prices.length).toBeGreaterThan(0)
    for (const p of prices) expect(p).toBe(BOX_PRICE)
    expect({ common: lastConstant('w_common'), uncommon: lastConstant('w_uncommon'), rare: lastConstant('w_rare'), epic: lastConstant('w_epic'), legendary: 0 }).toEqual(BOX_WEIGHTS)
    expect(lastConstant('pity_after')).toBe(BOX_PITY)
  })

  it('shop rotation size', () => {
    const limits = [...all.matchAll(/order by md5\(s\.id \|\| p_date::text\) limit (\d+)/g)].map((m) => Number(m[1]))
    expect(limits[limits.length - 1]).toBe(ROTATING_SLOTS)
  })

  it('starter seeds', () => {
    const grants = [...sqls[0].matchAll(/garden_add_seed\(v_uid, '(\w+)', (\d+)\)/g)].map((m) => [m[1], Number(m[2])])
    expect(Object.fromEntries(grants)).toEqual(STARTER_SEEDS)
  })
})
