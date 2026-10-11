import { Moon } from 'lucide-react'
import { minutesToClock } from '../lib/format'
import type { BlackoutState } from '../lib/blackout'

export function BlackoutCard({ state, what = 'Rankings and everyone else’s sleep' }: { state: BlackoutState; what?: string }) {
  return (
    <div className="card rest">
      <div className="moon"><Moon size={44} strokeWidth={1.6} /></div>
      <h2>{what} {what.endsWith('s') ? 'are' : 'is'} resting</h2>
      <p className="muted">
        {state.opensAt != null ? `Back at ${minutesToClock(state.opensAt)}. ` : ''}
        {state.reason === 'app'
          ? 'The whole league takes a break in the evening so nobody goes to bed stressing about a number.'
          : 'This is your personal wind-down window. You can change it in Me → Blackout.'}
      </p>
    </div>
  )
}
