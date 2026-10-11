import type { Tables } from './database.types'

export type Profile = Tables<'profiles'>
export type StoredNight = Pick<
  Tables<'sleep_nights'>,
  | 'user_id'
  | 'night_date'
  | 'duration_min'
  | 'score'
  | 'restorative_min'
  | 'deep_min'
  | 'rem_min'
  | 'source'
  | 'sleep_start'
  | 'sleep_end'
  | 'awake_min'
  | 'wake_count'
  | 'timezone'
> & {
  /** 'watch' | 'phone' | 'manual'. Missing until the device_class migration has been applied. */
  device_class?: string | null
}
/** A stored night plus the computed sleep score (null when the night lacks the inputs, e.g. manual entries). */
export type SleepNight = StoredNight & { sleep_score: number | null }
export type Role = 'owner' | 'admin' | 'member'

export interface MyGroup {
  id: string
  name: string
  role: Role
}

export interface Member {
  user_id: string
  role: Role
  joined_at: string
  display_name: string
  full_name: string | null
  /** 'HH:MM:SS' target bedtime from their profile (bedtime-gap records). */
  target_bedtime: string | null
}
