// Mirrors the web app's CSS variables (web/src/styles.css) so both look identical.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export type ThemeName = 'default' | 'red'

export interface Colors {
  bg: string
  surface: string
  surface2: string
  line: string
  text: string
  muted: string
  accent: string
  accentSoft: string
  teal: string
  gold: string
  silver: string
  bronze: string
  danger: string
  onAccent: string
  knob: string
  heroA: string
  heroB: string
  heroLine: string
  noticeLine: string
  tabbarBg: string
  chartBar: string
  chartHit: string
  chartLine: string
  chartLine2: string
  chartDeep: string
  chartRem: string
  chartHitDeep: string
  chartHitRem: string
  chartGrid: string
}

export const THEMES: Record<ThemeName, Colors> = {
  default: {
    bg: '#0b0d1a',
    surface: '#151a2e',
    surface2: '#1d2340',
    line: '#2a3158',
    text: '#eef0ff',
    muted: '#8d94b8',
    accent: '#8b7cff',
    accentSoft: 'rgba(139, 124, 255, 0.16)',
    teal: '#5eead4',
    gold: '#ffd166',
    silver: '#c3c9dd',
    bronze: '#d89a6a',
    danger: '#ff6b81',
    onAccent: '#ffffff',
    knob: '#ffffff',
    heroA: '#232a5c',
    heroB: '#151a2e',
    heroLine: '#333c7a',
    noticeLine: '#3b3f87',
    tabbarBg: 'rgba(11, 13, 26, 0.88)',
    chartBar: '#8b7cff',
    chartHit: '#5eead4',
    chartLine: '#ffd166',
    chartLine2: '#ff8fab',
    chartDeep: '#5b4bd6',
    chartRem: '#a99dff',
    chartHitDeep: '#14b8a6',
    chartHitRem: '#99f6e4',
    chartGrid: '#2a3158',
  },
  // Pure red on black for use with a phone-wide red colour filter (see styles.css).
  red: {
    bg: '#080000',
    surface: '#160000',
    surface2: '#260000',
    line: '#4a0000',
    text: '#ff1a00',
    muted: '#b80000',
    accent: '#ff0000',
    accentSoft: 'rgba(255, 0, 0, 0.16)',
    teal: '#ff0000',
    gold: '#e00000',
    silver: '#c00000',
    bronze: '#900000',
    danger: '#ff0000',
    onAccent: '#120000',
    knob: '#120000',
    heroA: '#3a0000',
    heroB: '#160000',
    heroLine: '#6a0000',
    noticeLine: '#6a0000',
    tabbarBg: 'rgba(8, 0, 0, 0.9)',
    chartBar: '#8a0000',
    chartHit: '#ff0000',
    chartLine: '#ff0000',
    chartLine2: '#ff0000',
    chartDeep: '#5a0000',
    chartRem: '#a00000',
    chartHitDeep: '#b30000',
    chartHitRem: '#ff0000',
    chartGrid: '#4a0000',
  },
}

export const RADIUS = 18
const KEY = 'll_theme'

function readTheme(): ThemeName {
  try {
    return localStorage.getItem(KEY) === 'red' ? 'red' : 'default'
  } catch {
    return 'default'
  }
}

interface ThemeState {
  name: ThemeName
  colors: Colors
  setTheme: (t: ThemeName) => void
}

const ThemeContext = createContext<ThemeState>({ name: 'default', colors: THEMES.default, setTheme: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState<ThemeName>(readTheme)
  const setTheme = useCallback((t: ThemeName) => {
    setName(t)
    try {
      localStorage.setItem(KEY, t)
    } catch {
      /* the choice just won't persist */
    }
  }, [])
  const value = useMemo(() => ({ name, colors: THEMES[name], setTheme }), [name, setTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
export const useColors = () => useContext(ThemeContext).colors

/** Builds a StyleSheet from the current theme's colours, rebuilt only when the theme changes. */
export function useStyles<T extends Record<string, object>>(factory: (c: Colors) => T): T {
  const colors = useColors()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => factory(colors), [colors])
}
