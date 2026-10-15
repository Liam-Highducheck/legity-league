import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './client'
import { useUserId } from './auth'
import { unwrap, useMyNights, useProfile } from './queries'
import { todayISO } from '@legity/core/dates'
import {
  achievementStatuses, claimableAchievements, claimableNights, gardenStats, overgrowth,
  type AchievementStatus, type GardenNight, type Overgrowth, type PlantRow,
} from '@legity/core/garden/index'

export interface GardenState {
  coins: number
  boxes: number
  pity: number
  boxes_opened: number
  started_on: string
}

export interface GardenData {
  state: GardenState
  /** Seeds in the inventory, species id -> count. */
  seeds: Record<string, number>
  /** Every plant I own: planted (cell set) and stored (cell null). */
  plants: PlantRow[]
  claimedNights: Set<string>
  claimedAchievements: Set<string>
}

export interface ShopItem {
  species: string
  price: number
  rarity: string
  rotating: boolean
}
export interface Shop {
  date: string
  box_price: number
  items: ShopItem[]
}

const plantRow = (r: PlantRow): PlantRow => ({
  id: r.id, species: r.species, cell: r.cell, planted_on: r.planted_on, evolved_from: r.evolved_from, evolved_on: r.evolved_on,
})

/** My garden. Creating it (and the starter seeds) happens on first load. */
export function useGarden() {
  const uid = useUserId()
  return useQuery({
    queryKey: ['garden', uid],
    queryFn: async (): Promise<GardenData> => {
      let state: GardenState | null = unwrap(await supabase.from('garden_state').select('coins, boxes, pity, boxes_opened, started_on').eq('user_id', uid).maybeSingle())
      if (!state) {
        unwrap(await supabase.rpc('garden_init'))
        state = unwrap(await supabase.from('garden_state').select('coins, boxes, pity, boxes_opened, started_on').eq('user_id', uid).single())
      }
      const [inv, plants, nights, achievements] = await Promise.all([
        supabase.from('garden_inventory').select('species, qty').eq('user_id', uid),
        supabase.from('garden_plants').select('id, species, cell, planted_on, evolved_from, evolved_on').eq('user_id', uid).order('created_at'),
        supabase.from('garden_night_claims').select('night_date').eq('user_id', uid),
        supabase.from('garden_achievement_claims').select('achievement_id').eq('user_id', uid),
      ])
      return {
        state,
        seeds: Object.fromEntries(unwrap(inv).map((r) => [r.species, r.qty])),
        plants: unwrap(plants).map(plantRow),
        claimedNights: new Set(unwrap(nights).map((r) => r.night_date)),
        claimedAchievements: new Set(unwrap(achievements).map((r) => r.achievement_id)),
      }
    },
  })
}

/** The planted plants of anyone in my groups (a profile's garden). Stored plants are private, so only planted ones come back. */
export function useGardenPlants(userId: string) {
  return useQuery({
    queryKey: ['garden-plants', userId],
    enabled: !!userId,
    queryFn: async (): Promise<PlantRow[]> =>
      unwrap(
        await supabase.from('garden_plants').select('id, species, cell, planted_on, evolved_from, evolved_on').eq('user_id', userId).not('cell', 'is', null),
      ).map(plantRow),
  })
}

export function useGardenShop() {
  const uid = useUserId()
  return useQuery({
    queryKey: ['garden-shop', uid],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Shop> => unwrap(await supabase.rpc('garden_shop')) as unknown as Shop,
  })
}

function useGardenMutation<T, V>(fn: (v: V) => Promise<T>) {
  const qc = useQueryClient()
  const uid = useUserId()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['garden', uid] })
      void qc.invalidateQueries({ queryKey: ['garden-plants', uid] })
    },
  })
}

export const useBuy = () =>
  useGardenMutation(async (v: { item: string; qty?: number }) => unwrap(await supabase.rpc('garden_buy', { p_item: v.item, p_qty: v.qty ?? 1 })))
export const useOpenBox = () => useGardenMutation(async () => unwrap(await supabase.rpc('garden_open_box')) as string)
export const usePlant = () =>
  useGardenMutation(async (v: { species: string; cell: number }) => unwrap(await supabase.rpc('garden_plant', { p_species: v.species, p_cell: v.cell })))
