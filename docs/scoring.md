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
| Bedtime (30) | Baseline = **mean** of sleep onset over the previous 13 nights (median fit worse; 13 beat 7/10/14/20/30). Up to 15 min later than the baseline is free, then 20 points per 90 min (60 late = 10, 150 late = 30). Up to 60 min earlier is free, then 1 point per 30 min, max 6. | 1.4 / 62%; 0.85 / 66% without the Melbourne-trip nights below |
| Interruptions (20) | From Apple's own Awake segments inside the night: wake events are awake spells of 1+ minute; first 2.5 events free then 1.1 points each, plus 0.15 per awake minute beyond the first 11. A long awake spell (2h+) zeroes it. | 0.55 / 54%; a grid search of other shapes did not do better than about 65% |

Total score: mean error 1.8 points (1.2 excluding the Melbourne trip), 37% exact.

Duration is as good as the data allows. The only places the duration curve and the data disagree:
two pairs of nights where Apple gave different points for effectively identical sleep (333.88 min = 33 pts vs
333.90 min = 32 pts; 217.4 min = 19 vs 219.4 min = 18), which no function of minutes asleep can explain, and the
two nap nights. The pairs are consistent with Apple rounding component points so that they add up to the integer
total, which would put a permanent +/-1 noise floor on every component. Checking this needs the real total scores
(the `apple_score` column) for those nights.

Known misses and caveats:

- Health exports stamp every sample with the *current* UTC offset, so nights before a daylight-saving change look
  an hour off in the raw export. Each record also carries an `HKTimeZone` metadata entry with the real zone
  (Sydney, plus Melbourne, Brisbane and Fiji trips in this data). Convert with that, not the offset. The app uses
  the profile timezone for everything, which is wrong on trips; the sleep sync does not send the zone.
- 2026-07-10, 07-11, 07-13 (and 07-14, 07-16) scored 17-20 points lower on bedtime than the fit predicts, even
  though the onset was close to the 13-night average. Those nights fall in a Melbourne trip (07-09 to 07-13, same
  UTC offset as Sydney in July), so a timezone change probably alters how Apple compares bedtimes. Not modelled.
- 2026-09-15/19/21/23/24 lost fewer points than the fit predicts at 2.5h+ late, suggesting
  the late penalty flattens or the baseline weights recent nights.
- Naps and split nights: Apple seems to sum all sleep that ends on a date into one duration (09-11: 361 + 201 min
  scored as 50/50; 09-10 scored 50 on 412 min, so its rule for the day boundary is unclear). Ingest keeps only the
  longest session per date and the league ranks on that, so naps are deliberately not modelled: two nights in 100.
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
