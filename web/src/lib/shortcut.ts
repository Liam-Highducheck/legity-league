export const SHORTCUT_NAME = 'Legity Sync'

/** Opens the Shortcuts app and runs the shortcut, passing a trigger label as its input. */
export const runShortcutUrl = (label: string) =>
  `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}&input=text&text=${encodeURIComponent(label)}`
