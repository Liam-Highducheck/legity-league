export const SHORTCUT_NAME = 'Legity Sync'
export const BACKFILL_NAME = 'Legity Backfill'

const runUrl = (name: string, label: string) =>
  `shortcuts://run-shortcut?name=${encodeURIComponent(name)}&input=text&text=${encodeURIComponent(label)}`

/** Opens the Shortcuts app and runs the shortcut, passing a trigger label as its input. */
export const runShortcutUrl = (label: string) => runUrl(SHORTCUT_NAME, label)

/** The backfill shortcut reaches back 14 days instead of the regular 7. */
export const runBackfillUrl = () => runUrl(BACKFILL_NAME, 'backfill')
