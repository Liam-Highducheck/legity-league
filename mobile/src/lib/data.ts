import type { PostgrestError } from '@supabase/supabase-js'

/** Returns the data from a Supabase response or throws its error, so react-query sees failures. */
export function unwrap<T>(res: { data: T | null; error: PostgrestError | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}
