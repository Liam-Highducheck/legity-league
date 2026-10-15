import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { Check, Coins, Gift, Lock, Sprout } from 'lucide-react-native'
import {
  ACHIEVEMENTS, BOX_PITY, SPECIES, type Rarity, describeGoal, formatProgress, speciesById, speciesName,
  type AchievementStatus, type PlantRow, type PlantStatus, type Reward,
} from '@legity/core/garden/index'
import type { GardenData, Shop } from '@legity/data/garden'
import { Button, Card, Chip, ErrorText, Pill, PillScroller, Row, T } from '../components/ui'
import { buzz, GrowthMeter } from './feedback'
import { useColors } from '../lib/theme'
import { PlantThumb } from './PlantArt'
import { RARITY_COLOR, RarityChip, SleepyBadge } from './rarity'
import { ShakingBox } from './Popups'

// ---- inventory ---------------------------------------------------------------------------------

export function InventoryTab({
  garden, statuses, opening, error, onPlantSeed, onPlace, onOpenBox,
}: {
  garden: GardenData
  statuses: Map<string, PlantStatus | null>
  opening: boolean
  error: unknown
  onPlantSeed: (species: string) => void
  onPlace: (plant: PlantRow) => void
  onOpenBox: () => void
}) {
  const c = useColors()
  const seeds = SPECIES.filter((s) => (garden.seeds[s.id] ?? 0) > 0)
  const stored = garden.plants.filter((p) => p.cell == null)
  const boxes = garden.state.boxes
  return (
    <>
      <Card gap={10}>
        <Row gap={14}>
          <ShakingBox active={opening} />
          <View style={{ flex: 1 }}>
            <T bold>Dream Boxes · {boxes}</T>
            <T muted small>
              Earned with a perfect 100, from goals and in the shop. Each holds a random seed; every {BOX_PITY + 1}th box without a rare is guaranteed one.
            </T>
          </View>
        </Row>
        <Button title={boxes > 0 ? 'Open a Dream Box' : 'No boxes yet'} icon={Gift} onPress={onOpenBox} disabled={boxes < 1 || opening} busy={opening} />
        <ErrorText error={error} />
      </Card>

      <Card title="Seeds" gap={12}>
        {seeds.length === 0 && <T muted small>No seeds. Buy some in the shop or earn them from goals.</T>}
        {seeds.map((s) => (
          <Row key={s.id} gap={12}>
            <PlantThumb species={s.id} stage={3} size={44} />
            <View style={{ flex: 1, gap: 2 }}>
              <T bold>{s.name} <T muted>×{garden.seeds[s.id]}</T></T>
              <Row gap={8}><RarityChip rarity={s.rarity} />{s.sleepy && <SleepyBadge />}</Row>
              <T muted small numberOfLines={2}>Grows with {describeGoal(s.goal)}.</T>
            </View>
            <Button title="Plant" small icon={Sprout} onPress={() => onPlantSeed(s.id)} />
          </Row>
        ))}
      </Card>

      {stored.length > 0 && (
        <Card title="Stored plants" gap={12}>
          {stored.map((p) => {
            const st = statuses.get(p.id)
            if (!st) return null
            return (
              <Row key={p.id} gap={12}>
                <PlantThumb species={st.species.id} stage={st.stage} size={44} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T bold>{st.species.name}</T>
                  <T muted small>{st.mature ? (p.evolved_from ? 'Evolved' : 'Fully grown') : 'Still growing'}</T>
                </View>
                <Button title="Place" small variant="secondary" onPress={() => onPlace(p)} />
              </Row>
            )
          })}
          <T muted small style={{ color: c.muted }}>Stored plants keep growing.</T>
        </Card>
      )}
    </>
  )
}

// ---- shop --------------------------------------------------------------------------------------

