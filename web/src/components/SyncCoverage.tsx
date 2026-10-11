import { useState } from 'react'
import { DatabaseBackup, Play } from 'lucide-react'
import { BACKFILL_SHORTCUT_URL } from '../lib/supabase'
import { addDays, formatShortDay, todayISO } from '../lib/dates'
import { COVERAGE_DAYS, REGULAR_WINDOW_DAYS, buildCoverage, missingBeyondWindow } from '../lib/coverage'
import { runBackfillUrl } from '../lib/shortcut'
import { useCreateToken, useMyNights, useProfile } from '../hooks/queries'
import { CopyButton, ErrorNote } from './ui'

/** Which of the last 30 nights have data, plus a backfill option for anything the regular sync can't reach. */
export function SyncCoverage() {
  const profile = useProfile()
  const today = todayISO(profile.data?.timezone)
  const nights = useMyNights(addDays(today, -(COVERAGE_DAYS - 1)), today)
  const [setup, setSetup] = useState(false)

  if (!profile.data || nights.isLoading) return null

  const cells = buildCoverage((nights.data ?? []).map((n) => n.night_date), today)
  const synced = cells.filter((c) => c.state === 'synced').length
  const missing = cells.filter((c) => c.state === 'missing').length
  const old = missingBeyondWindow(cells, today)

  return (
    <div className="card stack">
      <h2 style={{ marginBottom: 0 }}>Sync coverage</h2>
      <p>
        <b>{synced}</b> of the last {COVERAGE_DAYS} nights synced
        {missing > 0 && <span className="muted"> · {missing} without data</span>}
      </p>
      <div className="cov-grid" role="img" aria-label={`${synced} of ${COVERAGE_DAYS} nights synced`}>
        {cells.map((c) => (
          <div key={c.date} className={`cov-cell ${c.state}`} title={`${formatShortDay(c.date)}: ${c.state}`} />
        ))}
      </div>
      <div className="row small muted" style={{ gap: 14 }}>
        <span><i className="cov-key synced" /> Synced</span>
        <span><i className="cov-key missing" /> No data</span>
        <span><i className="cov-key pending" /> Today</span>
      </div>

      {old.length > 0 ? (
        <div className="notice stack" style={{ gap: 10 }}>
          <p>
            <b>{old.length} night{old.length === 1 ? '' : 's'}</b> older than {REGULAR_WINDOW_DAYS} days{' '}
            {old.length === 1 ? 'has' : 'have'} no data. The regular sync only reaches back {REGULAR_WINDOW_DAYS} days, so use
            Backfill to pull the last 14 days from Health. Anything older than that can&apos;t be recovered this way.
          </p>
          <a className="btn small" href={runBackfillUrl()}>
            <Play size={16} /> Run Backfill
          </a>
          {BACKFILL_SHORTCUT_URL && (
            <>
              <button className="btn secondary small" onClick={() => setSetup((v) => !v)}>
                <DatabaseBackup size={16} /> {setup ? 'Hide setup' : 'First time? Set up Backfill'}
              </button>
              {setup && <BackfillInstall />}
            </>
          )}
        </div>
      ) : (
        <p className="muted small">
          Nights without data are usually nights without your watch. The regular sync covers the last {REGULAR_WINDOW_DAYS} days
          automatically.
        </p>
      )}
    </div>
  )
}

/** Same copy-key-then-install flow as the main shortcut, for the one-off backfill shortcut. */
function BackfillInstall() {
  const create = useCreateToken()
  const [key, setKey] = useState<string | null>(null)
  return (
    <div className="stack" style={{ gap: 10 }}>
      {key ? (
        <>
          <div className="codebox mono">{key}</div>
          <CopyButton text={key} label="Copy key" />
          <a
            className="btn small"
            href={BACKFILL_SHORTCUT_URL}
            onClick={() => void navigator.clipboard?.writeText(key).catch(() => {})}
          >
            Add Backfill to Shortcuts
          </a>
          <p className="muted small">It copies your key; paste it when Shortcuts asks, then tap Add Shortcut. Choose Always Allow on first run.</p>
        </>
      ) : (
        <button
          className="btn secondary small"
          disabled={create.isPending}
          onClick={async () => setKey(await create.mutateAsync('Backfill shortcut'))}
        >
          {create.isPending ? 'Creating…' : 'Create a key for Backfill'}
        </button>
      )}
      <ErrorNote error={create.error} />
    </div>
  )
}
