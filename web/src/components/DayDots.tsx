import { formatShortDay } from '../lib/dates'
import { heat } from '../lib/heat'
import type { Metric } from '../lib/stats'

/**
 * One small bar per day of the period, as a heat map of how good that night was for the selected metric.
 * Faint outline = no night recorded, dashed = still to come (or today, not synced yet), gold ring = best of the group that day.
 */
export function DayDots({
  dates,
  values,
  metric,
  today,
  won,
  format,
}: {
  dates: string[]
  /** This person's value for each date they have a night. */
  values: Map<string, number>
  metric: Metric
  today: string
  /** Dates this person had the best night in the group. */
  won: Set<string>
  format: (v: number) => string
}) {
  return (
    <div className="day-dots" aria-hidden="true">
      {dates.map((d) => {
        const v = values.get(d)
        const future = d > today
        const pending = d === today && v == null
        const cls = ['day-dot', future || pending ? 'ahead' : v == null ? 'none' : '', won.has(d) ? 'won' : ''].filter(Boolean).join(' ')
        return (
          <i
            key={d}
            className={cls}
            title={`${formatShortDay(d)}${v != null ? `: ${format(v)}` : future ? ' (to come)' : ''}`}
            style={v != null ? { background: `color-mix(in srgb, var(--accent) ${Math.round(18 + heat(metric, v) * 82)}%, var(--surface-2))` } : undefined}
          />
        )
      })}
    </div>
  )
}
