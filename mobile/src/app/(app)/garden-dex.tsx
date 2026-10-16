// Dev-only plant codex: every species with its art at each stage, overgrown, how to grow it, where its seed comes from
// and what it evolves into. Open it from Me > Developer in a dev build.
import { useEffect, useState } from 'react'
import { useLocalSearchParams } from 'expo-router'
import { View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ArrowRight, Coins, Gift, Moon, Sprout, Sparkles, Trophy } from 'lucide-react-native'
import {
  RARITIES, RARITY_BANDS, RARITY_LABELS, SPECIES, describeGoal, evolvesFrom, growthDays, routesOf, speciesById,
  type Rarity, type Route, type Species, type Stage,
} from '@legity/core/garden/index'
import { Card, Pill, PillScroller, Row, Screen, Segmented, T } from '../../components/ui'
import { LivePlant } from '../../garden/LivePlant'
import { PlantThumb } from '../../garden/PlantArt'
import { RARITY_COLOR, RarityChip, SleepyBadge } from '../../garden/rarity'
import { useColors } from '../../lib/theme'

const days = (n: number) => (n < 1.5 ? 'a day' : n < 100 ? `${Math.round(n)} days` : `${Math.round(n / 10) * 10} days`)
const bandText = (r: Rarity) => `${RARITY_BANDS[r][0]}-${RARITY_BANDS[r][1]} days`
const STAGE_LABELS = ['Seedling', 'Young', 'Growing', 'Mature'] as const

function SourceIcon({ kind }: { kind: Route['kind'] }) {
  const c = useColors()
  const Icon = { starter: Sprout, shop: Coins, box: Gift, evolution: Sparkles, goal: Trophy }[kind]
  return <Icon size={14} color={kind === 'shop' ? c.gold : c.accent} />
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <T muted small bold style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>{title}</T>
      {children}
    </View>
  )
}

function EvolutionRow({ from, to, goalText, note }: { from: Species; to: Species; goalText: string; note: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Row gap={8} style={{ justifyContent: 'center' }}>
        <View style={{ alignItems: 'center' }}>
          <PlantThumb species={from.id} size={64} />
          <T small>{from.name}</T>
        </View>
        <ArrowRight size={20} color="#a9b4ff" />
        <View style={{ alignItems: 'center' }}>
          <PlantThumb species={to.id} size={64} />
          <T small bold>{to.name}</T>
        </View>
      </Row>
      <T small>{goalText}</T>
      <T muted small>{note}</T>
    </View>
  )
}

function PlantEntry({ s, stage, overgrown }: { s: Species; stage: Stage; overgrown: boolean }) {
  const c = useColors()
  const parent = evolvesFrom(s.id)
  const child = s.evolvesTo ? speciesById(s.evolvesTo.to) : undefined
  return (
    <Card gap={14}>
      <Row gap={14} style={{ alignItems: 'flex-start' }}>
        <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: c.line }}>
          <LinearGradient colors={['#141a30', '#2b3158']} style={{ padding: 6 }}>
            <LivePlant species={s.id} stage={stage} overgrown={overgrown} size={104} />
          </LinearGradient>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <T bold style={{ fontSize: 18 }}>{s.name}</T>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            <RarityChip rarity={s.rarity} />
            {s.sleepy && <SleepyBadge />}
          </Row>
          <T muted small>{s.blurb}</T>
          <T muted small>id: {s.id}</T>
        </View>
      </Row>

      <Section title="Every look">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {([0, 1, 2, 3] as Stage[]).map((st) => (
            <View key={st} style={{ alignItems: 'center', width: '19%' }}>
              <PlantThumb species={s.id} stage={st} size={52} />
              <T muted small style={{ fontSize: 11 }}>{STAGE_LABELS[st]}</T>
            </View>
          ))}
          <View style={{ alignItems: 'center', width: '19%' }}>
            <PlantThumb species={s.id} stage={3} overgrown size={52} />
            <T muted small style={{ fontSize: 11 }}>Overgrown</T>
          </View>
        </View>
      </Section>

      <Section title="How to grow it">
        {s.goal ? (
          <>
            <T small>{describeGoal(s.goal)}, counted from the night after planting (about {days(growthDays(s))}).</T>
            <T muted small>Stages are thirds of that goal; the plant is fully grown when it is met.</T>
          </>
        ) : (
          <T small>Nothing: it arrives fully grown, by evolution.</T>
        )}
      </Section>

      <Section title={`How to get it (${RARITY_LABELS[s.rarity].toLowerCase()}: ${bandText(s.rarity)})`}>
        {routesOf(s.id).map((src, i) => (
          <Row key={i} gap={8} style={{ alignItems: 'flex-start' }}>
            <View style={{ marginTop: 3 }}><SourceIcon kind={src.kind} /></View>
            <T small style={{ flex: 1 }}>{src.text}{src.kind === 'starter' ? '' : ` · about ${days(src.days)}`}</T>
          </Row>
        ))}
      </Section>

      {(child || parent) && (
        <Section title="Evolution">
          {child && s.evolvesTo && (
            <EvolutionRow from={s} to={child} goalText={`Needs ${describeGoal(s.evolvesTo.goal)}.`} note={`Counted from the night ${s.name} finished growing. The evolved plant is fully grown straight away.`} />
          )}
          {parent && parent.evolvesTo && (
            <EvolutionRow from={parent} to={s} goalText={`${parent.name} needs ${describeGoal(parent.evolvesTo.goal)}.`} note={`Only ever comes from a ${parent.name}: it cannot be bought, found or earned any other way.`} />
          )}
        </Section>
      )}
    </Card>
  )
}

