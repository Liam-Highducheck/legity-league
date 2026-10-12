import { ScrollView, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Button, ListItem, Popup, StatTile, T, Value } from './ui'
import { PopupHeader, longDate, type PeekRange } from './NightPeek'

export interface NightListSpec {
  title: string
  subtitle: string
  stats?: { label: string; value: string; wide?: boolean }[]
  rows: { date: string; primary: string; secondary?: string }[]
  zoom?: PeekRange
}

/** A popup listing nights (all of them, the ones that hit a target, or one streak), each opening its night page. */
export function NightList({ spec, onClose, onZoom }: { spec: NightListSpec | null; onClose: () => void; onZoom: (r: PeekRange) => void }) {
  const router = useRouter()
  return (
    <Popup visible={!!spec} onClose={onClose}>
      {spec && (
        <View style={{ gap: 14, flexShrink: 1 }}>
          <PopupHeader kicker={spec.subtitle} title={spec.title} onClose={onClose} />
          {spec.stats && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {spec.stats.map((s) => (
                <StatTile key={s.label} {...s} />
              ))}
            </View>
          )}
          <ScrollView style={{ maxHeight: 330 }} bounces={false}>
            {spec.rows.map((r, i) => (
              <ListItem key={r.date} last={i === spec.rows.length - 1} onPress={() => { onClose(); router.push(`/night/${r.date}`) }}>
                <View style={{ flex: 1 }}>
                  <T bold>{longDate(r.date, false)}</T>
                  {r.secondary ? <T muted small>{r.secondary}</T> : null}
                </View>
                <Value>{r.primary}</Value>
              </ListItem>
            ))}
            {spec.rows.length === 0 && <T muted style={{ textAlign: 'center' }}>No nights.</T>}
          </ScrollView>
          {spec.zoom && <Button title="Zoom into this period" onPress={() => { onClose(); onZoom(spec.zoom!) }} />}
        </View>
      )}
    </Popup>
  )
}
