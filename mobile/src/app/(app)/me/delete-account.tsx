import { useState } from 'react'
import { View } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react-native'
import { useUserId } from '@legity/data/auth'
import { supabase } from '../../../lib/supabase'
import { confirm } from '../../../lib/confirm'
import { Button, Card, ErrorText, PageHead, Screen, T } from '../../../components/ui'
import { useColors } from '../../../lib/theme'

const TOKEN_KEY_PREFIX = 'll_ingest_token_'

export default function DeleteAccount() {
  const c = useColors()
  const uid = useUserId()
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  async function remove() {
    const ok = await confirm('Delete your account?', 'This permanently deletes your account and all of your sleep data. It can’t be undone.', 'Delete forever')
    if (!ok) return
    setBusy(true)
    setError(null)
    const { error } = await supabase.rpc('delete_my_account')
    if (error) {
      setBusy(false)
      return setError(error)
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY_PREFIX + uid).catch(() => {})
    // The auth user is gone, so only clear this device's session. The route guards then return to the sign-in screen.
    await supabase.auth.signOut({ scope: 'local' })
    qc.clear()
  }

  return (
    <Screen>
      <PageHead title="Delete account" back />
      <Card gap={12}>
        <T bold>This permanently deletes:</T>
        <T muted>• your profile and every night of sleep you’ve synced or logged</T>
        <T muted>• your sync keys and your place in every group</T>
        <T muted>• any group where you’re the only member</T>
        <T muted small>
          Records and podiums you earned disappear from your groups’ history. Nobody else’s data is touched.
        </T>
      </Card>
      <Card gap={8}>
        <T bold>If you own a group with other members</T>
        <T muted>
          Make someone else the owner first (Me → Groups → the group → a member → Make owner), or remove the members. Deleting is blocked until
          then, so a group is never left without an owner.
        </T>
      </Card>
      <T muted small>Sleep data stored in Apple Health on your phone isn’t affected.</T>
      <ErrorText error={error} />
      <View>
        <Button title={busy ? 'Deleting…' : 'Delete my account'} variant="danger" icon={Trash2} busy={busy} onPress={remove} />
      </View>
      <T muted small style={{ textAlign: 'center', color: c.muted }}>You’ll be signed out straight away.</T>
    </Screen>
  )
}
