// GENERATED from packages/core/src/league/columns.ts by scripts/sync-shared.mjs. Do not edit here: change the source and run
//   node scripts/sync-shared.mjs
/** Columns the league reads from sleep_nights (shared by the web app and the Discord Edge Function). */
export const NIGHT_COLUMNS_BASE =
  'user_id,night_date,duration_min,score,restorative_min,deep_min,rem_min,source,sleep_start,sleep_end,awake_min,wake_count,timezone'

/** Plus the device class, which exists once the device_class migration has been applied. */
export const NIGHT_COLUMNS = `${NIGHT_COLUMNS_BASE},device_class`
