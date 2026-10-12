import { useParams } from 'react-router-dom'
import { addDays, todayISO } from '@legity/core/dates'
import { formatDuration } from '@legity/core/format'
import { SCORE_HISTORY_DAYS } from '@legity/core/score'
import { useMyNights, useNightSegments, useProfile } from '../hooks/queries'
import { Hypnogram } from '../components/Hypnogram'
import { clockTime } from '../components/NightPeek'
import { SleepScoreCard } from '../components/SleepScoreCard'
import { PageHead, Spinner } from '../components/ui'

const fullDate = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export function NightDetail() {
  const { date = todayISO() } = useParams()
  const profile = useProfile()
  const nights = useMyNights(addDays(date, -SCORE_HISTORY_DAYS), date)
  const segs = useNightSegments(date)

  if (!profile.data || nights.isLoading) return <div className="screen"><Spinner /></div>

  const history = nights.data ?? []
  const night = history.find((n) => n.night_date === date)
  if (!night) {
    return (
      <div className="screen stack">
        <PageHead title="Night" back />
        <p className="muted">No sleep recorded for {fullDate(date)}.</p>
      </div>
    )
  }

  const tz = night.timezone ?? profile.data.timezone
  const segments = segs.data ?? []
  const stageMin = (stage: string) =>
    segments.filter((s) => s.stage === stage).reduce((a, s) => a + (Date.parse(s.end) - Date.parse(s.start)) / 60_000, 0)
  const inBed = night.sleep_start && night.sleep_end ? (Date.parse(night.sleep_end) - Date.parse(night.sleep_start)) / 60_000 : null
  const stages = (['deep', 'rem', 'core'] as const)
    .map((k) => ({ k, label: { deep: 'Deep', rem: 'REM', core: 'Core' }[k], min: stageMin(k) }))
    .filter((s) => s.min > 0)

  return (
    <div className="screen stack">
      <PageHead title={fullDate(date)} back />

      <div className="card hero stack" style={{ gap: 10 }}>
        <p className="muted small">Asleep</p>
        <div className="big-num">{formatDuration(night.duration_min)}</div>
        <div className="chips">
          {night.sleep_score != null && <span className="chip">Score <b>{night.sleep_score}</b></span>}
          {night.restorative_min != null && <span className="chip">Restorative <b>{formatDuration(night.restorative_min)}</b></span>}
        </div>
      </div>

      {segments.length > 0 && (
        <div className="card stack" style={{ gap: 10 }}>
          <h2 style={{ marginBottom: 0 }}>Sleep stages</h2>
          <Hypnogram segments={segments} timeZone={tz} />
          {stages.length > 0 && (
            <div>
              {stages.map((s) => (
                <div key={s.k} className="kv">
                  <span className="muted">{s.label}</span>
                  <b>{formatDuration(s.min)} <span className="muted small">· {Math.round((s.min / night.duration_min) * 100)}%</span></b>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <SleepScoreCard night={night} history={history} timezone={tz ?? 'UTC'} />

      <div className="card">
        <h2>Details</h2>
        {night.sleep_start && <div className="kv"><span className="muted">Fell asleep</span><b>{clockTime(night.sleep_start, tz)}</b></div>}
        {night.sleep_end && <div className="kv"><span className="muted">Woke up</span><b>{clockTime(night.sleep_end, tz)}</b></div>}
        {inBed != null && <div className="kv"><span className="muted">Start to finish</span><b>{formatDuration(inBed)}</b></div>}
        {night.wake_count != null && <div className="kv"><span className="muted">Wake-ups</span><b>{night.wake_count}</b></div>}
        {night.awake_min != null && <div className="kv"><span className="muted">Time awake</span><b>{formatDuration(night.awake_min)}</b></div>}
        {tz && <div className="kv"><span className="muted">Timezone</span><b>{tz.replace('_', ' ')}</b></div>}
        <div className="kv"><span className="muted">Source</span><b style={{ textTransform: 'capitalize' }}>{night.source.replace('_', ' ')}</b></div>
      </div>
    </div>
  )
}
