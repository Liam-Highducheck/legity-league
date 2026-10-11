// GENERATED from web/src/lib/league/rank.ts by scripts/sync-shared.mjs. Do not edit here: change the source and run
//   node scripts/sync-shared.mjs
/** Standard competition ranking: equal values share a rank and the next rank skips (1, 1, 3). Input order breaks display ties only. */
export function rankValues<T>(items: T[], value: (t: T) => number, direction: 'max' | 'min' = 'max'): (T & { rank: number })[] {
  const sorted = [...items].sort((a, b) => (direction === 'max' ? value(b) - value(a) : value(a) - value(b)))
  return sorted.map((item) => {
    const better = sorted.filter((o) => (direction === 'max' ? value(o) > value(item) : value(o) < value(item))).length
    return { ...item, rank: better + 1 }
  })
}

export function isBetter(candidate: number, current: number, direction: 'max' | 'min'): boolean {
  return direction === 'max' ? candidate > current : candidate < current
}
