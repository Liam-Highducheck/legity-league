import { useState } from 'react'
import { useRouter } from 'expo-router'
import { addDays, todayISO } from '@legity/core/dates'
import { useProfile, useSaveManualNight } from '@legity/data/queries'
import { Button, DateField, ErrorText, Field, PageHead, Row, Screen } from '../../components/ui'

export default function LogNight() {
  const router = useRouter()
  const profile = useProfile()
  const save = useSaveManualNight()
  const today = todayISO(profile.data?.timezone)
  const [date, setDate] = useState(today)
  const [hours, setHours] = useState('7')
  const [mins, setMins] = useState('30')
  const [restorative, setRestorative] = useState('')

  const duration = Number(hours || 0) * 60 + Number(mins || 0)
  const valid = duration > 0 && duration <= 1440

  return (
    <Screen>
      <PageHead title="Log a night" back />
      <Row>
        <DateField label="Morning you woke up" value={date} max={today} onChange={(d) => setDate(d < addDays(today, -60) ? addDays(today, -60) : d)} />
      </Row>
      <Row>
        <Field grow label="Hours" keyboardType="number-pad" value={hours} onChangeText={setHours} maxLength={2} />
        <Field grow label="Minutes" keyboardType="number-pad" value={mins} onChangeText={setMins} maxLength={2} />
      </Row>
      <Field label="Restorative min (optional)" keyboardType="number-pad" value={restorative} onChangeText={setRestorative} maxLength={4} />
      <ErrorText error={save.error} />
      <Button
        title={save.isPending ? 'Saving…' : 'Save night'}
        busy={save.isPending}
        disabled={!valid}
        onPress={async () => {
          await save.mutateAsync({ night_date: date, duration_min: duration, restorative_min: restorative ? Number(restorative) : null })
          router.back()
        }}
      />
    </Screen>
  )
}

