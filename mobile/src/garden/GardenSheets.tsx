// The shop and the goals list, shown in tall sheets over the garden.
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { Check, Coins, Gift, Lock, Sprout, X } from 'lucide-react-native'
import {
  ACHIEVEMENTS, BOX_PITY, coinDays, describeGoal, formatProgress, speciesById, speciesName,
  type AchievementStatus, type Reward,
} from '@legity/core/garden/index'
import type { Shop } from '@legity/data/garden'
import { Button, Card, Chip, ErrorText, Pill, PillScroller, Row, T } from '../components/ui'
import { useColors } from '../lib/theme'
import { GrowthMeter } from './feedback'
import { PlantThumb } from './PlantArt'
import { RarityChip, SleepyBadge } from './rarity'

// ---- shop ------------------------------------------------------------------------------------

export function ShopContent({
  shop, coins, loading, error, buying, bought, onBuy,
}: {
  shop: Shop | undefined
  coins: number
  loading: boolean
  error: unknown
  buying: string | null
  /** an item just bought: its button shows a tick for a moment */
  bought: string | null
  onBuy: (item: string, price: number) => void
}) {
  const c = useColors()
  const approx = (price: number) => {
    const d = coinDays(price)
    return d < 1.5 ? 'a day of coins' : `about ${Math.round(d)} days of coins`
  }
  const items = [...(shop?.items ?? [])].sort((a, b) => a.price - b.price)
  return (
    <>
      <Card gap={10}>
        <Row gap={12}>
          <Gift size={32} color={c.accent} strokeWidth={1.6} />
          <View style={{ flex: 1 }}>
            <T bold>Dream Box</T>
            <T muted small>A random seed. Rare and epic ones can drop; every {BOX_PITY + 1}th box without a rare is guaranteed one.</T>
          </View>
        </Row>
        <Button
          title={bought === 'box' ? 'Bought' : shop ? `${shop.box_price}` : '…'}
          icon={bought === 'box' ? Check : Coins}
          variant={bought === 'box' ? 'secondary' : 'primary'}
          disabled={!shop || coins < shop.box_price}
          busy={buying === 'box'}
          onPress={() => shop && onBuy('box', shop.box_price)}
        />
        {shop && <T muted small>{approx(shop.box_price)}</T>}
      </Card>

      <Card title={`Today’s seeds`} gap={16}>
        {loading && <T muted small>Loading the shop…</T>}
        {items.map((it) => {
          const s = speciesById(it.species)
          if (!s) return null
          return (
            <Row key={it.species} gap={12} style={{ alignItems: 'flex-start' }}>
              <PlantThumb species={it.species} size={46} />
              <View style={{ flex: 1, gap: 3 }}>
                <Row gap={8} style={{ flexWrap: 'wrap' }}>
                  <T bold>{s.name}</T>
                  {it.rotating && <Chip style={{ paddingVertical: 1, paddingHorizontal: 8 }}><T muted small>Today only</T></Chip>}
                </Row>
                <Row gap={8}><RarityChip rarity={s.rarity} />{s.sleepy && <SleepyBadge />}</Row>
                {s.goal && <T muted small numberOfLines={2}>Grows with {describeGoal(s.goal)}.</T>}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Button
                  title={bought === it.species ? 'Bought' : String(it.price)}
                  icon={bought === it.species ? Check : Coins}
                  small
                  variant={bought === it.species ? 'secondary' : 'primary'}
                  disabled={coins < it.price}
                  busy={buying === it.species}
                  onPress={() => onBuy(it.species, it.price)}
                />
                <T muted small style={{ fontSize: 11 }}>{approx(it.price)}</T>
              </View>
            </Row>
          )
        })}
        <ErrorText error={error} />
        <T muted small>The always-in-stock seeds stay put; the rest rotate every day, the same for everyone. Rarer plants cost more because they take longer to earn.</T>
      </Card>
    </>
  )
}

// ---- goals -----------------------------------------------------------------------------------

type Filter = 'todo' | 'done' | 'all'

function RewardChips({ reward }: { reward: Reward }) {
  const c = useColors()
  return (
    <Row gap={8} style={{ flexWrap: 'wrap' }}>
      {reward.coins > 0 && <Chip><Coins size={13} color={c.gold} /><T small bold>{reward.coins}</T></Chip>}
      {reward.boxes > 0 && <Chip><Gift size={13} color={c.accent} /><T small bold>{reward.boxes}</T></Chip>}
      {reward.seed && <Chip><Sprout size={13} color="#86c19a" /><T small bold>{speciesName(reward.seed)}</T></Chip>}
    </Row>
  )
}

