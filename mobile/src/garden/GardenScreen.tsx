import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, LayoutAnimation, Platform, Text, UIManager, View, useWindowDimensions } from 'react-native'
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { achievementStatuses, achievementWindowStart, gardenStats, GRID_CELLS, plantStatus, speciesName, type PlantRow } from '@legity/core/garden/index'
import { useUserId } from '@legity/data/auth'
import {
  useBuy, useEvolve, useGarden, useGardenShop, useGardenSync, useMovePlant, useMyOvergrowth, useOpenBox, usePlant,
} from '@legity/data/garden'
import { useMyNights } from '@legity/data/queries'
import { Centered, ErrorText, Spinner } from '../components/ui'
import { BoxScene } from './BoxScene'
import { getBoxVariant } from './boxPrefs'
import type { BurstKind } from './Burst'
import { buzz, useToast } from './feedback'
import { Dock, EmptyCard, ModeBanner, PlantCard, SeedsPanel, TopBar } from './GardenChrome'
import { DAY, DUSK, GardenGrid, type Cells } from './GardenGrid'
import { GoalsContent, ModalSheet, ShopContent } from './GardenSheets'
import { layoutFor } from './iso'
import { useReducedMotion, useTimeOfDay } from './motion'
import { HaulPopup, RevealPopup } from './Popups'
import { SceneBackdrop } from './scenery'

/** What the next tap on the board does. `null` = just select a tile. */
type Mode =
  | null
  | { kind: 'plant'; species: string }
  | { kind: 'place'; plantId: string; name: string }
  | { kind: 'move'; plantId: string; name: string; from: number }

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true)
/** Eases the next layout change (panels opening and closing) instead of snapping. */
const animate = () => LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'))

const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')

/** The standard iOS tab bar is 49 pt plus the home-indicator inset; the garden draws underneath it. */
const TAB_BAR = 49

/**
 * The garden tab: the whole screen is the garden. Sky, hills and weather fill the background, the board floats in the
 * middle, and the controls are frosted glass at the edges that you can tuck away.
 */
