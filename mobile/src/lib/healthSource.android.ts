// Health Connect (Android) reader. Same exports as healthSource.ts (Apple Health).
//
// Health Connect has no "new data" wake-up like HealthKit background delivery, so on Android the hourly background task and
// the on-open sync are the triggers (see background.ts). Reads work while the phone is locked, so there is no locked check.
//
// Read window: Health Connect lets an app read only the 30 days before the permission was first granted, unless the user
// also grants "read past data" (ReadHealthDataHistory, Android 14+), which a full backfill needs. Reading while the app is in
// the background needs BackgroundAccessPermission (also Android 14+). Both are asked for once, after the sleep permission,
// and are optional: an older phone or a "no" just means a shorter backfill / syncs only when the app is open.
import {
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
  SleepStageType,
} from 'react-native-health-connect'
import { markHealthAuthorized } from './syncState'
import { toLocalIso, type SleepSegment, type SyncRange } from './health'

/** Stored on each night (`sleep_nights.source`). */
export const HEALTH_SOURCE = 'health_connect'
/** Value for `profiles.sleep_source` (the table only allows apple_health / manual / garmin / other). */
export const PROFILE_SOURCE = 'other'
/** The label shown next to the app's ingest key under Devices. */
export const TOKEN_LABEL = 'Android app'

const EXTRAS_ASKED = 'll_hc_extras_asked'
const PAGE_SIZE = 1000

const STAGE: Record<number, string> = {
  [SleepStageType.UNKNOWN]: 'Asleep',
  [SleepStageType.AWAKE]: 'Awake',
  [SleepStageType.SLEEPING]: 'Asleep',
  [SleepStageType.OUT_OF_BED]: 'Awake',
  [SleepStageType.LIGHT]: 'Core',
  [SleepStageType.DEEP]: 'Deep',
  [SleepStageType.REM]: 'REM',
}

export const healthAvailable = async () => (await getSdkStatus()) === SdkAvailabilityStatus.SDK_AVAILABLE

/** Health Connect data stays readable on a locked phone. */
export const healthReadable = () => true

async function ensureAccess(): Promise<void> {
  const status = await getSdkStatus()
  if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) {
    throw new Error(
      status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED
        ? 'Update Health Connect in the Play Store, then try again.'
        : 'Health Connect is not available on this phone.',
    )
  }
  if (!(await initialize())) throw new Error('Could not start Health Connect.')

  const granted = await getGrantedPermissions()
  if (!granted.some((p) => p.recordType === 'SleepSession')) {
    const result = await requestPermission([{ accessType: 'read', recordType: 'SleepSession' }])
    if (!result.some((p) => p.recordType === 'SleepSession')) throw new Error('Sleep access was not granted in Health Connect.')
  }
  markHealthAuthorized()

  // Optional extras, asked once. Phones older than Android 14 reject these, which is fine.
  if (!localStorage.getItem(EXTRAS_ASKED)) {
    localStorage.setItem(EXTRAS_ASKED, '1')
    await requestPermission([
      { accessType: 'read', recordType: 'ReadHealthDataHistory' },
      { accessType: 'read', recordType: 'BackgroundAccessPermission' },
    ]).catch(() => {})
  }
}

export async function readSleepSegments(range: SyncRange): Promise<SleepSegment[]> {
  await ensureAccess()
  const startTime = new Date(range === 'all' ? Date.UTC(2000, 0, 1) : Date.now() - range * 86400_000).toISOString()
  const segments: SleepSegment[] = []
  let pageToken: string | undefined
  do {
    const page = await readRecords('SleepSession', {
      timeRangeFilter: { operator: 'after', startTime },
      ascendingOrder: true,
      pageSize: PAGE_SIZE,
      pageToken,
    })
    for (const rec of page.records) {
      if (rec.stages && rec.stages.length > 0) {
        for (const st of rec.stages) {
          segments.push({
            start: toLocalIso(new Date(st.startTime)),
            end: toLocalIso(new Date(st.endTime)),
            value: STAGE[st.stage] ?? 'Asleep',
          })
        }
      } else {
        // A tracker that only records "slept from A to B" (no stages).
        segments.push({ start: toLocalIso(new Date(rec.startTime)), end: toLocalIso(new Date(rec.endTime)), value: 'Asleep' })
      }
    }
    pageToken = page.pageToken || undefined
  } while (pageToken)
  return segments
}

/** No wake-up on new data here; the hourly task covers it. */
export const canObserve = false
export async function startObserver(): Promise<void> {}
export async function stopObserver(): Promise<void> {}
