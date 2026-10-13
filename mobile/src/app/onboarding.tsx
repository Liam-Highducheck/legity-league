import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Activity, ChevronLeft, HeartPulse, Smartphone, Watch, type LucideIcon } from 'lucide-react-native'
import { useQueryClient } from '@tanstack/react-query'
import { hhmm } from '@legity/core/format'
import { useProfile, useUpdateProfile } from '@legity/data/queries'
import { supabase } from '../lib/supabase'
import { manualSync } from '../lib/healthSync'
import { HEALTH_NAME, IS_ANDROID } from '../lib/health'
import { PROFILE_SOURCE } from '../lib/healthSource'
import { Button, Card, ErrorText, Field, Notice, Screen, SelectField, Spinner, T, TimeField, Row } from '../components/ui'
import { useColors } from '../lib/theme'

type Step = 'you' | 'source' | 'sleep' | 'connect'
type Source = 'apple_health' | 'manual' | 'garmin' | 'other'
const STEPS: Step[] = ['you', 'source', 'sleep', 'connect']

// Remember the step across reloads (e.g. an update restarting the app mid-onboarding).
const STEP_KEY = 'll_onb_step'
function readStep(): number {
  try {
    return Math.max(0, Number(localStorage.getItem(STEP_KEY)) || 0)
  } catch {
    return 0
  }
}
function saveStep(n: number) {
  try {
    localStorage.setItem(STEP_KEY, String(n))
  } catch {
    /* ignore */
  }
}

