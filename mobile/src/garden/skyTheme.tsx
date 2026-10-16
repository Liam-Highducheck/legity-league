import { useMemo, type ReactNode } from 'react'
import { useLocalSearchParams } from 'expo-router'
import { ColorsOverride, THEMES, type Colors } from '../lib/theme'
import { useTimeOfDay } from './motion'

/** The garden's night: the indigo of its sky, so sheets feel like part of the scene. */
const NIGHT: Colors = {
  ...THEMES.default,
  bg: '#141a42',
  surface: '#1d2552',
  surface2: '#27306a',
  line: '#35417f',
  text: '#eef0ff',
  muted: '#a1a9d6',
  accent: '#8b7cff',
  accentSoft: 'rgba(139, 124, 255, 0.2)',
  chartGrid: '#35417f',
}

/** The garden's day: pale sky and soft white, with dark ink for text. */
const DAY_COLORS: Colors = {
  ...THEMES.default,
  bg: '#e6f1f4',
  surface: '#ffffff',
  surface2: '#eef5f6',
  line: '#cfe0e3',
  text: '#222d4a',
  muted: '#62738f',
  accent: '#6a5ce0',
  accentSoft: 'rgba(106, 92, 224, 0.14)',
  gold: '#c28608',
  danger: '#d5435c',
  onAccent: '#ffffff',
  knob: '#ffffff',
  chartGrid: '#cfe0e3',
}

/** Whether the garden is showing night (dev builds can force `?sky=day|night`). */
export function useGardenNight(): boolean {
  const { sky } = useLocalSearchParams<{ sky?: string }>()
  const clockNight = useTimeOfDay() === 'night'
  return __DEV__ && (sky === 'day' || sky === 'night') ? sky === 'night' : clockNight
}

export function useSkyColors(): Colors {
  const night = useGardenNight()
  return useMemo(() => (night ? NIGHT : DAY_COLORS), [night])
}

/** Re-themes everything inside to match the sky. */
export function SkyThemed({ children }: { children: ReactNode }) {
  return <ColorsOverride colors={useSkyColors()}>{children}</ColorsOverride>
}