export default function GardenScreen() {
  const uid = useUserId()
  const qc = useQueryClient()
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const still = useReducedMotion()
  // dev builds can force the sky with /garden?sky=day or ?sky=night (the real thing follows the phone's clock)
  const { sky } = useLocalSearchParams<{ sky?: string }>()
  const clockNight = useTimeOfDay() === 'night'
  const dusk = __DEV__ && (sky === 'day' || sky === 'night') ? sky === 'night' : clockNight
  const palette = dusk ? DUSK : DAY
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
  const toast = useToast()

  const [selected, setSelected] = useState<number | null>(null)
  const [mode, setMode] = useState<Mode>(null)
  const [seedsOpen, setSeedsOpen] = useState(false)
  const [sheet, setSheet] = useState<null | 'shop' | 'goals'>(null)
  const [relaxed, setRelaxed] = useState(false)
  const [box, setBox] = useState<{ open: boolean; species: string | null }>({ open: false, species: null })
  const [buying, setBuying] = useState<string | null>(null)
  const [bought, setBought] = useState<string | null>(null)
  const [bursts, setBursts] = useState<{ key: number; cell: number; kind: BurstKind }[]>([])
  const burstKey = useRef(0)
  const [reveal, setReveal] = useState<{ species: string; title: string; line: string } | null>(null)

  // Coming back to the tab picks up new nights straight away.
  const focused = useRef(false)
  useFocusEffect(
    useCallback(() => {
      if (focused.current) {
        void qc.invalidateQueries({ queryKey: ['garden', uid] })
        void qc.invalidateQueries({ queryKey: ['my-nights'] })
      }
      focused.current = true
    }, [qc, uid]),
  )

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

  const burst = (cell: number, kind: BurstKind) => setBursts((b) => [...b, { key: ++burstKey.current, cell, kind }])
  const onBurstDone = useCallback((key: number) => setBursts((b) => b.filter((x) => x.key !== key)), [])

  // Rewards landing deserve a little ripple.
  useEffect(() => {
    if (haul) buzz.success()
  }, [haul])

  // The board rises a little while a card is open underneath it.
  const rise = useRef(new Animated.Value(0)).current
  const cardOpen = !relaxed && (seedsOpen || selected != null) && !mode
  useEffect(() => {
    Animated.timing(rise, { toValue: cardOpen ? 1 : 0, duration: still ? 0 : 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
  }, [cardOpen, rise, still])

  if (garden.isLoading || nights.isLoading) return <Centered><Spinner /></Centered>
  if (garden.error || !garden.data) return <Centered><ErrorText error={garden.error ?? new Error('Couldn’t load your garden')} /></Centered>
  const g = garden.data

  const fail = (msg: string) => {
    buzz.error()
    toast.show(msg, 'bad')
  }
  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn()
    } catch (e) {
      fail(message(e))
    }
  }

  const empty = new Set(cells.flatMap((cell, i) => (cell ? [] : [i])))
  const all = new Set(Array.from({ length: GRID_CELLS }, (_, i) => i))
  const targets: Set<number> | null =
    mode?.kind === 'plant' ? empty : mode?.kind === 'place' ? all : mode?.kind === 'move' ? new Set([...all].filter((i) => i !== mode.from)) : null

  const selectedPlant = selected != null ? plants?.find((p) => p.cell === selected) : undefined
  const selectedStatus = selectedPlant ? statuses.get(selectedPlant.id) : null
  // A plant that was just planted has a placeholder id until the server answers; leave it alone for that moment.
  const busy = evolveM.isPending || !!selectedPlant?.id.startsWith('pending-')

  const onTile = (i: number) => {
    if (busy) return
    if (!mode) {
      animate()
      buzz.select()
      setSeedsOpen(false)
      setSelected(i === selected ? null : i)
      return
    }
    // The board updates optimistically, so leave the mode straight away; a refusal rolls back and says why.
    if (mode.kind === 'plant') {
      if (!empty.has(i)) return fail('That plot is taken. Pick an empty one.')
      animate()
      buzz.place()
      burst(i, 'plant')
      toast.show(`Planted ${speciesName(mode.species)}`)
      setMode(null)
      setSelected(i)
      void run(() => plantM.mutateAsync({ species: mode.species, cell: i }))
      return
    }
    animate()
    buzz.place()
    burst(i, 'plant')
    toast.show(`${mode.kind === 'place' ? 'Placed' : 'Moved'} ${mode.name}`)
    setMode(null)
    setSelected(i)
    void run(() => moveM.mutateAsync({ plantId: mode.plantId, cell: i }))
  }

  const startMode = (m: Mode) => {
    animate()
    buzz.select()
    setSeedsOpen(false)
    setSelected(null)
    setMode(m)
  }
  const cancelMode = () => {
    animate()
    setMode(null)
  }
  const toggleSeeds = () => {
    animate()
    setSelected(null)
    setMode(null)
    setSeedsOpen((o) => !o)
  }

  const pickUp = (plant: PlantRow, name: string) => {
    animate()
    buzz.light()
    if (plant.cell != null) burst(plant.cell, 'pickup')
    toast.show(`${name} is in your seeds`)
    setSelected(null)
    void run(() => moveM.mutateAsync({ plantId: plant.id, cell: null }))
  }

  const openBox = () => {
    if (g.state.boxes < 1) return toast.show('No Dream Boxes yet. A perfect 100 earns one, or buy one in the shop.', 'bad')
    buzz.heavy()
    setSeedsOpen(false)
    setBox({ open: true, species: null })
    void boxM.mutateAsync().then(
      (species) => setBox({ open: true, species }),
      (e) => {
        setBox({ open: false, species: null })
        fail(message(e))
      },
    )
  }

  const buy = (item: string, price: number) =>
    void run(async () => {
      if (g.state.coins < price) throw new Error('Not enough coins')
      setBuying(item)
      try {
        await buyM.mutateAsync({ item })
        buzz.success()
        toast.show(item === 'box' ? 'Bought a Dream Box' : `Bought ${speciesName(item)}`)
        setBought(item)
        setTimeout(() => setBought((b) => (b === item ? null : b)), 1400)
      } finally {
        setBuying(null)
      }
    })

  const evolve = (plant: PlantRow) =>
    void run(async () => {
      buzz.heavy()
      const from = speciesName(plant.species)
      const to = await evolveM.mutateAsync(plant.id)
      buzz.success()
      if (plant.cell != null) burst(plant.cell, 'evolve')
      setReveal({ species: to, title: 'Evolved!', line: `Your ${from} grew into a ${speciesName(to)}.` })
    })

  // layout: the board sits a little above the middle, between the top bar and the dock
  const topPad = insets.top + 62
  const dockBottom = insets.bottom + TAB_BAR + 10
  const dockH = 62
  const gridH = layoutFor(width).height
  const boardTop = Math.max(topPad, (height - insets.bottom - TAB_BAR - gridH) / 2 - 36)
  const cardBottom = dockBottom + dockH + 10
  const seedCount = Object.values(g.seeds).reduce((a, b) => a + b, 0) + g.plants.filter((p) => p.cell == null).length
  const hasSeeds = seedCount > 0

  return (
    <View style={{ flex: 1 }}>
      <SceneBackdrop width={width} height={height} dusk={dusk} still={still} topInset={insets.top + 44} />

      <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: boardTop, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [0, -64] }) }] }}>
        <GardenGrid
          cells={cells}
          art="soft"
          palette={palette}
          scenery={false}
          selected={selected}
          targets={targets}
          bursts={bursts}
          onBurstDone={onBurstDone}
          onTile={onTile}
        />
      </Animated.View>

      {/* top bar */}
      <View style={{ position: 'absolute', left: 16, right: 16, top: insets.top + 8 }}>
        <TopBar coins={g.state.coins} boxes={g.state.boxes} relaxed={relaxed} onRelax={() => { animate(); setRelaxed((r) => !r) }} />
      </View>

      {!relaxed && mode && (
        <View style={{ position: 'absolute', left: 16, right: 16, top: insets.top + 62 }}>
          <ModeBanner
            title={mode.kind === 'plant' ? `Planting ${speciesName(mode.species)}` : mode.kind === 'place' ? `Placing ${mode.name}` : `Moving ${mode.name}`}
            hint={mode.kind === 'plant' ? 'Tap an empty plot' : 'Tap a plot. A plant there swaps places'}
            onCancel={cancelMode}
          />
        </View>
      )}

      {/* cards above the dock */}
      {!relaxed && !mode && (
        <View style={{ position: 'absolute', left: 12, right: 12, bottom: cardBottom }}>
          {seedsOpen ? (
            <SeedsPanel
              garden={g}
              statuses={statuses}
              activeSeed={null}
              onSeed={(species) => startMode({ kind: 'plant', species })}
              onPlace={(p) => startMode({ kind: 'place', plantId: p.id, name: speciesName(p.species) })}
              onClose={toggleSeeds}
            />
          ) : selectedPlant && selectedStatus ? (
            <PlantCard
              plant={selectedPlant}
              status={selectedStatus}
              overgrown={!!over?.overgrown}
              busy={busy}
              onMove={() => startMode({ kind: 'move', plantId: selectedPlant.id, name: selectedStatus.species.name, from: selectedPlant.cell! })}
              onPickUp={() => pickUp(selectedPlant, selectedStatus.species.name)}
              onEvolve={() => evolve(selectedPlant)}
              onClose={() => { animate(); setSelected(null) }}
            />
          ) : selected != null ? (
            <EmptyCard hasSeeds={hasSeeds} onSeeds={toggleSeeds} onClose={() => { animate(); setSelected(null) }} />
          ) : null}
        </View>
      )}

      {/* dock */}
      {!relaxed && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: dockBottom, alignItems: 'center' }}>
          <Dock
            seeds={seedCount}
            boxes={g.state.boxes}
            seedsOpen={seedsOpen}
            onSeeds={toggleSeeds}
            onBoxes={openBox}
            onShop={() => setSheet('shop')}
            onGoals={() => setSheet('goals')}
          />
        </View>
      )}

      {/* a one-line nudge while the weeds are creeping or have won */}
      {!relaxed && over && (over.overgrown || over.badRun === 2) && !mode && selected == null && !seedsOpen && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 24, right: 24, bottom: cardBottom + 4, alignItems: 'center' }}>
          <View style={{ borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14, backgroundColor: 'rgba(10,14,38,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }}>
            <Text style={{ color: 'rgba(238,240,255,0.88)', fontSize: 12.5, fontWeight: '600' }}>{over.overgrown ? 'Overgrown. One night scoring 60+ clears the weeds.' : 'Weeds are creeping in. One more rough night and they take over.'}</Text>
          </View>
        </View>
      )}

      <ModalSheet visible={sheet === 'shop'} onClose={() => setSheet(null)} title="Shop" subtitle={`${g.state.coins} coins`}>
        <ShopContent shop={shop.data} coins={g.state.coins} loading={shop.isLoading} error={shop.error} buying={buying} bought={bought} onBuy={buy} />
      </ModalSheet>
      <ModalSheet visible={sheet === 'goals'} onClose={() => setSheet(null)} title="Goals" subtitle="Rewards are paid automatically">
        <GoalsContent statuses={goalStatuses} claimed={g.claimedAchievements} />
      </ModalSheet>

      {toast.node}
      <BoxScene visible={box.open} variant={getBoxVariant()} species={box.species} onClose={() => setBox({ open: false, species: null })} />
      <HaulPopup haul={haul} onClose={dismiss} />
      <RevealPopup species={reveal?.species ?? null} title={reveal?.title ?? ''} line={reveal?.line ?? ''} onClose={() => setReveal(null)} />
    </View>
  )
}
