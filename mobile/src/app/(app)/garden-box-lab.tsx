// Dev-only Dream Box animation lab: pick an animation and the rarity it should land on, and play it, optionally with a slow
// "server" to see how it waits. Open it from Me > Developer in a dev build.
import { useState } from 'react'
import { View } from 'react-native'
import { Check, Gift, Play, Timer } from 'lucide-react-native'
import { RARITIES, RARITY_LABELS, SPECIES, type Rarity } from '@legity/core/garden/index'
import { Button, Card, Pill, PillScroller, Screen, Segmented, T } from '../../components/ui'
import { BOX_VARIANTS, BoxScene, type BoxVariant } from '../../garden/BoxScene'
import { getBoxVariant, setBoxVariant } from '../../garden/boxPrefs'

export default function BoxLab() {
  const [variant, setVariant] = useState<BoxVariant>(getBoxVariant())
  const [rarity, setRarity] = useState<Rarity>('rare')
  const [slow, setSlow] = useState(false)
  const [speed, setSpeed] = useState<number>(1)
  const [open, setOpen] = useState(false)
  const [species, setSpecies] = useState<string | null>(null)
  const [used, setUsed] = useState<BoxVariant>(getBoxVariant())

  const play = () => {
    setSpecies(null)
    setOpen(true)
    // The "server" answers after a moment: 600 ms normally, 5 s to watch the animation wait for it.
    const pool = SPECIES.filter((s) => s.rarity === rarity)
    const pick = pool[Math.floor(Math.random() * pool.length)].id
    setTimeout(() => setSpecies(pick), slow ? 5000 : 600)
  }
  const info = BOX_VARIANTS.find((v) => v.id === variant)!

  return (
    <Screen>
      <T muted small>Dev only. The pips under the box light up one by one and the glow turns that rarity’s colour, so the build tells you what is coming.</T>
      <PillScroller>
        {BOX_VARIANTS.map((v) => (
          <Pill key={v.id} label={v.label} on={v.id === variant} onPress={() => setVariant(v.id)} />
        ))}
      </PillScroller>
      <Card gap={6}>
        <T bold>{info.label}</T>
        <T muted small>{info.blurb}</T>
      </Card>
      <T muted small bold>Lands on</T>
      <Segmented value={rarity} onChange={setRarity} options={RARITIES.map((r) => ({ value: r, label: RARITY_LABELS[r] }))} />
      <T muted small bold>Speed</T>
      <Segmented value={speed} onChange={setSpeed} options={[{ value: 1, label: 'Normal' }, { value: 0.5, label: '½×' }, { value: 0.25, label: '¼×' }, { value: 0.1, label: '1/10×' }]} />
      <Pill label={slow ? 'Slow server (5 s): on' : 'Slow server (5 s): off'} on={slow} onPress={() => setSlow(!slow)} />
      <Button title="Play" icon={Play} onPress={play} />
      <Button
        title={used === variant ? 'In use in the garden' : 'Use this one in the garden (until the app restarts)'}
        icon={used === variant ? Check : Gift}
        variant="secondary"
        disabled={used === variant}
        onPress={() => {
          setBoxVariant(variant)
          setUsed(variant)
        }}
      />
      <View style={{ height: 8 }} />
      <Row2 />
      <BoxScene visible={open} variant={variant} species={species} onClose={() => setOpen(false)} buttonLabel="Close" timeScale={speed} />
    </Screen>
  )
}

function Row2() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Timer size={14} color="#8d94b8" />
      <T muted small>Build about 3 s, climax about 1 s. Tap during the build to skip the wait.</T>
    </View>
  )
}
