import { Fragment, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronDown, ChevronRight } from 'lucide-react-native'
import { eachDay, formatDay, formatDayPlain } from '@legity/core/dates'
import { formatDuration, minutesToClock } from '@legity/core/format'
import { memberPath } from '@legity/core/links'
import {
  ROLLING_DAYS,
  computeRecords,
  formatNightStat,
  formatRecordValue,
  type CategoryReport,
  type Holder,
  type RecordEvent,
  type RecordScope,
  type RecordsReport,
} from '@legity/core/league/records'
import type { LeagueBase } from '@legity/core/league/report'
import { DIVISION_LABELS, LEAGUE_KINDS, type Division } from '@legity/core/league/types'
import { bedtimeOf } from '@legity/core/league/windows'
import { PERIOD_LABELS } from '@legity/core/periods'
import { Button, Card, Pill, PillScroller, Row, Segmented, T, Value } from './ui'
import { TABULAR } from './ui'
import { useColors } from '../lib/theme'

const SCOPES: RecordScope[] = ['night', ...LEAGUE_KINDS]
export const SCOPE_LABELS: Record<RecordScope, string> = { night: 'Single night', ...PERIOD_LABELS }
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export type Names = Map<string, string>

/** "Ann, Bo and Cy", each name tappable to open that member. Renders inline inside a parent <Text>. */
export function People({ holders, names }: { holders: Holder[]; names: Names }) {
  const router = useRouter()
  return (
    <>
      {holders.map((h, i) => (
        <Fragment key={h.userId}>
          {i > 0 && (i === holders.length - 1 ? ' and ' : ', ')}
          <Text style={{ fontWeight: '600' }} onPress={() => router.push(memberPath(h.userId) as never)}>
            {names.get(h.userId) ?? 'Someone'}
          </Text>
        </Fragment>
      ))}
    </>
  )
}

export function whenOf(e: Pick<RecordEvent, 'holders' | 'achievedOn'>): string {
  return e.holders[0]?.title ?? formatDay(e.achievedOn)
}

const eventKey = (e: RecordEvent) => `${e.achievedOn}-${e.value}`

