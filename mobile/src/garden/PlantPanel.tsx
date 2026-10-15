import { View } from 'react-native'
import { ArrowRightLeft, CloudFog, Sparkles, Sprout, X } from 'lucide-react-native'
import { STAGE_NAMES, describeGoal, formatProgress, type PlantRow, type PlantStatus } from '@legity/core/garden/index'
import { Button, Card, Meter, Row, T } from '../components/ui'
import { PlantThumb } from './PlantArt'
import { RarityChip, SleepyBadge } from './rarity'

/** Details and actions for the plant on the selected tile. */
export function PlantPanel({
  plant, status, overgrown, busy, onMove, onPickUp, onEvolve,
}: {
  plant: PlantRow
  status: PlantStatus
  overgrown: boolean
  busy: boolean
  onMove: () => void
  onPickUp: () => void
  onEvolve: () => void
}) {
  const s = status.species
  const evo = status.evolution
  return (
    <Card gap={12}>
      <Row gap={14} style={{ alignItems: 'flex-start' }}>
        <PlantThumb species={s.id} stage={status.stage} overgrown={overgrown} size={72} />
        <View style={{ flex: 1, gap: 4 }}>
          <T bold style={{ fontSize: 18 }}>{s.name}</T>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            <RarityChip rarity={s.rarity} />
            {s.sleepy && <SleepyBadge />}
          </Row>
          <T muted small>{s.blurb}</T>
        </View>
      </Row>

      {overgrown && (
        <Row gap={8} style={{ alignItems: 'flex-start' }}>
          <CloudFog size={16} color="#b4bf6a" style={{ marginTop: 2 }} />
          <T small style={{ flex: 1 }}>Overgrown. A decent night clears the weeds.</T>
        </Row>
      )}

      <View style={{ gap: 6 }}>
        <Row between>
          <T small bold>{status.mature ? 'Fully grown' : `${STAGE_NAMES[status.stage]}`}</T>
          <T small muted>{status.mature ? (plant.evolved_from ? 'Evolved' : 'Mature') : formatProgress(status.growthGoal, status.growth)}</T>
        </Row>
        <Meter fraction={status.growth.target ? status.growth.value / status.growth.target : 1} />
        {!status.mature && <T muted small>Grows with {describeGoal(status.growthGoal)} since {plant.planted_on}.</T>}
      </View>

      {evo && (
        <View style={{ gap: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 10 }}>
          <Row between>
            <T small bold>Evolves into {evo.to.name}</T>
            {status.mature && <T small muted>{formatProgress(evo.goal, evo.progress)}</T>}
          </Row>
          {status.mature ? (
            <>
              <Meter fraction={evo.progress.target ? evo.progress.value / evo.progress.target : 0} />
              {!evo.ready && <T muted small>Needs {describeGoal(evo.goal)}.</T>}
            </>
          ) : (
            <T muted small>Finish growing first, then {describeGoal(evo.goal)}.</T>
          )}
          {evo.ready && <Button title={`Evolve into ${evo.to.name}`} icon={Sparkles} onPress={onEvolve} busy={busy} />}
        </View>
      )}

      <Row gap={10}>
        <View style={{ flex: 1 }}><Button title="Move" icon={ArrowRightLeft} variant="secondary" small onPress={onMove} disabled={busy} /></View>
        <View style={{ flex: 1 }}><Button title="Pick up" icon={X} variant="secondary" small onPress={onPickUp} disabled={busy} /></View>
      </Row>
    </Card>
  )
}

/** Shown for a tile with nothing on it. */
export function EmptyPanel({ hasSeeds, hasStored, onSeeds }: { hasSeeds: boolean; hasStored: boolean; onSeeds: () => void }) {
  return (
    <Card gap={10}>
      <Row gap={10}>
        <Sprout size={22} color="#86c19a" />
        <T bold>Empty plot</T>
      </Row>
      <T muted small>
        {hasSeeds || hasStored
          ? 'Pick a seed or a stored plant below to put here.'
          : 'No seeds left. Earn coins from your sleep and visit the shop, or open a Dream Box.'}
      </T>
      {(hasSeeds || hasStored) && <Button title="Choose what to plant" variant="secondary" small onPress={onSeeds} />}
    </Card>
  )
}