export default function Onboarding() {
  const router = useRouter()
  const c = useColors()
  const qc = useQueryClient()
  const profile = useProfile()
  const update = useUpdateProfile()
  const [i, setI] = useState(readStep)
  const [fullName, setFullName] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [source, setSource] = useState<Source | null>(null)
  const [bed, setBed] = useState<string | null>(null)
  const [wake, setWake] = useState<string | null>(null)
  const [lead, setLead] = useState<number | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<unknown>(null)

  if (!profile.data) return <Screen><Spinner /></Screen>
  const p = profile.data
  const chosenSource: Source = source ?? (p.sleep_source as Source | null) ?? (PROFILE_SOURCE as Source)
  const chosenLead = lead ?? p.blackout_lead_min
  const step = STEPS[Math.min(i, STEPS.length - 1)]
  const go = (n: number) => {
    const clamped = Math.min(Math.max(n, 0), STEPS.length - 1)
    saveStep(clamped)
    setI(clamped)
  }
  const next = () => go(i + 1)

  async function finish() {
    await update.mutateAsync({ onboarded_at: new Date().toISOString() })
    saveStep(0)
    await qc.invalidateQueries({ queryKey: ['profile'] })
    router.replace('/')
  }

  async function connect() {
    setSyncing(true)
    setSyncError(null)
    setSyncMsg(null)
    try {
      const { segments } = await manualSync(14, 'onboarding')
      setSyncMsg(segments === 0 ? `Connected, but ${HEALTH_NAME} has no recent sleep yet.` : `Synced ${segments} sleep records.`)
    } catch (e) {
      setSyncError(e)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <Pressable onPress={() => go(i - 1)} hitSlop={10} style={{ width: 70, flexDirection: 'row', alignItems: 'center', opacity: i === 0 ? 0 : 1 }} disabled={i === 0} accessibilityLabel="Previous step">
          <ChevronLeft size={22} color={c.accent} style={{ marginLeft: -4 }} />
          <Text style={{ color: c.accent, fontSize: 16 }}>Back</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {STEPS.map((s, idx) => (
            <View key={s} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: idx <= i ? c.accent : c.line }} />
          ))}
        </View>
        <View style={{ width: 70 }} />
      </View>

      {step === 'you' && (
        <>
          <Text style={{ color: c.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.56 }}>Who are you?</Text>
          <Field label="Your name" value={fullName ?? p.full_name ?? ''} onChangeText={setFullName} maxLength={80} autoComplete="name" />
          <Field label="Display name (shown everywhere in the league)" value={displayName ?? p.display_name} onChangeText={setDisplayName} maxLength={40} />
          <ErrorText error={update.error} />
          <Button
            title="Next"
            busy={update.isPending}
            disabled={!(displayName ?? p.display_name).trim()}
            onPress={async () => {
              await update.mutateAsync({
                display_name: (displayName ?? p.display_name).trim(),
                full_name: (fullName ?? p.full_name ?? '').trim() || null,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || p.timezone,
              })
              next()
            }}
          />
        </>
      )}

      {step === 'source' && (
        <>
          <Text style={{ color: c.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.56 }}>How do you track sleep?</Text>
          {(
            [
              IS_ANDROID
                ? [PROFILE_SOURCE as Source, Watch, 'Health Connect', 'Wear OS, Samsung, Fitbit, Garmin and others sync sleep into Health Connect. Best option.']
                : ['apple_health', Watch, 'Apple Watch / Apple Health', 'Syncs automatically from this phone. Best option.'],
              ['garmin', Activity, 'Garmin', `Works automatically if Garmin Connect writes sleep to ${HEALTH_NAME}. Otherwise log manually.`],
              ['manual', Smartphone, 'Something else / manual', 'Log bed and wake time yourself. Perfect for trying it out.'],
            ] as [Source, LucideIcon, string, string][]
          )
            .filter(([value]) => !(IS_ANDROID && value === 'garmin'))
            .map(([value, Icon, title, blurb]) => (
            <Pressable key={value} onPress={() => setSource(value)}>
              <View
                style={{
                  borderRadius: 18,
                  borderWidth: 1,
                  padding: 16,
                  borderColor: chosenSource === value ? c.accent : c.line,
                  backgroundColor: chosenSource === value ? c.accentSoft : c.surface,
                }}
              >
                <Row gap={12}>
                  <Icon size={28} color={c.accent} strokeWidth={1.7} />
                  <View style={{ flex: 1 }}>
                    <T bold>{title}</T>
                    <T muted small>{blurb}</T>
                  </View>
                </Row>
              </View>
            </Pressable>
          ))}
          <Button
            title="Next"
            busy={update.isPending}
            onPress={async () => {
              await update.mutateAsync({ sleep_source: chosenSource })
              next()
            }}
          />
        </>
      )}

      {step === 'sleep' && (
        <>
          <Text style={{ color: c.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.56 }}>Your sleep schedule</Text>
          <T muted>
            Rankings are hidden each evening so you&apos;re not checking scores in bed. Tell us when you aim to sleep and we&apos;ll hide them before then.
          </T>
          <Row>
            <TimeField label="Bedtime" value={bed ?? hhmm(p.target_bedtime)} onChange={setBed} />
            <TimeField label="Wake up" value={wake ?? hhmm(p.target_wake)} onChange={setWake} />
          </Row>
          <SelectField
            label="Hide rankings before bedtime"
            value={chosenLead}
            onChange={setLead}
            options={[60, 120, 180, 240, 300, 360].map((m) => ({ value: m, label: `${m / 60} hour${m > 60 ? 's' : ''} before` }))}
          />
          <T muted small>You can fine-tune this any time in Me → Blackout.</T>
          <ErrorText error={update.error} />
          <Button
            title="Next"
            busy={update.isPending}
            onPress={async () => {
              await update.mutateAsync({
                target_bedtime: bed ?? hhmm(p.target_bedtime),
                target_wake: wake ?? hhmm(p.target_wake),
                blackout_mode: 'bedtime',
                blackout_lead_min: chosenLead,
                blackout_enabled: true,
              })
              next()
            }}
          />
        </>
      )}

      {step === 'connect' && (
        <>
          {p.sleep_source === 'manual' ? (
            <>
              <Text style={{ color: c.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.56 }}>You&apos;re all set</Text>
              <Card>
                <T>Log each morning from the Today tab: wake date, time asleep, and optionally restorative minutes. Manual nights count for duration but have no sleep score.</T>
                <T muted small>You can switch to automatic {HEALTH_NAME} sync later in Me → Devices.</T>
              </Card>
            </>
          ) : (
            <>
              <Text style={{ color: c.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.56 }}>Connect your sleep</Text>
              {p.sleep_source === 'garmin' && (
                <Notice>
                  <T small>
                    First check Health → Browse → Sleep → Data Sources &amp; Access. If Garmin Connect is listed, continue. If not, choose manual logging instead (Me → Devices).
                  </T>
                </Notice>
              )}
              <Card gap={12}>
                <Row>
                  <HeartPulse size={22} color={c.accent} />
                  <T style={{ flex: 1 }}>Legity League reads your sleep from {HEALTH_NAME}. Only sleep is read, and nothing is ever written back.</T>
                </Row>
                <Button title={syncing ? 'Syncing…' : `Connect ${HEALTH_NAME}`} busy={syncing} onPress={connect} />
                {syncMsg && <T small color={c.teal}>{syncMsg}</T>}
                <ErrorText error={syncError} />
              </Card>
            </>
          )}
          <ErrorText error={update.error} />
          <Button title={update.isPending ? 'Finishing…' : 'Finish setup'} busy={update.isPending} onPress={finish} />
          <Button title="Sign out" variant="secondary" onPress={() => supabase.auth.signOut()} />
        </>
      )}
    </Screen>
  )
}
