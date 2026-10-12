// Reads sleep from Apple Health and pushes it through the same ingest_sleep_segments RPC the Apple Shortcut uses.
// Android's Health Connect version lives in healthSync.android.ts.
import * as SecureStore from 'expo-secure-store'
import {
  CategoryValueSleepAnalysis,
  isHealthDataAvailable,
  isProtectedDataAvailable,
  queryCategorySamples,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit'
import { supabase } from './supabase'
import { appendSyncLog, emitSynced, markHealthAuthorized, setLatestNight } from './syncState'

const SLEEP = 'HKCategoryTypeIdentifierSleepAnalysis'
// One key per signed-in account: the Keychain is shared by every account on this device, and reusing one account's key for
// another would write sleep into the wrong account.
const TOKEN_KEY_PREFIX = 'll_ingest_token_'
const LEGACY_TOKEN_KEY = 'll_ingest_token'
export const HEALTH_SOURCE = 'apple_health'

export interface SleepSegment {
  start: string
  end: string
  value: string
}

const STAGE: Record<number, string> = {
  [CategoryValueSleepAnalysis.inBed]: 'In Bed',
  [CategoryValueSleepAnalysis.asleepUnspecified]: 'Asleep',
  [CategoryValueSleepAnalysis.awake]: 'Awake',
  [CategoryValueSleepAnalysis.asleepCore]: 'Core',
  [CategoryValueSleepAnalysis.asleepDeep]: 'Deep',
  [CategoryValueSleepAnalysis.asleepREM]: 'REM',
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Local ISO 8601 with the UTC offset (the server derives the local wake-up date from the offset). */
export function toLocalIso(d: Date) {
  const off = -d.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  const abs = Math.abs(off)
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  )
}

export const healthAvailable = () => isHealthDataAvailable()

/** Apple Health can't be read while the phone is locked; reads then fail until the next unlock. */
export const healthReadable = () => isProtectedDataAvailable()

/** `days` back from now, or 'all' for the whole Apple Health sleep history. */
export type SyncRange = number | 'all'

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

/** The app's own ingest token: created once through the RPC (the server only ever shows it once) and kept in the Keychain. */
async function tokenKey(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const uid = data.session?.user.id
  if (!uid) throw new Error('Sign in to sync')
  return TOKEN_KEY_PREFIX + uid
}

async function ingestToken(): Promise<string> {
  const key = await tokenKey()
  // The old single key may belong to a different account than the one signed in now, so it is never reused.
  await SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY).catch(() => {})
  const existing = await SecureStore.getItemAsync(key)
  if (existing) return existing
  const { data, error } = await supabase.rpc('create_ingest_token', { p_label: 'iPhone app' })
  if (error) throw new Error(error.message)
  await SecureStore.setItemAsync(key, data as string)
  return data as string
}

const SESSION_GAP_MS = 3 * 60 * 60 * 1000
const BATCH_TARGET = 3500 // the database accepts at most 5000 per call

/** Splits segments (oldest first) into batches that never cut a sleep session in half. */
export function toBatches(segments: SleepSegment[]): SleepSegment[][] {
  const batches: SleepSegment[][] = []
  let batch: SleepSegment[] = []
  let session: SleepSegment[] = []
  let lastEnd = -Infinity
  const flushSession = () => {
    if (batch.length + session.length > BATCH_TARGET && batch.length > 0) {
      batches.push(batch)
      batch = []
    }
    batch.push(...session)
    session = []
  }
  for (const seg of segments) {
    const start = Date.parse(seg.start)
    if (session.length > 0 && start - lastEnd > SESSION_GAP_MS) flushSession()
    session.push(seg)
    lastEnd = Math.max(lastEnd, Date.parse(seg.end))
  }
  flushSession()
  if (batch.length > 0) batches.push(batch)
  return batches
}

export async function syncSleep(
  range: SyncRange,
  trigger: string,
  onProgress?: (done: number, total: number) => void,
): Promise<{ segments: number }> {
  const segments = await readSleepSegments(range)
  if (segments.length === 0) return { segments: 0 }
  const token = await ingestToken()
  const batches = toBatches(segments)
  let done = 0
  onProgress?.(0, batches.length)
  for (const batch of batches) {
    const { error } = await supabase.rpc('ingest_sleep_segments', {
      p_token: token,
      p_segments: batch as never,
      p_source: HEALTH_SOURCE,
      p_trigger: trigger,
    })
    if (error) {
      // A revoked/rotated token: forget it so the next sync mints a fresh one.
      if (/invalid token/i.test(error.message)) await SecureStore.deleteItemAsync(await tokenKey())
      throw new Error(error.message)
    }
    onProgress?.(++done, batches.length)
  }
  await rememberLatestNight()
  // Having synced once with Health access granted, hand future syncs to iOS background delivery.
  void enableBackgroundAfterFirstSync().catch(() => {})
  return { segments: segments.length }
}

/** Records the newest night on the server so the background logic knows whether today's sleep has arrived. Best effort. */
async function rememberLatestNight(): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession()
    const uid = data.session?.user.id
    if (!uid) return
    const res = await supabase.from('sleep_nights').select('night_date').eq('user_id', uid).order('night_date', { ascending: false }).limit(1).maybeSingle()
    setLatestNight(res.data?.night_date ?? null)
  } catch {
    /* the next sync will try again */
  }
}

/** After the first authorised sync, turn on background delivery (if the person hasn't switched it off). */
export async function enableBackgroundAfterFirstSync(): Promise<void> {
  const { backgroundEnabled } = require('./syncState') as typeof import('./syncState')
  if (!backgroundEnabled()) return
  const { startBackgroundSync } = require('../background') as typeof import('../background')
  await startBackgroundSync()
}

/** A sync the person asked for (button taps, onboarding): same as syncSleep, but it also lands in the sync log and refreshes the UI. */
export async function manualSync(range: SyncRange, trigger: string, onProgress?: (done: number, total: number) => void) {
  const started = Date.now()
  try {
    const res = await syncSleep(range, trigger, onProgress)
    appendSyncLog({ at: Date.now(), reason: trigger, outcome: 'ok', segments: res.segments, ms: Date.now() - started })
    emitSynced()
    return res
  } catch (e) {
    appendSyncLog({ at: Date.now(), reason: trigger, outcome: 'error', detail: e instanceof Error ? e.message : String(e), ms: Date.now() - started })
    throw e
  }
}
