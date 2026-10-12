import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { formatDuration, formatMetric } from '@legity/core/format'
import type { Metric } from '@legity/core/stats'
import type { SleepNight } from '@legity/core/types'

export type PeekRange = { from: string; to: string }

export const longDate = (iso: string, withYear = true) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) })

export function clockTime(iso: string | null, tz?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz ?? undefined })
}

export const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x != null)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

const HERO_LABEL: Record<Metric, string> = { duration: 'Asleep', restorative: 'Restorative', score: 'Sleep score' }
const heroValue = (n: SleepNight, m: Metric) => (m === 'duration' ? n.duration_min : m === 'restorative' ? n.restorative_min : n.sleep_score)

export function Stat({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className="peek-stat" style={wide ? { gridColumn: '1 / -1' } : undefined}>
      <p className="muted small">{label}</p>
      <b>{value}</b>
    </div>
  )
}

/** A small popup for a tapped bar: one night's headline numbers, or a summary when the bar covers several nights. */
export function NightPeek({
  range, nights, metric, onClose, onZoom,
}: {
  range: PeekRange | null
  nights: SleepNight[]
  metric: Metric
  onClose: () => void
  onZoom: (r: PeekRange) => void
}) {
  const nav = useNavigate()
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (range && !d.open) d.showModal()
    if (!range && d.open) d.close()
  }, [range])

  const inRange = range ? nights.filter((n) => n.night_date >= range.from && n.night_date <= range.to) : []
  const single = range && range.from === range.to ? inRange[0] : undefined
  const others = (['duration', 'restorative', 'score'] as Metric[]).filter((m) => m !== metric)

  const header = (kicker: string, title: string) => (
    <div className="row between" style={{ alignItems: 'flex-start' }}>
      <div>
        <p className="muted small">{kicker}</p>
        <h2 style={{ margin: 0 }}>{title}</h2>
      </div>
      <button className="icon-btn" aria-label="Close" onClick={onClose}><X size={20} /></button>
    </div>
  )

  return (
    <dialog ref={ref} className="peek" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      {range && single && (
        <div className="stack" style={{ gap: 14 }}>
          {header('Night ending', longDate(single.night_date))}

          <div>
            <p className="muted small">{HERO_LABEL[metric]}</p>
            <p className="big-num" style={{ fontSize: 40 }}>{formatMetric(metric, heroValue(single, metric))}</p>
            {metric === 'restorative' && single.deep_min != null && single.rem_min != null && (
              <div className="stack" style={{ gap: 6, marginTop: 8 }}>
                <div className="splitbar">
                  <i style={{ flex: single.deep_min, background: 'var(--chart-deep)' }} />
                  <i style={{ flex: single.rem_min, background: 'var(--chart-rem)' }} />
                </div>
                <p className="small muted">
                  <span style={{ color: 'var(--chart-deep)' }}>■</span> Deep {formatDuration(single.deep_min)} ·{' '}
                  <span style={{ color: 'var(--chart-rem)' }}>■</span> REM {formatDuration(single.rem_min)}
                </p>
              </div>
            )}
          </div>

          <div className="peek-grid">
            {others.map((m) => (
              <Stat key={m} label={HERO_LABEL[m]} value={formatMetric(m, heroValue(single, m))} />
            ))}
            {single.sleep_start && (
              <Stat wide label="Slept" value={`${clockTime(single.sleep_start, single.timezone)} – ${clockTime(single.sleep_end, single.timezone)}`} />
            )}
            {single.wake_count != null && <Stat label="Wake-ups" value={String(single.wake_count)} />}
          </div>

          <button className="btn block" onClick={() => { onClose(); nav(`/night/${single.night_date}`) }}>Full details</button>
        </div>
      )}
      {range && !single && (
        <div className="stack" style={{ gap: 14 }}>
          {header(`${inRange.length} night${inRange.length === 1 ? '' : 's'}`, `${longDate(range.from, false)} – ${longDate(range.to)}`)}
          <div>
            <p className="muted small">Average {HERO_LABEL[metric].toLowerCase()}</p>
            <p className="big-num" style={{ fontSize: 40 }}>
              {formatMetric(metric, avg(inRange.map((n) => heroValue(n, metric))))}
            </p>
          </div>
          <div className="peek-grid">
            {others.map((m) => (
              <Stat key={m} label={`Avg. ${HERO_LABEL[m].toLowerCase()}`} value={formatMetric(m, avg(inRange.map((n) => heroValue(n, m))))} />
            ))}
          </div>
          <button className="btn block" onClick={() => { onClose(); onZoom(range) }}>Zoom into this period</button>
        </div>
      )}
    </dialog>
  )
}
