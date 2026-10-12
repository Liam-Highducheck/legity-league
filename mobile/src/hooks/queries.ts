import { useQuery } from '@tanstack/react-query'
import type { MyGroup, Profile } from '@legity/core/types'
import { supabase } from '../lib/supabase'
import { unwrap } from '../lib/data'
import { useUserId } from './auth'

export function useProfile() {
  const uid = useUserId()
  return useQuery({
    queryKey: ['profile', uid],
    queryFn: async (): Promise<Profile> => unwrap(await supabase.from('profiles').select('*').eq('id', uid).single()),
  })
}

export function useMyGroups() {
  const uid = useUserId()
  return useQuery({
    queryKey: ['groups', uid],
    queryFn: async (): Promise<MyGroup[]> => {
      const rows = unwrap(
        await supabase
          .from('group_members')
          .select('role, groups(id, name, blackout_enabled, blackout_start, blackout_end)')
          .eq('user_id', uid),
      )
      return rows
        .filter((r) => r.groups)
        .map((r) => ({
          id: r.groups!.id,
          name: r.groups!.name,
          role: r.role as MyGroup['role'],
          blackout: {
            enabled: r.groups!.blackout_enabled,
            start: r.groups!.blackout_start,
            end: r.groups!.blackout_end,
          },
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    },
  })
}
