import { describe, expect, it } from 'vitest'
import { isoInZone, looksLikeSleepCycle, parseSleepCycleCsv, zonedToMs } from './sleepcycle.ts'

const HEADER =
  'Went to bed;Woke up;Sleep Quality;Time in bed (seconds);Time asleep (seconds);Asleep after (seconds);Regularity;Did snore'
const ROW1 = '2026-10-11 23:06:48;2026-10-12 06:09:19;72%;25350;18928;1352;—;false'
const ROW2 = '2026-10-12 23:23:06;2026-10-13 06:05:41;69%;24154;18035;1046;97%;false'

describe('sleep cycle csv', () => {
  it('recognises the export and rejects other files', () => {
    expect(looksLikeSleepCycle(`${HEADER}\n${ROW1}`)).toBe(true)
    expect(looksLikeSleepCycle('﻿' + HEADER)).toBe(true)
    expect(looksLikeSleepCycle('date,hours\n2026-01-01,7')).toBe(false)
  })

  it('places local times in the time zone with the right offset', () => {
    const ms = zonedToMs('2026-10-11 23:06:48', 'Australia/Sydney')!
    expect(isoInZone(ms, 'Australia/Sydney')).toBe('2026-10-11T23:06:48+11:00')
    expect(new Date(ms).toISOString()).toBe('2026-10-11T12:06:48.000Z')
    expect(isoInZone(zonedToMs('2026-06-01 07:00:00', 'Australia/Sydney')!, 'Australia/Sydney')).toBe('2026-06-01T07:00:00+10:00')
  })

  it('keeps bed, wake and the asleep total exact', () => {
    const r = parseSleepCycleCsv(`${HEADER}\n${ROW1}\n${ROW2}`, 'Australia/Sydney')
    expect(r.nights).toBe(2)
    expect(r.skipped).toBe(0)
    expect(r.from).toBe('2026-10-12')
    expect(r.to).toBe('2026-10-13')
    const night1 = r.segments.slice(0, 2)
    expect(night1.every((s) => s.value === 'Asleep' && s.tz === 'Australia/Sydney')).toBe(true)
    // falls asleep 1352s after getting into bed, wakes at 06:09:19
    expect(night1[0].start).toBe('2026-10-11T23:29:20+11:00')
    expect(night1[1].end).toBe('2026-10-12T06:09:19+11:00')
    const asleepMs = night1.reduce((n, s) => n + (Date.parse(s.end) - Date.parse(s.start)), 0)
    expect(asleepMs / 1000).toBe(18928)
  })

  it('uses one segment when there is no restless time', () => {
    const r = parseSleepCycleCsv(`${HEADER}\n2026-10-11 23:00:00;2026-10-12 07:00:00;80%;28800;28800;0;—;false`, 'UTC')
    expect(r.segments).toHaveLength(1)
    expect(r.segments[0]).toMatchObject({ start: '2026-10-11T23:00:00+00:00', end: '2026-10-12T07:00:00+00:00' })
  })

  it('skips rows with no sleep or no times', () => {
    const r = parseSleepCycleCsv(`${HEADER}\n;;;;;;;\n2026-10-11 23:00:00;2026-10-12 07:00:00;0%;0;0;0;—;false`, 'UTC')
    expect(r.nights).toBe(0)
    expect(r.skipped).toBe(2)
  })
})
