import { describe, expect, it } from 'vitest'
import {
  ACHIEVEMENTS, BOX_WEIGHTS, GRID_CELLS, RARITIES, SPECIES, STARTER_SEEDS, achievementStatuses, claimableAchievements,
  claimableNights, describeGoal, evolvesFrom, gardenStats, goalProgress, nightReward, overgrowth, plantStatus, seedPrice,
  boxChance, seedSources, speciesById, stageFor, type GardenNight, type PlantRow,
} from './index.ts'

function night(date: string, o: Partial<GardenNight> = {}): GardenNight {
  return {
    night_date: date, duration_min: 480, restorative_min: 150, deep_min: 70, rem_min: 90, awake_min: 20, wake_count: 1,
    sleep_start: `${date}T11:30:00Z`, timezone: 'UTC', sleep_score: 80, ...o,
  }
}
const days = (from: number, to: number, o: (d: number) => Partial<GardenNight> = () => ({})) =>
  Array.from({ length: to - from + 1 }, (_, i) => night(`2026-10-${String(from + i).padStart(2, '0')}`, o(from + i)))

describe('goalProgress', () => {
  it('counts nights meeting a condition and records when it was done', () => {
    const g = { kind: 'nights', cond: { metric: 'duration', op: '>=', value: 480 }, count: 3 } as const
    const list = [night('2026-10-01'), night('2026-10-02', { duration_min: 300 }), night('2026-10-03'), night('2026-10-05'), night('2026-10-06')]
    const p = goalProgress(g, list)
    expect(p).toMatchObject({ value: 3, target: 3, done: true, doneOn: '2026-10-05' })
  })

  it('streaks need consecutive dates', () => {
    const g = { kind: 'streak', cond: { metric: 'score', op: '>=', value: 80 }, count: 3 } as const
    const gap = [night('2026-10-01'), night('2026-10-02'), night('2026-10-04'), night('2026-10-05')]
    expect(goalProgress(g, gap)).toMatchObject({ value: 2, done: false })
    const full = [...gap, night('2026-10-06')]
    expect(goalProgress(g, full)).toMatchObject({ value: 3, done: true, doneOn: '2026-10-06' })
    const broken = [night('2026-10-01'), night('2026-10-02', { sleep_score: 50 }), night('2026-10-03'), night('2026-10-04')]
    expect(goalProgress(g, broken).value).toBe(2)
  })

  it('totals add minutes and ignore missing stage data', () => {
    const g = { kind: 'total', metric: 'rem', minutes: 200 } as const
    const list = [night('2026-10-01', { rem_min: 90 }), night('2026-10-02', { rem_min: null }), night('2026-10-03', { rem_min: 120 })]
    expect(goalProgress(g, list)).toMatchObject({ value: 200, done: true, doneOn: '2026-10-03' })
  })

  it('only counts nights after the cutoff', () => {
    const g = { kind: 'nights', cond: { metric: 'score', op: '>=', value: 60 }, count: 2 } as const
    const list = days(1, 5)
    expect(goalProgress(g, list, '2026-10-03')).toMatchObject({ value: 2, done: true, doneOn: '2026-10-05' })
    expect(goalProgress(g, list, '2026-10-04').done).toBe(false)
  })

  it('bedtime uses the local clock after noon, and a missing value never counts', () => {
    const g = { kind: 'nights', cond: { metric: 'bedtime', op: '<=', value: 630 }, count: 1 } as const // by 10:30pm
    expect(goalProgress(g, [night('2026-10-01', { sleep_start: '2026-09-30T22:00:00Z' })]).done).toBe(true)
    expect(goalProgress(g, [night('2026-10-01', { sleep_start: '2026-09-30T23:30:00Z' })]).done).toBe(false)
    expect(goalProgress(g, [night('2026-10-01', { sleep_start: null })]).done).toBe(false)
    // 00:30 is after midnight, so it is late, not early
    expect(goalProgress(g, [night('2026-10-01', { sleep_start: '2026-10-01T00:30:00Z' })]).done).toBe(false)
  })
})

describe('describeGoal', () => {
  it('reads naturally', () => {
    expect(describeGoal({ kind: 'nights', cond: { metric: 'duration', op: '>=', value: 480 }, count: 3 })).toBe('3 nights with 8h+ of sleep')
    expect(describeGoal({ kind: 'streak', cond: { metric: 'score', op: '>=', value: 80 }, count: 5 })).toBe('5 nights in a row with a sleep score of 80+')
    expect(describeGoal({ kind: 'total', metric: 'rem', minutes: 600 })).toBe('10h of REM sleep in total')
    expect(describeGoal({ kind: 'nights', cond: { metric: 'bedtime', op: '<=', value: 630 }, count: 3 })).toBe('3 nights asleep by 10:30pm')
  })
})

