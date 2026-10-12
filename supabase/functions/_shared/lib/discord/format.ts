// GENERATED from packages/core/src/discord/format.ts by scripts/sync-shared.mjs. Do not edit here: change the source and run
//   node scripts/sync-shared.mjs
import { formatDayPlain } from '../dates.ts'
import { formatPodiumValue } from '../format.ts'
import { DIVISION_LABELS } from '../league/types.ts'
import type { Podium } from '../league/podiums.ts'
import { formatRecordValue, type Announcement, type Holder } from '../league/records.ts'
import { METRIC_LABELS } from '../stats.ts'

// Discord's limits: 4096 characters per embed description, 6000 across all embeds of a message, 10 embeds and 2000
// characters of content per message. We stay comfortably inside them.
const DESCRIPTION_MAX = 3800
const MESSAGE_EMBED_CHARS = 5800
const MESSAGE_EMBEDS = 10
const CONTENT_MAX = 1900
const MAX_INLINE_ANNOUNCEMENTS = 8

export interface DiscordEmbed {
  title?: string
  description?: string
  url?: string
  color?: number
  footer?: { text: string }
}

export interface DiscordPayload {
  content?: string
  embeds?: DiscordEmbed[]
  /** Always empty: names come from user-entered text, so nothing we post may ping anyone. */
  allowed_mentions: { parse: [] }
}

const COLOR_GOLD = 0xe3b341
const COLOR_RECORD = 0x58a6ff

const MEDALS = ['🥇', '🥈', '🥉']

