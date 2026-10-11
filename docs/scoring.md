# Sleep scoring

Formulas live in `web/src/lib/score/` (one file per formula, registered in `index.ts`). Each takes a night, the
user's earlier nights and a context (timezone, goal) and returns a score, band and per-part breakdown. They run in
the browser, so changing a formula needs no migration or re-ingest. Today shows the breakdown for the latest night.

Inputs per night: `sleep_start`, `sleep_end`, `duration_min`, plus `awake_min` and `wake_count`, which ingest now
derives (migration `20261011170001`): awake minutes = time in the session not covered by sleep segments, wake
events = gaps of 2+ minutes between merged sleep segments. Manual entries have neither, so they get no score.

## Formula 1: Apple-style (`apple.ts`)

Apple's own page confirms only: 0-100, **duration 50 + bedtime consistency 30 + interruptions 20**, bedtime is
sleep onset compared with the **previous 13 nights**, interruptions look at how often and how long you were awake,
and the bands (watchOS 26.2): 0-40 Very low, 41-60 Low, 61-80 OK, 81-95 High, 96-100 Very high.
([Apple Watch guide](https://support.apple.com/guide/watch/view-your-sleep-score-apded441a669/watchos),
[MacRumors on the band change](https://www.macrumors.com/2025/11/04/watchos-26-2-updates-sleep-score-ranges/))

The curves inside each part are not published. The most detailed breakdown found is
[the5krunner](https://the5krunner.com/2025/10/06/how-apple-watchs-sleep-score-is-calculated-all-you-need-to-know-to-improve-sleep-health/);
its numbers are partly self-contradictory and not attributed to Apple, so they are used as a starting point only.

| Part | What we implement | Confidence |
| --- | --- | --- |
| Duration (50) | No loss within 10 min of the goal (7h50 for 8h). Loss by minutes short: 1h=5, 2h=13, 3h=25, 4h=36, 5h=44, 6h=50, linear between. Oversleeping not penalised. | Threshold and 1h/2h points from the5krunner; the rest is a smooth extrapolation (the source's "20+ points for the next hour" doesn't fit its own 13-point figure). |
| Bedtime (30) | Baseline = median onset of the previous 13 nights (needs 3+, else full marks). Up to 15 min late is free, then 20 points per 90 min (60 late = 10, 150 late = 30). Up to 60 min early is free, then 1 per 30 min, max 6. | Matches the source's 60 and 150 minute figures. Median rather than mean is our choice. |
| Interruptions (20) | First 11 min awake free, then 1 point per 4 min; first 2 wake events free, then 1 point per 2 events. | From the source; wake event definition (gap of 2+ min) is ours. |

Left out on purpose: the claimed 5-point deductions for low deep / REM. Apple's page doesn't mention stages and
[Longevity Benchmark](https://www.longevitybenchmark.com/sleep/apple-watch-sleep-score/) says stages don't affect the
score. Nightly goal is fixed at 8h (`DEFAULT_GOAL_MIN`); there is no per-user goal setting yet.

To check accuracy: compare our score with the one in the Health / Sleep app for the same nights and adjust the
`ESTIMATE` constants at the top of `apple.ts`.

## Not built yet

- League/Trends "Score" still reads the `score` column (only manual entries fill it). Ranking on a computed score
  needs either every member's nights (already readable) scored client-side, or the score stored at ingest.
- A formula picker (only one formula exists).
