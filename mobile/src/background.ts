// Automatic health sync. Three triggers feed one `runSync`, which logs every attempt on the phone (see Devices):
//
//   observer    iOS only: HealthKit tells us new sleep was written to Health (background delivery; can wake a closed app).
//   task        an hourly background task (iOS/Android decide when it really runs): from 6am until today's night has arrived.
//   foreground  the app was opened or came back to the foreground.
//
// Android has no observer: Health Connect can't wake the app, so there the hourly task and the on-open sync do all the work.
// Apple Health data is encrypted while the phone is locked, so reads fail then (Health Connect stays readable). We check first and just try again at the
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

const TASK = 'legity-sleep-sync'
const TASK_INTERVAL_MIN = 60
const OBSERVER_GAP_MS = 2 * 60_000
const FOREGROUND_GAP_MS = 2 * 60_000
// The hourly task only hunts for today's night inside this window: nothing new can exist before you wake up (the watch
// writes the night once you're up), and a day with no watch data shouldn't keep retrying forever.
const WINDOW_START_HOUR = 6
const WINDOW_END_HOUR = 14

const SUPPORTED = Platform.OS === 'ios' || Platform.OS === 'android'

type Reason = 'observer' | 'task' | 'foreground'
// Loaded lazily: the platform's health module is only needed once a sync actually runs.
const source = () => require('./lib/healthSource') as typeof import('./lib/healthSource')

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

      if (!source().healthReadable()) {
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
  if (!SUPPORTED) return
  await source().startObserver(
    () => void runSync('observer', OBSERVER_GAP_MS),
    (detail) => appendSyncLog({ at: Date.now(), reason: 'observer', outcome: 'error', detail }),
  )
  await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: TASK_INTERVAL_MIN })
}

export async function stopBackgroundSync(): Promise<void> {
  if (!SUPPORTED) return
  await source().stopObserver()
  await BackgroundTask.unregisterTaskAsync(TASK).catch(() => {})
}

/** The Devices toggle. */
export async function setBackgroundSync(on: boolean): Promise<void> {
  setBackgroundEnabledFlag(on)
  if (on) await startBackgroundSync()
  else await stopBackgroundSync()
}

if (SUPPORTED) {
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
