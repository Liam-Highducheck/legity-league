import { useState } from 'react'
import { CircleCheck } from 'lucide-react'
import { SHORTCUT_URL, SUPABASE_ANON_KEY, SUPABASE_URL } from '../lib/supabase'
import { useCreateToken, useMyNights } from '../hooks/queries'
import { formatDuration } from '../lib/format'
import { CopyButton, ErrorNote } from './ui'

const ENDPOINT = `${SUPABASE_URL}/rest/v1/rpc/ingest_sleep_segments`

/** Walks someone through: key → add Shortcut → automation → first sync. */
export function ShortcutSetup() {
  const createToken = useCreateToken()
  const [token, setToken] = useState<string | null>(null)
  const nights = useMyNights()
  // Poll for the first device-sourced night once a key exists.
  const synced = (nights.data ?? []).filter((n) => n.source !== 'manual')
  const latest = synced[synced.length - 1]

  async function refresh() {
    await nights.refetch()
  }

  return (
    <div className="stack">
      <div className="card">
        <h2>1 · Your key</h2>
        <p className="muted small" style={{ marginBottom: 12 }}>
          This key lets your iPhone send sleep to your account. It&apos;s shown once, so copy it before leaving.
        </p>
        {token ? (
          <div className="stack">
            <div className="codebox mono">{token}</div>
            <CopyButton text={token} label="Copy key" />
          </div>
        ) : (
          <button
            className="btn block"
            disabled={createToken.isPending}
            onClick={async () => setToken(await createToken.mutateAsync('iPhone Shortcut'))}
          >
            {createToken.isPending ? 'Creating…' : 'Create my key'}
          </button>
        )}
        <ErrorNote error={createToken.error} />
      </div>

      <div className="card">
        <h2>2 · Add the Shortcut</h2>
        {SHORTCUT_URL ? (
          <div className="stack">
            <p className="muted small">
              Tap below, then choose <b>Add Shortcut</b>. When it asks for your key, paste it.
            </p>
            <a className="btn block" href={SHORTCUT_URL}>
              Get the Shortcut
            </a>
          </div>
        ) : (
          <p className="muted small">
            The shared Shortcut link isn&apos;t published yet. Until it is, build it from the recipe in the repo
            (<code>docs/shortcut.md</code>) using the details below.
          </p>
        )}
        <details>
          <summary>Advanced: endpoint details</summary>
          <div className="stack" style={{ marginTop: 8 }}>
            <p className="small muted">URL (POST)</p>
            <div className="codebox mono">{ENDPOINT}</div>
            <CopyButton text={ENDPOINT} label="Copy URL" />
            <p className="small muted">Header <code>apikey</code></p>
            <div className="codebox mono">{SUPABASE_ANON_KEY}</div>
            <CopyButton text={SUPABASE_ANON_KEY} label="Copy apikey" />
          </div>
        </details>
      </div>

      <div className="card">
        <h2>3 · Make it automatic</h2>
        <ol className="steps">
          <li>Open the <b>Shortcuts</b> app → <b>Automation</b> tab → <b>+</b> → <b>Time of Day</b>.</li>
          <li>Pick a time after you wake up (for example 8:00am), set it to <b>Daily</b>.</li>
          <li>Choose <b>Run Shortcut</b> and select the Legity League shortcut.</li>
          <li>
            Turn on <b>Run Immediately</b> and turn off <b>Notify When Run</b>. Without this it asks you to tap every
            morning.
          </li>
        </ol>
      </div>

      <div className="card">
        <h2>4 · Run it once</h2>
        <p className="muted small" style={{ marginBottom: 12 }}>
          Run the Shortcut manually. iPhone will ask for access to Sleep in Health the first time: tap <b>Allow</b>.
        </p>
        {latest ? (
          <p className="success">
            <CircleCheck size={18} className="inline-icon" /> Connected. Latest night: {latest.night_date} · {formatDuration(latest.duration_min)}
          </p>
        ) : (
          <div className="stack">
            <p className="muted small">Waiting for your first night to arrive…</p>
            <button className="btn secondary" onClick={refresh} disabled={nights.isFetching}>
              {nights.isFetching ? 'Checking…' : 'Check now'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
