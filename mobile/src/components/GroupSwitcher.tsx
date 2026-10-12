import { Pressable, Text } from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronDown } from 'lucide-react-native'
import { useGroup } from '@legity/data/group'
import { Chip, DropdownMenu } from './ui'
import { useColors } from '../lib/theme'

const MANAGE = '__manage'

export function GroupSwitcher() {
  const { groups, group, setGroupId } = useGroup()
  const router = useRouter()
  const c = useColors()
  if (!group) return null
  return (
    <DropdownMenu
      align="right"
      minWidth={230}
      value={group.id}
      options={[...groups.map((g) => ({ value: g.id, label: g.name })), { value: MANAGE, label: 'Manage groups…', accent: true }]}
      onChange={(id) => (id === MANAGE ? router.push('/me/groups') : setGroupId(id))}
    >
      {(open) => (
        <Pressable onPress={open} accessibilityRole="button" accessibilityLabel="Switch group">
          <Chip>
            <Text style={{ color: c.text, fontSize: 14, fontWeight: '600' }}>{group.name}</Text>
            <ChevronDown size={16} color={c.muted} />
          </Chip>
        </Pressable>
      )}
    </DropdownMenu>
  )
}
