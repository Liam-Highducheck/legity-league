import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Moon } from 'lucide-react-native'
import { supabase } from '../lib/supabase'
import { Button, ErrorText, Field, Heading, Screen, Stack, T } from '../components/ui'
import { useColors } from '../lib/theme'

export default function SignIn() {
  const router = useRouter()
  const c = useColors()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  async function submit() {
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setError(error)
    // On success the session listener flips the route guards and the app takes over.
  }

  return (
    <Screen padTop={false}>
      <View style={{ height: 56 }} />
      <View style={{ alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <Moon size={52} color={c.gold} strokeWidth={1.6} />
        <Text style={{ color: c.text, fontSize: 32, fontWeight: '700', letterSpacing: -0.64 }}>Legity League</Text>
        <T muted>Sleep like you mean it.</T>
      </View>
      <Stack>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          textContentType="emailAddress"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={submit}
        />
        <ErrorText error={error} />
        <Button title={busy ? 'Signing in…' : 'Sign in'} onPress={submit} busy={busy} disabled={!email || !password} />
      </Stack>
      <View style={{ alignItems: 'center' }}>
        <T muted>
          Got an invite?{' '}
          <Text style={{ color: c.accent }} onPress={() => router.push('/join')}>
            Join with a code
          </Text>
        </T>
      </View>
    </Screen>
  )
}
