import { useState } from 'react'
import { Text, View } from 'react-native'
import { Check, Moon } from 'lucide-react-native'
import { personalWindow, toMinutes } from '@legity/core/blackout'
import { hhmm, minutesToClock } from '@legity/core/format'
import type { Profile } from '@legity/core/types'
import { useForcedBlackout, useProfile, useUpdateProfile } from '@legity/data/queries'
import { Button, Card, CardTitle, ErrorText, Notice, PageHead, Row, Screen, Segmented, SelectField, Spinner, T, TimeField, Toggle } from '../../../components/ui'
import { useColors } from '../../../lib/theme'

export default function BlackoutSettings() {
  const profile = useProfile()
  const forced = useForcedBlackout()
  if (!profile.data) return <Screen><Spinner /></Screen>
  return <Form key={profile.data.updated_at} p={profile.data} forced={forced.data} />
}

function Form({ p, forced }: { p: Profile; forced: { enabled: boolean; start: string; end: string } | null | undefined }) {
  const c = useColors()
  const update = useUpdateProfile()
  const [enabled, setEnabled] = useState(p.blackout_enabled)
  const [mode, setMode] = useState<'bedtime' | 'fixed'>(p.blackout_mode as 'bedtime' | 'fixed')
  const [bed, setBed] = useState(hhmm(p.target_bedtime))
  const [wake, setWake] = useState(hhmm(p.target_wake))
  const [lead, setLead] = useState(p.blackout_lead_min)
  const [start, setStart] = useState(hhmm(p.blackout_start))
  const [end, setEnd] = useState(hhmm(p.blackout_end))
  const [saved, setSaved] = useState(false)

  const win = personalWindow({
    blackout_enabled: enabled,
    blackout_mode: mode,
    blackout_start: start,
    blackout_end: end,
    target_bedtime: bed,
    target_wake: wake,
    blackout_lead_min: lead,
  })

  return (
    <Screen>
      <PageHead title="Blackout" back />
      <T muted>
        Rankings and other people&apos;s sleep are hidden in the evening, so you don&apos;t go to bed stressing about a number. Your own data
        always stays visible.
      </T>

      {forced?.enabled && (
        <Notice>
          <Text style={{ color: c.text, fontSize: 14, lineHeight: 20 }}>
            <Moon size={16} color={c.text} /> The whole league also rests from <Text style={{ fontWeight: '600' }}>{minutesToClock(toMinutes(forced.start))}</Text> to{' '}
            <Text style={{ fontWeight: '600' }}>{minutesToClock(toMinutes(forced.end))}</Text> (your local time). That can&apos;t be turned off.
          </Text>
        </Notice>
      )}

      <Card gap={14}>
        <Row between>
          <View style={{ flex: 1 }}>
            <T bold>My own blackout</T>
            <T muted small>Adds to your group&apos;s blackout</T>
          </View>
          <Toggle on={enabled} onChange={setEnabled} label="Personal blackout" />
        </Row>

        <View style={{ marginTop: 6 }}><CardTitle>Sleep schedule</CardTitle></View>
        <Row>
          <TimeField label="Bedtime" value={bed} onChange={setBed} />
          <TimeField label="Wake up" value={wake} onChange={setWake} />
        </Row>

        {enabled && (
          <>
            <Segmented value={mode} onChange={setMode} options={[{ value: 'bedtime', label: 'Follow my bedtime' }, { value: 'fixed', label: 'Fixed times' }]} />
            {mode === 'bedtime' ? (
              <SelectField
                label="Start hiding before bedtime"
                value={lead}
                onChange={setLead}
                options={[0, 30, 60, 90, 120, 180, 240, 300, 360, 480].map((m) => ({
                  value: m,
                  label: m === 0 ? 'At bedtime' : m % 60 === 0 ? `${m / 60} hour${m > 60 ? 's' : ''} before` : `${m} minutes before`,
                }))}
              />
            ) : (
              <Row>
                <TimeField label="Hide from" value={start} onChange={setStart} />
                <TimeField label="Until" value={end} onChange={setEnd} />
              </Row>
            )}
            {win && (
              <T muted small>
                Hidden <T small bold>{minutesToClock(win.start)}</T> → <T small bold>{minutesToClock(win.end)}</T>
              </T>
            )}
          </>
        )}
      </Card>

      <ErrorText error={update.error} />
      <Button
        title={update.isPending ? 'Saving…' : saved ? 'Saved' : 'Save'}
        icon={saved && !update.isPending ? Check : undefined}
        busy={update.isPending}
        onPress={async () => {
          setSaved(false)
          await update.mutateAsync({
            blackout_enabled: enabled,
            blackout_mode: mode,
            blackout_lead_min: lead,
            blackout_start: start,
            blackout_end: end,
            target_bedtime: bed,
            target_wake: wake,
          })
          setSaved(true)
        }}
      />
    </Screen>
  )
}
