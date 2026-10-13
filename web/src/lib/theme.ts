export type Theme = 'default' | 'ember' | 'red'

const KEY = 'll_theme'
const COLORS: Record<Theme, string> = { default: '#0b0d1a', ember: '#0f0a0c', red: '#080000' }

export function getTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'red' || v === 'ember' ? v : 'default'
  } catch {
    return 'default'
  }
}

/** Sets <html data-theme> and the browser/status-bar colour. A per-device preference, so it lives in localStorage. */
export function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'default') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLORS[theme])
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* storage can be unavailable; the choice just won't persist */
  }
}
