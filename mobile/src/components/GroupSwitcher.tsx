import { useState } from 'react'
import { Pressable, Text } from 'react-native'
import { useRouter } from 'expo-router'
import { Check, ChevronDown } from 'lucide-react-native'
import { useGroup } from '@legity/data/group'
import { Chip, ListItem, Sheet } from './ui'
import { useColors } from '../lib/theme'

export function GroupSwitcher() {
  const { groups, group, setGroupId } = useGroup()
  const router = useRouter()
  const c = useColors()
  const [open, setOpen] = useState(false)
  if (!group) return null
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityLabel="Switch group">
        <Chip>
          <Text style={{ color: c.text, fontSize: 14, fontWeight: '600' }}>{group.name}</Text>
          <ChevronDown size={16} color={c.muted} />
        </Chip>
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title="Switch group">
        {groups.map((g) => (
          <ListItem
            key={g.id}
            chevron={false}
            onPress={() => {
              setGroupId(g.id)
              setOpen(false)
            }}
          >
            <Text style={{ color: c.text, fontSize: 17, flex: 1 }}>{g.name}</Text>
            {g.id === group.id && <Check size={20} color={c.accent} />}
          </ListItem>
        ))}
        <ListItem
          last
          onPress={() => {
            setOpen(false)
            router.push('/me/groups')
          }}
        >
          <Text style={{ color: c.accent, fontSize: 17, flex: 1 }}>Manage groups…</Text>
        </ListItem>
      </Sheet>
    </>
  )
}
