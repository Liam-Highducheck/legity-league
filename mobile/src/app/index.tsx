import { View } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useMyGroups, useProfile } from '../hooks/queries'
import { Button, Card, ErrorText, Heading, Muted, Screen, Spinner } from '../components/ui'
import { colors } from '../lib/theme'

// Placeholder home: proves sign-in works end to end. The real Today/League tabs come next.
export default function Home() {
  const router = useRouter()
  const qc = useQueryClient()
  const profile = useProfile()
  const groups = useMyGroups()

  return (
    <Screen>
      <Heading>{profile.data ? `Hi, ${profile.data.display_name}` : 'Legity League'}</Heading>
      {(profile.isLoading || groups.isLoading) && <Spinner />}
      <ErrorText error={profile.error ?? groups.error} />
      {(groups.data ?? []).map((g) => (
        <Card key={g.id}>
          <Heading>{g.name}</Heading>
          <Muted>{g.role}</Muted>
        </Card>
      ))}
      {groups.data?.length === 0 && (
        <Card>
          <Muted>You&apos;re not in a group yet.</Muted>
          <Link href="/join" style={{ color: colors.accent, fontSize: 16 }}>Join with an invite code</Link>
        </Card>
      )}
      <View style={{ gap: 12, marginTop: 8 }}>
        <Button title="HealthKit spike" variant="secondary" onPress={() => router.push('/health-spike')} />
        <Button
          title="Sign out"
          variant="secondary"
          onPress={async () => {
            await supabase.auth.signOut()
            qc.clear()
          }}
        />
      </View>
    </Screen>
  )
}