/** Makes user-entered text safe to put in a message: markdown is escaped and @ can't form a mention. */
export function escapeMd(text: string): string {
  return text.replace(/[\\*_~`|>#[\]()]/g, '\\$&').replace(/@/g, '@\u200b')
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/** Splits lines into chunks no longer than `max` characters (a single over-long line gets its own chunk). */
export function chunkLines(lines: string[], max: number): string[] {
  const chunks: string[] = []
  let cur = ''
  for (const line of lines) {
    if (cur && cur.length + 1 + line.length > max) {
      chunks.push(cur)
      cur = line
    } else {
      cur = cur ? `${cur}\n${line}` : line
    }
  }
  if (cur) chunks.push(cur)
  return chunks
}

function embedChars(e: DiscordEmbed): number {
  return (e.title?.length ?? 0) + (e.description?.length ?? 0) + (e.footer?.text.length ?? 0)
}

/** Packs embeds into as few messages as the limits allow, keeping their order. */
export function packEmbeds(embeds: DiscordEmbed[]): DiscordPayload[] {
  const out: DiscordPayload[] = []
  let cur: DiscordEmbed[] = []
  let chars = 0
  for (const e of embeds) {
    const n = embedChars(e)
    if (cur.length > 0 && (cur.length >= MESSAGE_EMBEDS || chars + n > MESSAGE_EMBED_CHARS)) {
      out.push({ embeds: cur, allowed_mentions: { parse: [] } })
      cur = []
      chars = 0
    }
    cur.push(e)
    chars += n
  }
  if (cur.length > 0) out.push({ embeds: cur, allowed_mentions: { parse: [] } })
  return out
}

/** The podium block (top 3 with medals), then the full ranking when more than three people were ranked. */
function rankingLines(podium: Podium): string[] {
  const { placings, unranked, days } = podium.ranking
  const metric = podium.metric
  const lines: string[] = []
  if (podium.medals.length === 0) {
    lines.push('*No podium: it needs at least two people with every night.*')
  } else {
    for (const p of podium.medals) {
      lines.push(`${MEDALS[p.rank - 1]} **${escapeMd(p.name)}** — ${formatPodiumValue(metric, p.value)}`)
    }
  }
  if (placings.length > podium.medals.length) {
    lines.push('', '**Full ranking**')
    for (const p of placings) lines.push(`${p.rank}. ${escapeMd(p.name)} — ${formatPodiumValue(metric, p.value)}`)
  }
  if (unranked.length > 0) {
    // Someone with every night who is still unranked is excluded by the group's device rules for this metric.
    const why = (u: { nights: number }) => (u.nights >= days ? 'not eligible' : `${u.nights}/${days}`)
    lines.push('', `*Not ranked (needs all ${days} nights):* ${unranked.map((u) => `${escapeMd(u.name)} (${why(u)})`).join(', ')}`)
  }
  return lines
}

function podiumEmbeds(podium: Podium, title: string, subtitle: string | null, footer: string, url?: string): DiscordEmbed[] {
  const body = chunkLines(rankingLines(podium), DESCRIPTION_MAX)
  return body.map((text, i) => ({
    title: i === 0 ? title : `${title} (cont.)`,
    description: i === 0 && subtitle ? `${subtitle}\n\n${text}` : text,
    url: i === 0 ? url : undefined,
    color: COLOR_GOLD,
    footer: i === body.length - 1 ? { text: footer } : undefined,
  }))
}

/** Worth posting only if someone has at least one night in the period (an entirely empty week isn't news). */
const hasContent = (p: Podium) => p.ranking.placings.length > 0 || p.ranking.unranked.some((u) => u.nights > 0)

/** The standings for one finished period: an embed per metric. Empty when nobody had data for any metric. */
export function periodSummaryPayloads(opts: {
  groupName: string
  /** All podiums of this one period (one per metric). */
  podiums: Podium[]
  /** Optional link to open this podium in the app. */
  urlFor?: (podium: Podium) => string | undefined
}): DiscordPayload[] {
  const embeds: DiscordEmbed[] = []
  for (const podium of opts.podiums.filter(hasContent)) {
    embeds.push(
      ...podiumEmbeds(podium, `🏆 ${escapeMd(podium.title)} — ${METRIC_LABELS[podium.metric]}`, null, `${opts.groupName} · every night required`, opts.urlFor?.(podium)),
    )
  }
  return packEmbeds(embeds)
}

/** The final standings of a championship competition. */
export function championshipPayloads(opts: { groupName: string; podiums: Podium[]; urlFor?: (podium: Podium) => string | undefined }): DiscordPayload[] {
  const embeds: DiscordEmbed[] = []
  for (const podium of opts.podiums.filter(hasContent)) {
    const dates = `${formatDayPlain(podium.start)} to ${formatDayPlain(podium.end)}`
    embeds.push(
      ...podiumEmbeds(podium, `🏅 ${escapeMd(podium.title)} — ${METRIC_LABELS[podium.metric]}`, `**Championship** · ${dates}`, `${opts.groupName} · championship`, opts.urlFor?.(podium)),
    )
  }
  return packEmbeds(embeds)
}

function holderNames(holders: Holder[], names: Map<string, string>): string {
  return joinNames(holders.map((h) => escapeMd(names.get(h.userId) ?? 'Someone')))
}

/** One line: "New record: Longest night (Watch) — Sam, 10h 12m (Mon 5 Oct), beating Alex (9h 40m), which stood 23 days." */
export function recordLine(a: Announcement, names: Map<string, string>): string {
  const { category, event } = a
  const who = holderNames(event.holders, names)
  const when = event.holders[0]?.title ?? formatDayPlain(event.achievedOn)
  const prev = event.previous!
  // Someone improving their own record reads better as "their own" than "beating <themselves>".
  const own = event.holders.every((h) => prev.holders.some((p) => p.userId === h.userId))
  const beating = own ? 'improving on their own record' : `beating ${holderNames(prev.holders, names)}`
  return (
    `**New record:** ${category.label} (${DIVISION_LABELS[category.division]}) — **${who}**, ` +
    `${formatRecordValue(category.stat, event.value)} (${escapeMd(when)}), ${beating} ` +
    `(${formatRecordValue(category.stat, prev.value)}), which stood ${plural(prev.stoodDays, 'day')}.`
  )
}

/** One announcement is a plain message; a few go in one message; a large batch becomes a digest embed. */
export function recordPayloads(announcements: Announcement[], names: Map<string, string>, groupName: string): DiscordPayload[] {
  if (announcements.length === 0) return []
  const lines = announcements.map((a) => recordLine(a, names))
  if (announcements.length <= MAX_INLINE_ANNOUNCEMENTS) {
    return chunkLines(lines, CONTENT_MAX).map((content) => ({ content, allowed_mentions: { parse: [] } }))
  }
  const embeds = chunkLines(lines, DESCRIPTION_MAX).map((description, i) => ({
    title: i === 0 ? `${announcements.length} records broken` : `Records broken (cont.)`,
    description,
    color: COLOR_RECORD,
    footer: { text: groupName },
  }))
  return packEmbeds(embeds)
}
