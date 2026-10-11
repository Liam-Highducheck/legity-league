import { DEFAULT_GOAL_MIN, getFormula } from '../lib/score'
import type { SleepNight } from '../lib/types'

/** Score breakdown for one night, computed in the browser from the stored night + the earlier nights. */
export function SleepScoreCard({ night, history, timezone }: { night: SleepNight; history: SleepNight[]; timezone: string }) {
  const formula = getFormula(null)
  const result = formula.compute(night, history, { timezone, goalMin: DEFAULT_GOAL_MIN })
  if (!result) {
    return (
      <div className="card">
        <h2>Sleep score</h2>
        <p className="muted small">Needs a night synced from Apple Health (manual entries have no bedtime or wake-up detail).</p>
      </div>
    )
  }
  return (
    <div className="card stack" style={{ gap: 12 }}>
      <div className="row between">
        <h2 style={{ margin: 0 }}>Sleep score</h2>
        <span className="chip">{formula.name}</span>
      </div>
      <div className="row" style={{ alignItems: 'baseline', gap: 10 }}>
        <span className="big-num">{result.score}</span>
        <span className="muted">/ 100 · {result.band}</span>
      </div>
      <div className="stack" style={{ gap: 10 }}>
        {result.parts.map((p) => (
          <div key={p.key} className="stack" style={{ gap: 4 }}>
            <div className="row between small">
              <b>{p.label}</b>
              <span>{p.points} / {p.max}</span>
            </div>
            <div className="meter"><i style={{ width: `${(p.points / p.max) * 100}%` }} /></div>
            <p className="muted small">{p.note}</p>
          </div>
        ))}
      </div>
      {result.caveats.map((c) => <p key={c} className="muted small">{c}</p>)}
    </div>
  )
}
