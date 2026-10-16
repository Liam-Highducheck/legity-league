// The controls floating over the garden scene: top bar, dock, plant card, seed tray. All frosted glass, none of it always in
// the way: the dock is the only thing that stays, and the whole lot can be hidden for a quiet look at the garden.
import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { ArrowRightLeft, ChevronDown, ChevronUp, Coins, Eye, EyeOff, Gift, Sparkles, Sprout, Store, Trophy, X } from 'lucide-react-native'
import { STAGE_NAMES, describeGoal, formatProgress, SPECIES, type PlantRow, type PlantStatus, type Species } from '@legity/core/garden/index'
import type { GardenData } from '@legity/data/garden'
import { Button, Row, T } from '../components/ui'
import { useColors } from '../lib/theme'
import { buzz, CountUp, GrowthMeter } from './feedback'
import { Glass } from './Glass'
import { PlantThumb } from './PlantArt'
import { RARITY_COLOR, RarityChip, SleepyBadge } from './rarity'

/** Round glass button. */
export function GlassIcon({ icon: Icon, onPress, label, size = 42 }: { icon: typeof Eye; onPress: () => void; label: string; size?: number }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={8}>
      <Glass radius={size / 2} intensity={24}>
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={19} color="#eef0ff" strokeWidth={2} />
        </View>
      </Glass>
    </Pressable>
  )
}

export function TopBar({ coins, boxes, relaxed, onRelax }: { coins: number; boxes: number; relaxed: boolean; onRelax: () => void }) {
  return (
    <Row between style={{ alignItems: 'center' }}>
      <GlassIcon icon={relaxed ? Eye : EyeOff} label={relaxed ? 'Show controls' : 'Hide controls'} onPress={onRelax} />
      {!relaxed && (
        <Row gap={8}>
          <Glass radius={999} intensity={24}>
            <Row gap={6} style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
              <Coins size={16} color="#ffd166" />
              <CountUp value={coins} />
            </Row>
          </Glass>
          <Glass radius={999} intensity={24}>
            <Row gap={6} style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
              <Gift size={16} color="#a9b4ff" />
              <CountUp value={boxes} />
            </Row>
          </Glass>
        </Row>
      )}
    </Row>
  )
}

