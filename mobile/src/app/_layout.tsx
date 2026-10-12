import '../lib/supabase'
import { useEffect, useRef } from 'react'
import { DarkTheme, Stack, ThemeProvider as NavThemeProvider, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from '@legity/data/auth'
import { Centered, Spinner } from '../components/ui'
import { ThemeProvider, useColors } from '../lib/theme'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <Routes />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}

function Routes() {
  const { session, loading } = useAuth()
  const router = useRouter()
  const c = useColors()
  const wasSignedIn = useRef<boolean | null>(null)

  // When the session appears or disappears, reset the stack: signing in must land on the dashboard (not on a join
  // screen left in the stack) and signing out must land on a clean sign-in screen.
  const signedInNow = !!session
  useEffect(() => {
    if (loading) return
    const was = wasSignedIn.current
    wasSignedIn.current = signedInNow
    if (was === null || was === signedInNow) return
    queryClient.clear() // never show one account's cached data to the next
    router.replace(signedInNow ? '/' : '/sign-in')
  }, [loading, signedInNow, router])

  // The navigator's default theme is light; its background shows in the corners while a screen slides.
  const navTheme = {
    ...DarkTheme,
    colors: { ...DarkTheme.colors, background: c.bg, card: c.bg, border: c.line, primary: c.accent, text: c.text },
  }
  if (loading) {
    return (
      <Centered>
        <Spinner />
      </Centered>
    )
  }
  const signedIn = !!session
  return (
    <NavThemeProvider value={navTheme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'slide_from_right' }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(app)" options={{ animation: 'none' }} />
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        </Stack.Protected>
        {/* Invite links work signed in or out, so these aren't guarded. */}
        <Stack.Screen name="join/index" />
        <Stack.Screen name="join/[code]" />
      </Stack>
    </NavThemeProvider>
  )
}
