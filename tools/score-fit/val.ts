import { readFileSync } from 'node:fs'
import { appleScore } from '/Users/liam/Documents/coding/projects/legity-league/packages/core/src/score/apple.ts'
const { nights, actual } = JSON.parse(readFileSync('/tmp/ll/val.json', 'utf8'))
const ctx = { timezone: 'Australia/Sydney', goalMin: 480 }
const stats: Record<string, { err: number; exact: number; n: number }> = { total: { err: 0, exact: 0, n: 0 }, duration: { err: 0, exact: 0, n: 0 }, bedtime: { err: 0, exact: 0, n: 0 }, interruptions: { err: 0, exact: 0, n: 0 } }
const skip = new Set(['2026-09-10', '2026-09-11', ...(process.env.SKIP_TRIP ? ['2026-07-09','2026-07-10','2026-07-11','2026-07-12','2026-07-13','2026-07-14','2026-07-15','2026-07-16'] : [])])
const rowsOut: string[] = []
for (const n of nights) {
  const a = actual[n.night_date]
  if (!a || skip.has(n.night_date)) continue
  const r = appleScore.compute(n, nights, ctx)!
  const pred = [r.score, ...r.parts.map((p: any) => Math.round(p.points))]
  const act = [a[0] + a[1] + a[2], a[0], a[1], a[2]]
  ;['total', 'duration', 'bedtime', 'interruptions'].forEach((k, i) => {
    const s = stats[k]; s.n++; s.err += Math.abs(pred[i] - act[i]); s.exact += pred[i] === act[i] ? 1 : 0
  })
  rowsOut.push(`${n.night_date} pred ${pred.join('/')} actual ${act.join('/')} diff ${pred[0] - act[0]}`)
}
for (const [k, s] of Object.entries(stats)) console.log(k.padEnd(14), 'MAE', (s.err / s.n).toFixed(2), 'exact', ((100 * s.exact) / s.n).toFixed(0) + '%', 'n', s.n)
const top = nights.filter((n: any) => actual[n.night_date] && actual[n.night_date].reduce((a: number, b: number) => a + b, 0) >= 95 && !skip.has(n.night_date))
for (const n of top) { const r = appleScore.compute(n, nights, ctx)!; const a = actual[n.night_date]; console.log('>=95', n.night_date, 'pred', r.score, 'actual', a[0] + a[1] + a[2]) }
const hi = rowsOut.filter((l) => Number(l.split('actual ')[1].split('/')[0]) >= 88)
console.log('top end (actual >= 88):', hi.length)
console.log(hi.join('\n'))
