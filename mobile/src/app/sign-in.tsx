import { useState } from 'react'
import { View } from 'react-native'
import { Link } from 'expo-router'
import { Moon } from 'lucide-react-native'
import { supabase } from '../lib/supabase'
import { Button, ErrorText, Field, Heading, Muted, Screen } from '../components/ui'
import { colors } from '../lib/theme'

export default function SignIn() {
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
    // On success the session listener flips the route guards and the app screen takes over.
  }

  return (
    <Screen gap={16}>
      <View style={{ alignItems: 'center', gap: 6, marginTop: 40, marginBottom: 12 }}>
        <Moon size={52} color={colors.gold} strokeWidth={1.6} />
        <Heading>Legity League</Heading>
        <Muted>Sleep like you mean it.</Muted>
      </View>
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
      <Button title="Sign in" onPress={submit} busy={busy} disabled={!email || !password} />
      <View style={{ alignItems: 'center' }}>
        <Muted>
          Got an invite? <Link href="/join" style={{ color: colors.accent }}>Join with a code</Link>
        </Muted>
      </View>
    </Screen>
  )
}
