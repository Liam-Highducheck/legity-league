import { useState } from 'react'
import { Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { Check, HeartPulse, RefreshCw } from 'lucide-react-native'
import { useRevokeToken, useTokens } from '@legity/data/queries'
import { confirm } from '../../../../lib/confirm'
import { syncSleep } from '../../../../lib/healthSync'
import { SyncCoverage } from '../../../../components/SyncCoverage'
import { Button, Card, ErrorText, ListItem, PageHead, Row, Screen, Spinner, T } from '../../../../components/ui'
import { useColors } from '../../../../lib/theme'

export default function Devices() {
  const router = useRouter()
  const c = useColors()
  const qc = useQueryClient()
  const tokens = useTokens()
  const revoke = useRevokeToken()
  const [busy, setBusy] = useState<'sync' | 'backfill' | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<unknown>(null)

  async function run(kind: 'sync' | 'backfill') {
    setBusy(kind)
    setError(null)
    setResult(null)
    try {
      const { segments } = await syncSleep(kind === 'sync' ? 7 : 'all', kind === 'sync' ? 'devices-sync' : 'backfill', (done, total) =>
        setProgress(total > 1 ? `Sent ${done} of ${total} batches…` : null),
      )
      setResult(segments === 0 ? 'No sleep found in Apple Health for that period.' : `Synced ${segments} sleep records.`)
      await qc.invalidateQueries({ queryKey: ['my-nights'] })
      await qc.invalidateQueries({ queryKey: ['group-nights'] })
      await qc.invalidateQueries({ queryKey: ['tokens'] })
    } catch (e) {
      setError(e)
    } finally {
      setBusy(null)
      setProgress(null)
    }
  }

  return (
    <Screen>
      <PageHead title="Devices" back />

      <Card title="Apple Health" gap={12}>
        <Row>
          <HeartPulse size={22} color={c.accent} />
          <T style={{ flex: 1 }}>This app reads your sleep straight from Apple Health. No Shortcut needed.</T>
        </Row>
        <Button title="Sync now" icon={RefreshCw} busy={busy === 'sync'} disabled={busy != null} onPress={() => run('sync')} />
        {result && (
          <Row gap={6}>
            <Check size={16} color={c.teal} />
            <T small color={c.teal}>{result}</T>
          </Row>
        )}
        {progress && <T muted small>{progress}</T>}
        <ErrorText error={error} />
        <T muted small>Syncing reads the last 7 days. Backfill reads your entire Apple Health sleep history and is safe to run more than once.</T>
      </Card>

      <SyncCoverage backfilling={busy === 'backfill'} onBackfill={() => run('backfill')} />

      <Card title="Keys">
        {tokens.isLoading ? (
          <Spinner />
        ) : (tokens.data ?? []).length === 0 ? (
          <T muted>No keys yet. The app creates one the first time it syncs.</T>
        ) : (
          <View>
            {tokens.data!.map((t, i, arr) => (
              <ListItem key={t.id} chevron={false} last={i === arr.length - 1}>
                <View style={{ flex: 1 }}>
                  <T>
                    <T bold>{t.label}</T> <Text style={{ color: c.muted, fontFamily: 'Menlo', fontSize: 13 }}>{t.token_prefix}…</Text>
                  </T>
                  <T muted small>
                    {t.revoked_at ? 'Revoked' : t.last_used_at ? `Last used ${new Date(t.last_used_at).toLocaleString('en-AU')}` : 'Never used'}
                  </T>
                </View>
                {!t.revoked_at && (
                  <Button
                    small
                    variant="danger"
                    title="Revoke"
                    disabled={revoke.isPending}
                    onPress={async () => {
                      if (await confirm('Revoke this key?', 'Whatever is using it will stop syncing.', 'Revoke')) revoke.mutate(t.id)
                    }}
                  />
                )}
              </ListItem>
            ))}
          </View>
        )}
        <ErrorText error={revoke.error} />
      </Card>

      <Button title="Log a night manually" variant="secondary" onPress={() => router.push('/log')} />
    </Screen>
  )
}