describe('overgrowth', () => {
  const today = '2026-10-10'
  it('is healthy with recent good nights', () => {
    expect(overgrowth(days(5, 10), today).overgrown).toBe(false)
  })
  it('three bad nights in a row overgrow the garden, one good night clears it', () => {
    const bad = days(1, 10, (d) => ({ sleep_score: d >= 8 ? 40 : 80 }))
    expect(overgrowth(bad, today)).toMatchObject({ overgrown: true, badRun: 3 })
    const recovered = days(1, 10, (d) => ({ sleep_score: d === 10 ? 85 : d >= 7 ? 40 : 80 }))
    expect(overgrowth(recovered, today).overgrown).toBe(false)
  })
  it("today's missing night is not held against you, earlier missing nights are", () => {
    const list = days(1, 7).filter((n) => n.night_date <= '2026-10-07')
    expect(overgrowth(list, '2026-10-08')).toMatchObject({ badRun: 0 }) // night 08 hasn't synced yet
    expect(overgrowth(list, '2026-10-10')).toMatchObject({ badRun: 2, overgrown: false })
    expect(overgrowth(list, '2026-10-11')).toMatchObject({ badRun: 3, overgrown: true })
  })
  it('a night with no score is neutral', () => {
    const list = days(1, 10, (d) => ({ sleep_score: d === 9 ? null : 40 }))
    expect(overgrowth(list, today).badRun).toBe(1)
  })
})

describe('plant growth and evolution', () => {
  const plant = (species: string, o: Partial<PlantRow> = {}): PlantRow => ({
    id: 'p1', species, cell: 0, planted_on: '2026-10-01', evolved_from: null, evolved_on: null, ...o,
  })

  it('a sprout needs 2 decent nights after planting', () => {
    const list = days(1, 4)
    const s = plantStatus(plant('sprout'), list)!
    expect(s.growth).toMatchObject({ value: 2, done: true, doneOn: '2026-10-03' })
    expect(s.stage).toBe(3)
    expect(s.maturedOn).toBe('2026-10-03')
    const early = plantStatus(plant('sprout'), days(1, 2))!
    expect(early.growth.value).toBe(1)
    expect(early.stage).toBe(1)
    expect(plantStatus(plant('sprout', { planted_on: '2026-10-04' }), list)!.stage).toBe(0)
  })

  it('evolution counts only after the plant matured', () => {
    // sprout matures on the 3rd, evolution needs 3 nights scoring 75+ after that
    const list = days(1, 8)
    const s = plantStatus(plant('sprout'), list)!
    expect(s.evolution?.to.id).toBe('fern')
    expect(s.evolution?.progress).toMatchObject({ value: 3, done: true, doneOn: '2026-10-06' })
    expect(s.evolution?.ready).toBe(true)
    const notYet = plantStatus(plant('sprout'), days(1, 5))!
    expect(notYet.evolution?.progress.value).toBe(2)
    expect(notYet.evolution?.ready).toBe(false)
  })

  it('an evolved plant is fully grown and counts its next evolution from evolved_on', () => {
    const list = days(1, 12)
    const s = plantStatus(plant('fern', { evolved_from: 'sprout', evolved_on: '2026-10-08' }), list)!
    expect(s.mature).toBe(true)
    expect(s.stage).toBe(3)
    expect(s.evolution?.to.id).toBe('dreamcatcher')
    // fern -> dreamcatcher needs 8h of deep sleep after the 8th: 4 nights of 70 min = 280 min < 480
    expect(s.evolution?.progress.done).toBe(false)
    expect(s.evolution?.progress.value).toBe(280)
  })

  it('stages follow progress thirds', () => {
    const p = (value: number, done = false) => ({ value, target: 3, done, doneOn: null })
    expect([stageFor(p(0)), stageFor(p(1)), stageFor(p(2)), stageFor(p(3, true))]).toEqual([0, 1, 2, 3])
  })

  it('unknown species are ignored instead of crashing', () => {
    expect(plantStatus(plant('mystery'), [])).toBeNull()
  })
})

