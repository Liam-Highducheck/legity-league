// Reads sleep from the phone's health store and pushes it through the same ingest_sleep_segments RPC the Apple Shortcut uses.
// The store itself (Apple Health or Android's Health Connect) is behind healthSource.ts / healthSource.android.ts.
import * as SecureStore from 'expo-secure-store'
import { supabase } from './supabase'
import { appendSyncLog, emitSynced, setLatestNight } from './syncState'
import { HEALTH_SOURCE, TOKEN_LABEL, readSleepSegments } from './healthSource'
import type { SleepSegment, SyncRange } from './health'

export { HEALTH_SOURCE, healthAvailable, healthReadable, readSleepSegments } from './healthSource'
export { toLocalIso, type SleepSegment, type SyncRange } from './health'

// One key per signed-in account: the Keychain is shared by every account on this device, and reusing one account's key for
// another would write sleep into the wrong account.
const TOKEN_KEY_PREFIX = 'll_ingest_token_'
const LEGACY_TOKEN_KEY = 'll_ingest_token'

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
  const { data, error } = await supabase.rpc('create_ingest_token', { p_label: TOKEN_LABEL })
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

/** Sends segments (oldest first) through the ingest RPC in session-safe batches. */
export async function uploadSegments(
  segments: SleepSegment[],
  trigger: string,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
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
}

export async function syncSleep(
  range: SyncRange,
  trigger: string,
  onProgress?: (done: number, total: number) => void,
): Promise<{ segments: number }> {
  const segments = await readSleepSegments(range)
  if (segments.length === 0) return { segments: 0 }
  await uploadSegments(segments, trigger, onProgress)
  // Having synced once with Health access granted, hand future syncs to background delivery.
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
