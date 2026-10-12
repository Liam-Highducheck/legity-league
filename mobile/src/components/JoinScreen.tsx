import { useState } from 'react'
import { Text, View } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Moon } from 'lucide-react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from '@legity/data/auth'
import { Button, Card, ErrorText, Field, Heading, Muted, Screen, Segmented, Spinner, T } from './ui'
import { useColors } from '../lib/theme'

function useInviteCheck(code: string) {
  return useQuery({
    queryKey: ['invite-check', code],
    enabled: code.trim().length >= 6,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('check_invite', { p_code: code.trim() })
      if (error) throw new Error(error.message)
      return data?.[0] ?? { valid: false, group_name: null }
    },
  })
}

export function JoinScreen({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode.toUpperCase())
  const { session } = useAuth()
  const check = useInviteCheck(code)
  const valid = check.data?.valid === true
  const colors = useColors()

  return (
    <Screen gap={16}>
      <View style={{ alignItems: 'center', gap: 6, marginTop: 24 }}>
        <Moon size={44} color={colors.gold} strokeWidth={1.6} />
        <Heading>Join Legity League</Heading>
      </View>

      <Field
        label="Invite code"
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase().replace(/\s/g, ''))}
        autoCapitalize="characters"
        autoCorrect={false}
        spellCheck={false}
        placeholder="e.g. K7QX9M2P41AB"
      />

      {check.isFetching && <Spinner />}
      {!check.isFetching && code.trim().length >= 6 && check.data && !valid && (
        <ErrorText error="That invite isn't valid. It may have expired or been used up. Ask for a new one." />
      )}

      {valid && (
        <Card hero>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <T muted small>You&apos;re invited to</T>
            <Text style={{ color: colors.text, fontSize: 26, fontWeight: '700' }}>{check.data?.group_name ?? ''}</Text>
          </View>
        </Card>
      )}

      {valid && (session ? <JoinExisting code={code} /> : <JoinNew code={code} />)}

      {!session && (
        <View style={{ alignItems: 'center' }}>
          <Link href="/sign-in" style={{ color: colors.accent, fontSize: 15 }}>Back to sign in</Link>
        </View>
      )}
    </Screen>
  )
}

function JoinExisting({ code }: { code: string }) {
  const router = useRouter()
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  return (
    <View style={{ gap: 12 }}>
      <ErrorText error={error} />
      <Button
        title="Join this group"
        busy={busy}
        onPress={async () => {
          setBusy(true)
          setError(null)
          const { error } = await supabase.rpc('join_group', { p_code: code })
          setBusy(false)
          if (error) return setError(error)
          await qc.invalidateQueries({ queryKey: ['groups'] })
          router.replace('/')
        }}
      />
    </View>
  )
}

function JoinNew({ code }: { code: string }) {
  const router = useRouter()
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')
  const [fullName, setFullName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)

  const ready =
    email.trim() && password.length >= 8 && (mode === 'signin' || (fullName.trim() && displayName.trim()))

  async function submit() {
    setBusy(true)
    setError(null)
    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { invite_code: code, display_name: displayName.trim(), full_name: fullName.trim() } },
      })
      setBusy(false)
      if (error) {
        setError(/database error/i.test(error.message) ? 'That invite is no longer valid. Ask for a new one.' : error.message)
        return
      }
      if (data.session) router.replace('/')
      else setCheckEmail(true)
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (signInError) {
        setBusy(false)
        return setError(signInError.message)
      }
      const { error: joinError } = await supabase.rpc('join_group', { p_code: code })
      setBusy(false)
      if (joinError) return setError(joinError.message)
      router.replace('/')
    }
  }

  if (checkEmail) {
    return (
      <Card>
        <T bold>Check your email.</T>
        <Muted>Confirm your address, then come back and sign in. You&apos;ll already be in the group.</Muted>
      </Card>
    )
  }

  return (
    <View style={{ gap: 14 }}>
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'signup', label: 'New here' },
          { value: 'signin', label: 'I have an account' },
        ]}
      />
      {mode === 'signup' && (
        <>
          <Field label="Your name" value={fullName} onChangeText={setFullName} autoComplete="name" maxLength={80} />
          <Field
            label="Display name (what everyone sees)"
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={40}
          />
        </>
      )}
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
        label="Password (8+ characters)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        textContentType={mode === 'signup' ? 'newPassword' : 'password'}
      />
      {error && <ErrorText error={error} />}
      <Button
        title={mode === 'signup' ? 'Create account & join' : 'Sign in & join'}
        onPress={submit}
        busy={busy}
        disabled={!ready}
      />
    </View>
  )
}
