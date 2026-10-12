import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@legity/core/database.types'

export interface DataConfig {
  /** The app's own Supabase client (web and native configure storage differently). */
  supabase: SupabaseClient<Database>
  /** Calls `cb` whenever the app comes back to the foreground; returns an unsubscribe. */
  onForeground?: (cb: () => void) => () => void
}

let config: DataConfig | null = null

/** Call once at startup, before any hook runs. */
export function configureData(c: DataConfig) {
  config = c
}

export function getConfig(): DataConfig {
  if (!config) throw new Error('@legity/data: call configureData({ supabase }) at startup')
  return config
}

// Hooks import `supabase` like a normal module export; it forwards to whichever client the app configured.
export const supabase: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
  get(_t, prop) {
    const client = getConfig().supabase as unknown as Record<string | symbol, unknown>
    const value = client[prop]
    return typeof value === 'function' ? value.bind(client) : value
  },
})

/**
 * The same client without the generated schema types. Used only for the tables, columns and RPCs added by the
 * 2026-10-12 migrations (device_class, competitions, group_discord, groups.timezone) until the types are regenerated
 * with them. After that, switch these call sites back to `supabase` and delete this.
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
