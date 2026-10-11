import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Crown, DatabaseBackup, RefreshCw } from 'lucide-react'
import { addDays, formatDay, todayISO } from '../lib/dates'
import { formatDuration, formatMetric } from '../lib/format'
import { periodRange } from '../lib/periods'
import { runBackfillUrl, runShortcutUrl } from '../lib/shortcut'
import { daysSince } from '../lib/coverage'
import { LONG_SLEEP_MIN, leaderboard, nightsAtLeast } from '../lib/stats'
import { useGroup } from '../hooks/group'
import { useBlackout } from '../hooks/useBlackout'
import { useGroupNights, useMyNights, useProfile, useRoster } from '../hooks/queries'
import { useUserId } from '../hooks/auth'
import { BlackoutCard } from '../components/BlackoutCard'
import { SleepScoreCard } from '../components/SleepScoreCard'
import { GroupSwitcher } from '../components/GroupSwitcher'
import { Spinner } from '../components/ui'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Still up?'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function Today() {
  const nav = useNavigate()
  const uid = useUserId()
  const { group } = useGroup()
  const profile = useProfile()
  const blackout = useBlackout()

  const tz = profile.data?.timezone
  const today = todayISO(tz)
  const week = periodRange('week', 0, tz)
  const mine = useMyNights(addDays(today, -30), today)
  const roster = useRoster(group?.id)
  const weekNights = useGroupNights(group?.id, week.start, week.end)

  if (!profile.data || mine.isLoading) return <div className="screen"><Spinner /></div>

  const nights = mine.data ?? []
  const latest = nights[nights.length - 1]
  const prior = nights.slice(-8, -1)
  const priorAvg = prior.length ? prior.reduce((s, n) => s + n.duration_min, 0) / prior.length : null
  const delta = latest && priorAvg != null ? latest.duration_min - priorAvg : null

  const members = (roster.data ?? []).map((m) => ({ user_id: m.user_id, name: m.display_name }))
  const board = leaderboard(members, weekNights.data ?? [], 'duration', week.start, week.end)
  const ranked = board.filter((r) => r.avg != null)
  const myRank = ranked.findIndex((r) => r.user_id === uid)
  const leader = ranked[0]
  const longNights = nightsAtLeast(members, weekNights.data ?? [], LONG_SLEEP_MIN, week.start, week.end)[0]

  return (
    <div className="screen stack">
      <div className="row between">
        <div>
          <p className="muted">{greeting()},</p>
          <h1 style={{ fontSize: 28 }}>{profile.data.display_name}</h1>
        </div>
        <GroupSwitcher />
      </div>

      {latest ? (
        <div className="card hero stack" style={{ gap: 10 }}>
          <p className="muted small">{latest.night_date === today ? 'Last night' : `Night ending ${formatDay(latest.night_date)}`}</p>
          <div className="big-num">{formatDuration(latest.duration_min)}</div>
          <div className="chips">
            {latest.restorative_min != null && <span className="chip">Restorative <b>{formatDuration(latest.restorative_min)}</b></span>}
            {latest.score != null && <span className="chip">Score <b>{latest.score}</b></span>}
            {delta != null && (
              <span className="chip">
                <b className={delta >= 0 ? 'success' : ''} style={delta < 0 ? { color: 'var(--danger)' } : undefined}>
                  {delta >= 0 ? '+' : '−'}{formatDuration(Math.abs(delta))}
                </b>{' '}vs last 7
              </span>
            )}
          </div>
          {latest.night_date !== today && (
            <div className="row between">
              <p className="muted small">Today&apos;s sleep hasn&apos;t synced yet.</p>
              {profile.data.sleep_source !== 'manual' && (
                <a className="btn secondary small" href={runShortcutUrl('today-prompt')}>
                  <RefreshCw size={14} /> Sync now
                </a>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="card hero stack">
          <h2 style={{ marginBottom: 0 }}>No sleep yet</h2>
          <p className="muted">Connect your phone to sync automatically, or log last night by hand.</p>
          <Link className="btn" to="/me/devices">Set up auto-sync</Link>
        </div>
      )}

      {latest && profile.data.sleep_source !== 'manual' && daysSince(latest.night_date, today) > 5 && (
        <div className="notice stack" style={{ gap: 10 }}>
          <p>
            Your last synced night was <b>{daysSince(latest.night_date, today)} days ago</b>. The regular sync only reaches back 7
            days, so catch up with Backfill to recover the nights in between.
          </p>
          <div className="row">
            <a className="btn small" href={runBackfillUrl()}>
              <DatabaseBackup size={16} /> Run Backfill
            </a>
            <Link className="btn secondary small" to="/me/devices">Details</Link>
          </div>
        </div>
      )}

      {latest && <SleepScoreCard night={latest} history={nights} timezone={tz ?? 'UTC'} />}

      {blackout.active ? (
        <BlackoutCard state={blackout} />
      ) : (
        <>
          <div className="card">
            <h2>This week · {group?.name}</h2>
            {leader ? (
              <div className="stack" style={{ gap: 8 }}>
                <p>
                  <Crown size={18} color="var(--gold)" className="inline-icon" /> <b>{leader.name}</b> leads with{' '}
                  <b>{formatMetric('duration', leader.avg)}</b> avg
                </p>
                {myRank >= 0 ? (
                  <p className="muted">You&apos;re <b style={{ color: 'var(--text)' }}>#{myRank + 1}</b> of {ranked.length}</p>
                ) : (
                  <p className="muted">Log a night to get on the board.</p>
                )}
                {longNights && longNights.value > 0 && (
                  <p className="muted small">Most 8h+ nights: {longNights.name} ({longNights.value})</p>
                )}
              </div>
            ) : (
              <p className="muted">No nights logged this week yet.</p>
            )}
            <Link to="/league" className="small" style={{ display: 'inline-block', marginTop: 10 }}>Full rankings <ChevronRight size={14} className="inline-icon" /></Link>
          </div>
        </>
      )}

      <button className="btn secondary" onClick={() => nav('/log')}>Log a night manually</button>
    </div>
  )
}
