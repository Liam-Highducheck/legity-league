// Apple Health (iOS) reader. Android's Health Connect version is healthSource.android.ts and must export the same names.
import {
  CategoryValueSleepAnalysis,
  clearBackgroundTypes,
  configureBackgroundTypes,
  isHealthDataAvailable,
  isProtectedDataAvailable,
  queryCategorySamples,
  requestAuthorization,
  subscribeToChanges,
  UpdateFrequency,
} from '@kingstinct/react-native-healthkit'
import { markHealthAuthorized } from './syncState'
import { toLocalIso, type SleepSegment, type SyncRange } from './health'

const SLEEP = 'HKCategoryTypeIdentifierSleepAnalysis'
/** Stored on each night (`sleep_nights.source`). */
export const HEALTH_SOURCE = 'apple_health'
/** Value for `profiles.sleep_source` (the table only allows apple_health / manual / garmin / other). */
export const PROFILE_SOURCE = 'apple_health'
/** The label shown next to the app's ingest key under Devices. */
export const TOKEN_LABEL = 'iPhone app'

const STAGE: Record<number, string> = {
  [CategoryValueSleepAnalysis.inBed]: 'In Bed',
  [CategoryValueSleepAnalysis.asleepUnspecified]: 'Asleep',
  [CategoryValueSleepAnalysis.awake]: 'Awake',
  [CategoryValueSleepAnalysis.asleepCore]: 'Core',
  [CategoryValueSleepAnalysis.asleepDeep]: 'Deep',
  [CategoryValueSleepAnalysis.asleepREM]: 'REM',
}

export const healthAvailable = async () => isHealthDataAvailable()

/** Apple Health can't be read while the phone is locked; reads then fail until the next unlock. */
export const healthReadable = () => isProtectedDataAvailable()

export async function readSleepSegments(range: SyncRange): Promise<SleepSegment[]> {
  await requestAuthorization({ toRead: [SLEEP] })
  markHealthAuthorized()
  const filter = range === 'all' ? undefined : { date: { startDate: new Date(Date.now() - range * 86400_000) } }
  const samples = await queryCategorySamples(SLEEP, { limit: -1, ascending: true, ...(filter ? { filter } : null) })
  return samples.map((s) => ({
    start: toLocalIso(s.startDate),
    end: toLocalIso(s.endDate),
    value: STAGE[s.value as number] ?? 'Asleep',
  }))
}

/** iOS can wake the app when Health gets new sleep. `onChange` runs for each wake-up. */
export const canObserve = true
let subscription: { remove: () => void } | null = null

export async function startObserver(onChange: () => void, onError: (message: string) => void): Promise<void> {
  if (subscription) return
  // Persisted natively: iOS can relaunch the app for new sleep data even after it has been terminated.
  await configureBackgroundTypes([SLEEP], UpdateFrequency.immediate)
  subscription = subscribeToChanges(SLEEP, ({ errorMessage }) => (errorMessage ? onError(errorMessage) : onChange()))
}

export async function stopObserver(): Promise<void> {
  subscription?.remove()
  subscription = null
  await clearBackgroundTypes()
}