function goalText(g: AchievementStatus['def']['goal']): string {
  if (g.kind !== 'stat') return describeGoal(g)
  return {
    plants: `Own ${g.target} plant${g.target === 1 ? '' : 's'}`,
    species: `Collect ${g.target} different species`,
    evolved: `Evolve ${g.target} plant${g.target === 1 ? '' : 's'}`,
    mature: `Grow ${g.target} plants to maturity`,
    boxesOpened: `Open ${g.target} Dream Boxes`,
  }[g.stat]
}

/**
 * The goals list. Finished goals sit at the top waiting to be collected by hand (nothing is paid until you tap), then the
 * goals in progress, then the ones already collected.
 */
export function GoalsContent({
  statuses, claimed, collecting, onCollect,
}: { statuses: AchievementStatus[]; claimed: Set<string>; collecting: boolean; onCollect: (ids: string[]) => void }) {
  const c = useColors()
  const [filter, setFilter] = useState<Filter>('todo')
  const frac = (s: AchievementStatus) => (s.progress.target ? s.progress.value / s.progress.target : 0)
  const ready = statuses.filter((s) => s.progress.done && !claimed.has(s.def.id))
  const rows = useMemo(() => {
    const list = statuses.filter((s) => (filter === 'done' ? claimed.has(s.def.id) : filter === 'all' ? !(s.progress.done && !claimed.has(s.def.id)) : !s.progress.done && !claimed.has(s.def.id)))
    return list.sort((a, b) => frac(b) - frac(a) || ACHIEVEMENTS.indexOf(a.def) - ACHIEVEMENTS.indexOf(b.def))
  }, [statuses, claimed, filter])
  const doneCount = statuses.filter((s) => claimed.has(s.def.id)).length

  const row = (s: AchievementStatus, isReady: boolean) => {
    const g = s.def.goal
    const isDone = claimed.has(s.def.id)
    const caption = g.kind === 'stat' ? `${s.progress.value} / ${s.progress.target}` : formatProgress(g, s.progress)
    return (
      <View key={s.def.id} style={{ gap: 6, opacity: isDone ? 0.65 : 1 }}>
        <Row between>
          <Row gap={8} style={{ flex: 1 }}>
            {isDone ? <Check size={16} color={c.accent} /> : isReady ? <Sprout size={16} color={c.gold} /> : <Lock size={14} color={c.muted} />}
            <T bold style={{ flex: 1 }}>{s.def.name}</T>
          </Row>
          {!isDone && !isReady && <T muted small>{caption}</T>}
        </Row>
        <T muted small>{goalText(g)}</T>
        {!isDone && !isReady && <GrowthMeter fraction={frac(s)} />}
        <Row between style={{ alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}><RewardChips reward={s.def.reward} /></View>
          {isReady && <Button title="Collect" small icon={Gift} onPress={() => onCollect([s.def.id])} disabled={collecting} />}
        </Row>
      </View>
    )
  }

  return (
    <>
      <T muted small>{doneCount} of {statuses.length} goals collected.</T>
      {ready.length > 0 && (
        <Card gap={16} style={{ borderColor: c.gold }}>
          <Row between>
            <T bold>Ready to collect · {ready.length}</T>
            {ready.length > 1 && <Button title="Collect all" small icon={Gift} onPress={() => onCollect(ready.map((r) => r.def.id))} disabled={collecting} />}
          </Row>
          {ready.map((s) => row(s, true))}
        </Card>
      )}
      <PillScroller>
        <Pill label="To do" on={filter === 'todo'} onPress={() => setFilter('todo')} />
        <Pill label="Collected" on={filter === 'done'} onPress={() => setFilter('done')} />
        <Pill label="All" on={filter === 'all'} onPress={() => setFilter('all')} />
      </PillScroller>
      <Card gap={18}>
        {rows.length === 0 && <T muted small>Nothing here.</T>}
        {rows.map((s) => row(s, false))}
      </Card>
      <HowItWorks />
    </>
  )
}

/** The rules in a few lines. */
function HowItWorks() {
  return (
    <Card title="How the garden works" gap={8}>
      <T small>· Each night’s sleep score becomes that many coins. A perfect 100 also earns a Dream Box.</T>
      <T small>· Plants grow from the nights after you plant them: each seed has its own sleep goal.</T>
      <T small>· Fully grown plants can evolve into a richer form when you hit a harder goal.</T>
      <T small>· The rare plants have exactly one way to be earned, so what is in someone’s garden tells you how hard it was.</T>
      <T small>· Three bad nights in a row (a score under 60, or no night at all) and the garden overgrows. One good night clears it.</T>
    </Card>
  )
}
