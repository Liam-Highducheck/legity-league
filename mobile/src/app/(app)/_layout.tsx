import { Redirect, Stack } from 'expo-router'
import { GroupProvider } from '@legity/data/group'
import { useMyGroups, useProfile } from '@legity/data/queries'
import { Centered, ErrorText, HeaderContext, Spinner } from '../../components/ui'
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

  // Pushed screens get a native header with a Back button that stays pinned while the content scrolls.
  return (
    <HeaderContext.Provider value>
      <Stack
        screenOptions={{
          headerShown: true,
          headerTitle: '',
          headerBackButtonDisplayMode: 'default',
          headerBackTitle: 'Back',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: c.bg },
          headerTintColor: c.accent,
          contentStyle: { backgroundColor: c.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* the garden's shop and goals are native form sheets: they rest at a detent, drag up to full height and swipe down to leave */}
        {(['garden-shop', 'garden-goals'] as const).map((name) => (
          <Stack.Screen
            key={name}
            name={name}
            options={{
              headerShown: false,
              presentation: 'formSheet',
              animation: 'default',
              sheetAllowedDetents: [0.62, 0.94],
              sheetInitialDetentIndex: 0,
              sheetGrabberVisible: true,
              sheetCornerRadius: 30,
              sheetExpandsWhenScrolledToEdge: true,
            }}
          />
        ))}
      </Stack>
    </HeaderContext.Provider>
  )
}

export default function AppLayout() {
  return (
    <GroupProvider>
      <Gate />
    </GroupProvider>
  )
}