function DockButton({ icon: Icon, label, count, on, onPress }: { icon: typeof Gift; label: string; count?: number; on?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        buzz.select()
        onPress()
      }}
      accessibilityRole="button"
      accessibilityLabel={count ? `${label}, ${count}` : label}
      style={({ pressed }) => ({ width: 66, alignItems: 'center', gap: 3, paddingVertical: 9, opacity: pressed ? 0.6 : 1 })}
    >
      <View>
        <Icon size={23} color={on ? '#bcd0ff' : '#eef0ff'} strokeWidth={on ? 2.3 : 1.9} />
        {!!count && count > 0 && (
          <View style={{ position: 'absolute', right: -9, top: -6, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4, backgroundColor: '#8b7cff', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{count > 99 ? '99+' : count}</Text>
          </View>
        )}
      </View>
      <Text style={{ color: on ? '#bcd0ff' : 'rgba(238,240,255,0.78)', fontSize: 11, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  )
}

export function Dock({ seeds, boxes, seedsOpen, onSeeds, onBoxes, onShop, onGoals }: { seeds: number; boxes: number; seedsOpen: boolean; onSeeds: () => void; onBoxes: () => void; onShop: () => void; onGoals: () => void }) {
  return (
    <Glass radius={26}>
      <Row gap={2} style={{ paddingHorizontal: 6 }}>
        <DockButton icon={Sprout} label="Seeds" count={seeds} on={seedsOpen} onPress={onSeeds} />
        <DockButton icon={Gift} label="Boxes" count={boxes} onPress={onBoxes} />
        <DockButton icon={Store} label="Shop" onPress={onShop} />
        <DockButton icon={Trophy} label="Goals" onPress={onGoals} />
      </Row>
    </Glass>
  )
}

/** A slim banner while a plant is being placed or moved. */
export function ModeBanner({ title, hint, onCancel }: { title: string; hint: string; onCancel: () => void }) {
  return (
    <Glass radius={20}>
      <Row gap={12} style={{ paddingVertical: 10, paddingLeft: 16, paddingRight: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#eef0ff', fontWeight: '700', fontSize: 15 }}>{title}</Text>
          <Text style={{ color: 'rgba(238,240,255,0.7)', fontSize: 12 }}>{hint}</Text>
        </View>
        <GlassIcon icon={X} label="Cancel" onPress={onCancel} size={34} />
      </Row>
    </Glass>
  )
}

/** The plant on the selected tile: name, growth, and what you can do with it. Tap the header for the details. */
export function PlantCard({
  plant, status, overgrown, busy, onMove, onPickUp, onEvolve, onClose,
}: {
  plant: PlantRow
  status: PlantStatus
  overgrown: boolean
  busy: boolean
  onMove: () => void
  onPickUp: () => void
  onEvolve: () => void
  onClose: () => void
}) {
  const [open, setOpen] = useState(false)
  const s = status.species
  const evo = status.evolution
  const frac = status.growth.target ? status.growth.value / status.growth.target : 1
  const stageText = status.mature ? (plant.evolved_from ? 'Evolved' : 'Fully grown') : STAGE_NAMES[status.stage]
  return (
    <Glass radius={26}>
      <View style={{ padding: 14, gap: 10 }}>
        <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityLabel={open ? 'Hide details' : 'Show details'}>
          <Row gap={12}>
            <PlantThumb species={s.id} stage={status.stage} overgrown={overgrown} size={54} />
            <View style={{ flex: 1, gap: 3 }}>
              <Row gap={8} style={{ flexWrap: 'wrap' }}>
                <Text style={{ color: '#eef0ff', fontSize: 18, fontWeight: '700' }}>{s.name}</Text>
                <RarityChip rarity={s.rarity} />
              </Row>
              <Row gap={8}>
                <Text style={{ color: 'rgba(238,240,255,0.8)', fontSize: 13 }}>{stageText}{overgrown ? ' · overgrown' : ''}</Text>
                {s.sleepy && <SleepyBadge />}
              </Row>
            </View>
            {open ? <ChevronUp size={20} color="rgba(238,240,255,0.6)" /> : <ChevronDown size={20} color="rgba(238,240,255,0.6)" />}
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close" style={{ marginLeft: 2 }}>
              <X size={20} color="rgba(238,240,255,0.7)" />
            </Pressable>
          </Row>
        </Pressable>

        {!status.mature && status.growthGoal && (
          <View style={{ gap: 5 }}>
            <GrowthMeter fraction={frac} />
            <Row between>
              <T small color="rgba(238,240,255,0.75)">{formatProgress(status.growthGoal, status.growth)}</T>
              <T small color="rgba(238,240,255,0.55)" numberOfLines={1} style={{ flexShrink: 1 }}>{describeGoal(status.growthGoal)}</T>
            </Row>
          </View>
        )}
        {evo && status.mature && !evo.ready && (
          <View style={{ gap: 5 }}>
            <GrowthMeter fraction={evo.progress.target ? evo.progress.value / evo.progress.target : 0} color="#ffd166" />
            <T small color="rgba(238,240,255,0.75)">Evolving into {evo.to.name}: {formatProgress(evo.goal, evo.progress)}</T>
          </View>
        )}

        {open && (
          <View style={{ gap: 8 }}>
            <T small color="rgba(238,240,255,0.7)">{s.blurb}</T>
            {overgrown && <T small color="#d3de86">Overgrown: a night scoring 60 or more clears the weeds.</T>}
            {!status.mature && status.growthGoal && <T small color="rgba(238,240,255,0.7)">Grows with {describeGoal(status.growthGoal)} since {plant.planted_on}.</T>}
            {evo && <T small color="rgba(238,240,255,0.7)">Evolves into {evo.to.name} after {describeGoal(evo.goal)}{status.mature ? '' : ', once fully grown'}.</T>}
          </View>
        )}

        {evo?.ready && <Button title={`Evolve into ${evo.to.name}`} icon={Sparkles} onPress={onEvolve} busy={busy} />}
        <Row gap={10}>
          <View style={{ flex: 1 }}><Button title="Move" icon={ArrowRightLeft} variant="secondary" small onPress={onMove} disabled={busy} /></View>
          <View style={{ flex: 1 }}><Button title="Pick up" icon={X} variant="secondary" small onPress={onPickUp} disabled={busy} /></View>
        </Row>
      </View>
    </Glass>
  )
}

export function EmptyCard({ hasSeeds, onSeeds, onClose }: { hasSeeds: boolean; onSeeds: () => void; onClose: () => void }) {
  return (
    <Glass radius={24}>
      <Row gap={12} style={{ padding: 14 }}>
        <Sprout size={24} color="#86c19a" />
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#eef0ff', fontWeight: '700', fontSize: 16 }}>Empty plot</Text>
          <Text style={{ color: 'rgba(238,240,255,0.7)', fontSize: 13 }}>{hasSeeds ? 'Plant a seed here.' : 'No seeds left. Visit the shop or open a Dream Box.'}</Text>
        </View>
        {hasSeeds && <Button title="Plant" small icon={Sprout} onPress={onSeeds} />}
        <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close"><X size={20} color="rgba(238,240,255,0.7)" /></Pressable>
      </Row>
    </Glass>
  )
}

function SeedCard({ species, qty, stored, active, onPress }: { species: Species; qty: number; stored?: boolean; active: boolean; onPress: () => void }) {
  const color = RARITY_COLOR[species.rarity]
  return (
    <Pressable
      onPress={() => {
        buzz.select()
        onPress()
      }}
      accessibilityRole="button"
      accessibilityLabel={`${species.name}, ${stored ? 'stored plant' : `${qty} seeds`}`}
      style={({ pressed }) => ({
        width: 128, borderRadius: 20, borderWidth: 1, borderColor: active ? '#8b7cff' : 'rgba(255,255,255,0.12)', backgroundColor: active ? 'rgba(139,124,255,0.2)' : 'rgba(255,255,255,0.05)',
        padding: 10, gap: 4, opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ alignItems: 'center', height: 64, justifyContent: 'flex-end' }}>
        <PlantThumb species={species.id} stage={3} size={50} />
        <View style={{ position: 'absolute', right: 0, top: 0, minWidth: 22, height: 20, borderRadius: 10, paddingHorizontal: 6, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{stored ? 'Stored' : `×${qty}`}</Text>
        </View>
      </View>
      <Row gap={5}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
        <Text numberOfLines={1} style={{ color: '#eef0ff', fontSize: 13, fontWeight: '700', flex: 1 }}>{species.name}</Text>
      </Row>
      {!stored && species.goal ? (
        <Text numberOfLines={3} style={{ color: 'rgba(238,240,255,0.62)', fontSize: 11, lineHeight: 14 }}>{describeGoal(species.goal)}</Text>
      ) : (
        <Text numberOfLines={3} style={{ color: 'rgba(238,240,255,0.62)', fontSize: 11, lineHeight: 14 }}>{stored ? 'Tap, then pick a plot.' : 'Arrives fully grown.'}</Text>
      )}
    </Pressable>
  )
}

/** The seeds and stored plants to choose from; picking one starts placing it. */
export function SeedsPanel({
  garden, statuses, activeSeed, onSeed, onPlace, onClose,
}: {
  garden: GardenData
  statuses: Map<string, PlantStatus | null>
  activeSeed: string | null
  onSeed: (species: string) => void
  onPlace: (plant: PlantRow) => void
  onClose: () => void
}) {
  const seeds = SPECIES.filter((s) => (garden.seeds[s.id] ?? 0) > 0)
  const stored = garden.plants.filter((p) => p.cell == null)
  return (
    <Glass radius={26}>
      <View style={{ paddingVertical: 12, gap: 10 }}>
        <Row between style={{ paddingHorizontal: 16 }}>
          <Text style={{ color: '#eef0ff', fontSize: 16, fontWeight: '700' }}>Plant something</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close"><X size={20} color="rgba(238,240,255,0.7)" /></Pressable>
        </Row>
        {seeds.length === 0 && stored.length === 0 ? (
          <Text style={{ color: 'rgba(238,240,255,0.7)', fontSize: 13, paddingHorizontal: 16 }}>No seeds yet. Earn coins from your sleep and visit the shop, or open a Dream Box.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
            {seeds.map((s) => (
              <SeedCard key={s.id} species={s} qty={garden.seeds[s.id]} active={activeSeed === s.id} onPress={() => onSeed(s.id)} />
            ))}
            {stored.map((p) => {
              const st = statuses.get(p.id)
              return st ? <SeedCard key={p.id} species={st.species} qty={1} stored active={false} onPress={() => onPlace(p)} /> : null
            })}
          </ScrollView>
        )}
      </View>
    </Glass>
  )
}
