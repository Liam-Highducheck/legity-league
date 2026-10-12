// Reads sleep from Apple Health and pushes it through the same ingest_sleep_segments RPC the Apple Shortcut uses.
// Android's Health Connect version lives in healthSync.android.ts.
import * as SecureStore from 'expo-secure-store'
import {
  CategoryValueSleepAnalysis,
  isHealthDataAvailable,
  queryCategorySamples,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit'
import { supabase } from './supabase'

const SLEEP = 'HKCategoryTypeIdentifierSleepAnalysis'
const TOKEN_KEY = 'll_ingest_token'
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

export async function readSleepSegments(days: number): Promise<SleepSegment[]> {
  await requestAuthorization({ toRead: [SLEEP] })
  const start = new Date(Date.now() - days * 86400_000)
  const samples = await queryCategorySamples(SLEEP, { limit: -1, ascending: true, filter: { date: { startDate: start } } })
  return samples.map((s) => ({
    start: toLocalIso(s.startDate),
    end: toLocalIso(s.endDate),
    value: STAGE[s.value as number] ?? 'Asleep',
  }))
}

/** The app's own ingest token: created once through the RPC (the server only ever shows it once) and kept in the Keychain. */
async function ingestToken(): Promise<string> {
  const existing = await SecureStore.getItemAsync(TOKEN_KEY)
  if (existing) return existing
  const { data, error } = await supabase.rpc('create_ingest_token', { p_label: 'iPhone app' })
  if (error) throw new Error(error.message)
  await SecureStore.setItemAsync(TOKEN_KEY, data as string)
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

export async function syncSleep(days: number, trigger: string): Promise<{ segments: number }> {
  const segments = await readSleepSegments(days)
  if (segments.length === 0) return { segments: 0 }
  const token = await ingestToken()
  for (const batch of toBatches(segments)) {
    const { error } = await supabase.rpc('ingest_sleep_segments', {
      p_token: token,
      p_segments: batch as never,
      p_source: HEALTH_SOURCE,
      p_trigger: trigger,
    })
    if (error) {
      // A revoked/rotated token: forget it so the next sync mints a fresh one.
      if (/invalid token/i.test(error.message)) await SecureStore.deleteItemAsync(TOKEN_KEY)
      throw new Error(error.message)
    }
  }
  return { segments: segments.length }
}
