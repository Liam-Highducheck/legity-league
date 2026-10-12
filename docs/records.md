# Records, podiums and championships

Everything here is **computed from the nights** in the database. There is no records or podiums table: the
pure TypeScript in `packages/core/src/league/` replays every night in date order, so history, "how long it stood"
and past podiums fall out of the data. The Discord Edge Function runs the same code (see `docs/discord.md`).

## The rules

- **Complete periods only.** Weeks run Monday to Sunday, fortnights are 14-day blocks anchored on 2024-01-01,
  months are calendar months, seasons are southern hemisphere (Dec-Feb is summer). A period counts once it has ended.
- **Every night.** An average-based podium or record needs a night on **every** day of the period (all 7 for a week).
  One missing night means the person isn't ranked for that period. Single-night records have no such rule.
- **Manual nights never count.** They are typed in by hand (or written straight to the API), so they can't place or
  set records. (`COUNTS_MANUAL` in `lib/league/device.ts` flips this.)
- **Strictly better.** A record is broken only by a strictly better value. Equal values by someone else are
  co-holders (ties); people reaching the best value on the same day share it. Values are compared after rounding
  (whole minutes, scores to 0.1).
- **Ties share a rank** in podiums (1, 1, 3). A podium needs at least two ranked people.

## Devices

`sleep_nights.device_class` is `watch`, `phone` or `manual`, set by ingest from the segments it receives:
a night with sleep-stage data (core/deep/REM) is `watch`; asleep/in-bed only is `phone`. Client writes are forced to
`manual` by a trigger. "Watch" really means "has stage data": another wearable that writes stages to Apple Health
looks identical. A future upgrade is the Shortcut sending each sample's source name (not checked whether Shortcuts
exposes it).

- **Records** are kept in two divisions: **Watch** (every night in the window is `watch`) and **Non-Watch** (a window
  with any `phone` night). Restorative time and score need stages, so they are Watch records only.
- **Podiums** rank everyone together by default. Owners/admins can switch a device type off per metric
  (`groups.settings.eligibility`, edited on the group page). Defaults: everything counts.

## Record categories

Shown in this order: **longest duration, longest restorative time, most consistent bedtime, bedtime closest to
target, best score**.

- Single night: duration (both divisions), restorative (Watch), score (Watch).
- For each of week, fortnight, month and season: best average duration (both), restorative (Watch), **most
  consistent bedtime** (lowest standard deviation of sleep onset, both), **bedtime closest to target** (average
  distance from the member's own `target_bedtime`, across midnight, both) and score (Watch).
- Tap **Show the nights** on a record (or on an entry in its history) to see every night behind it: the date, that
  night's value for the record, and its duration, score and bedtime.
- **Rolling** (button on the Records page, off by default): instead of calendar periods, the best run of any N
  consecutive days: 7 for week, 14 fortnight, 30 month, 90 season (`ROLLING_DAYS`). The same every-night rule applies.
  Rolling records are not announced on Discord (only the calendar ones are).
- **More statistics** (`/records/advanced`, linked from the Records page): best REM, best deep sleep and best
  interruptions score (0-20), for a night or a window, calendar or rolling. Watch records only.

The set of period kinds is `LEAGUE_KINDS` in `lib/league/types.ts`.

## Podiums, profiles, championships

- Podiums exist per period kind and per metric (duration, restorative, score). A weekly gold is not a monthly gold,
  and profiles count them separately and link each count back to the exact periods.
- A **championship** is a date range set by a group owner/admin (Group -> Championships). Whoever places top three
  over it (same every-night rule) gets a championship podium, counted separately from period podiums.
- **Most BOX**: on the League page, the standard deviation of the selected metric over the selected period
  (at least 3 nights). It follows the period pill ("Most BOX week", "Most BOX month", ...).

## Trends: best and worst runs

On Trends, the **Best** button jumps to your best run of the selected number of days (7, 30 or 90) for the selected
metric, anywhere in your history; tap again for your worst, and again to go back to the latest days. Unlike records
this allows a few missing nights: a run needs nights on at least 80% of its days (`MIN_WINDOW_COVERAGE`).

## Known limits

- Everything is recomputed from current data, so history can change when someone joins, leaves, backfills old nights
  or edits their target bedtime. Discord is protected from duplicate posts by stored markers; the in-app history is not.
- The Shortcut reaches back 7 days (Backfill 14), so a missed sync can permanently unrank someone for a period.
- Records, profiles and Discord ignore the evening blackout (League still hides rankings).
