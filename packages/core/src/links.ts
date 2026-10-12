import type { PeriodKind } from './periods'
import type { Metric } from './stats'

/** Where a member's profile lives. */
export const memberPath = (userId: string) => `/league/member/${userId}`

/** Opens the League page on a specific finished period. */
export const leaguePath = (kind: PeriodKind, start: string, metric: Metric) => `/league?kind=${kind}&p=${start}&metric=${metric}`