/** /garden-dex?review=N shows six plants at a time, large and still, for checking the drawings (add &stage=0-3 or &over=1). */
function Review({ page, stage, over }: { page: number; stage: Stage; over: boolean }) {
  const list = SPECIES.slice(page * 6, page * 6 + 6)
  return (
    <Screen>
      <T muted small>Review page {page + 1} of {Math.ceil(SPECIES.length / 6)} · {STAGE_LABELS[stage]}{over ? ' · overgrown' : ''}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 6 }}>
        {list.map((s) => (
          <View key={s.id} style={{ width: '50%', alignItems: 'center' }}>
            <PlantThumb species={s.id} stage={stage} overgrown={over} size={148} />
            <T small bold>{s.name}</T>
          </View>
        ))}
      </View>
    </Screen>
  )
}

export default function GardenDex() {
  const reviewParams = useLocalSearchParams<{ review?: string; stage?: string; over?: string }>()
  if (reviewParams.review != null) {
    return <Review page={Math.max(0, Number(reviewParams.review) || 0)} stage={(Math.max(0, Math.min(3, Number(reviewParams.stage ?? 3))) as Stage)} over={reviewParams.over === '1'} />
  }
  return <GardenDexBody />
}

function GardenDexBody() {
  // /garden-dex?rarity=epic&stage=0&over=1 opens pre-filtered (handy for links and for checking the art)
  const params = useLocalSearchParams<{ rarity?: string; stage?: string; over?: string; review?: string }>()
  const [rarity, setRarity] = useState<Rarity | 'all'>('all')
  const [stage, setStage] = useState<Stage>(3)
  const [over, setOver] = useState(false)
  useEffect(() => {
    if (params.rarity) setRarity((RARITIES as string[]).includes(params.rarity) ? (params.rarity as Rarity) : 'all')
    if (params.stage != null) setStage((Math.max(0, Math.min(3, Number(params.stage) || 0)) as Stage))
    if (params.over != null) setOver(params.over === '1')
  }, [params.rarity, params.stage, params.over])
  const list = SPECIES.filter((s) => rarity === 'all' || s.rarity === rarity)
  return (
    <Screen>
      <T muted small>Dev only. The big preview on each card follows the stage and overgrown switches below; the strip shows every look at once.</T>
      <Segmented value={stage} onChange={setStage} options={STAGE_LABELS.map((label, i) => ({ value: i as Stage, label }))} />
      <PillScroller>
        <Pill label={over ? 'Overgrown: on' : 'Overgrown: off'} on={over} onPress={() => setOver(!over)} />
        <Pill label="All" on={rarity === 'all'} onPress={() => setRarity('all')} />
        {RARITIES.map((r) => (
          <Pill key={r} label={RARITY_LABELS[r]} on={rarity === r} onPress={() => setRarity(r)} />
        ))}
      </PillScroller>
      <Row gap={8}>
        <Moon size={14} color="#a9b4ff" />
        <T muted small>{list.length} plants shown</T>
      </Row>
      {/* overview: every plant at a glance, in the current stage / overgrown setting */}
      <Card gap={10}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 }}>
          {list.map((s) => (
            <View key={s.id} style={{ width: '25%', alignItems: 'center' }}>
              <PlantThumb species={s.id} stage={stage} overgrown={over} size={58} />
              <T small style={{ fontSize: 10, textAlign: 'center' }} numberOfLines={1}>{s.name}</T>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: RARITY_COLOR[s.rarity] }} />
            </View>
          ))}
        </View>
      </Card>
      {list.map((s) => (
        <PlantEntry key={s.id} s={s} stage={stage} overgrown={over} />
      ))}
    </Screen>
  )
}
