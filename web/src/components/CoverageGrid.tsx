import { formatShortDay } from '@legity/core/dates'
import type { CoverageCell } from '@legity/core/coverage'

/** One cell per day: synced, missing or today (pending). Used by the sync card and member profiles. */
export function CoverageGrid({ cells, label }: { cells: CoverageCell[]; label: string }) {
  return (
    <>
      <div className="cov-grid" role="img" aria-label={label}>
        {cells.map((c) => (
          <div key={c.date} className={`cov-cell ${c.state}`} title={`${formatShortDay(c.date)}: ${c.state}`} />
        ))}
      </div>
      <div className="row small muted" style={{ gap: 14 }}>
        <span><i className="cov-key synced" /> Synced</span>
        <span><i className="cov-key missing" /> No data</span>
        <span><i className="cov-key pending" /> Today</span>
      </div>
    </>
  )
}
