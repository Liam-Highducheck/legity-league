import { Redirect, Stack } from 'expo-router'
import { GroupProvider } from '@legity/data/group'
import { useMyGroups, useProfile } from '@legity/data/queries'
import { Centered, ErrorText, Spinner } from '../../components/ui'
import { NoGroup } from '../../components/NoGroup'
import { useColors } from '../../lib/theme'

/** Main app: needs finished onboarding and at least one group (the web app's AppShell). */
function Gate() {
  const profile = useProfile()
  const groups = useMyGroups()
  const c = useColors()

  if (profile.isLoading || groups.isLoading) {
    return (
      <Centered>
        <Spinner />
      </Centered>
    )
  }
  if (profile.error || !profile.data) {
    return (
      <Centered>
        <ErrorText error={profile.error ?? new Error('Couldn’t load your profile.')} />
      </Centered>
    )
  }
  if (!profile.data.onboarded_at) return <Redirect href="/onboarding" />
  if ((groups.data ?? []).length === 0) return <NoGroup />

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'slide_from_right' }} />
}

export default function AppLayout() {
  return (
    <GroupProvider>
      <Gate />
    </GroupProvider>
  )
}
