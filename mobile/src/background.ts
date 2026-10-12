// Automatic Apple Health sync. Four triggers feed one `runSync`, which logs every attempt on the phone (see Devices):
//
//   observer    iOS tells us new sleep was written to Health (HealthKit background delivery; can wake a closed app).
//   task        an hourly background task (iOS decides when it really runs): from 6am until today's night has arrived.
//   foreground  the app was opened or came back to the foreground.
//
// Apple Health data is encrypted while the phone is locked, so reads fail then. We check first and just try again at the
// next trigger (a log line says "locked"). This module is imported from index.ts so handlers exist in a background launch,
// when the UI never mounts. Nothing is registered until the Health permission sheet has been through.
import { AppState, Platform } from 'react-native'
import * as BackgroundTask from 'expo-background-task'
import * as TaskManager from 'expo-task-manager'
import { todayISO } from '@legity/core/dates'
import { supabase } from './lib/supabase'
import {
  appendSyncLog,
  backgroundEnabled,
  emitSynced,
  healthAuthorized,
  latestNight,
  recordSync,
  setBackgroundEnabledFlag,
  setSyncing,
} from './lib/syncState'

const SLEEP = 'HKCategoryTypeIdentifierSleepAnalysis'
const TASK = 'legity-sleep-sync'
const TASK_INTERVAL_MIN = 60
const OBSERVER_GAP_MS = 2 * 60_000
const FOREGROUND_GAP_MS = 2 * 60_000
// The hourly task only hunts for today's night inside this window: nothing new can exist before you wake up (the watch
// writes the night once you're up), and a day with no watch data shouldn't keep retrying forever.
const WINDOW_START_HOUR = 6
const WINDOW_END_HOUR = 14

type Reason = 'observer' | 'task' | 'foreground'
type HealthKit = typeof import('@kingstinct/react-native-healthkit')
const healthKit = (): HealthKit => require('@kingstinct/react-native-healthkit')

let subscription: { remove: () => void } | null = null
let inflight: Promise<void> | null = null
let lastRunAt = 0

const localToday = () => todayISO(Intl.DateTimeFormat().resolvedOptions().timeZone)
const haveToday = () => (latestNight() ?? '') >= localToday()

function skip(reason: Reason, detail: string) {
  appendSyncLog({ at: Date.now(), reason, outcome: 'skipped', detail })
}

/** One quiet sync of the last few days. Throttled, never overlaps itself, never throws. */
export function runSync(reason: Reason, minGapMs: number): Promise<void> {
  if (inflight) return inflight
  if (Date.now() - lastRunAt < minGapMs) return Promise.resolve()
  inflight = (async () => {
    const started = Date.now()
    try {
      // getSession refreshes an expired token, which matters when we're woken long after the last launch.
      const { data } = await supabase.auth.getSession()
      if (!data.session) return skip(reason, 'signed out')

      if (reason === 'task') {
        const hour = new Date().getHours()
        if (hour < WINDOW_START_HOUR || hour >= WINDOW_END_HOUR) return skip(reason, `outside ${WINDOW_START_HOUR}am-${WINDOW_END_HOUR - 12}pm window`)
        if (haveToday()) return skip(reason, "today's night already synced")
      }

      if (!healthKit().isProtectedDataAvailable()) {
        appendSyncLog({ at: Date.now(), reason, outcome: 'locked', detail: 'phone locked, Health unreadable' })
        return
      }

      setSyncing(true)
      const { syncSleep } = require('./lib/healthSync') as typeof import('./lib/healthSync')
      const { segments } = await syncSleep(3, reason)
      lastRunAt = Date.now()
      recordSync({ at: lastRunAt, reason, ok: true, segments })
      appendSyncLog({ at: lastRunAt, reason, outcome: 'ok', segments, ms: lastRunAt - started })
      emitSynced()
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e)
      recordSync({ at: Date.now(), reason, ok: false, error })
      appendSyncLog({ at: Date.now(), reason, outcome: 'error', detail: error, ms: Date.now() - started })
    } finally {
      setSyncing(false)
      inflight = null
    }
  })()
  return inflight
}

// Must be defined at module load (not in a component): iOS can launch the app just to run it.
TaskManager.defineTask(TASK, async () => {
  await runSync('task', 0)
  return BackgroundTask.BackgroundTaskResult.Success
})

/** Registers background delivery and the hourly task. Call only after Health has been authorised. */
export async function startBackgroundSync(): Promise<void> {
  if (Platform.OS !== 'ios') return
  const hk = healthKit()
  if (!subscription) {
    // Persisted natively: iOS can relaunch the app for new sleep data even after it has been terminated.
    await hk.configureBackgroundTypes([SLEEP], hk.UpdateFrequency.immediate)
    subscription = hk.subscribeToChanges(SLEEP, ({ errorMessage }) => {
      if (errorMessage) appendSyncLog({ at: Date.now(), reason: 'observer', outcome: 'error', detail: errorMessage })
      else void runSync('observer', OBSERVER_GAP_MS)
    })
  }
  await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: TASK_INTERVAL_MIN })
}

export async function stopBackgroundSync(): Promise<void> {
  if (Platform.OS !== 'ios') return
  subscription?.remove()
  subscription = null
  await healthKit().clearBackgroundTypes()
  await BackgroundTask.unregisterTaskAsync(TASK).catch(() => {})
}

/** The Devices toggle. */
export async function setBackgroundSync(on: boolean): Promise<void> {
  setBackgroundEnabledFlag(on)
  if (on) await startBackgroundSync()
  else await stopBackgroundSync()
}

if (Platform.OS === 'ios') {
  if (healthAuthorized() && backgroundEnabled()) {
    startBackgroundSync().catch((e) => appendSyncLog({ at: Date.now(), reason: 'startup', outcome: 'error', detail: String(e) }))
  }
  const onActive = () => {
    if (healthAuthorized() && backgroundEnabled()) void runSync('foreground', FOREGROUND_GAP_MS)
  }
  AppState.addEventListener('change', (state) => state === 'active' && onActive())
  // A cold start is already 'active', so no change event fires: sync on launch too.
  if (AppState.currentState === 'active') onActive()
}