export const useMovePlant = () =>
  useGardenMutation(async (v: { plantId: string; cell: number | null }) =>
    unwrap(await supabase.rpc('garden_move', { p_plant: v.plantId, p_cell: v.cell as number })),
  )
export const useEvolve = () => useGardenMutation(async (plantId: string) => unwrap(await supabase.rpc('garden_evolve', { p_plant: plantId })))

// ---- derived views ---------------------------------------------------------------

/** Today's date where I live (profile timezone). */
export function useLocalToday() {
  const profile = useProfile()
  return todayISO(profile.data?.timezone)
}

export function useMyOvergrowth(): Overgrowth | null {
  const nights = useMyNights()
  const today = useLocalToday()
  return nights.data ? overgrowth(nights.data, today) : null
}

export function useAchievementStatuses(): AchievementStatus[] | null {
  const garden = useGarden()
  const nights = useMyNights()
  if (!garden.data || !nights.data) return null
  return achievementStatuses(nights.data, gardenStats(garden.data.plants, nights.data, garden.data.state.boxes_opened))
}

// ---- rewards -----------------------------------------------------------------------

export interface Haul {
  coins: number
  boxes: number
  nights: number
  seeds: string[]
  achievements: string[]
}
const emptyHaul = (): Haul => ({ coins: 0, boxes: 0, nights: 0, seeds: [], achievements: [] })

/**
 * Turns new nights into coins and finished achievements into rewards. Mount it on the garden screen: every time the
 * garden or the nights change it claims whatever is new (each night and achievement only ever pays once, on the server),
 * and reports what came in so the screen can show it.
 */
export function useGardenSync() {
  const uid = useUserId()
  const qc = useQueryClient()
  const garden = useGarden()
  const nights = useMyNights()
  const [haul, setHaul] = useState<Haul | null>(null)
  const busy = useRef(false)
  // Tried this session already: stops a night the server refuses from being retried on every refetch.
  const tried = useRef(new Set<string>())

  useEffect(() => {
    const g = garden.data
    const n = nights.data as GardenNight[] | undefined
    if (!g || !n || busy.current) return

    const claims = claimableNights(n, g.claimedNights, g.state.started_on).filter((c) => !tried.current.has('n:' + c.date))
    const stats = gardenStats(g.plants, n, g.state.boxes_opened)
    const achievements = claimableAchievements(achievementStatuses(n, stats), g.claimedAchievements).filter((id) => !tried.current.has('a:' + id))
    if (claims.length === 0 && achievements.length === 0) return

    busy.current = true
    for (const c of claims) tried.current.add('n:' + c.date)
    for (const id of achievements) tried.current.add('a:' + id)
    void (async () => {
      const got = emptyHaul()
      try {
        if (claims.length) {
          const r = unwrap(await supabase.rpc('garden_claim_nights', { p_nights: claims.map((c) => ({ date: c.date, score: c.score })) })) as unknown as { coins: number; boxes: number; dates: string[] }
          got.coins += r.coins
          got.boxes += r.boxes
          got.nights += r.dates.length
        }
        if (achievements.length) {
          const r = unwrap(await supabase.rpc('garden_claim_achievements', { p_ids: achievements })) as unknown as { coins: number; boxes: number; claimed: string[]; seeds: string[] }
          got.coins += r.coins
          got.boxes += r.boxes
          got.seeds.push(...r.seeds)
          got.achievements.push(...r.claimed)
        }
      } catch {
        // Offline or a transient error: nothing was lost, the next refetch tries the rest.
      } finally {
        busy.current = false
      }
      if (got.coins || got.boxes || got.seeds.length || got.achievements.length) {
        setHaul((prev) => (prev ? merge(prev, got) : got))
      }
      await qc.invalidateQueries({ queryKey: ['garden', uid] })
    })()
  }, [garden.data, nights.data, qc, uid])

  return { haul, dismiss: () => setHaul(null) }
}

const merge = (a: Haul, b: Haul): Haul => ({
  coins: a.coins + b.coins,
  boxes: a.boxes + b.boxes,
  nights: a.nights + b.nights,
  seeds: [...a.seeds, ...b.seeds],
  achievements: [...a.achievements, ...b.achievements],
})