describe('economy', () => {
  it('coins equal the night score and a 100 earns a box', () => {
    expect(nightReward(83)).toEqual({ coins: 83, box: false })
    expect(nightReward(100)).toEqual({ coins: 100, box: true })
    expect(nightReward(140)).toEqual({ coins: 100, box: true })
  })

  it('only unclaimed, scored nights inside the grace window are claimable', () => {
    const list = [night('2026-09-20'), night('2026-10-01'), night('2026-10-02', { sleep_score: null }), night('2026-10-03'), night('2026-10-04')]
    const claims = claimableNights(list, new Set(['2026-10-03']), '2026-10-05')
    expect(claims.map((c) => c.date)).toEqual(['2026-10-01', '2026-10-04'])
  })

  it('achievements become claimable once done and only once', () => {
    const list = days(1, 8)
    const stats = gardenStats([], list, 0)
    const done = claimableAchievements(achievementStatuses(list, stats), new Set())
    expect(done).toContain('first-night')
    expect(done).toContain('week-logged')
    expect(done).toContain('eight-streak-7')
    expect(done).not.toContain('first-plant')
    expect(claimableAchievements(achievementStatuses(list, stats), new Set(done))).toEqual([])
  })

  it('goals only count nights from the start of the window', () => {
    const list = days(1, 12)
    const stats = gardenStats([], list, 0)
    const all = achievementStatuses(list, stats).find((a) => a.def.id === 'week-logged')!
    expect(all.progress.done).toBe(true)
    const since = achievementStatuses(list, stats, '2026-10-08').find((a) => a.def.id === 'week-logged')!
    expect(since.progress).toMatchObject({ value: 5, target: 7, done: false })
  })

  it('garden stats count plants, species, evolutions and mature plants', () => {
    const plants: PlantRow[] = [
      { id: 'a', species: 'sprout', cell: 0, planted_on: '2026-10-01', evolved_from: null, evolved_on: null },
      { id: 'b', species: 'fern', cell: null, planted_on: '2026-10-01', evolved_from: 'sprout', evolved_on: '2026-10-05' },
    ]
    expect(gardenStats(plants, days(1, 6), 2)).toEqual({ plants: 2, species: 2, evolved: 1, mature: 2, boxesOpened: 2 })
  })
})

describe('catalog integrity', () => {
  const ids = new Set(SPECIES.map((s) => s.id))
  it('ids are unique and evolutions point at real species', () => {
    expect(ids.size).toBe(SPECIES.length)
    for (const s of SPECIES) if (s.evolvesTo) expect(ids.has(s.evolvesTo.to)).toBe(true)
  })
  it('every species evolves from at most one parent and chains do not loop', () => {
    for (const s of SPECIES) {
      expect(SPECIES.filter((p) => p.evolvesTo?.to === s.id).length).toBeLessThanOrEqual(1)
      let cur = s
      const seen = new Set<string>()
      while (cur.evolvesTo) {
        expect(seen.has(cur.id)).toBe(false)
        seen.add(cur.id)
        cur = speciesById(cur.evolvesTo.to)!
      }
    }
    expect(evolvesFrom('sakura')?.id).toBe('bonsai')
  })
  it('every rarity has something to drop and something sold', () => {
    for (const r of RARITIES) expect(SPECIES.some((s) => s.droppable && s.rarity === r)).toBe(true)
    expect(BOX_WEIGHTS.common + BOX_WEIGHTS.uncommon + BOX_WEIGHTS.rare + BOX_WEIGHTS.epic).toBe(100)
    expect(SPECIES.filter((s) => s.shop === 'always').length).toBeGreaterThanOrEqual(3)
    expect(SPECIES.filter((s) => s.shop === 'rotating').length).toBeGreaterThanOrEqual(3)
    expect(seedPrice('sprout')).toBe(150)
    expect(seedPrice('willow')).toBeNull()
  })
  it('starter seeds, achievement rewards and ids are valid', () => {
    for (const id of Object.keys(STARTER_SEEDS)) expect(ids.has(id)).toBe(true)
    const aids = new Set(ACHIEVEMENTS.map((a) => a.id))
    expect(aids.size).toBe(ACHIEVEMENTS.length)
    for (const a of ACHIEVEMENTS) {
      if (a.reward.seed) expect(ids.has(a.reward.seed)).toBe(true)
      expect(a.reward.coins + a.reward.boxes + (a.reward.seed ? 1 : 0)).toBeGreaterThan(0)
    }
    expect(GRID_CELLS).toBe(25)
  })
  it('evolution-only species cannot be bought or dropped', () => {
    const sakura = speciesById('sakura')!
    expect(sakura.shop).toBeNull()
    expect(sakura.droppable).toBe(false)
  })
})

describe('seed sources', () => {
  it('every species can actually be obtained somehow', () => {
    for (const s of SPECIES) expect(seedSources(s.id).length, s.id).toBeGreaterThan(0)
  })
  it('lists every route for a species', () => {
    const kinds = (id: string) => seedSources(id).map((x) => x.kind)
    expect(kinds('sprout')).toEqual(expect.arrayContaining(['starter', 'shop', 'box']))
    expect(kinds('sakura')).toEqual(['evolution'])
    expect(kinds('willow')).toEqual(expect.arrayContaining(['box', 'goal']))
    expect(seedSources('fern').some((x) => x.kind === 'evolution')).toBe(true)
  })
  it('box chances add up to the weights of each rarity', () => {
    for (const r of RARITIES) {
      const total = SPECIES.filter((s) => s.droppable && s.rarity === r).reduce((sum, s) => sum + boxChance(s.id), 0)
      expect(total).toBeCloseTo(BOX_WEIGHTS[r])
    }
    expect(boxChance('sakura')).toBe(0)
  })
})
