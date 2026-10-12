import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { LogOut, Trash2 } from 'lucide-react-native'
import { useProfile } from '@legity/data/queries'
import { supabase } from '../../../lib/supabase'
import { Button, Card, PageHead, Screen, T } from '../../../components/ui'

export default function Account() {
  const router = useRouter()
  const profile = useProfile()
  return (
    <Screen>
      <PageHead title="Account" back />
      <T muted>Signed in as <T bold>{profile.data?.display_name ?? '…'}</T>.</T>
      <Button title="Sign out" variant="secondary" icon={LogOut} onPress={() => supabase.auth.signOut()} />
      <View style={{ height: 16 }} />
      <Card title="Danger zone" gap={12}>
        <T muted>Deleting your account permanently removes your profile, your sleep data and your place in every group.</T>
        <Button title="Delete account" variant="danger" icon={Trash2} onPress={() => router.push('/me/delete-account')} />
      </Card>
    </Screen>
  )
}
