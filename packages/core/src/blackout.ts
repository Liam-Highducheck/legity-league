import type { Profile } from './types'

/** A fixed daily window; used for both the app-wide and the per-group blackout. */
export interface ForcedBlackout {
  enabled: boolean
  start: string
  end: string
}

export interface BlackoutState {
  active: boolean
  reason: 'app' | 'group' | 'personal' | null
  opensAt: number | null // minutes since midnight when rankings return
}

const DAY = 1440

export function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function nowMinutes(timeZone: string, now: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  return h * 60 + m
}

function inWindow(cur: number, start: number, end: number): boolean {
  if (start === end) return false
  return start < end ? cur >= start && cur < end : cur >= start || cur < end
}

export function personalWindow(p: Pick<
  Profile,
  'blackout_enabled' | 'blackout_mode' | 'blackout_start' | 'blackout_end' | 'target_bedtime' | 'target_wake' | 'blackout_lead_min'
>): { start: number; end: number } | null {
  if (!p.blackout_enabled) return null
  if (p.blackout_mode === 'fixed') {
    return { start: toMinutes(p.blackout_start), end: toMinutes(p.blackout_end) }
  }
  const start = (((toMinutes(p.target_bedtime) - p.blackout_lead_min) % DAY) + DAY) % DAY
  return { start, end: toMinutes(p.target_wake) }
}

// Evaluated in the user's own timezone. Active if the app-wide, group or personal window covers "now".
export function blackoutState(
  profile: Profile | null | undefined,
  forced: ForcedBlackout | null | undefined,
  group: ForcedBlackout | null | undefined,
  now: Date = new Date(),
): BlackoutState {
  if (!profile) return { active: false, reason: null, opensAt: null }
  const tz = profile.timezone
  const personal = personalWindow(profile)
  const forcedWin = forced?.enabled ? { start: toMinutes(forced.start), end: toMinutes(forced.end) } : null

  const groupWin = group?.enabled ? { start: toMinutes(group.start), end: toMinutes(group.end) } : null

  const activeAt = (cur: number) => ({
    app: forcedWin ? inWindow(cur, forcedWin.start, forcedWin.end) : false,
    group: groupWin ? inWindow(cur, groupWin.start, groupWin.end) : false,
    personal: personal ? inWindow(cur, personal.start, personal.end) : false,
  })

  const cur = nowMinutes(tz, now)
  const a = activeAt(cur)
  if (!a.app && !a.group && !a.personal) return { active: false, reason: null, opensAt: null }

  // First minute at which neither window is active.
  let opensAt: number | null = null
  for (let i = 1; i <= DAY; i++) {
    const c = (cur + i) % DAY
    const s = activeAt(c)
    if (!s.app && !s.group && !s.personal) {
      opensAt = c
      break
    }
  }
  return { active: true, reason: a.app ? 'app' : a.group ? 'group' : 'personal', opensAt }
}
