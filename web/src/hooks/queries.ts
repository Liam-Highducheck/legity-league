import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useUserId } from './auth'
import type { ForcedBlackout } from '../lib/blackout'
import type { Member, MyGroup, Profile, Role, SleepNight } from '../lib/types'
import type { TablesUpdate } from '../lib/database.types'

const NIGHT_COLUMNS =
  'user_id,night_date,duration_min,score,restorative_min,deep_min,rem_min,source,sleep_start,sleep_end,awake_min,wake_count'

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

// ---- profile ----------------------------------------------------------------

export function useProfile() {
  const uid = useUserId()
  return useQuery({
    queryKey: ['profile', uid],
    queryFn: async (): Promise<Profile> =>
      unwrap(await supabase.from('profiles').select('*').eq('id', uid).single()),
  })
}

export function useUpdateProfile() {
  const uid = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: TablesUpdate<'profiles'>) => {
      unwrap(await supabase.from('profiles').update(patch).eq('id', uid).select('id').single())
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', uid] }),
  })
}

export function useForcedBlackout() {
  return useQuery({
    queryKey: ['app_config', 'forced_blackout'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ForcedBlackout | null> => {
      const res = await supabase.from('app_config').select('value').eq('key', 'forced_blackout').maybeSingle()
      if (res.error) throw new Error(res.error.message)
      return (res.data?.value as unknown as ForcedBlackout) ?? null
    },
  })
}

// ---- groups -----------------------------------------------------------------

export function useMyGroups() {
  const uid = useUserId()
  return useQuery({
    queryKey: ['groups', uid],
    queryFn: async (): Promise<MyGroup[]> => {
      const rows = unwrap(
        await supabase.from('group_members').select('role, groups(id, name)').eq('user_id', uid),
      )
      return rows
        .filter((r) => r.groups)
        .map((r) => ({ id: r.groups!.id, name: r.groups!.name, role: r.role as Role }))
        .sort((a, b) => a.name.localeCompare(b.name))
    },
  })
}

export function useRoster(groupId: string | undefined) {
  return useQuery({
    queryKey: ['roster', groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<Member[]> => {
      const rows = unwrap(
        await supabase
          .from('group_members')
          .select('user_id, role, joined_at, profiles(display_name, full_name)')
          .eq('group_id', groupId!),
      )
      return rows
        .map((r) => ({
          user_id: r.user_id,
          role: r.role as Role,
          joined_at: r.joined_at,
          display_name: r.profiles?.display_name ?? 'Unknown',
          full_name: r.profiles?.full_name ?? null,
        }))
        .sort((a, b) => a.display_name.localeCompare(b.display_name))
    },
  })
}

async function fetchNights(userIds: string[], start?: string, end?: string): Promise<SleepNight[]> {
  if (userIds.length === 0) return []
  const out: SleepNight[] = []
  const size = 1000
  for (let from = 0; ; from += size) {
    let q = supabase
      .from('sleep_nights')
      .select(NIGHT_COLUMNS)
      .in('user_id', userIds)
      .order('night_date', { ascending: true })
      .order('user_id', { ascending: true })
      .range(from, from + size - 1)
    if (start) q = q.gte('night_date', start)
    if (end) q = q.lte('night_date', end)
    const rows = unwrap(await q)
    out.push(...(rows as SleepNight[]))
    if (rows.length < size) break
  }
  return out
}

/** Nights for every member of the group; start/end omitted = all time. */
export function useGroupNights(groupId: string | undefined, start?: string, end?: string) {
  const roster = useRoster(groupId)
  const ids = (roster.data ?? []).map((m) => m.user_id)
  return useQuery({
    queryKey: ['group-nights', groupId, ids.join(','), start ?? null, end ?? null],
    enabled: !!groupId && roster.isSuccess,
    queryFn: () => fetchNights(ids, start, end),
  })
}

export function useMyNights(start?: string, end?: string) {
  const uid = useUserId()
  return useQuery({
    queryKey: ['my-nights', uid, start ?? null, end ?? null],
    queryFn: () => fetchNights([uid], start, end),
  })
}

export function useSaveManualNight() {
  const uid = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { night_date: string; duration_min: number; restorative_min?: number | null; score?: number | null }) => {
      unwrap(
        await supabase
          .from('sleep_nights')
          .upsert(
            {
              user_id: uid,
              night_date: v.night_date,
              source: 'manual',
              duration_min: v.duration_min,
              restorative_min: v.restorative_min ?? null,
              score: v.score ?? null,
            },
            { onConflict: 'user_id,night_date' },
          )
          .select('night_date')
          .single(),
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-nights'] })
      qc.invalidateQueries({ queryKey: ['group-nights'] })
    },
  })
}

