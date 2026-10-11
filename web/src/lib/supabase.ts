import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
export const SHORTCUT_URL = import.meta.env.VITE_SHORTCUT_URL || ''

// persistSession + autoRefreshToken keep people signed in on the home-screen app.
// detectSessionInUrl is off because the hash router owns the URL fragment.
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})
