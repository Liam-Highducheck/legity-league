import { useState } from 'react'
import { View } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { File } from 'expo-file-system'
import { useQueryClient } from '@tanstack/react-query'
import { Check, FileUp } from 'lucide-react-native'
import { useProfile } from '@legity/data/queries'
import { looksLikeSleepCycle, parseSleepCycleCsv, type SleepCycleImport } from '@legity/core/sleepcycle'
import { formatShortDay } from '@legity/core/dates'
import { appendSyncLog, emitSynced } from '../../../../lib/syncState'
import { uploadSegments } from '../../../../lib/healthSync'
import { Button, Card, ErrorText, PageHead, Row, Screen, Spinner, T } from '../../../../components/ui'
import { useColors } from '../../../../lib/theme'

export default function SleepCycleImport() {
  const c = useColors()
  const qc = useQueryClient()
  const profile = useProfile()
  const [found, setFound] = useState<SleepCycleImport | null>(null)
  const [fileName, setFileName] = useState('')
  const [progress, setProgress] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<unknown>(null)

  if (!profile.data) return <Screen><Spinner /></Screen>
  const tz = profile.data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone

  async function pick() {
    setError(null)
    setDone(false)
    setFound(null)
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false })
      if (res.canceled) return
      const asset = res.assets[0]
      const text = await new File(asset.uri).text()
      if (!looksLikeSleepCycle(text)) throw new Error('That doesn’t look like a Sleep Cycle export. In Sleep Cycle choose Settings → Export data and pick that file.')
      const parsed = parseSleepCycleCsv(text, tz)
      if (parsed.nights === 0) throw new Error('No nights with sleep were found in that file.')
      setFileName(asset.name)
      setFound(parsed)
    } catch (e) {
      setError(e)
    }
  }

  async function upload() {
    if (!found) return
    setBusy(true)
    setError(null)
    const started = Date.now()
    try {
      await uploadSegments(found.segments, 'sleep-cycle-import', (d, total) => setProgress(total > 1 ? `Sent ${d} of ${total} batches…` : null))
      appendSyncLog({ at: Date.now(), reason: 'sleep-cycle-import', outcome: 'ok', segments: found.segments.length, ms: Date.now() - started })
      emitSynced()
      await qc.invalidateQueries({ queryKey: ['my-nights'] })
      await qc.invalidateQueries({ queryKey: ['group-nights'] })
      setDone(true)
      setFound(null)
    } catch (e) {
      appendSyncLog({ at: Date.now(), reason: 'sleep-cycle-import', outcome: 'error', detail: e instanceof Error ? e.message : String(e), ms: Date.now() - started })
      setError(e)
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <Screen>
      <PageHead title="Import Sleep Cycle" back />

      <Card title="One-time history import" gap={10}>
        <T muted>
          Brings in the nights from a Sleep Cycle export, to fill in history from before your sleep started syncing. Existing
          nights are only replaced when the imported one is at least as long.
        </T>
        <View style={{ gap: 4 }}>
          <T muted small>1. In Sleep Cycle open Settings → Export data and save the file to your phone.</T>
          <T muted small>2. Choose it below.</T>
          <T muted small>Times are read in your time zone ({tz}). Nights count as phone-only (no sleep stages).</T>
        </View>
        <Button title="Choose Sleep Cycle file" icon={FileUp} disabled={busy} onPress={pick} />
      </Card>

      {found && (
        <Card gap={10}>
          <T>
            <T bold>{found.nights}</T> night{found.nights === 1 ? '' : 's'} in {fileName}, from <T bold>{formatShortDay(found.from!)}</T> to{' '}
            <T bold>{formatShortDay(found.to!)}</T>.
          </T>
          {found.skipped > 0 && <T muted small>{found.skipped} row{found.skipped === 1 ? '' : 's'} skipped (no sleep recorded).</T>}
          <Button title={`Import ${found.nights} night${found.nights === 1 ? '' : 's'}`} busy={busy} onPress={upload} />
          {progress && <T muted small>{progress}</T>}
        </Card>
      )}

      {done && (
        <Row gap={6}>
          <Check size={16} color={c.teal} />
          <T color={c.teal}>Imported. Nights shorter than 2 hours of sleep are not kept.</T>
        </Row>
      )}
      <ErrorText error={error} />
    </Screen>
  )
}