/** The nights behind a record: every night of the window (or the single night) with its value and a little context. */
function NightsPanel({ holder, category, base, name }: { holder: Holder; category: CategoryReport['category']; base: LeagueBase; name: string }) {
  const c = useColors()
  const target = base.members.find((m) => m.user_id === holder.userId)?.target_bedtime
  const byDate = base.index.get(holder.userId)
  const single = !(holder.start && holder.end)
  const dates = single ? [holder.achievedOn] : eachDay(holder.start!, holder.end!)
  return (
    <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: 18, padding: 12, gap: 4 }}>
      <T small>
        <T small bold>{name}</T> <T small muted>· {single ? 'the night' : `${dates.length} nights`}</T>
      </T>
      <ScrollView nestedScrollEnabled style={{ maxHeight: 360 }}>
        {dates.map((d, i) => {
          const n = byDate?.get(d)
          const bed = n ? bedtimeOf(n) : null
          return (
            <View key={d} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 4, minHeight: 44, borderBottomWidth: i === dates.length - 1 ? 0 : 1, borderBottomColor: c.line }}>
              <View style={{ flex: 1 }}>
                <T bold>{formatDayPlain(d)}</T>
                <T muted small>
                  {n
                    ? [
                        `${formatDuration(n.duration_min)} asleep`,
                        n.sleep_score != null ? `score ${n.sleep_score}` : null,
                        bed ? `bed ${minutesToClock(bed.minutes)}` : null,
                        single && n.restorative_min != null ? `restorative ${formatDuration(n.restorative_min)}` : null,
                        single && n.deep_min != null ? `deep ${formatDuration(n.deep_min)}` : null,
                        single && n.rem_min != null ? `REM ${formatDuration(n.rem_min)}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    : 'No night recorded'}
                </T>
              </View>
              <Value>{n ? formatNightStat(n, category.stat, target) : '—'}</Value>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

function Panels({ event, category, base, names }: { event: RecordEvent; category: CategoryReport['category']; base: LeagueBase; names: Names }) {
  return (
    <View style={{ gap: 8 }}>
      {[...event.holders, ...event.ties].map((h) => (
        <NightsPanel key={h.userId} holder={h} category={category} base={base} name={names.get(h.userId) ?? 'Someone'} />
      ))}
    </View>
  )
}

export function EventLine({
  category,
  event,
  names,
  onToggle,
  last,
}: {
  category: CategoryReport['category']
  event: RecordEvent
  names: Names
  onToggle?: () => void
  last?: boolean
}) {
  const c = useColors()
  const body = (
    <>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontSize: 16, lineHeight: 22 }}>
          <Text style={[{ fontWeight: '600' }, TABULAR]}>{formatRecordValue(category.stat, event.value)}</Text> · <People holders={event.holders} names={names} />
        </Text>
        <T muted small>
          {whenOf(event)}
          {event.previous ? ` · beat ${formatRecordValue(category.stat, event.previous.value)} after ${plural(event.previous.stoodDays, 'day')}` : ' · first record'}
        </T>
      </View>
      <T muted small>{event.supersededOn ? `stood ${plural(event.stoodDays, 'day')}` : 'standing'}</T>
    </>
  )
  const style = { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 12, paddingVertical: 13, paddingHorizontal: 4, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.line }
  if (!onToggle) return <View style={style}>{body}</View>
  return (
    <Pressable onPress={onToggle} style={style}>
      {body}
    </Pressable>
  )
}

function RecordCard({ report, names, base }: { report: CategoryReport; names: Names; base: LeagueBase }) {
  const c = useColors()
  const { category, current, events } = report
  const [open, setOpen] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const toggle = (e: RecordEvent) => setOpen(open === eventKey(e) ? null : eventKey(e))
  const hint =
    category.scope === 'night'
      ? ''
      : category.rolling
        ? ` It needs ${ROLLING_DAYS[category.scope]} days in a row with a night on every day.`
        : ` It needs a full ${category.scope} with a night on every day.`
  return (
    <Card gap={8}>
      <T bold>{category.label}</T>
      {current ? (
        <>
          <Text style={[{ color: c.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 }, TABULAR]}>{formatRecordValue(category.stat, current.value)}</Text>
          <Text style={{ color: c.text, fontSize: 16 }}><People holders={current.holders} names={names} /></Text>
          {current.ties.length > 0 && (
            <Text style={{ color: c.text, fontSize: 13 }}>Tied by <People holders={current.ties} names={names} /></Text>
          )}
          <T muted small>{whenOf(current)} · standing for {plural(current.stoodDays, 'day')}</T>
          <View style={{ alignSelf: 'flex-start' }}>
            <Button
              small
              variant="secondary"
              title={open === eventKey(current) ? 'Hide nights' : category.scope === 'night' ? 'Show the night' : 'Show the nights'}
              onPress={() => toggle(current)}
            />
          </View>
          {open === eventKey(current) && <Panels event={current} category={category} base={base} names={names} />}
        </>
      ) : (
        <T muted small>No record yet.{hint}</T>
      )}
      {events.length > 1 && (
        <View>
          <Pressable onPress={() => setShowHistory(!showHistory)} style={{ paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {showHistory ? <ChevronDown size={18} color={c.accent} /> : <ChevronRight size={18} color={c.accent} />}
            <Text style={{ color: c.accent, fontSize: 16 }}>History · {events.length} records</Text>
          </Pressable>
          {showHistory &&
            [...events].reverse().map((e, i, arr) => (
              <Fragment key={eventKey(e)}>
                <EventLine category={category} event={e} names={names} onToggle={() => toggle(e)} last={i === arr.length - 1 && open !== eventKey(e)} />
                {open === eventKey(e) && e !== current && <Panels event={e} category={category} base={base} names={names} />}
              </Fragment>
            ))}
        </View>
      )}
    </Card>
  )
}

export function DivisionPills({ value, onChange }: { value: Division; onChange: (d: Division) => void }) {
  return (
    <Segmented
      value={value}
      onChange={onChange}
      options={(Object.keys(DIVISION_LABELS) as Division[]).map((d) => ({ value: d, label: DIVISION_LABELS[d] }))}
    />
  )
}

/**
 * Record cards for one set of statistics: Watch / Non-Watch, single night or period, and calendar or rolling
 * windows. `mainReport` is the already-computed calendar report; anything else is computed on demand.
 */
export function RecordsBrowser({ base, mainReport, advanced = false }: { base: LeagueBase; mainReport?: RecordsReport; advanced?: boolean }) {
  const [division, setDivision] = useState<Division>('watch')
  const [scope, setScope] = useState<RecordScope>('night')
  const [rolling, setRolling] = useState(false)
  const names: Names = useMemo(() => new Map(base.members.map((m) => [m.user_id, m.name])), [base.members])

  const report = useMemo(
    () => (!advanced && !rolling && mainReport ? mainReport : computeRecords(base.members, base.nights, base.asOf, LEAGUE_KINDS, { rolling, advanced })),
    [advanced, rolling, mainReport, base],
  )
  const shownScope: RecordScope = rolling && scope === 'night' ? 'week' : scope
  const shown = report.categories.filter((cat) => cat.category.division === division && cat.category.scope === shownScope)

  return (
    <>
      <DivisionPills value={division} onChange={setDivision} />
      <PillScroller>
        {SCOPES.filter((s) => !(rolling && s === 'night')).map((s) => (
          <Pill key={s} label={SCOPE_LABELS[s]} on={s === shownScope} onPress={() => setScope(s)} />
        ))}
      </PillScroller>
      {shownScope !== 'night' && (
        <Row between>
          <T muted small style={{ flex: 1 }}>
            {rolling ? `Any ${ROLLING_DAYS[shownScope]} days in a row` : `Calendar ${shownScope === 'week' ? 'weeks (Mon to Sun)' : `${shownScope}s`}`}
          </T>
          <Pill
            label="Rolling"
            on={rolling}
            onPress={() => {
              setRolling(!rolling)
              if (!rolling && scope === 'night') setScope('week')
            }}
          />
        </Row>
      )}
      {division === 'watch' ? (
        <T muted small>Watch records need sleep-stage data on every night counted (an Apple Watch, or another tracker that writes stages to Apple Health).</T>
      ) : (
        <T muted small>Non-Watch covers phone-only Health data. Restorative time, score and sleep stages need stage data, so they are Watch records only.</T>
      )}
      {shown.length === 0 && <T muted style={{ textAlign: 'center' }}>Nothing to show here.</T>}
      {shown.map((r) => (
        <RecordCard key={r.category.key} report={r} names={names} base={base} />
      ))}
    </>
  )
}
