import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from '../hooks/auth'
import { Centered, Spinner } from '../components/ui'
import { colors } from '../lib/theme'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="light" />
          <Routes />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}

function Routes() {
  const { session, loading } = useAuth()
  if (loading) {
    return (
      <Centered>
        <Spinner />
      </Centered>
    )
  }
  const signedIn = !!session
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="index" />
        <Stack.Screen name="health-spike" />
      </Stack.Protected>
      {/* Invite links work signed in or out, so these aren't guarded. */}
      <Stack.Screen name="join/index" />
      <Stack.Screen name="join/[code]" />
    </Stack>
  )
}
