import { Link } from 'react-router-dom'
import { Avatar } from './ui'
import { MedalIcon } from './MedalCount'
import { formatPodiumValue } from '@legity/core/format'
import { memberPath } from '@legity/core/links'
import type { Podium } from '@legity/core/league/podiums'
import { METRIC_LABELS } from '@legity/core/stats'

/** The official podium for a finished period: top three (ties share a place), plus who missed out and why. */
export function PodiumCard({ podium, title }: { podium: Podium; title?: string }) {
  const { placings, unranked, days } = podium.ranking
  return (
    <div className="card stack" style={{ gap: 10 }}>
      <h2 style={{ marginBottom: 0 }}>{title ?? `Podium · ${METRIC_LABELS[podium.metric]}`}</h2>
      {podium.medals.length === 0 ? (
        <p className="muted small">
          {placings.length === 0
            ? `Nobody has a night on every one of the ${days} days.`
            : 'No podium: it needs at least two people with a night on every day.'}
        </p>
      ) : (
        <div className="list">
          {podium.medals.map((p) => (
            <Link key={p.userId} to={memberPath(p.userId)} className="list-item">
              <span className="rank"><MedalIcon rank={p.rank} /></span>
              <Avatar name={p.name} />
              <b className="grow">{p.name}</b>
              <span className="value">{formatPodiumValue(podium.metric, p.value)}</span>
            </Link>
          ))}
        </div>
      )}
      {unranked.length > 0 && placings.length > 0 && (
        <p className="muted small">
          Not ranked (needs all {days} nights): {unranked.map((u) => `${u.name} (${u.nights >= days ? 'not eligible' : `${u.nights}/${days}`})`).join(', ')}
        </p>
      )}
    </div>
  )
}
