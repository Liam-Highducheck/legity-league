import 'expo-sqlite/localStorage/install'
import { AppState } from 'react-native'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@legity/core/database.types'
import { configureData } from '@legity/data/client'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
if (!url || !anonKey) throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY (see mobile/.env.example)')

export const SUPABASE_URL = url
export const SUPABASE_ANON_KEY = anonKey

// Sessions persist in expo-sqlite's localStorage (SecureStore's 2KB value limit is too small for a session).
// detectSessionInUrl is off: there is no URL fragment to read a session from in a native app.
export const supabase = createClient<Database>(url, anonKey, {
  auth: { storage: localStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})

// The refresh loop runs constantly on native, so tie it to the app being in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh()
  else supabase.auth.stopAutoRefresh()
})

configureData({
  supabase,
  onForeground: (cb) => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && cb())
    return () => sub.remove()
  },
})
