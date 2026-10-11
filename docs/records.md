# Records, podiums and championships

Everything here is **computed from the nights** in the database. There is no records or podiums table: the
pure TypeScript in `web/src/lib/league/` replays every night in date order, so history, "how long it stood"
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

Single night: longest duration (both divisions), most restorative (Watch), best score (Watch). For each of week,
fortnight, month and season: best average duration (both), restorative (Watch), score (Watch), **most consistent
bedtime** (lowest standard deviation of sleep onset) and **bedtime closest to target** (average distance from the
member's own `target_bedtime`, across midnight). The set of period kinds is `LEAGUE_KINDS` in `lib/league/types.ts`.

## Podiums, profiles, championships

- Podiums exist per period kind and per metric (duration, restorative, score). A weekly gold is not a monthly gold,
  and profiles count them separately and link each count back to the exact periods.
- A **championship** is a date range set by a group owner/admin (Group -> Championships). Whoever places top three
  over it (same every-night rule) gets a championship podium, counted separately from period podiums.
- **Most BOX**: on the League page, the standard deviation of the selected metric over the selected period
  (at least 3 nights). It follows the period pill ("Most BOX week", "Most BOX month", ...).

## Known limits

- Everything is recomputed from current data, so history can change when someone joins, leaves, backfills old nights
  or edits their target bedtime. Discord is protected from duplicate posts by stored markers; the in-app history is not.
- The Shortcut reaches back 7 days (Backfill 14), so a missed sync can permanently unrank someone for a period.
- Records, profiles and Discord ignore the evening blackout (League still hides rankings).