export function ShopTab({
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
  const price = (p: number) => (
    <Row gap={4}>
      <Coins size={14} color={c.gold} />
      <T bold small>{p}</T>
    </Row>
  )
  return (
    <>
      <Card gap={12}>
        <Row gap={12}>
          <Gift size={30} color={c.accent} strokeWidth={1.6} />
          <View style={{ flex: 1 }}>
            <T bold>Dream Box</T>
            <T muted small>A random seed. Rare and epic ones can drop.</T>
          </View>
          <Button title={bought === 'box' ? 'Bought' : shop ? String(shop.box_price) : '…'} icon={bought === 'box' ? Check : Coins} small variant={bought === 'box' ? 'secondary' : 'primary'} disabled={!shop || coins < shop.box_price} busy={buying === 'box'} onPress={() => shop && onBuy('box', shop.box_price)} />
        </Row>
      </Card>

      <Card title="Today’s seeds" gap={14}>
        {loading && <T muted small>Loading the shop…</T>}
        {shop?.items.map((it) => {
          const s = speciesById(it.species)
          if (!s) return null
          return (
            <Row key={it.species} gap={12}>
              <PlantThumb species={it.species} size={44} />
              <View style={{ flex: 1, gap: 2 }}>
                <Row gap={8} style={{ flexWrap: 'wrap' }}>
                  <T bold>{s.name}</T>
                  {it.rotating && <Chip style={{ paddingVertical: 1, paddingHorizontal: 8 }}><T muted small>Today only</T></Chip>}
                </Row>
                <Row gap={8}><RarityChip rarity={s.rarity} />{s.sleepy && <SleepyBadge />}</Row>
                <T muted small numberOfLines={2}>Grows with {describeGoal(s.goal)}.</T>
              </View>
              <Button
                title={bought === it.species ? 'Bought' : String(it.price)}
                icon={bought === it.species ? Check : Coins}
                small
                variant={bought === it.species ? 'secondary' : 'primary'}
                disabled={coins < it.price}
                busy={buying === it.species}
                onPress={() => onBuy(it.species, it.price)}
              />
            </Row>
          )
        })}
        <ErrorText error={error} />
        <T muted small>The always-in-stock seeds stay put; the rest rotate every day, the same for everyone.</T>
      </Card>
    </>
  )
}

// ---- goals --------------------------------------------------------------------------------------

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

export function GoalsTab({ statuses, claimed }: { statuses: AchievementStatus[]; claimed: Set<string> }) {
  const c = useColors()
  const [filter, setFilter] = useState<Filter>('todo')
  const rows = useMemo(() => {
    const frac = (s: AchievementStatus) => (s.progress.target ? s.progress.value / s.progress.target : 0)
    const list = statuses.filter((s) => (filter === 'all' ? true : filter === 'done' ? claimed.has(s.def.id) : !claimed.has(s.def.id)))
    return list.sort((a, b) => frac(b) - frac(a) || ACHIEVEMENTS.indexOf(a.def) - ACHIEVEMENTS.indexOf(b.def))
  }, [statuses, claimed, filter])
  const doneCount = statuses.filter((s) => claimed.has(s.def.id)).length
  return (
    <>
      <T muted small>{doneCount} of {statuses.length} goals reached. Rewards are paid automatically.</T>
      <PillScroller>
        <Pill label="To do" on={filter === 'todo'} onPress={() => setFilter('todo')} />
        <Pill label="Reached" on={filter === 'done'} onPress={() => setFilter('done')} />
        <Pill label="All" on={filter === 'all'} onPress={() => setFilter('all')} />
      </PillScroller>
      <Card gap={16}>
        {rows.length === 0 && <T muted small>Nothing here.</T>}
        {rows.map((s) => {
          const g = s.def.goal
          const text =
            g.kind === 'stat'
              ? ({ plants: `Own ${g.target} plant${g.target === 1 ? '' : 's'}`, species: `Collect ${g.target} different species`, evolved: `Evolve ${g.target} plant${g.target === 1 ? '' : 's'}`, mature: `Grow ${g.target} plants to maturity`, boxesOpened: `Open ${g.target} Dream Boxes` } as const)[g.stat]
              : describeGoal(g)
          const caption = g.kind === 'stat' ? `${s.progress.value} / ${s.progress.target}` : formatProgress(g, s.progress)
          const isDone = claimed.has(s.def.id)
          return (
            <View key={s.def.id} style={{ gap: 6, opacity: isDone ? 0.7 : 1 }}>
              <Row between>
                <Row gap={8} style={{ flex: 1 }}>
                  {isDone ? <Check size={16} color={c.accent} /> : s.progress.done ? <Sprout size={16} color={c.accent} /> : <Lock size={14} color={c.muted} />}
                  <T bold style={{ flex: 1 }}>{s.def.name}</T>
                </Row>
                {!isDone && <T muted small>{caption}</T>}
              </Row>
              <T muted small>{text}</T>
              {!isDone && <GrowthMeter fraction={s.progress.target ? s.progress.value / s.progress.target : 0} />}
              <RewardChips reward={s.def.reward} />
            </View>
          )
        })}
      </Card>
    </>
  )
}

/** The rules in a few lines, for the Goals tab. */
export function HowItWorks() {
  return (
    <Card title="How the garden works" gap={8}>
      <T small>· Each night’s sleep score becomes that many coins. A perfect 100 also earns a Dream Box.</T>
      <T small>· Plants grow from the nights after you plant them: each seed has its own sleep goal.</T>
      <T small>· Fully grown plants can evolve into something rarer when you hit a harder goal.</T>
      <T small>· Three bad nights in a row (a score under 60, or no night at all) and the garden overgrows. One good night clears it.</T>
      <T small>· Goals pay out seeds, coins and boxes. They look at your whole sleep history.</T>
    </Card>
  )
}

// ---- seed tray ----------------------------------------------------------------------------------

/** A scrolling row of seeds and stored plants right under the board, so planting never needs a trip down the page. */
export function SeedTray({
  garden, statuses, activeSeed, activePlant, onSeed, onPlace,
}: {
  garden: GardenData
  statuses: Map<string, PlantStatus | null>
  activeSeed: string | null
  activePlant: string | null
  onSeed: (species: string) => void
  onPlace: (plant: PlantRow) => void
}) {
  const c = useColors()
  const seeds = SPECIES.filter((s) => (garden.seeds[s.id] ?? 0) > 0)
  const stored = garden.plants.filter((p) => p.cell == null)
  if (seeds.length === 0 && stored.length === 0) return null
  const tile = (key: string, on: boolean, onPress: () => void, thumb: React.ReactNode, label: string, badge: string, rarity: Rarity) => (
    <Pressable
      key={key}
      onPress={() => {
        buzz.select()
        onPress()
      }}
      style={({ pressed }) => ({
        width: 82, alignItems: 'center', gap: 1, paddingTop: 8, paddingBottom: 7, borderRadius: 16, borderWidth: 1,
        borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accentSoft : c.surface, opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ height: 46, justifyContent: 'flex-end' }}>{thumb}</View>
      <Text numberOfLines={1} style={{ color: c.text, fontSize: 12, fontWeight: '600', maxWidth: 74, marginTop: 2 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: RARITY_COLOR[rarity] }} />
        <Text style={{ color: c.muted, fontSize: 12 }}>{badge}</Text>
      </View>
    </Pressable>
  )
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
      {seeds.map((s) => tile('s' + s.id, activeSeed === s.id, () => onSeed(s.id), <PlantThumb species={s.id} stage={3} size={38} />, s.name, `×${garden.seeds[s.id]}`, s.rarity))}
      {stored.map((p) => {
        const st = statuses.get(p.id)
        if (!st) return null
        return tile('p' + p.id, activePlant === p.id, () => onPlace(p), <PlantThumb species={st.species.id} stage={st.stage} size={38} />, st.species.name, 'Stored', st.species.rarity)
      })}
    </ScrollView>
  )
}
