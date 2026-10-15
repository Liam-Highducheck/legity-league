import { useMemo, useState } from 'react'
import { View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { CloudFog, Coins, Gift, Sprout, Sun } from 'lucide-react-native'
import { achievementStatuses, achievementWindowStart, gardenStats, GRID_CELLS, plantStatus, speciesName, type PlantRow } from '@legity/core/garden/index'
import { useUserId } from '@legity/data/auth'
import {
  useBuy, useEvolve, useGarden, useGardenShop, useGardenSync, useMovePlant, useMyOvergrowth, useOpenBox, usePlant,
} from '@legity/data/garden'
import { useMyNights } from '@legity/data/queries'
import { Button, Chip, ErrorText, Notice, PageHead, Row, Screen, Segmented, Spinner, T } from '../components/ui'
import { useColors } from '../lib/theme'
import { DUSK, GardenGrid, type Cells } from './GardenGrid'
import { GoalsTab, HowItWorks, InventoryTab, SeedTray, ShopTab } from './GardenTabs'
import { PlantPanel, EmptyPanel } from './PlantPanel'
import { HaulPopup, RevealPopup } from './Popups'

type Tab = 'inventory' | 'shop' | 'goals'
/** What the next tap on the board does. `null` = just select a tile. */
type Mode =
  | null
  | { kind: 'plant'; species: string }
  | { kind: 'place'; plantId: string; name: string }
  | { kind: 'move'; plantId: string; name: string; from: number }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')

export default function GardenScreen() {
  const c = useColors()
  const uid = useUserId()
  const qc = useQueryClient()
  const garden = useGarden()
  const nights = useMyNights()
  const over = useMyOvergrowth()
  const shop = useGardenShop()
  const { haul, dismiss } = useGardenSync()
  const plantM = usePlant()
  const moveM = useMovePlant()
  const evolveM = useEvolve()
  const boxM = useOpenBox()
  const buyM = useBuy()

  // /garden?tab=shop opens straight on a tab (handy for links and for checking screens).
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>()
  const [tab, setTab] = useState<Tab>(tabParam === 'shop' || tabParam === 'goals' ? tabParam : 'inventory')
  const [selected, setSelected] = useState<number | null>(null)
  const [mode, setMode] = useState<Mode>(null)
  const [error, setError] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)
  const [buying, setBuying] = useState<string | null>(null)
  const [reveal, setReveal] = useState<{ species: string; title: string; line: string } | null>(null)

  const plants = garden.data?.plants
  const nightList = nights.data
  const statuses = useMemo(() => new Map((plants ?? []).map((p) => [p.id, plantStatus(p, nightList ?? [])])), [plants, nightList])
  const goalStatuses = useMemo(
    () => (garden.data && nightList ? achievementStatuses(nightList, gardenStats(garden.data.plants, nightList, garden.data.state.boxes_opened), achievementWindowStart(garden.data.state.started_on)) : []),
    [garden.data, nightList],
  )

  const cells = useMemo<Cells>(() => {
    const out: Cells = Array(GRID_CELLS).fill(null)
    for (const p of plants ?? []) {
      const st = statuses.get(p.id)
      if (p.cell == null || !st) continue
      out[p.cell] = { id: p.id, species: p.species, stage: st.stage, overgrown: !!over?.overgrown, ready: !!st.evolution?.ready }
    }
    return out
  }, [plants, statuses, over?.overgrown])

  if (garden.isLoading || nights.isLoading) return <Screen tabs><PageHead title="Garden" /><Spinner /></Screen>
  if (garden.error || !garden.data) return <Screen tabs><PageHead title="Garden" /><ErrorText error={garden.error ?? new Error('Couldn’t load your garden')} /></Screen>
  const g = garden.data

  const empty = new Set(cells.flatMap((cell, i) => (cell ? [] : [i])))
  const targets: Set<number> | null =
    mode?.kind === 'plant' ? empty : mode?.kind === 'place' ? new Set(Array.from({ length: GRID_CELLS }, (_, i) => i)) : mode?.kind === 'move' ? new Set(Array.from({ length: GRID_CELLS }, (_, i) => i).filter((i) => i !== mode.from)) : null

  const plantAt = (i: number): PlantRow | undefined => plants?.find((p) => p.cell === i)
  const selectedPlant = selected != null ? plantAt(selected) : undefined
  const selectedStatus = selectedPlant ? statuses.get(selectedPlant.id) : null
  // A plant that was just planted has a placeholder id until the server answers; leave it alone for that moment.
  const busy = evolveM.isPending || !!selectedPlant?.id.startsWith('pending-')

  const run = async (fn: () => Promise<unknown>) => {
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(message(e))
    }
  }

  const onTile = (i: number) => {
    if (busy) return
    if (!mode) {
      setSelected(i === selected ? null : i)
      setError(null)
      return
    }
    // The board updates optimistically, so leave the mode straight away; a refusal rolls back and shows the reason.
    if (mode.kind === 'plant') {
      if (!empty.has(i)) return setError('That plot is taken. Pick an empty one.')
      setMode(null)
      setSelected(i)
      void run(() => plantM.mutateAsync({ species: mode.species, cell: i }))
      return
    }
    setMode(null)
    setSelected(i)
    void run(() => moveM.mutateAsync({ plantId: mode.plantId, cell: i }))
  }

  const startPlanting = (species: string) => {
    setError(null)
    setSelected(null)
    setMode({ kind: 'plant', species })
  }

  const openBox = () =>
    void run(async () => {
      setOpening(true)
      try {
        const [species] = await Promise.all([boxM.mutateAsync(), sleep(900)])
        setReveal({ species, title: 'Dream Box', line: 'Added to your seeds.' })
      } finally {
        setOpening(false)
      }
    })

  const buy = (item: string, price: number) =>
    void run(async () => {
      if (g.state.coins < price) throw new Error('Not enough coins')
      setBuying(item)
      try {
        await buyM.mutateAsync({ item })
      } finally {
        setBuying(null)
      }
    })

  const evolve = (plant: PlantRow) =>
    void run(async () => {
      const from = speciesName(plant.species)
      const to = await evolveM.mutateAsync(plant.id)
      setReveal({ species: to, title: 'Evolved!', line: `Your ${from} grew into a ${speciesName(to)}.` })
    })

  const hasSeeds = Object.keys(g.seeds).length > 0
  const hasStored = g.plants.some((p) => p.cell == null)
  const planted = g.plants.filter((p) => p.cell != null).length

  return (
    <Screen
      tabs
      refreshing={garden.isRefetching || nights.isRefetching}
      onRefresh={() => {
        void qc.invalidateQueries({ queryKey: ['garden', uid] })
        void qc.invalidateQueries({ queryKey: ['my-nights'] })
        void qc.invalidateQueries({ queryKey: ['garden-shop', uid] })
      }}
    >
      <PageHead
        title="Garden"
        right={
          <Row gap={8}>
            <Chip><Coins size={15} color={c.gold} /><T bold small>{g.state.coins}</T></Chip>
            <Chip><Gift size={15} color={c.accent} /><T bold small>{g.state.boxes}</T></Chip>
          </Row>
        }
      />

      {over?.overgrown && (
        <Notice>
          <Row gap={10} style={{ alignItems: 'flex-start' }}>
            <CloudFog size={20} color="#b4bf6a" />
            <View style={{ flex: 1, gap: 2 }}>
              <T bold>Your garden is overgrown</T>
              <T muted small>{over.badRun} rough nights in a row. One night scoring 60 or more clears the weeds.</T>
            </View>
          </Row>
        </Notice>
      )}
      {!over?.overgrown && over?.badRun === 2 && (
        <Notice>
          <Row gap={10} style={{ alignItems: 'flex-start' }}>
            <Sun size={20} color={c.gold} />
            <View style={{ flex: 1, gap: 2 }}>
              <T bold>Weeds are creeping in</T>
              <T muted small>One more rough night and your plants will overgrow.</T>
            </View>
          </Row>
        </Notice>
      )}

      <View style={{ borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: c.line }}>
        <LinearGradient colors={['#141a30', '#2b3158']} style={{ paddingVertical: 10 }}>
          <GardenGrid cells={cells} art="soft" palette={DUSK} selected={selected} targets={targets} onTile={onTile} />
        </LinearGradient>
      </View>

      <SeedTray
        garden={g}
        statuses={statuses}
        activeSeed={mode?.kind === 'plant' ? mode.species : null}
        activePlant={mode && mode.kind !== 'plant' ? mode.plantId : null}
        onSeed={(sp) => (mode?.kind === 'plant' && mode.species === sp ? setMode(null) : startPlanting(sp))}
        onPlace={(p) => { setSelected(null); setError(null); setMode({ kind: 'place', plantId: p.id, name: speciesName(p.species) }) }}
      />
      {mode ? (
        <Notice>
          <T bold>
            {mode.kind === 'plant' ? `Planting ${speciesName(mode.species)}` : mode.kind === 'place' ? `Placing ${mode.name}` : `Moving ${mode.name}`}
          </T>
          <T muted small>{mode.kind === 'plant' ? 'Tap an empty plot.' : 'Tap a plot. If a plant is there, you swap places.'}</T>
          <Button title="Cancel" variant="secondary" small onPress={() => { setMode(null); setError(null) }} />
        </Notice>
      ) : selectedPlant && selectedStatus ? (
        <PlantPanel
          plant={selectedPlant}
          status={selectedStatus}
          overgrown={!!over?.overgrown}
          busy={busy}
          onMove={() => setMode({ kind: 'move', plantId: selectedPlant.id, name: selectedStatus.species.name, from: selectedPlant.cell! })}
          onPickUp={() => { setSelected(null); void run(() => moveM.mutateAsync({ plantId: selectedPlant.id, cell: null })) }}
          onEvolve={() => evolve(selectedPlant)}
        />
      ) : selected != null ? (
        <EmptyPanel hasSeeds={hasSeeds} hasStored={hasStored} onSeeds={() => setTab('inventory')} />
      ) : planted === 0 ? (
        <Notice>
          <Row gap={10} style={{ alignItems: 'flex-start' }}>
            <Sprout size={20} color="#86c19a" />
            <View style={{ flex: 1, gap: 2 }}>
              <T bold>Welcome to your garden</T>
              <T muted small>Choose a seed below and tap a plot to plant it. Plants grow on the sleep you log from now on.</T>
            </View>
          </Row>
        </Notice>
      ) : (
        <T muted small style={{ textAlign: 'center' }}>{planted} of {GRID_CELLS} plots planted. Tap a plant to see how it’s growing.</T>
      )}
      <ErrorText error={error ? new Error(error) : null} />

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'inventory', label: 'Inventory' },
          { value: 'shop', label: 'Shop' },
          { value: 'goals', label: 'Goals' },
        ]}
      />
      {tab === 'inventory' && (
        <InventoryTab
          garden={g}
          statuses={statuses}
          opening={opening}
          error={null}
          onPlantSeed={startPlanting}
          onPlace={(p) => { setSelected(null); setError(null); setMode({ kind: 'place', plantId: p.id, name: speciesName(p.species) }) }}
          onOpenBox={openBox}
        />
      )}
      {tab === 'shop' && <ShopTab shop={shop.data} coins={g.state.coins} loading={shop.isLoading} error={shop.error} buying={buying} onBuy={buy} />}
      {tab === 'goals' && (
        <>
          <GoalsTab statuses={goalStatuses} claimed={g.claimedAchievements} />
          <HowItWorks />
        </>
      )}

      <HaulPopup haul={haul} onClose={dismiss} />
      <RevealPopup species={reveal?.species ?? null} title={reveal?.title ?? ''} line={reveal?.line ?? ''} onClose={() => setReveal(null)} />
    </Screen>
  )
}
