// Background Apple Health sync.
//
// iOS wakes the app when new sleep samples are written to Health (HealthKit background delivery), even if the app was
// closed, as long as it wasn't force-quit. This module is imported from index.ts so the handler exists before React
// renders: in a background launch the UI never mounts. It also catches up whenever the app returns to the foreground.
//
// Safe on a fresh install: nothing is registered until the person has been through the Health permission sheet.
import { AppState, Platform } from 'react-native'
import './lib/supabase'
import { supabase } from './lib/supabase'
import { backgroundEnabled, emitSynced, healthAuthorized, recordSync, setBackgroundEnabledFlag } from './lib/syncState'

const SLEEP = 'HKCategoryTypeIdentifierSleepAnalysis'
const BACKGROUND_GAP_MS = 5 * 60_000
const FOREGROUND_GAP_MS = 30 * 60_000

type HealthKit = typeof import('@kingstinct/react-native-healthkit')
const healthKit = (): HealthKit => require('@kingstinct/react-native-healthkit')

let subscription: { remove: () => void } | null = null
let inflight: Promise<void> | null = null
let lastRunAt = 0

/** One quiet sync of the last few days. Throttled, never overlaps itself, and never throws. */
export function backgroundSync(reason: 'background' | 'foreground', minGapMs: number): Promise<void> {
  if (inflight) return inflight
  if (Date.now() - lastRunAt < minGapMs) return Promise.resolve()
  inflight = (async () => {
    try {
      // getSession refreshes an expired token, which matters when we're woken long after the last launch.
      const { data } = await supabase.auth.getSession()
      if (!data.session) return
      const { syncSleep } = require('./lib/healthSync') as typeof import('./lib/healthSync')
      const { segments } = await syncSleep(3, reason)
      lastRunAt = Date.now()
      recordSync({ at: lastRunAt, reason, ok: true, segments })
      emitSynced()
    } catch (e) {
      recordSync({ at: Date.now(), reason, ok: false, error: e instanceof Error ? e.message : String(e) })
    } finally {
      inflight = null
    }
  })()
  return inflight
}

/** Registers background delivery with iOS and attaches our handler. Call only after Health has been authorised. */
export async function startBackgroundSync(): Promise<void> {
  if (Platform.OS !== 'ios' || subscription) return
  const hk = healthKit()
  // Persisted natively: iOS can relaunch the app for new sleep data even after it has been terminated.
  await hk.configureBackgroundTypes([SLEEP], hk.UpdateFrequency.immediate)
  subscription = hk.subscribeToChanges(SLEEP, ({ errorMessage }) => {
    if (!errorMessage) void backgroundSync('background', BACKGROUND_GAP_MS)
  })
}

export async function stopBackgroundSync(): Promise<void> {
  if (Platform.OS !== 'ios') return
  subscription?.remove()
  subscription = null
  await healthKit().clearBackgroundTypes()
}

/** The Devices toggle. Turning it on makes sure Health access has been granted first. */
export async function setBackgroundSync(on: boolean): Promise<void> {
  setBackgroundEnabledFlag(on)
  if (on) await startBackgroundSync()
  else await stopBackgroundSync()
}

if (Platform.OS === 'ios') {
  if (healthAuthorized() && backgroundEnabled()) {
    startBackgroundSync().catch(() => {})
  }
  AppState.addEventListener('change', (state) => {
    if (state === 'active' && healthAuthorized() && backgroundEnabled()) void backgroundSync('foreground', FOREGROUND_GAP_MS)
  })
}
