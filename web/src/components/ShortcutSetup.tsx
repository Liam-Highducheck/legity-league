import { useEffect, useState } from 'react'
import { CircleCheck, Clock, Play, RefreshCw, TriangleAlert } from 'lucide-react'
import { SHORTCUT_URL, SUPABASE_ANON_KEY, SUPABASE_URL } from '../lib/supabase'
import { useCreateToken, useIngestEvents, useMyNights, useTokens } from '../hooks/queries'
import { formatDuration } from '../lib/format'
import { SHORTCUT_NAME, runShortcutUrl as runUrl } from '../lib/shortcut'
import { CopyButton, ErrorNote } from './ui'

const ENDPOINT = `${SUPABASE_URL}/rest/v1/rpc/ingest_sleep_segments`
const KEY_STORAGE = 'll_pending_key'


function readPendingKey(): string | null {
  try {
    return localStorage.getItem(KEY_STORAGE)
  } catch {
    return null
  }
}

function copy(text: string) {
  // Called synchronously inside a tap so Safari allows it; navigation continues regardless.
  void navigator.clipboard?.writeText(text).catch(() => {})
}

/** Key → add Shortcut → run once → check. Experimental triggers live in the last card. */
export function ShortcutSetup() {
  const createToken = useCreateToken()
  const tokens = useTokens()
  const events = useIngestEvents()
  const nights = useMyNights()
  const [key, setKey] = useState<string | null>(readPendingKey)

  const hasActiveToken = (tokens.data ?? []).some((t) => !t.revoked_at)
  const deviceNights = (nights.data ?? []).filter((n) => n.source !== 'manual')
  const latestNight = deviceNights[deviceNights.length - 1]
  const lastEvent = events.data?.[0]
  const connected = deviceNights.length > 0

  // Poll lightly while waiting for the first sync, so the screen flips by itself when it lands.
  const refetchAll = () => Promise.all([nights.refetch(), events.refetch(), tokens.refetch()])
  useEffect(() => {
    if (connected) {
      try {
        localStorage.removeItem(KEY_STORAGE)
      } catch {
        /* ignore */
      }
      return
    }
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void refetchAll()
    }, 6000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected])

  async function makeKey() {
    const k = await createToken.mutateAsync('iPhone Shortcut')
    setKey(k)
    try {
      localStorage.setItem(KEY_STORAGE, k)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="stack">
      <div className="card">
        <h2>1 · Create your key</h2>
        <p className="muted small" style={{ marginBottom: 12 }}>
          The key lets your iPhone send sleep to your account. Only you have it, and you can revoke it any time.
        </p>
        {key ? (
          <div className="stack">
            <div className="codebox mono">{key}</div>
            <CopyButton text={key} label="Copy key" />
          </div>
        ) : (
          <>
            <button className="btn block" disabled={createToken.isPending} onClick={makeKey}>
              {createToken.isPending ? 'Creating…' : hasActiveToken ? 'Create a new key' : 'Create my key'}
            </button>
            {hasActiveToken && <p className="muted small" style={{ marginTop: 8 }}>You already have a key, but for safety it can&apos;t be shown again.</p>}
          </>
        )}
        <ErrorNote error={createToken.error} />
      </div>

      <div className="card">
        <h2>2 · Add the Shortcut</h2>
        {SHORTCUT_URL ? (
          <div className="stack">
            <a
              className={`btn block ${key ? '' : 'disabled'}`}
              href={key ? SHORTCUT_URL : undefined}
              aria-disabled={!key}
              onClick={() => key && copy(key)}
            >
              Add to Shortcuts
            </a>
            <ol className="steps">
              <li>Tap the button. Your key is copied and the Shortcuts app opens.</li>
              <li>When it asks for your key, tap the field and choose <b>Paste</b>.</li>
              <li>Tap <b>Add Shortcut</b>.</li>
            </ol>
            {!key && <p className="muted small">Create your key first.</p>}
          </div>
        ) : (
          <p className="muted small">
            The shared Shortcut link isn&apos;t published yet. Build it from <code>docs/shortcut.md</code>, then set{' '}
            <code>VITE_SHORTCUT_URL</code>.
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
        <h2>3 · Run it once</h2>
        <div className="stack">
          <ol className="steps">
            <li>
              Once only: iPhone <b>Settings → Shortcuts → Advanced</b> and turn on <b>Allow Sharing Large Amounts of Data</b>.
              Without it iOS blocks sending your sleep.
            </li>
            <li>Run the shortcut. When asked, allow access to <b>Sleep</b> in Health.</li>
            <li>When it asks to send health samples to our server, choose <b>Always Allow</b> so it can run on its own later.</li>
          </ol>
          <a className="btn secondary block" href={runUrl('setup')}>
            <Play size={18} /> Run {SHORTCUT_NAME}
          </a>

          <StatusLine
            connected={connected}
            night={latestNight ? `${latestNight.night_date} · ${formatDuration(latestNight.duration_min)}` : null}
            lastEventAt={lastEvent?.created_at ?? null}
          />

          <button
            className="btn secondary"
            disabled={nights.isFetching || events.isFetching}
            onClick={() => void refetchAll()}
          >
            <RefreshCw size={18} /> {nights.isFetching ? 'Checking…' : 'Check now'}
          </button>
        </div>
      </div>

      <Experiments />
      <SyncHistory />
    </div>
  )
}

function StatusLine({ connected, night, lastEventAt }: { connected: boolean; night: string | null; lastEventAt: string | null }) {
  if (connected) {
    return (
      <p className="success">
        <CircleCheck size={18} className="inline-icon" /> Connected. Latest night: {night}
      </p>
    )
  }
  if (lastEventAt) {
    return (
      <p style={{ color: 'var(--gold)' }}>
        <TriangleAlert size={18} className="inline-icon" /> Your Shortcut checked in ({new Date(lastEventAt).toLocaleString('en-AU')}) but
        no sleep arrived. Check that Health access to Sleep is allowed, and that you have sleep recorded in the last 3 days.
      </p>
    )
  }
  return (
    <p className="muted">
      <Clock size={18} className="inline-icon" /> Haven&apos;t heard from your Shortcut yet.
    </p>
  )
}

const TRIGGERS: { label: string; title: string; how: string }[] = [
  { label: 'time', title: 'Time of day', how: 'Trigger: Time of Day, e.g. 8:00 AM, Daily.' },
  {
    label: 'open-app',
    title: 'When you open an app (recommended)',
    how: 'Trigger: App → pick apps you open every day (Messages, Safari…) → Is Opened. The phone is always unlocked at that moment. Legity League itself can’t be picked: iOS doesn’t list Home Screen web apps.',
  },
  { label: 'wake-up', title: 'Wake up', how: 'Trigger: Sleep → Wake Up.' },
]

function Experiments() {
  return (
    <div className="card">
      <h2>4 · Automatic sync (experiments)</h2>
      <p className="muted small" style={{ marginBottom: 10 }}>
        Apple doesn&apos;t let apps create automations, and Health data may be unreadable while the phone is locked. We&apos;re finding
        which trigger works reliably. Set up one or more, use them for a day or two, then check <b>Sync history</b> below.
      </p>
      <div className="stack">
        <div>
          <b>Run it from this app</b>
          <p className="muted small" style={{ margin: '4px 0 8px' }}>Opens Shortcuts, syncs, and you switch back. Works with the phone unlocked.</p>
          <a className="btn secondary small" href={runUrl('app-button')}>
            <Play size={16} /> Sync now
          </a>
        </div>
        {TRIGGERS.map((t) => (
          <details key={t.label}>
            <summary>{t.title}</summary>
            <ol className="steps" style={{ marginTop: 8 }}>
              <li>Shortcuts → <b>Automation</b> → <b>+</b>. {t.how}</li>
              <li>Choose <b>Run Immediately</b> (turn off notifications).</li>
              <li>Add the action <b>Text</b> and type <code>{t.label}</code>.</li>
              <li>Add <b>Run Shortcut</b> → {SHORTCUT_NAME}, with the <b>Text</b> as its input.</li>
            </ol>
          </details>
        ))}
      </div>
    </div>
  )
}

function SyncHistory() {
  const events = useIngestEvents()
  const rows = events.data ?? []
  return (
    <div className="card">
      <h2>Sync history</h2>
      {rows.length === 0 ? (
        <p className="muted small">Nothing yet. Each time your Shortcut checks in, it shows up here.</p>
      ) : (
        <div className="list">
          {rows.map((e) => (
            <div key={e.id} className="list-item" style={{ minHeight: 44 }}>
              <div className="grow">
                <b>{e.trigger_label ?? 'no label'}</b>
                <p className="muted small">{new Date(e.created_at).toLocaleString('en-AU')}</p>
              </div>
              <span className="muted small">{e.segment_count} segments · {e.nights_written} night{e.nights_written === 1 ? '' : 's'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