// ---- group management (all via RPC) ------------------------------------------

function useRpcInvalidate<T, V>(fn: (v: V) => Promise<T>, keys: string[][]) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => keys.forEach((k) => qc.invalidateQueries({ queryKey: k })),
  })
}

export function useCreateGroup() {
  return useRpcInvalidate(
    async (name: string) => unwrap(await supabase.rpc('create_group', { p_name: name })) as string,
    [['groups']],
  )
}

export function useJoinGroup() {
  return useRpcInvalidate(
    async (code: string) => unwrap(await supabase.rpc('join_group', { p_code: code })) as string,
    [['groups'], ['roster']],
  )
}

export function useLeaveGroup() {
  return useRpcInvalidate(
    async (groupId: string) => unwrap(await supabase.rpc('leave_group', { p_group_id: groupId })),
    [['groups']],
  )
}

export function useRemoveMember() {
  return useRpcInvalidate(
    async (v: { groupId: string; userId: string }) =>
      unwrap(await supabase.rpc('remove_member', { p_group_id: v.groupId, p_user_id: v.userId })),
    [['roster']],
  )
}

export function useSetMemberRole() {
  return useRpcInvalidate(
    async (v: { groupId: string; userId: string; role: Role }) =>
      unwrap(await supabase.rpc('set_member_role', { p_group_id: v.groupId, p_user_id: v.userId, p_role: v.role })),
    [['roster'], ['groups']],
  )
}

export function useTransferOwnership() {
  return useRpcInvalidate(
    async (v: { groupId: string; userId: string }) =>
      unwrap(await supabase.rpc('transfer_ownership', { p_group_id: v.groupId, p_new_owner: v.userId })),
    [['roster'], ['groups']],
  )
}

export function useRenameGroup() {
  return useRpcInvalidate(
    async (v: { groupId: string; name: string }) => {
      unwrap(await supabase.from('groups').update({ name: v.name.trim() }).eq('id', v.groupId).select('id').single())
    },
    [['groups']],
  )
}

export function useInvites(groupId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['invites', groupId],
    enabled,
    queryFn: async () => {
      const rows = unwrap(
        await supabase
          .from('group_invites')
          .select('id, code, expires_at, max_uses, uses, revoked_at, created_at')
          .eq('group_id', groupId)
          .order('created_at', { ascending: false }),
      )
      return rows
    },
  })
}

export function useCreateInvite() {
  return useRpcInvalidate(
    async (v: { groupId: string; days: number; maxUses: number }) =>
      unwrap(
        await supabase.rpc('create_invite', {
          p_group_id: v.groupId,
          p_expires_in: `${v.days} days`,
          p_max_uses: v.maxUses,
        }),
      ) as string,
    [['invites']],
  )
}

export function useRevokeInvite() {
  return useRpcInvalidate(
    async (id: string) => unwrap(await supabase.rpc('revoke_invite', { p_invite_id: id })),
    [['invites']],
  )
}

// ---- ingest tokens ------------------------------------------------------------

export function useTokens() {
  const uid = useUserId()
  return useQuery({
    queryKey: ['tokens', uid],
    queryFn: async () =>
      unwrap(
        await supabase
          .from('ingest_tokens')
          .select('id, label, token_prefix, created_at, last_used_at, revoked_at')
          .order('created_at', { ascending: false }),
      ),
  })
}

export function useIngestEvents() {
  const uid = useUserId()
  return useQuery({
    queryKey: ['ingest-events', uid],
    queryFn: async () =>
      unwrap(
        await supabase
          .from('ingest_events')
          .select('id, trigger_label, segment_count, nights_written, created_at')
          .order('created_at', { ascending: false })
          .limit(10),
      ),
  })
}

export function useCreateToken() {
  return useRpcInvalidate(
    async (label: string) => unwrap(await supabase.rpc('create_ingest_token', { p_label: label })) as string,
    [['tokens']],
  )
}

export function useRevokeToken() {
  return useRpcInvalidate(
    async (id: string) => unwrap(await supabase.rpc('revoke_ingest_token', { p_token_id: id })),
    [['tokens']],
  )
}
