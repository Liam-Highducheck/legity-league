import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { todayISO } from '@legity/core/dates'
import { parseEligibility, withEligibility, type Eligibility } from '@legity/core/league/eligibility'
import { GROUP_DISCORD_COLUMNS, type GroupDiscordRow } from '@legity/core/league/dbRows'
import { classifyNights } from '@legity/core/league/prepare'
import { buildBase, buildReport, type LeagueBase } from '@legity/core/league/report'
import type { Competition, LeagueMember } from '@legity/core/league/types'
import type { PeriodKind } from '@legity/core/periods'
import { isMissingSchema, untyped } from '../lib/untyped'
import { supabase } from '../lib/supabase'
import { useGroupNights, useProfile, useRoster, unwrap, useRpcInvalidate } from './queries'

// ---- group settings (timezone + the podium eligibility grid) -------------------------------------------

export interface GroupSettings {
  /** null until the group_timezone migration has been applied */
  timezone: string | null
  settings: unknown
}

export function useGroupSettings(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group-settings', groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<GroupSettings> => {
      let res = await untyped.from('groups').select('timezone, settings').eq('id', groupId!).maybeSingle()
      if (res.error && isMissingSchema(res.error)) res = await untyped.from('groups').select('settings').eq('id', groupId!).maybeSingle()
      if (res.error) throw new Error(res.error.message)
      return { timezone: (res.data?.timezone as string | undefined) ?? null, settings: res.data?.settings ?? {} }
    },
  })
}

export function useSaveEligibility() {
  return useRpcInvalidate(
    async (v: { groupId: string; current: unknown; eligibility: Eligibility }) => {
      const settings = withEligibility(v.current, v.eligibility)
      unwrap(await supabase.from('groups').update({ settings: settings as never }).eq('id', v.groupId).select('id').single())
    },
    [['group-settings']],
  )
}

export function useSaveGroupTimezone() {
  return useRpcInvalidate(
    async (v: { groupId: string; timezone: string }) => {
      const res = await untyped.from('groups').update({ timezone: v.timezone }).eq('id', v.groupId).select('id').single()
      if (res.error) throw new Error(res.error.message)
    },
    [['group-settings']],
  )
}

// ---- the league itself --------------------------------------------------------------------------------

/** Members, classified nights, the every-night index and the group's rules. Cheap; shared by every league page. */
export function useLeagueBase(groupId: string | undefined) {
  const roster = useRoster(groupId)
  const nights = useGroupNights(groupId)
  const settings = useGroupSettings(groupId)
  const profile = useProfile()

  const timeZone = settings.data?.timezone ?? profile.data?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const base = useMemo<LeagueBase | null>(() => {
    if (!roster.data || !nights.data) return null
    const members: LeagueMember[] = roster.data.map((m) => ({ user_id: m.user_id, name: m.display_name, target_bedtime: m.target_bedtime }))
    return buildBase(members, classifyNights(nights.data), parseEligibility(settings.data?.settings), todayISO(timeZone), timeZone)
  }, [roster.data, nights.data, settings.data?.settings, timeZone])

  return {
    base,
    isLoading: roster.isLoading || nights.isLoading || settings.isLoading,
    error: roster.error ?? nights.error ?? settings.error,
  }
}

/** Podiums, medal tallies and records for the whole history (the heavier derivation: Records, profiles). */
export function useLeagueReport(groupId: string | undefined) {
  const { base, isLoading, error } = useLeagueBase(groupId)
  const competitions = useCompetitions(groupId)
  const report = useMemo(() => (base ? buildReport(base, competitions.data?.rows ?? []) : null), [base, competitions.data])
  return { base, report, competitions: competitions.data?.rows ?? [], isLoading: isLoading || competitions.isLoading, error }
}

// ---- championship competitions -----------------------------------------------------------------------

export function useCompetitions(groupId: string | undefined) {
  return useQuery({
    queryKey: ['competitions', groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<{ available: boolean; rows: Competition[] }> => {
      const res = await untyped
        .from('competitions')
        .select('id, name, starts_on, ends_on')
        .eq('group_id', groupId!)
        .order('starts_on', { ascending: false })
      if (res.error) {
        if (isMissingSchema(res.error)) return { available: false, rows: [] }
        throw new Error(res.error.message)
      }
      return { available: true, rows: res.data as Competition[] }
    },
  })
}

interface CompetitionInput {
  name: string
  startsOn: string
  endsOn: string
}

async function rpc(name: string, args: Record<string, unknown>) {
  const res = await untyped.rpc(name, args)
  if (res.error) throw new Error(res.error.message)
  return res.data
}

export function useCreateCompetition() {
  return useRpcInvalidate(
    (v: CompetitionInput & { groupId: string }) =>
      rpc('create_competition', { p_group_id: v.groupId, p_name: v.name, p_starts_on: v.startsOn, p_ends_on: v.endsOn }),
    [['competitions']],
  )
}

export function useUpdateCompetition() {
  return useRpcInvalidate(
    (v: CompetitionInput & { id: string }) =>
      rpc('update_competition', { p_id: v.id, p_name: v.name, p_starts_on: v.startsOn, p_ends_on: v.endsOn }),
    [['competitions']],
  )
}

export function useDeleteCompetition() {
  return useRpcInvalidate((id: string) => rpc('delete_competition', { p_id: id }), [['competitions']])
}

// ---- Discord ------------------------------------------------------------------------------------------

export function useGroupDiscord(groupId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['group-discord', groupId],
    enabled: !!groupId && enabled,
    queryFn: async (): Promise<{ available: boolean; row: GroupDiscordRow | null }> => {
      // Explicit columns only: webhook_url is not selectable, so `*` would be refused.
      const res = await untyped.from('group_discord').select(GROUP_DISCORD_COLUMNS).eq('group_id', groupId!).maybeSingle()
      if (res.error) {
        if (isMissingSchema(res.error)) return { available: false, row: null }
        throw new Error(res.error.message)
      }
      return { available: true, row: (res.data as GroupDiscordRow | null) ?? null }
    },
  })
}

export function useSetWebhook() {
  return useRpcInvalidate(
    (v: { groupId: string; url: string }) => rpc('set_group_discord_webhook', { p_group_id: v.groupId, p_url: v.url }),
    [['group-discord']],
  )
}

export function useClearWebhook() {
  return useRpcInvalidate((groupId: string) => rpc('clear_group_discord_webhook', { p_group_id: groupId }), [['group-discord']])
}

export interface DiscordPrefs {
  enabled?: boolean
  postHour?: number
  periodKinds?: PeriodKind[]
  postRecords?: boolean
  postChampionships?: boolean
}

export function useUpdateDiscord() {
  return useRpcInvalidate(
    (v: { groupId: string } & DiscordPrefs) =>
      rpc('update_group_discord', {
        p_group_id: v.groupId,
        p_enabled: v.enabled ?? null,
        p_post_hour: v.postHour ?? null,
        p_period_kinds: v.periodKinds ?? null,
        p_post_records: v.postRecords ?? null,
        p_post_championships: v.postChampionships ?? null,
      }),
    [['group-discord']],
  )
}

export function useSendTestMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (groupId: string) => {
      const res = await untyped.functions.invoke('discord-test', { body: { group_id: groupId } })
      if (res.error) {
        // Edge Function errors carry the JSON body we returned; surface its message.
        const body = await (res.error as { context?: Response }).context?.json?.().catch(() => null)
        throw new Error(body?.error ?? res.error.message)
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['group-discord'] }),
  })
}
