import { useState } from 'react'
import { Check } from 'lucide-react-native'
import { useProfile, useUpdateProfile } from '@legity/data/queries'
import { Button, ErrorText, Field, PageHead, Screen, SelectField, Spinner, T } from '../../../components/ui'

function timezones(): string[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (k: string) => string[] }
  try {
    return intl.supportedValuesOf ? intl.supportedValuesOf('timeZone') : []
  } catch {
    return []
  }
}

export default function ProfileSettings() {
  const profile = useProfile()
  const update = useUpdateProfile()
  const [fullName, setFullName] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [tz, setTz] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  if (!profile.data) return <Screen><Spinner /></Screen>
  const p = profile.data
  const zones = timezones()
  const currentTz = tz ?? p.timezone

  return (
    <Screen>
      <PageHead title="Profile" back />
      <Field label="Your name" value={fullName ?? p.full_name ?? ''} onChangeText={setFullName} maxLength={80} autoComplete="name" />
      <Field label="Display name (shown everywhere)" value={displayName ?? p.display_name} onChangeText={setDisplayName} maxLength={40} />
      {zones.length ? (
        <SelectField
          label="Timezone"
          value={currentTz}
          onChange={setTz}
          options={[...(zones.includes(currentTz) ? [] : [currentTz]), ...zones].map((z) => ({ value: z, label: z }))}
        />
      ) : (
        <Field label="Timezone" value={currentTz} onChangeText={setTz} autoCapitalize="none" autoCorrect={false} />
      )}
      <T muted small>Your timezone decides which morning each night counts for, so keep it right when you travel.</T>
      <ErrorText error={update.error} />
      <Button
        title={update.isPending ? 'Saving…' : saved ? 'Saved' : 'Save'}
        icon={saved && !update.isPending ? Check : undefined}
        busy={update.isPending}
        disabled={!(displayName ?? p.display_name).trim()}
        onPress={async () => {
          setSaved(false)
          await update.mutateAsync({
            full_name: (fullName ?? p.full_name ?? '').trim() || null,
            display_name: (displayName ?? p.display_name).trim(),
            timezone: currentTz,
          })
          setSaved(true)
        }}
      />
    </Screen>
  )
}
