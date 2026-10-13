import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { Check, HeartPulse, RefreshCw } from 'lucide-react-native'
import { useRevokeToken, useTokens } from '@legity/data/queries'
import { confirm } from '../../../../lib/confirm'
import { manualSync } from '../../../../lib/healthSync'
import { HEALTH_NAME, IS_ANDROID } from '../../../../lib/health'
import { setBackgroundSync } from '../../../../background'
import * as BackgroundTask from 'expo-background-task'
import { backgroundEnabled, lastSync, onSynced, onSyncing, syncLog, type SyncLogEntry } from '../../../../lib/syncState'
import { SyncCoverage } from '../../../../components/SyncCoverage'
import { Button, Card, ErrorText, ListItem, PageHead, Row, Screen, Spinner, T, Toggle } from '../../../../components/ui'
import { useColors } from '../../../../lib/theme'

export default function Devices() {
  const router = useRouter()
  const c = useColors()
  const qc = useQueryClient()
  const tokens = useTokens()
  const revoke = useRevokeToken()
  const [busy, setBusy] = useState<'sync' | 'backfill' | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [bg, setBg] = useState(backgroundEnabled)
  const [bgError, setBgError] = useState<unknown>(null)
  const last = lastSync()
  const [log, setLog] = useState<SyncLogEntry[]>(syncLog)
  const [showLog, setShowLog] = useState(false)
  useEffect(() => {
    const refresh = () => setLog(syncLog())
    const offA = onSynced(refresh)
    const offB = onSyncing(refresh)
    refresh()
    return () => {
      offA()
      offB()
    }
  }, [])
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<unknown>(null)

  async function run(kind: 'sync' | 'backfill') {
    setBusy(kind)
    setError(null)
    setResult(null)
    try {
      const { segments } = await manualSync(kind === 'sync' ? 7 : 'all', kind === 'sync' ? 'devices-sync' : 'backfill', (done, total) =>
        setProgress(total > 1 ? `Sent ${done} of ${total} batches…` : null),
      )
      setResult(segments === 0 ? `No sleep found in ${HEALTH_NAME} for that period.` : `Synced ${segments} sleep records.`)
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

      <Card title={HEALTH_NAME} gap={12}>
        <Row>
          <HeartPulse size={22} color={c.accent} />
          <T style={{ flex: 1 }}>This app reads your sleep straight from {HEALTH_NAME}. No Shortcut needed.</T>
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
        <Row between>
          <View style={{ flex: 1 }}>
            <T bold>Sync in the background</T>
            <T muted small>{IS_ANDROID ? 'Your phone checks for new sleep about once an hour each morning, and whenever you open the app.' : 'Your phone sends new sleep as soon as Health records it, even with the app closed.'}</T>
          </View>
          <Toggle
            on={bg}
            label="Sync in the background"
            onChange={async (v) => {
              setBg(v)
              setBgError(null)
              try {
                await setBackgroundSync(v)
              } catch (e) {
                setBgError(e)
                setBg(!v)
              }
            }}
          />
        </Row>
        <ErrorText error={bgError} />
        {last && (
          <T muted small>
            Last automatic sync: {new Date(last.at).toLocaleString('en-AU')} ({last.reason}){last.ok ? '' : ` failed: ${last.error}`}
          </T>
        )}
        <T muted small>Syncing reads the last 7 days. Backfill reads your entire {HEALTH_NAME} sleep history and is safe to run more than once.</T>
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

      <Card title="Sync log" gap={10} right={<Text onPress={() => setShowLog((v) => !v)} style={{ color: c.accent, fontSize: 13 }}>{showLog ? 'Hide' : 'Show'}</Text>}>
        <T muted small>
          Every automatic sync attempt on this phone.{IS_ANDROID ? '' : ' iOS can’t read Apple Health while the phone is locked, so some attempts show as locked.'}
        </T>
        {showLog &&
          (log.length === 0 ? (
            <T muted small>Nothing yet.</T>
          ) : (
            log.slice(0, 25).map((e, i) => (
              <View key={`${e.at}-${i}`} style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ color: c.muted, fontFamily: 'Menlo', fontSize: 11, width: 92 }}>
                  {new Date(e.at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                </Text>
                <Text style={{ flex: 1, fontSize: 12, color: e.outcome === 'ok' ? c.teal : e.outcome === 'error' ? c.danger : c.muted }}>
                  {e.reason} · {e.outcome}
                  {e.segments != null ? ` · ${e.segments} samples` : ''}
                  {e.detail ? ` · ${e.detail}` : ''}
                </Text>
              </View>
            ))
          ))}
      </Card>

      {__DEV__ && (
        <Button
          title="Run the background task now (dev only)"
          variant="secondary"
          onPress={async () => {
            await BackgroundTask.triggerTaskWorkerForTestingAsync()
          }}
        />
      )}

    </Screen>
  )
}
