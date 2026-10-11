import { addDays, dayNumFromISO } from './dates'

/** How far back the regular Legity Sync shortcut reaches. Anything older needs the backfill shortcut. */
export const REGULAR_WINDOW_DAYS = 7
export const COVERAGE_DAYS = 30

export type CellState = 'synced' | 'missing' | 'pending'

export interface CoverageCell {
  date: string
  state: CellState
}

/** One cell per day, oldest first, ending today. Today without data is "pending", not missing. */
export function buildCoverage(nightDates: string[], today: string, days: number = COVERAGE_DAYS): CoverageCell[] {
  const have = new Set(nightDates)
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - (days - 1))
    const state: CellState = have.has(date) ? 'synced' : date === today ? 'pending' : 'missing'
    return { date, state }
  })
}

/** Missing nights too old for the regular sync to reach. */
export function missingBeyondWindow(cells: CoverageCell[], today: string): CoverageCell[] {
  const oldest = addDays(today, -(REGULAR_WINDOW_DAYS - 1))
  return cells.filter((c) => c.state === 'missing' && c.date < oldest)
}

export function daysSince(date: string, today: string): number {
  return dayNumFromISO(today) - dayNumFromISO(date)
}
