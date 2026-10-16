// The shop and the goals, as native iOS form sheets (real detents, a draggable grabber, the system's dismiss gesture).
// Their colours follow the garden's sky so they never clash with it.
import { useEffect, useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Coins, Gift, X } from 'lucide-react-native'
import { achievementStatuses, achievementWindowStart, gardenStats, speciesName } from '@legity/core/garden/index'
import { useBuy, useClaimGoals, useGarden, useGardenShop, type GoalPayout } from '@legity/data/garden'
import { useMyNights } from '@legity/data/queries'
import { Row, Spinner, T } from '../components/ui'
import { useColors } from '../lib/theme'
import { buzz, CountUp, useToast } from './feedback'
import { GoalsContent, ShopContent } from './GardenSheets'
import { RevealCard } from './Popups'
import { SkyThemed } from './skyTheme'

function SheetFrame({ title, right, children, overlay }: { title: string; right?: React.ReactNode; children: React.ReactNode; overlay?: React.ReactNode }) {
  const c = useColors()
  const router = useRouter()
  // The ScrollView is the screen's root view, as react-native-screens expects for sheets: that is what lets the sheet and its
  // scrolling cooperate (dragging the content up at the top edge grows the sheet) and what gets the content laid out at all.
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 28, paddingBottom: 70, gap: 14 }}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="never"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, minHeight: 40 }}>
        <Text style={{ color: c.text, fontSize: 26, fontWeight: '700' }}>{title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {right}
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Close" style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface2 }}>
            <X size={18} color={c.text} />
          </Pressable>
        </View>
      </View>
      {overlay}
      {children}
    </ScrollView>
  )
}

function CoinChip({ coins }: { coins: number }) {
  const c = useColors()
  return (
    <Row gap={6} style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, backgroundColor: c.surface2 }}>
      <Coins size={15} color={c.gold} />
      <CountUp value={coins} />
    </Row>
  )
}

function ShopInner() {
  const garden = useGarden()
  const shop = useGardenShop()
  const buyM = useBuy()
  const toast = useToast()
  const [buying, setBuying] = useState<string | null>(null)
  const [bought, setBought] = useState<string | null>(null)
  const coins = garden.data?.state.coins ?? 0

  const buy = async (item: string, price: number) => {
    if (coins < price) {
      buzz.error()
      return toast.show('Not enough coins', 'bad')
    }
    setBuying(item)
    try {
      await buyM.mutateAsync({ item })
      buzz.success()
      toast.show(item === 'box' ? 'Bought a Dream Box' : `Bought ${speciesName(item)}`)
      setBought(item)
      setTimeout(() => setBought((b) => (b === item ? null : b)), 1400)
    } catch (e) {
      buzz.error()
      toast.show(e instanceof Error ? e.message : 'Something went wrong', 'bad')
    } finally {
      setBuying(null)
    }
  }

  return (
    <SheetFrame title="Shop" right={<CoinChip coins={coins} />} overlay={toast.node}>
      {garden.isLoading ? <Spinner /> : <ShopContent shop={shop.data} coins={coins} loading={shop.isLoading} error={shop.error} buying={buying} bought={bought} onBuy={buy} />}
    </SheetFrame>
  )
}

function GoalsInner() {
  const garden = useGarden()
  const nights = useMyNights()
  const claimM = useClaimGoals()
  const toast = useToast()
  // seeds from collected goals are shown one at a time, like opening a present
  const [seedQueue, setSeedQueue] = useState<string[]>([])

  const statuses = useMemo(
    () => (garden.data && nights.data ? achievementStatuses(nights.data, gardenStats(garden.data.plants, nights.data, garden.data.state.boxes_opened), achievementWindowStart(garden.data.state.started_on)) : []),
    [garden.data, nights.data],
  )

  const collect = async (ids: string[]) => {
    try {
      const got: GoalPayout = await claimM.mutateAsync(ids)
      buzz.success()
      const parts = [got.coins ? `+${got.coins} coins` : '', got.boxes ? `+${got.boxes} Dream Box${got.boxes === 1 ? '' : 'es'}` : '', got.seeds.length ? `${got.seeds.length} new seed${got.seeds.length === 1 ? '' : 's'}` : ''].filter(Boolean)
      toast.show(parts.join(' · ') || 'Collected')
      if (got.seeds.length) setSeedQueue((q) => [...q, ...got.seeds])
    } catch (e) {
      buzz.error()
      toast.show(e instanceof Error ? e.message : 'Something went wrong', 'bad')
    }
  }

  useEffect(() => {
    if (seedQueue.length) buzz.heavy()
  }, [seedQueue.length])

  return (
    <SheetFrame
      title="Goals"
      right={<CoinChip coins={garden.data?.state.coins ?? 0} />}
      overlay={
        <>
          <Modal visible={seedQueue.length > 0} transparent animationType="fade" onRequestClose={() => setSeedQueue((q) => q.slice(1))}>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(4,6,20,0.7)', padding: 24 }}>
              {seedQueue.length > 0 && <GoalReveal species={seedQueue[0]} onClose={() => setSeedQueue((q) => q.slice(1))} remaining={seedQueue.length - 1} />}
            </View>
          </Modal>
          {toast.node}
        </>
      }
    >
      {garden.isLoading || nights.isLoading ? <Spinner /> : <GoalsContent statuses={statuses} claimed={garden.data?.claimedAchievements ?? new Set()} collecting={claimM.isPending} onCollect={collect} />}
    </SheetFrame>
  )
}

function GoalReveal({ species, onClose, remaining }: { species: string; onClose: () => void; remaining: number }) {
  const c = useColors()
  return (
    <View style={{ width: '100%', maxWidth: 340, borderRadius: 26, backgroundColor: c.surface, padding: 20, borderWidth: 1, borderColor: c.line }}>
      <RevealCard species={species} title="A goal's reward" line="A new seed for your garden." onClose={onClose} button={remaining > 0 ? `Next (${remaining} more)` : 'Lovely'} />
    </View>
  )
}

export function ShopSheet() {
  return (
    <SkyThemed>
      <ShopInner />
    </SkyThemed>
  )
}

export function GoalsSheet() {
  return (
    <SkyThemed>
      <GoalsInner />
    </SkyThemed>
  )
}
