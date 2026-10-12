import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Send } from 'lucide-react'
import { PERIOD_LABELS, type PeriodKind } from '@legity/core/periods'
import { useGroup } from '@legity/data/group'
import {
  useClearWebhook,
  useGroupDiscord,
  useGroupSettings,
  useSaveGroupTimezone,
  useSendTestMessage,
  useSetWebhook,
  useUpdateDiscord,
} from '@legity/data/league'
import { ErrorNote, PageHead, Spinner, Toggle } from '../components/ui'

const POST_KINDS: { kind: PeriodKind; label: string }[] = [
  { kind: 'week', label: `${PERIOD_LABELS.week}ly` },
  { kind: 'fortnight', label: `${PERIOD_LABELS.fortnight}ly` },
  { kind: 'month', label: `${PERIOD_LABELS.month}ly` },
  { kind: 'season', label: 'Seasonal' },
]

const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'am' : 'pm'}`

function timeZones(current: string | null): string[] {
  const all = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
  const set = new Set(all)
  if (current) set.add(current)
  return [...set].sort()
}

export function DiscordSettings() {
  const { id = '' } = useParams()
  const { groups } = useGroup()
  const group = groups.find((g) => g.id === id)
  const isAdmin = group?.role === 'owner' || group?.role === 'admin'

  const discord = useGroupDiscord(id, isAdmin)
  const settings = useGroupSettings(id)
  const setWebhook = useSetWebhook()
  const clearWebhook = useClearWebhook()
  const update = useUpdateDiscord()
  const test = useSendTestMessage()
  const saveTz = useSaveGroupTimezone()
  const [url, setUrl] = useState('')
  const [tested, setTested] = useState(false)

  const head = <PageHead title="Discord" back />
  if (!group) return <div className="screen stack">{head}<p className="muted">You&apos;re not in this group.</p></div>
  if (!isAdmin) return <div className="screen stack">{head}<p className="muted">Only owners and admins can change Discord settings.</p></div>
  if (discord.isLoading || settings.isLoading) return <div className="screen stack">{head}<Spinner /></div>
  if (discord.error) return <div className="screen stack">{head}<ErrorNote error={discord.error} /></div>

  if (!discord.data?.available) {
    return (
      <div className="screen stack">
        {head}
        <div className="notice">
          Discord posting isn&apos;t switched on for this app yet. The database update for it (migration
          20261012090003) hasn&apos;t been applied, so ask Liam to run <code>supabase db push</code>.
        </div>
      </div>
    )
  }

  const row = discord.data.row
  const configured = !!row?.webhook_configured
  const invalid = row?.webhook_status === 'invalid'
  const kinds = row?.period_kinds ?? (['week', 'fortnight', 'month', 'season'] as PeriodKind[])
  const tz = settings.data?.timezone ?? null
  const error = setWebhook.error ?? clearWebhook.error ?? update.error ?? saveTz.error

  function toggleKind(kind: PeriodKind, on: boolean) {
    const next = on ? [...new Set([...kinds, kind])] : kinds.filter((k) => k !== kind)
    update.mutate({ groupId: id, periodKinds: next })
  }

  return (
    <div className="screen stack">
      {head}
      <p className="muted">
        Post this group&apos;s standings and broken records to a Discord channel in <b>{group.name}</b>.
      </p>

      {invalid && (
        <div className="notice">Discord says this webhook doesn&apos;t work any more (it may have been deleted). Paste a new one below.</div>
      )}

      <form
        className="card stack"
        onSubmit={(e) => {
          e.preventDefault()
          setWebhook.mutate({ groupId: id, url }, { onSuccess: () => setUrl('') })
        }}
      >
        <h2 style={{ marginBottom: 0 }}>Webhook</h2>
        <p className="muted small">
          In Discord: channel settings, Integrations, Webhooks, New Webhook, then Copy Webhook URL. Treat the URL like a password:
          anyone with it can post to that channel.
        </p>
        {configured && (
          <p>
            <span className={`status-dot ${invalid ? 'bad' : 'ok'}`} />
            Saved, ending in <code>…{row?.webhook_hint}</code>
          </p>
        )}
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://discord.com/api/webhooks/…"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Discord webhook URL"
        />
        <div className="row">
          <button className="btn grow" disabled={setWebhook.isPending || !url.trim()}>
            {setWebhook.isPending ? 'Saving…' : configured ? 'Replace webhook' : 'Save webhook'}
          </button>
          {configured && (
            <button
              type="button"
              className="btn danger"
              disabled={clearWebhook.isPending}
              onClick={() => window.confirm('Remove the webhook and stop posting to Discord?') && clearWebhook.mutate(id)}
            >
              Remove
            </button>
          )}
        </div>
      </form>

      <div className="card stack">
        <div className="row between">
          <div className="grow">
            <b>Post to Discord</b>
            <p className="muted small">Existing records are noted quietly when you switch this on, so only new ones are announced.</p>
          </div>
          <Toggle
            on={!!row?.enabled}
            label="Post to Discord"
            onChange={(v) => configured && update.mutate({ groupId: id, enabled: v })}
          />
        </div>
        {!configured && <p className="muted small">Save a webhook first.</p>}
      </div>

      <div className="card stack">
        <h2 style={{ marginBottom: 0 }}>What to post</h2>
        {POST_KINDS.map(({ kind, label }) => (
          <div key={kind} className="row between">
            <span>{label} standings</span>
            <Toggle on={kinds.includes(kind)} label={`${label} standings`} onChange={(v) => toggleKind(kind, v)} />
          </div>
        ))}
        <div className="row between">
          <span>Broken records</span>
          <Toggle on={row?.post_records ?? true} label="Broken records" onChange={(v) => update.mutate({ groupId: id, postRecords: v })} />
        </div>
        <div className="row between">
          <span>Championship results</span>
          <Toggle on={row?.post_championships ?? true} label="Championship results" onChange={(v) => update.mutate({ groupId: id, postChampionships: v })} />
        </div>
      </div>

      <div className="card stack">
        <h2 style={{ marginBottom: 0 }}>When</h2>
        <label className="field">
          Post standings at
          <select value={row?.post_hour ?? 9} onChange={(e) => update.mutate({ groupId: id, postHour: Number(e.target.value) })}>
            {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
          </select>
        </label>
        <label className="field">
          Group timezone
          <select value={tz ?? ''} disabled={tz == null} onChange={(e) => saveTz.mutate({ groupId: id, timezone: e.target.value })}>
            {tz == null && <option value="">Not available yet</option>}
            {timeZones(tz).map((z) => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}
          </select>
        </label>
        <p className="muted small">
          A period is posted the day after it ends, at this hour in the group timezone. Everyone&apos;s phone syncs on its own
          (set up the Shortcut automation), so nights that arrive after the post aren&apos;t added to it.
        </p>
      </div>

      <div className="card stack">
        <h2 style={{ marginBottom: 0 }}>Status</h2>
        <p className="small">
          Last post: <b>{row?.last_post_at ? new Date(row.last_post_at).toLocaleString('en-AU') : 'none yet'}</b>
        </p>
        {row?.last_error && (
          <p className="error">
            Last problem{row.last_error_at ? ` (${new Date(row.last_error_at).toLocaleString('en-AU')})` : ''}: {row.last_error}
          </p>
        )}
        <button
          className="btn secondary"
          disabled={!configured || test.isPending}
          onClick={() => {
            setTested(false)
            test.mutate(id, { onSuccess: () => setTested(true) })
          }}
        >
          <Send size={18} /> {test.isPending ? 'Sending…' : 'Send a test message'}
        </button>
        {tested && !test.error && <p className="success small">Sent. Check the channel.</p>}
        <ErrorNote error={test.error} />
        <p className="muted small">Posts are checked every 15 minutes.</p>
      </div>

      <ErrorNote error={error} />
    </div>
  )
}
