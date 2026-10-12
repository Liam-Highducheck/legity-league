import { Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Medal, Moon, Palette, Smartphone, User, Users, type LucideIcon } from 'lucide-react-native'
import Constants from 'expo-constants'
import { useUserId } from '@legity/data/auth'
import { useProfile } from '@legity/data/queries'
import { memberPath } from '@legity/core/links'
import { supabase } from '../../../lib/supabase'
import { Avatar, Button, Card, ListItem, PageHead, Row, Screen, Spinner, T } from '../../../components/ui'
import { useColors } from '../../../lib/theme'

const items: { to: string; Icon: LucideIcon; label: string; hint: string }[] = [
  { to: '/me/profile', Icon: User, label: 'Profile', hint: 'Names and timezone' },
  { to: '/me/blackout', Icon: Moon, label: 'Blackout & sleep schedule', hint: 'When rankings rest' },
  { to: '/me/appearance', Icon: Palette, label: 'Appearance', hint: 'Colour theme' },
  { to: '/me/devices', Icon: Smartphone, label: 'Devices & auto-sync', hint: 'Apple Health, keys, manual logging' },
  { to: '/me/groups', Icon: Users, label: 'Groups', hint: 'Members, invites, roles' },
]

export default function Me() {
  const router = useRouter()
  const c = useColors()
  const profile = useProfile()
  const uid = useUserId()
  if (!profile.data) {
    return (
      <Screen tabs>
        <Spinner />
      </Screen>
    )
  }
  return (
    <Screen tabs>
      <PageHead title="Me" />
      <Card>
        <Row>
          <Avatar name={profile.data.display_name} />
          <View style={{ flex: 1 }}>
            <T bold>{profile.data.display_name}</T>
            <T muted small>{profile.data.full_name ?? 'Add your name in Profile'}</T>
          </View>
        </Row>
      </Card>
      <Button title="View my stats, podiums and records" variant="secondary" icon={Medal} onPress={() => router.push(memberPath(uid) as never)} />
      <Card flush>
        <View>
          {items.map(({ Icon, ...i }, idx) => (
            <ListItem key={i.to} last={idx === items.length - 1} onPress={() => router.push(i.to as never)}>
              <Icon size={22} color={c.accent} />
              <View style={{ flex: 1 }}>
                <T bold>{i.label}</T>
                <T muted small>{i.hint}</T>
              </View>
            </ListItem>
          ))}
        </View>
      </Card>
      <Button title="Sign out" variant="secondary" onPress={() => supabase.auth.signOut()} />
      <T muted small style={{ textAlign: 'center' }}>Legity League · v{Constants.expoConfig?.version ?? '0.1'}</T>
    </Screen>
  )
}
