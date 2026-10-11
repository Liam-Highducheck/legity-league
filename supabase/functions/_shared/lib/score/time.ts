// GENERATED from web/src/lib/score/time.ts by scripts/sync-shared.mjs. Do not edit here: change the source and run
//   node scripts/sync-shared.mjs
// Local-clock helpers shared by the score and the bedtime stats. One Intl formatter per timezone: building one is
// slow, and the score alone asks for ~14 per night.

const formatters = new Map<string, Intl.DateTimeFormat>()

function clockFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    formatters.set(timeZone, f)
  }
  return f
}

/** Minutes after local midnight (0-1439) at instant `iso` in `timeZone`. */
export function minutesOfDay(iso: string, timeZone: string): number {
  const parts = clockFormatter(timeZone).formatToParts(new Date(iso))
  const h = Number(parts.find((p) => p.type === 'hour')!.value)
  const m = Number(parts.find((p) => p.type === 'minute')!.value)
  return h * 60 + m
}

/** Minutes after local noon that sleep began. Anchoring on noon keeps 23:50 and 00:10 on the same side of the wrap. */
export function onsetFromNoon(iso: string, timeZone: string): number {
  return (((minutesOfDay(iso, timeZone) - 720) % 1440) + 1440) % 1440
}
