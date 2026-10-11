export type Theme = 'default' | 'red'

const KEY = 'll_theme'
const COLORS: Record<Theme, string> = { default: '#0b0d1a', red: '#080000' }

export function getTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'red' ? 'red' : 'default'
  } catch {
    return 'default'
  }
}

/** Sets <html data-theme> and the browser/status-bar colour. A per-device preference, so it lives in localStorage. */
export function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'red') root.setAttribute('data-theme', 'red')
  else root.removeAttribute('data-theme')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLORS[theme])
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* storage can be unavailable; the choice just won't persist */
  }
}
