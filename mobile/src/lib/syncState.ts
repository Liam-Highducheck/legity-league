// Small device-local flags for Apple Health syncing (localStorage is backed by expo-sqlite, so it works in a
// background launch too).

const AUTHORIZED = 'll_health_authorized'
const BG_OFF = 'll_bg_sync_off'
const LAST = 'll_last_sync'

function get(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function set(key: string, value: string | null) {
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* device-local convenience only */
  }
}

/** Set once the person has been through the Health permission sheet (observers must not be registered before it). */
export const healthAuthorized = () => get(AUTHORIZED) === '1'
export const markHealthAuthorized = () => set(AUTHORIZED, '1')

/** Automatic syncing is on by default; the toggle on Devices turns it off. */
export const backgroundEnabled = () => get(BG_OFF) !== '1'
export const setBackgroundEnabledFlag = (on: boolean) => set(BG_OFF, on ? null : '1')

export interface LastSync {
  at: number
  reason: string
  ok: boolean
  segments?: number
  error?: string
}
export function lastSync(): LastSync | null {
  const raw = get(LAST)
  try {
    return raw ? (JSON.parse(raw) as LastSync) : null
  } catch {
    return null
  }
}
export const recordSync = (s: LastSync) => set(LAST, JSON.stringify(s))

/** One line of the on-device sync log (the Devices screen shows it, so we can see what iOS actually does in the background). */
export interface SyncLogEntry {
  at: number
  reason: string
  outcome: 'ok' | 'skipped' | 'locked' | 'error'
  detail?: string
  segments?: number
  ms?: number
}
const LOG = 'll_sync_log'
const LOG_MAX = 40
export function syncLog(): SyncLogEntry[] {
  const raw = get(LOG)
  try {
    return raw ? (JSON.parse(raw) as SyncLogEntry[]) : []
  } catch {
    return []
  }
}
export function appendSyncLog(entry: SyncLogEntry) {
  set(LOG, JSON.stringify([entry, ...syncLog()].slice(0, LOG_MAX)))
}

/** The newest night (its wake-up date) we have confirmed on the server for the signed-in account, to know when today is done. */
const LATEST = 'll_latest_night'
export const latestNight = () => get(LATEST)
export const setLatestNight = (date: string | null) => set(LATEST, date)

// "Syncing…" state for the UI.
let syncing = false
const syncingListeners = new Set<(v: boolean) => void>()
export const isSyncing = () => syncing
export function setSyncing(v: boolean) {
  syncing = v
  syncingListeners.forEach((cb) => cb(v))
}
export const onSyncing = (cb: (v: boolean) => void) => {
  syncingListeners.add(cb)
  return () => {
    syncingListeners.delete(cb)
  }
}

// Lets the UI refresh its data when a sync finishes while the app is open (e.g. after a background wake-up).
const listeners = new Set<() => void>()
export const onSynced = (cb: () => void) => {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
export const emitSynced = () => listeners.forEach((cb) => cb())
