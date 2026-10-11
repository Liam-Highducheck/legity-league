# Score fitting scripts

Throwaway analysis used to fit the Apple-style formula (see `docs/scoring.md`). They read personal Health data
and a spreadsheet of Apple's own scores, neither of which is in the repo, and use hard-coded `/tmp/ll/` paths:

1. `grep 'HKCategoryTypeIdentifierSleepAnalysis' export.xml > /tmp/sleep_lines.txt`, then `extract.py` writes
   `sleep_nights.csv` (one row per night) to fill in Apple's component points by hand.
2. Save the filled sheet as `/tmp/ll/filled.csv`; `load.py` is the shared loader.
3. `fitbed.py` (bedtime window/slope grid search), `fitint2.py` (interruptions grid search).
4. `val.ts` runs `web/src/lib/score/apple.ts` over the same nights and prints MAE / exact-match per part
   (`node --experimental-strip-types val.ts`, after dumping `/tmp/ll/val.json`).

Note: Health exports stamp every sample with the *current* UTC offset, so convert instants to the user's real
timezone (zoneinfo / Intl) before taking time of day, otherwise nights before a DST change are an hour off.
