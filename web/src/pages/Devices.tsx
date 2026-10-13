import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRevokeToken, useTokens } from '@legity/data/queries'
import { ShortcutSetup } from '../components/ShortcutSetup'
import { SyncCoverage } from '../components/SyncCoverage'
import { ErrorNote, PageHead, Spinner } from '../components/ui'

export function Devices() {
  const nav = useNavigate()
  const tokens = useTokens()
  const revoke = useRevokeToken()
  const [setup, setSetup] = useState(false)

  return (
    <div className="screen stack">
      <PageHead title="Devices" back />

      {setup ? (
        <>
          <ShortcutSetup />
          <button className="btn secondary" onClick={() => setSetup(false)}>Done</button>
        </>
      ) : (
        <button className="btn" onClick={() => setSetup(true)}>Set up Apple Health auto-sync</button>
      )}

      <SyncCoverage />

      <div className="card">
        <h2>Keys</h2>
        {tokens.isLoading ? (
          <Spinner />
        ) : (tokens.data ?? []).length === 0 ? (
          <p className="muted">No keys yet.</p>
        ) : (
          <div className="list">
            {tokens.data!.map((t) => (
              <div key={t.id} className="list-item">
                <div className="grow">
                  <b>{t.label}</b> <span className="mono muted">{t.token_prefix}…</span>
                  <p className="muted small">
                    {t.revoked_at
                      ? 'Revoked'
                      : t.last_used_at
                        ? `Last used ${new Date(t.last_used_at).toLocaleString('en-AU')}`
                        : 'Never used'}
                  </p>
                </div>
                {!t.revoked_at && (
                  <button
                    className="btn danger small"
                    disabled={revoke.isPending}
                    onClick={() => window.confirm('Revoke this key? The Shortcut using it will stop syncing.') && revoke.mutate(t.id)}
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <ErrorNote error={revoke.error} />
      </div>

      <button className="btn secondary" onClick={() => nav('/me/devices/import')}>Import full history</button>
    </div>
  )
}
