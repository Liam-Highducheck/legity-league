// Dev-only plant codex: every species with its art at each stage, overgrown, how to grow it, where its seed comes from
// and what it evolves into. Open it from Me > Developer in a dev build.
import { useState } from 'react'
import { View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ArrowRight, Coins, Gift, Moon, Sprout, Sparkles, Trophy } from 'lucide-react-native'
import {
  RARITIES, RARITY_LABELS, SPECIES, describeGoal, evolvesFrom, seedSources, speciesById,
  type Rarity, type SeedSource, type Species, type Stage,
} from '@legity/core/garden/index'
import { Card, Pill, PillScroller, Row, Screen, Segmented, T } from '../../components/ui'
import { LivePlant } from '../../garden/LivePlant'
import { PlantThumb } from '../../garden/PlantArt'
import { RarityChip, SleepyBadge } from '../../garden/rarity'
import { useColors } from '../../lib/theme'

const STAGE_LABELS = ['Seedling', 'Young', 'Growing', 'Mature'] as const

function SourceIcon({ kind }: { kind: SeedSource['kind'] }) {
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
        <T small>{describeGoal(s.goal)}, counted from the night after planting.</T>
        <T muted small>Stages are thirds of that goal; the plant is fully grown when it is met. Evolved plants skip this.</T>
      </Section>

      <Section title="How to get the seed">
        {seedSources(s.id).map((src, i) => (
          <Row key={i} gap={8} style={{ alignItems: 'flex-start' }}>
            <View style={{ marginTop: 3 }}><SourceIcon kind={src.kind} /></View>
            <T small style={{ flex: 1 }}>{src.text}</T>
          </Row>
        ))}
      </Section>

      {(child || parent) && (
        <Section title="Evolution">
          {child && s.evolvesTo && (
            <EvolutionRow from={s} to={child} goalText={`Needs ${describeGoal(s.evolvesTo.goal)}.`} note={`Counted from the night ${s.name} finished growing. The evolved plant is fully grown straight away.`} />
          )}
          {parent && parent.evolvesTo && (
            <EvolutionRow from={parent} to={s} goalText={`${parent.name} needs ${describeGoal(parent.evolvesTo.goal)}.`} note={`Comes from a ${parent.name}${s.shop === null && !s.droppable ? ' only: it cannot be bought or found' : ''}.`} />
          )}
        </Section>
      )}
    </Card>
  )
}

export default function GardenDex() {
  const [rarity, setRarity] = useState<Rarity | 'all'>('all')
  const [stage, setStage] = useState<Stage>(3)
  const [over, setOver] = useState(false)
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
      {list.map((s) => (
        <PlantEntry key={s.id} s={s} stage={stage} overgrown={over} />
      ))}
    </Screen>
  )
}
