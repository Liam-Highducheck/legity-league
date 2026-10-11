import type { Tables } from './database.types'

export type Profile = Tables<'profiles'>
export type SleepNight = Pick<
  Tables<'sleep_nights'>,
  'user_id' | 'night_date' | 'duration_min' | 'score' | 'restorative_min' | 'deep_min' | 'rem_min' | 'source'
>
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
}
