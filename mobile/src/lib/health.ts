// Platform-neutral pieces of the health sync: the segment shape the ingest RPC takes, and names for UI copy.
// The actual readers live in healthSource.ts (Apple Health, iOS) and healthSource.android.ts (Health Connect).
import { Platform } from 'react-native'

export interface SleepSegment {
  start: string
  end: string
  value: string
}

/** `days` back from now, or 'all' for the whole sleep history. */
export type SyncRange = number | 'all'

export const IS_ANDROID = Platform.OS === 'android'

/** What the phone's health store is called in UI copy. */
export const HEALTH_NAME = IS_ANDROID ? 'Health Connect' : 'Apple Health'

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
