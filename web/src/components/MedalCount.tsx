import { Medal } from 'lucide-react'

/** Gold / silver / bronze counts with coloured medal icons (colours come from CSS variables, so every theme works). */
export function MedalCount({
  gold,
  silver,
  bronze,
  compact = false,
}: {
  gold: number
  silver: number
  bronze: number
  /** Coloured numbers only (no icons), for narrow grid cells. Pair with <MedalLegend />. */
  compact?: boolean
}) {
  if (compact) {
    return (
      <span className="medals compact" aria-label={`${gold} gold, ${silver} silver, ${bronze} bronze`}>
        <span className="medal-1">{gold}</span>
        <span className="medal-2">{silver}</span>
        <span className="medal-3">{bronze}</span>
      </span>
    )
  }
  return (
    <span className="medals" aria-label={`${gold} gold, ${silver} silver, ${bronze} bronze`}>
      <span className="medal-1"><Medal size={15} />{gold}</span>
      <span className="medal-2"><Medal size={15} />{silver}</span>
      <span className="medal-3"><Medal size={15} />{bronze}</span>
    </span>
  )
}

export function MedalIcon({ rank, size = 18 }: { rank: number; size?: number }) {
  return <Medal size={size} className={`medal-${Math.min(3, Math.max(1, rank))}`} aria-label={`Rank ${rank}`} />
}

export function MedalLegend() {
  return (
    <span className="medals small muted" style={{ fontWeight: 500, gap: 14 }}>
      <span><Medal size={14} className="medal-1" /> Gold</span>
      <span><Medal size={14} className="medal-2" /> Silver</span>
      <span><Medal size={14} className="medal-3" /> Bronze</span>
    </span>
  )
}
