import { useState } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { useCreateGroup, useJoinGroup } from '@legity/data/queries'
import { useGroup } from '@legity/data/group'
import { Button, Card, ErrorText, Field, ListItem, PageHead, Screen, T } from '../../../../components/ui'

export default function Groups() {
  const router = useRouter()
  const { groups, setGroupId } = useGroup()
  const create = useCreateGroup()
  const join = useJoinGroup()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')

  return (
    <Screen>
      <PageHead title="Groups" back />
      <Card flush>
        <View>
          {groups.map((g, i) => (
            <ListItem key={g.id} last={i === groups.length - 1} onPress={() => router.push(`/me/groups/${g.id}`)}>
              <View style={{ flex: 1 }}>
                <T bold>{g.name}</T>
                <T muted small style={{ textTransform: 'capitalize' }}>{g.role}</T>
              </View>
            </ListItem>
          ))}
        </View>
      </Card>

      <Card title="Join another group" gap={14}>
        <Field value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder="Invite code" autoCapitalize="characters" autoCorrect={false} />
        <ErrorText error={join.error} />
        <Button
          title="Join"
          variant="secondary"
          busy={join.isPending}
          disabled={code.trim().length < 6}
          onPress={async () => {
            setGroupId(await join.mutateAsync(code.trim()))
            setCode('')
          }}
        />
      </Card>

      <Card title="Start a new group" gap={14}>
        <Field value={name} onChangeText={setName} placeholder="Group name" maxLength={60} />
        <ErrorText error={create.error} />
        <Button
          title="Create"
          variant="secondary"
          busy={create.isPending}
          disabled={!name.trim()}
          onPress={async () => {
            setGroupId(await create.mutateAsync(name))
            setName('')
          }}
        />
      </Card>
    </Screen>
  )
}
