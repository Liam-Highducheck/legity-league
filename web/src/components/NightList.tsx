import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, X } from 'lucide-react'
import { Stat, longDate, type PeekRange } from './NightPeek'

export interface NightListSpec {
  title: string
  subtitle: string
  stats?: { label: string; value: string; wide?: boolean }[]
  rows: { date: string; primary: string; secondary?: string }[]
  zoom?: PeekRange
}

/** A popup listing nights (all of them, the ones that hit a target, or one streak), each opening its night page. */
export function NightList({ spec, onClose, onZoom }: { spec: NightListSpec | null; onClose: () => void; onZoom: (r: PeekRange) => void }) {
  const nav = useNavigate()
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (spec && !d.open) d.showModal()
    if (!spec && d.open) d.close()
  }, [spec])

  return (
    <dialog ref={ref} className="peek" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      {spec && (
        <div className="stack" style={{ gap: 14 }}>
          <div className="row between" style={{ alignItems: 'flex-start' }}>
            <div>
              <p className="muted small">{spec.subtitle}</p>
              <h2 style={{ margin: 0 }}>{spec.title}</h2>
            </div>
            <button className="icon-btn" aria-label="Close" onClick={onClose}><X size={20} /></button>
          </div>

          {spec.stats && (
            <div className="peek-grid">
              {spec.stats.map((s) => <Stat key={s.label} {...s} />)}
            </div>
          )}

          <div className="peek-list">
            {spec.rows.map((r) => (
              <button key={r.date} className="list-item" onClick={() => { onClose(); nav(`/night/${r.date}`) }}>
                <div className="grow" style={{ textAlign: 'left' }}>
                  <b>{longDate(r.date, false)}</b>
                  {r.secondary && <p className="muted small">{r.secondary}</p>}
                </div>
                <b>{r.primary}</b>
                <ChevronRight size={18} className="chev" />
              </button>
            ))}
            {spec.rows.length === 0 && <p className="muted center">No nights.</p>}
          </div>

          {spec.zoom && (
            <button className="btn block" onClick={() => { onClose(); onZoom(spec.zoom!) }}>Zoom into this period</button>
          )}
        </div>
      )}
    </dialog>
  )
}
