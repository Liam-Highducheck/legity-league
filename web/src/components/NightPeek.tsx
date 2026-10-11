import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDuration } from '../lib/format'
import type { SleepNight } from '../lib/types'

export type PeekRange = { from: string; to: string }

const longDate = (iso: string, withYear = true) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) })

export function clockTime(iso: string | null, tz?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz ?? undefined })
}

const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x != null)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

/** A small popup for a tapped bar: one night's headline numbers, or a summary when the bar covers several nights. */
export function NightPeek({
  range, nights, onClose, onZoom,
}: {
  range: PeekRange | null
  nights: SleepNight[]
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

  return (
    <dialog
      ref={ref}
      className="peek"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      {range && single && (
        <div className="stack" style={{ gap: 12 }}>
          <div>
            <p className="muted small">Night ending</p>
            <h2 style={{ margin: 0 }}>{longDate(single.night_date)}</h2>
          </div>
          <div>
            <div className="kv"><span className="muted">Asleep</span><b>{formatDuration(single.duration_min)}</b></div>
            {single.restorative_min != null && (
              <div className="kv">
                <span className="muted">Restorative</span>
                <b>{formatDuration(single.restorative_min)}</b>
              </div>
            )}
            {single.deep_min != null && single.rem_min != null && (
              <div className="kv"><span className="muted">Deep · REM</span><b>{formatDuration(single.deep_min)} · {formatDuration(single.rem_min)}</b></div>
            )}
            {single.sleep_score != null && <div className="kv"><span className="muted">Sleep score</span><b>{single.sleep_score}</b></div>}
            {single.sleep_start && (
              <div className="kv">
                <span className="muted">Slept</span>
                <b>{clockTime(single.sleep_start, single.timezone)} – {clockTime(single.sleep_end, single.timezone)}</b>
              </div>
            )}
          </div>
          <div className="row">
            <button className="btn grow" onClick={() => { onClose(); nav(`/night/${single.night_date}`) }}>Full details</button>
            <button className="btn secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      )}
      {range && !single && (
        <div className="stack" style={{ gap: 12 }}>
          <div>
            <p className="muted small">{inRange.length} night{inRange.length === 1 ? '' : 's'}</p>
            <h2 style={{ margin: 0 }}>{longDate(range.from, false)} – {longDate(range.to)}</h2>
          </div>
          <div>
            <div className="kv"><span className="muted">Avg. asleep</span><b>{formatDuration(avg(inRange.map((n) => n.duration_min)))}</b></div>
            <div className="kv"><span className="muted">Avg. restorative</span><b>{formatDuration(avg(inRange.map((n) => n.restorative_min)))}</b></div>
            <div className="kv">
              <span className="muted">Avg. score</span>
              <b>{(() => { const a = avg(inRange.map((n) => n.sleep_score)); return a == null ? '—' : Math.round(a) })()}</b>
            </div>
          </div>
          <div className="row">
            <button className="btn grow" onClick={() => { onClose(); onZoom(range) }}>Zoom into this period</button>
            <button className="btn secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      )}
    </dialog>
  )
}
