// Spike: prove we can read sleep from HealthKit and push it through the existing ingest_sleep_segments RPC.
// Throwaway UI. Real screens come after the spike works.
import { useEffect, useState } from 'react'
import { Button, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { todayISO } from '@legity/core/dates'
import {
  CategoryValueSleepAnalysis,
  isHealthDataAvailable,
  queryCategorySamples,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
const SLEEP = 'HKCategoryTypeIdentifierSleepAnalysis'
const TOKEN_KEY = 'ingest_token'

type Segment = { start: string; end: string; value: string }

const STAGE: Record<number, string> = {
  [CategoryValueSleepAnalysis.inBed]: 'In Bed',
  [CategoryValueSleepAnalysis.asleepUnspecified]: 'Asleep',
  [CategoryValueSleepAnalysis.awake]: 'Awake',
  [CategoryValueSleepAnalysis.asleepCore]: 'Core',
  [CategoryValueSleepAnalysis.asleepDeep]: 'Deep',
  [CategoryValueSleepAnalysis.asleepREM]: 'REM',
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Local ISO 8601 with the UTC offset (the server derives the local wake-up date from the offset). */
function toLocalIso(d: Date) {
  const off = -d.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  const abs = Math.abs(off)
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  )
}

export default function App() {
  const [token, setToken] = useState('')
  const [days, setDays] = useState('7')
  const [segments, setSegments] = useState<Segment[]>([])
  const [log, setLog] = useState<string[]>([])
  const say = (m: string) => setLog((l) => [`${new Date().toLocaleTimeString()}  ${m}`, ...l])

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY).then((t) => t && setToken(t))
  }, [])

  async function readSleep() {
    try {
      if (!isHealthDataAvailable()) return say('HealthKit not available on this device')
      await requestAuthorization({ toRead: [SLEEP] })
      const start = new Date(Date.now() - Number(days) * 86400_000)
      const samples = await queryCategorySamples(SLEEP, {
        limit: -1,
        ascending: true,
        filter: { date: { startDate: start } },
      })
      const segs = samples.map((s) => ({
        start: toLocalIso(s.startDate),
        end: toLocalIso(s.endDate),
        value: STAGE[s.value as number] ?? 'Asleep',
      }))
      setSegments(segs)
      say(`Read ${segs.length} sleep samples from the last ${days} days`)
    } catch (e) {
      say(`Read failed: ${String(e)}`)
    }
  }

  async function push() {
    try {
      if (!SUPABASE_URL || !ANON_KEY) return say('Missing EXPO_PUBLIC_SUPABASE_* env vars (see .env.example)')
      if (!token) return say('Paste your ingest token first')
      await SecureStore.setItemAsync(TOKEN_KEY, token)
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ingest_sleep_segments`, {
        method: 'POST',
        headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p_token: token,
          p_segments: segments,
          p_trigger: 'native-spike',
        }),
      })
      say(`Ingest ${res.status}: ${(await res.text()).slice(0, 400)}`)
    } catch (e) {
      say(`Push failed: ${String(e)}`)
    }
  }

  const input = { borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 10, fontSize: 16 }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: '700' }}>HealthKit spike</Text>
        <Text style={{ color: '#666' }}>Shared core says today is {todayISO()}</Text>
        <TextInput
          style={input}
          value={token}
          onChangeText={setToken}
          placeholder="Ingest token"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text>Days back</Text>
          <TextInput style={[input, { width: 70 }]} value={days} onChangeText={setDays} keyboardType="number-pad" />
        </View>
        <Button title="1. Read sleep from Health" onPress={readSleep} />
        <Button title={`2. Send ${segments.length} segments to Legity League`} onPress={push} disabled={!segments.length} />
        {segments.slice(-6).map((s, i) => (
          <Text key={i} style={{ fontFamily: 'Menlo', fontSize: 11 }}>
            {s.start} → {s.end.slice(11, 19)} {s.value}
          </Text>
        ))}
        {log.map((l, i) => (
          <Text key={i} style={{ fontSize: 12 }}>
            {l}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
