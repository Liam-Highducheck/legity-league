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

The curves inside each part are not published, so they were **fitted to Apple's own scores**: 71 nights
(2026-08-01 to 2026-10-11) from one Apple Watch, with Apple's duration / bedtime / interruptions points read off the
Sleep Score screen next to the Health export for the same nights (scripts in `tools/score-fit/`). Two nights with
a daytime nap spanning the date boundary (09-10, 09-11) were excluded from the fits. Result on the other 69 nights:
total score mean error 1.6 points, 29% exact; per part the mean error is 0.4 (duration), 1.1 (bedtime) and 0.5
(interruptions).

| Part | Fitted rule | Fit |
| --- | --- | --- |
| Duration (50) | Full marks at 8h asleep (anything under loses points), then loss = 5.86 × hours_short^1.16: about 6 for 1h short, 13 for 2h, 21 for 3h, 29 for 4h. Oversleeping is not penalised. Uses time actually asleep (core + deep + REM), not time in bed. | 59% exact, off by 1 at most almost always, residuals uncorrelated with deep/REM/awake time, so no stage term. |
| Bedtime (30) | Baseline = **mean** of sleep onset over the previous 13 nights (median fit worse; 13 beat 7/10/14/20/30). Up to 15 min later than the baseline is free, then 20 points per 90 min (60 late = 10, 150 late = 30). Up to 60 min earlier is free, then 1 point per 30 min, max 6. | 64% exact. Matches the figures in the5krunner's article. |
| Interruptions (20) | From Apple's own Awake segments inside the night: first 3 wake events free then 0.8 each, plus 0.15 per awake minute beyond the first 8. A long awake spell (2h+) zeroes it. | 59% exact; wake-event count matters more than minutes (a 9-minute night with 2 events scored 20/20; 5 events in 11 minutes scored 18). |

The user's own hunch held for duration (anything under 8h loses points) but the free interruption allowance is by
event count (3 events) rather than minutes.

Known misses and caveats:

- Health exports stamp every sample with the *current* UTC offset, so nights before a daylight-saving change look
  an hour off in the raw export. Times must be converted to the real timezone (the app and fit scripts do).
- 2026-10-11 (latest night): Apple gave bedtime 20/30 although the onset was on the 13-night average; maybe it was
  scored on provisional data. 2026-09-21/23/24 lost fewer points than the fit predicts at 2.5h+ late, suggesting
  the late penalty flattens or the baseline weights recent nights.
- Naps and split nights: Apple sums all sleep that ends on a date into one duration (09-11: 361 + 201 min scored
  as 50/50); we only use the longest session. Not yet modelled.
- Interruptions need the raw Awake segments, which ingest now stores (`awake_min`, `wake_count`; migration
  `20261011180001`). Nights ingested before that have a gap-based estimate until the next sync of that night
  overwrites it; manual entries have none.
- The 13-night window is the previous 13 nights present in our table; Apple presumably does the same but we
  haven't tested gaps in the data.
- Stage-based deductions claimed by one article were not found: deep/REM do not explain the residuals.
- One person, one watch. Needs checking against another user's scores before trusting the constants.

To keep improving: add more nights (or another person's), re-run `tools/score-fit/`, and edit the constants at
the top of `web/src/lib/score/apple.ts`.

## Not built yet

- League/Trends "Score" still reads the `score` column (only manual entries fill it). Ranking on a computed score
  needs either every member's nights (already readable) scored client-side, or the score stored at ingest.
- A formula picker (only one formula exists).
