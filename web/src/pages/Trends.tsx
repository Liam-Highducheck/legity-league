import { useState } from 'react'
import { Moon } from 'lucide-react'
import { addDays, todayISO } from '../lib/dates'
import { formatDuration, formatMetric } from '../lib/format'
import { METRIC_LABELS, metricValue, type Metric } from '../lib/stats'
import { useGroup } from '../hooks/group'
import { useBlackout } from '../hooks/useBlackout'
import { useGroupNights, useMyNights, useProfile } from '../hooks/queries'
import { BarChart, type BarPoint } from '../components/BarChart'
import { GroupSwitcher } from '../components/GroupSwitcher'
import { PageHead, Segmented, Spinner } from '../components/ui'

export function Trends() {
  const { group } = useGroup()
  const profile = useProfile()
  const blackout = useBlackout()
  const [days, setDays] = useState(30)
  const [metric, setMetric] = useState<Metric>('duration')

  const today = todayISO(profile.data?.timezone)
  const start = addDays(today, -(days - 1))
  const mine = useMyNights(start, today)
  const groupNights = useGroupNights(group?.id, start, today)

  if (!profile.data || mine.isLoading) return <div className="screen"><Spinner /></div>

  const byDate = new Map((mine.data ?? []).map((n) => [n.night_date, n]))
  const dates = Array.from({ length: days }, (_, i) => addDays(start, i))
  const points: BarPoint[] = dates.map((d) => {
    const n = byDate.get(d)
    return { date: d, value: n ? metricValue(n, metric) : null }
  })

  const showGroup = !blackout.active && blackout.ready
  const line = showGroup
    ? dates.map((d) => {
        const vals = (groupNights.data ?? [])
          .filter((n) => n.night_date === d)
          .map((n) => metricValue(n, metric))
          .filter((v): v is number => v != null)
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
      })
    : undefined

  const vals = points.map((p) => p.value).filter((v): v is number => v != null)
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  const best = vals.length ? Math.max(...vals) : null
  const fmt = (v: number) => formatMetric(metric, v)
  const goal = metric === 'duration' ? 480 : undefined

  return (
    <div className="screen stack">
      <PageHead title="Trends" right={<GroupSwitcher />} />
      <Segmented
        value={days}
        onChange={setDays}
        options={[{ value: 7, label: '7 days' }, { value: 30, label: '30 days' }, { value: 90, label: '90 days' }]}
      />
      <Segmented
        value={metric}
        onChange={setMetric}
        options={(Object.keys(METRIC_LABELS) as Metric[]).map((m) => ({ value: m, label: METRIC_LABELS[m] }))}
      />

      <div className="card">
        {vals.length === 0 ? (
          <p className="muted center">No {METRIC_LABELS[metric].toLowerCase()} data in this range.</p>
        ) : (
          <BarChart data={points} line={line} goal={goal} format={fmt} />
        )}
        {showGroup && line && <p className="small muted" style={{ marginTop: 6 }}><span style={{ color: 'var(--gold)' }}>- - -</span> group average</p>}
      </div>

      <div className="row">
        <div className="card grow center">
          <p className="muted small">Average</p>
          <p className="value" style={{ fontSize: 22 }}>{avg == null ? '—' : fmt(avg)}</p>
        </div>
        <div className="card grow center">
          <p className="muted small">Best</p>
          <p className="value" style={{ fontSize: 22 }}>{best == null ? '—' : fmt(best)}</p>
        </div>
        <div className="card grow center">
          <p className="muted small">Nights</p>
          <p className="value" style={{ fontSize: 22 }}>{vals.length}</p>
        </div>
      </div>
      {metric === 'duration' && (
        <p className="muted small center">Teal bars hit 8h ({formatDuration(480)}).</p>
      )}
      {blackout.active && blackout.ready && (
        <p className="muted small center"><Moon size={14} className="inline-icon" /> Group comparison is hidden during blackout.</p>
      )}
    </div>
  )
}
