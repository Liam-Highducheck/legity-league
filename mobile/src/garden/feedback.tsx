import { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, Easing, Text, View } from 'react-native'
import { AlertCircle, Check } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useColors } from '../lib/theme'

/** Haptic accents for the garden: a tick for selecting, a thud for placing, a ripple for rewards, a buzz for refusals. */
export const buzz = {
  select: () => void Haptics.selectionAsync(),
  place: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  light: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  heavy: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  error: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
}

type ToastState = { key: number; text: string; tone: 'ok' | 'bad' }

/** A pill that slides down from the top, holds for a moment and leaves. Render `node` once, call `show` anywhere. */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)
  const counter = useRef(0)
  const show = useCallback((text: string, tone: 'ok' | 'bad' = 'ok') => {
    counter.current += 1
    setToast({ key: counter.current, text, tone })
  }, [])
  const node = toast ? <ToastView key={toast.key} toast={toast} onDone={() => setToast((t) => (t?.key === toast.key ? null : t))} /> : null
  return { show, node }
}

function ToastView({ toast, onDone }: { toast: ToastState; onDone: () => void }) {
  const c = useColors()
  const insets = useSafeAreaInsets()
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.sequence([
      Animated.spring(v, { toValue: 1, friction: 7, tension: 110, useNativeDriver: true }),
      Animated.delay(toast.tone === 'bad' ? 2600 : 1700),
      Animated.timing(v, { toValue: 0, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(({ finished }) => finished && onDone())
  }, [v, toast.tone, onDone])
  const Icon = toast.tone === 'bad' ? AlertCircle : Check
  const color = toast.tone === 'bad' ? c.danger : c.accent
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: 0, right: 0, top: insets.top + 60, alignItems: 'center',
        opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, backgroundColor: c.surface2, borderWidth: 1, borderColor: color, maxWidth: '88%' }}>
        <Icon size={16} color={color} strokeWidth={2.4} />
        <Text style={{ color: c.text, fontSize: 14, fontWeight: '600', flexShrink: 1 }}>{toast.text}</Text>
      </View>
    </Animated.View>
  )
}

/** A number that rolls to its new value instead of jumping, so earning and spending feel like something. */
export function CountUp({ value, bold = true }: { value: number; bold?: boolean }) {
  const c = useColors()
  const anim = useRef(new Animated.Value(value)).current
  const [shown, setShown] = useState(value)
  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setShown(Math.round(v)))
    Animated.timing(anim, { toValue: value, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
    return () => anim.removeListener(id)
  }, [value, anim])
  return <Text style={{ color: c.text, fontSize: 13, fontWeight: bold ? '700' : '400', fontVariant: ['tabular-nums'] }}>{shown}</Text>
}

/** A progress bar whose fill eases to its value (the plain Meter jumps). */
export function GrowthMeter({ fraction, color }: { fraction: number; color?: string }) {
  const c = useColors()
  const f = Math.max(0, Math.min(1, fraction))
  const w = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(w, { toValue: f, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
  }, [f, w])
  return (
    <View style={{ height: 8, borderRadius: 8, backgroundColor: c.surface2, overflow: 'hidden' }}>
      <Animated.View style={{ height: '100%', borderRadius: 8, backgroundColor: color ?? c.accent, width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </View>
  )
}
