import { useState } from 'react'
import { Text, View } from 'react-native'
import { Trophy } from 'lucide-react-native'
import { useCreateGroup, useJoinGroup } from '@legity/data/queries'
import { useGroup } from '@legity/data/group'
import { supabase } from '../lib/supabase'
import { Button, Card, ErrorText, Field, Screen, T } from './ui'
import { useColors } from '../lib/theme'

export function NoGroup() {
  const c = useColors()
  const create = useCreateGroup()
  const join = useJoinGroup()
  const { setGroupId } = useGroup()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: 6, marginTop: 24 }}>
        <Trophy size={44} color={c.gold} strokeWidth={1.6} />
        <Text style={{ color: c.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 }}>Find your league</Text>
        <T muted style={{ textAlign: 'center' }}>A group is where you and your friends compete. Join one or start your own.</T>
      </View>

      <Card title="Join with a code" gap={14}>
        <Field value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder="Invite code" autoCapitalize="characters" autoCorrect={false} />
        <ErrorText error={join.error} />
        <Button
          title="Join"
          busy={join.isPending}
          disabled={code.trim().length < 6}
          onPress={async () => setGroupId(await join.mutateAsync(code.trim()))}
        />
      </Card>

      <Card title="Start a group" gap={14}>
        <Field value={name} onChangeText={setName} placeholder="Group name" maxLength={60} />
        <ErrorText error={create.error} />
        <Button title="Create group" busy={create.isPending} disabled={!name.trim()} onPress={async () => setGroupId(await create.mutateAsync(name))} />
      </Card>

      <Button title="Sign out" variant="secondary" onPress={() => supabase.auth.signOut()} />
    </Screen>
  )
}
