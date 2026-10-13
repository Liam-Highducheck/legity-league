// Reads a Sleep Cycle data export (Settings -> Export data), the semicolon-separated CSV with one row per night.
//
//   Went to bed;Woke up;Sleep Quality;Time in bed (seconds);Time asleep (seconds);Asleep after (seconds);...
//   2026-10-11 23:06:48;2026-10-12 06:09:19;72%;25350;18928;1352;...
//
// Times are local to wherever the person slept (no zone in the file), so they are placed in the caller's time zone.
// Sleep Cycle gives totals, not stages, so each night becomes plain "Asleep" segments (phone-only data): from falling asleep
// until waking, with the restless time carved out as an unlabelled gap so the asleep total matches Sleep Cycle's own number
// and the bed/wake times are exact. No awake events are invented.

export interface SleepCycleSegment {
  start: string
  end: string
  value: string
  tz: string
}

export interface SleepCycleImport {
  segments: SleepCycleSegment[]
  nights: number
  /** Rows that couldn't be used (no wake time, or no sleep). */
  skipped: number
  /** First and last wake-up date found (YYYY-MM-DD), when there is at least one night. */
  from?: string
  to?: string
}

const pad = (n: number) => String(n).padStart(2, '0')

const formatters = new Map<string, Intl.DateTimeFormat>()
function formatter(tz: string) {
  let f = formatters.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    formatters.set(tz, f)
  }
  return f
}

/** `tz`'s offset from UTC at an instant, in milliseconds. */
function offsetAt(ms: number, tz: string): number {
  const p = Object.fromEntries(formatter(tz).formatToParts(new Date(ms)).map((x) => [x.type, x.value]))
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000
}

/** An instant written as local time in `tz` with its UTC offset, e.g. 2026-10-11T23:06:48+11:00. */
export function isoInZone(ms: number, tz: string): string {
  const offset = offsetAt(ms, tz)
  const d = new Date(ms + offset)
  const mins = Math.round(offset / 60_000)
  const sign = mins >= 0 ? '+' : '-'
  const abs = Math.abs(mins)
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  )
}

/** "2026-10-11 23:06:48" read in `tz`, as an instant (ms since epoch). Null when it isn't a date. */
export function zonedToMs(local: string, tz: string): number | null {
  const m = /^(\d{4})-(\d\d)-(\d\d)[ T](\d\d):(\d\d)(?::(\d\d))?$/.exec(local.trim())
  if (!m) return null
  const [y, mo, d, h, mi, s] = [m[1], m[2], m[3], m[4], m[5], m[6] ?? '0'].map(Number)
  const wall = Date.UTC(y, mo - 1, d, h, mi, s)
  // Two passes settle the offset even right next to a clock change.
  const first = offsetAt(wall, tz)
  return wall - offsetAt(wall - first, tz)
}

function splitLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (const ch of line) {
    if (ch === '"') quoted = !quoted
    else if (ch === ';' && !quoted) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.map((v) => v.trim())
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')

/** True when the text looks like a Sleep Cycle export (so a wrong file gets a clear message). */
export function looksLikeSleepCycle(text: string): boolean {
  const first = text.replace(/^﻿/, '').split(/\r?\n/, 1)[0] ?? ''
  const cols = splitLine(first).map(norm)
  return cols.includes('wenttobed') && cols.includes('wokeup')
}

export function parseSleepCycleCsv(text: string, tz: string): SleepCycleImport {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length === 0) return { segments: [], nights: 0, skipped: 0 }
  const header = splitLine(lines[0]).map(norm)
  const col = (name: string, fallback: number) => {
    const i = header.indexOf(name)
    return i >= 0 ? i : fallback
  }
  const iBed = col('wenttobed', 0)
  const iWake = col('wokeup', 1)
  const iAsleep = col('timeasleepseconds', 4)
  const iLatency = col('asleepafterseconds', 5)

  const segments: SleepCycleSegment[] = []
  let nights = 0
  let skipped = 0
  let from: string | undefined
  let to: string | undefined

  for (const line of lines.slice(1)) {
    const f = splitLine(line)
    const bed = zonedToMs(f[iBed] ?? '', tz)
    const wake = zonedToMs(f[iWake] ?? '', tz)
    const asleepS = Number(f[iAsleep])
    if (bed == null || wake == null || wake <= bed || !Number.isFinite(asleepS) || asleepS <= 0) {
      skipped++
      continue
    }
    const latencyS = Number(f[iLatency])
    const onset = bed + (Number.isFinite(latencyS) && latencyS > 0 ? Math.min(latencyS * 1000, wake - bed) : 0)
    const asleepMs = Math.min(asleepS * 1000, wake - onset)
    const gapMs = wake - onset - asleepMs
    const seg = (a: number, b: number) => {
      if (b > a) segments.push({ start: isoInZone(a, tz), end: isoInZone(b, tz), value: 'Asleep', tz })
    }
    if (gapMs >= 60_000) {
      // Restless time is unlabelled: asleep from falling asleep, a gap in the middle, asleep until waking.
      const half = asleepMs / 2
      seg(onset, onset + half)
      seg(wake - half, wake)
    } else {
      seg(onset, wake)
    }
    nights++
    const day = isoInZone(wake, tz).slice(0, 10)
    if (!from || day < from) from = day
    if (!to || day > to) to = day
  }
  return { segments, nights, skipped, from, to }
}
