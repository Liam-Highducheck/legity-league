import { View } from 'react-native'
import { Check } from 'lucide-react-native'
import { Card, ListItem, PageHead, Screen, T } from '../../../components/ui'
import { useColors, useTheme, type ThemeName } from '../../../lib/theme'

const options: { value: ThemeName; label: string; hint: string; swatch: string[] }[] = [
  { value: 'default', label: 'Midnight', hint: 'Dark with purple accents', swatch: ['#0b0d1a', '#151a2e', '#8b7cff', '#5eead4'] },
  { value: 'ember', label: 'Ember', hint: 'Dark with red accents', swatch: ['#0f0a0c', '#1a1216', '#e5484d', '#5eead4'] },
  { value: 'red', label: 'Red only', hint: 'Shades of red on black, for a red colour filter', swatch: ['#080000', '#260000', '#8a0000', '#ff0000'] },
]

export default function Appearance() {
  const c = useColors()
  const { name, setTheme } = useTheme()
  return (
    <Screen>
      <PageHead title="Appearance" back />
      <Card flush>
        <View>
          {options.map((o, i) => (
            <ListItem key={o.value} chevron={false} last={i === options.length - 1} onPress={() => setTheme(o.value)}>
              <View style={{ flexDirection: 'row', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: c.line }}>
                {o.swatch.map((col) => (
                  <View key={col} style={{ width: 14, height: 36, backgroundColor: col }} />
                ))}
              </View>
              <View style={{ flex: 1 }}>
                <T bold>{o.label}</T>
                <T muted small>{o.hint}</T>
              </View>
              {name === o.value && <Check size={20} color={c.accent} />}
            </ListItem>
          ))}
        </View>
      </Card>
      <T muted small>Saved on this device only.</T>
    </Screen>
  )
}
