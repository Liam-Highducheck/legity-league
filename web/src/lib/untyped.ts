import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabase'

/**
 * The same client without the generated schema types. Used only for the tables, columns and RPCs added by the
 * 2026-10-12 migrations (device_class, competitions, group_discord, groups.timezone) until Liam regenerates
 * database.types.ts. After that, switch these call sites back to `supabase` and delete this file.
 */
export const untyped = supabase as unknown as SupabaseClient

/** PostgREST/Postgres errors that mean "that table or column doesn't exist yet" (migration not applied). */
export function isMissingSchema(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  return (
    error.code === '42P01' ||
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    error.code === 'PGRST205' ||
    /does not exist|schema cache/i.test(error.message ?? '')
  )
}
