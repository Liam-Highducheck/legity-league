# Sleep scoring

Formulas live in `web/src/lib/score/` (one file per formula, registered in `index.ts`). Each takes a night, the
user's earlier nights and a context (timezone, goal) and returns a score, band and per-part breakdown. They run in
the browser, so changing a formula needs no migration or re-ingest. Today shows the breakdown for the latest night.

Inputs per night: `sleep_start`, `sleep_end`, `duration_min`, plus `awake_min` and `wake_count`, which ingest now
derives from Apple's explicit Awake segments (migrations `20261011170001`, `20261011180001`): awake minutes and the
number of awake spells inside the night. Manual entries have neither, so they get no score.

## Formula 1: Apple-style (`apple.ts`)

Apple's own page confirms only: 0-100, **duration 50 + bedtime consistency 30 + interruptions 20**, bedtime is
sleep onset compared with the **previous 13 nights**, interruptions look at how often and how long you were awake,
and the bands (watchOS 26.2): 0-40 Very low, 41-60 Low, 61-80 OK, 81-95 High, 96-100 Very high.
([Apple Watch guide](https://support.apple.com/guide/watch/view-your-sleep-score-apded441a669/watchos),
[MacRumors on the band change](https://www.macrumors.com/2025/11/04/watchos-26-2-updates-sleep-score-ranges/))

The curves inside each part are not published, so they were **fitted to Apple's own scores**: 102 nights
(2026-07-01 to 2026-10-11) from one Apple Watch, with Apple's duration / bedtime / interruptions points read off the
Sleep Score screen next to the Health export for the same nights (scripts in `tools/score-fit/`). Two nights where a
nap spanned the date boundary (09-10, 09-11) were excluded from the fits. Result on the other 100 nights:

| Part | Fitted rule | Fit (mean error / exact match) |
| --- | --- | --- |
| Duration (50) | Full marks at 8h asleep, then a lookup curve (not a clean formula): 15 min short = 48.3, 30 = 47.7, 1h = 45.6, 1.5h = 40.7, 2h = 36.0, 3h = 28.0, 4h = 21.4, 5h = 13.1, continuing at the same slope. Uses time actually asleep (core + deep + REM), not time in bed. Oversleeping not penalised. | 0.08 / 92%; 91% in 10-fold cross-validation |
| Bedtime (30) | Baseline = **mean** sleep onset of the nights in the previous 13 calendar days **slept in the same timezone** (confirmed exactly against Apple's "offset from average" on five trip nights; if there are none in that timezone it falls back to all nights). Up to 15 min later than the baseline is free, then 20 points per 90 min (60 late = 10, 150 late = 30). Up to 60 min earlier is free, then 1 point per 10 min, max 6. Afternoon-onset sessions (before 18:00) are ignored for the baseline. | 0.14 / 88% |
| Interruptions (20) | From Apple's own Awake segments inside the night: each wake event (awake spell of 1+ min) costs about 1.1 points after a 2.5 point allowance, plus 0.1 per awake minute beyond the first 10. A long awake spell (2h+) zeroes it. | 0.48 / 61%; richer shapes (per-size costs, blips, floors) did not beat about 63% |

Total score: mean error 0.6 points, 53% exact. For nights Apple scored 95 or more (19 nights) every prediction is within
1 point, 7 exact; the Very high band (96+) is called wrongly on 2 of those 19.

Duration is as good as the data allows. The only places the duration curve and the data disagree:
two pairs of nights where Apple gave different points for effectively identical sleep (333.88 min = 33 pts vs
333.90 min = 32 pts; 217.4 min = 19 vs 219.4 min = 18), which no function of minutes asleep can explain, and the
two nap nights. The inputs were rechecked and are right, and Apple's total is exactly the sum of the three parts, so
there is no total-based rounding. Apple's duration probably uses a slightly different minutes-asleep figure than the
raw segments give (its shown durations differ from ours by 0 to 2 minutes).

Known misses and caveats:

- Health exports stamp every sample with the *current* UTC offset, so nights before a daylight-saving change look
  an hour off in the raw export. Each record also carries an `HKTimeZone` metadata entry with the real zone
  (Sydney, plus Melbourne, Brisbane and Fiji trips in this data). Convert with that, not the offset. The app records
  the profile timezone per night at sync time (`sleep_nights.timezone`), so on a trip the user has to change their
  profile timezone for the bedtime baseline to restart; the Shortcut does not send the real zone.
- The July trip nights (Melbourne, 07-09 to 07-13) looked like unexplained misses until Apple's own "offset from
  average" showed its baseline contained only that trip's nights; now modelled via the per-night timezone.
- One night (2026-09-11) started at 16:08 (a nap-like session) and skewed the next two weeks of baselines; ignoring
  afternoon-onset sessions for the baseline fixed all of those. The 18:00 cutoff is our guess at Apple's rule.
- Interruptions: Apple's own wake-up counts and awake minutes (read off the Health app for five nights) sometimes
  differ from the raw Awake segments by one event or a minute, e.g. a 0.5-minute segment counted on one night and not
  on another. That noise limits this part to about 60% exact.
- Naps and split nights: Apple seems to sum all sleep that ends on a date into one duration (09-11: 361 + 201 min
  scored as 50/50; 09-10 scored 50 on 412 min, so its rule for the day boundary is unclear). Ingest keeps only the
  longest session per date and the league ranks on that, so naps are deliberately not modelled: two nights in 100.
- Interruptions need the raw Awake segments, which ingest now stores (`awake_min`, `wake_count`; migration
  `20261011180001`). Nights ingested before that have a gap-based estimate until the next sync of that night
  overwrites it; manual entries have none.
- Stage-based deductions claimed by one article were not found: deep/REM do not explain the residuals.
- One person, one watch. Needs checking against another user's scores before trusting the constants.

To keep improving: add more nights (or another person's), re-run `tools/score-fit/`, and edit the constants at
the top of `web/src/lib/score/apple.ts`.

## Not built yet

- League/Trends "Score" still reads the `score` column (only manual entries fill it). Ranking on a computed score
  needs either every member's nights (already readable) scored client-side, or the score stored at ingest.
- A formula picker (only one formula exists).
