// The native counterpart of web/src/styles.css + web/src/components/ui.tsx: same tokens, spacing and shapes.
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { LinearGradient } from 'expo-linear-gradient'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check, ChevronLeft, ChevronRight, type LucideProps } from 'lucide-react-native'
import { initials } from '@legity/core/format'
import { RADIUS, useColors, useStyles } from '../lib/theme'

type Icon = ComponentType<LucideProps>
export const TABULAR: TextStyle = { fontVariant: ['tabular-nums'] }

// ---- text ------------------------------------------------------------------------------------------------

export function T({
  children,
  muted,
  small,
  bold,
  style,
  numberOfLines,
  color,
}: {
  children: ReactNode
  muted?: boolean
  small?: boolean
  bold?: boolean
  style?: StyleProp<TextStyle>
  numberOfLines?: number
  color?: string
}) {
  const c = useColors()
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        { color: color ?? (muted ? c.muted : c.text), fontSize: small ? 13 : 16, lineHeight: small ? 18 : 22 },
        bold && { fontWeight: '600' },
        style,
      ]}
    >
      {children}
    </Text>
  )
}

export function BigNum({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useColors()
  return (
    <Text style={[{ color: c.text, fontSize: 52, fontWeight: '800', letterSpacing: -1.6, lineHeight: 56 }, TABULAR, style]}>
      {children}
    </Text>
  )
}

// ---- layout ----------------------------------------------------------------------------------------------

export function Screen({
  children,
  tabs,
  gap = 14,
  refreshing,
  onRefresh,
  padTop = true,
}: {
  children: ReactNode
  /** the screen sits above the tab bar */
  tabs?: boolean
  gap?: number
  refreshing?: boolean
  onRefresh?: () => void
  padTop?: boolean
}) {
  const insets = useSafeAreaInsets()
  const c = useColors()
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="never"
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.muted} /> : undefined}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: padTop ? insets.top + 14 : 0,
          paddingBottom: tabs ? 24 : insets.bottom + 32,
          gap,
        }}
      >
        {children}
      </ScrollView>
      {/* content scrolls under the status bar otherwise; keep the clock readable */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: c.bg }} />
    </KeyboardAvoidingView>
  )
}

export function Row({ children, between, style, gap = 10 }: { children: ReactNode; between?: boolean; style?: StyleProp<ViewStyle>; gap?: number }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, between && { justifyContent: 'space-between' }, style]}>
      {children}
    </View>
  )
}

export function Stack({ children, gap = 14, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ gap }, style]}>{children}</View>
}

export function PageHead({ title, right, back }: { title: string; right?: ReactNode; back?: boolean }) {
  const router = useRouter()
  const c = useColors()
  return (
    <View>
      {back && (
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 8 }}>
          <ChevronLeft size={22} color={c.accent} style={{ marginLeft: -4 }} />
          <Text style={{ color: c.accent, fontSize: 16 }}>Back</Text>
        </Pressable>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 40, marginBottom: 16 }}>
        <Text style={{ color: c.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.6, flexShrink: 1 }}>{title}</Text>
        {right}
      </View>
    </View>
  )
}

// ---- cards -----------------------------------------------------------------------------------------------

export function Card({
  children,
  title,
  hero,
  flush,
  style,
  gap,
  right,
}: {
  children: ReactNode
  title?: string
  hero?: boolean
  flush?: boolean
  style?: StyleProp<ViewStyle>
  gap?: number
  right?: ReactNode
}) {
  const c = useColors()
  const base: ViewStyle = {
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: hero ? c.heroLine : c.line,
    overflow: 'hidden',
    backgroundColor: c.surface,
  }
  const inner: ViewStyle = { padding: 16, paddingVertical: flush ? 0 : 16, gap }
  const head = title ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <CardTitle>{title}</CardTitle>
      {right}
    </View>
  ) : null
  if (hero) {
    return (
      // CSS: linear-gradient(160deg, hero-a 0%, hero-b 70%)
      <LinearGradient colors={[c.heroA, c.heroB]} locations={[0, 0.7]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={[base, style]}>
        <View style={inner}>
          {head}
          {children}
        </View>
      </LinearGradient>
    )
  }
  return (
    <View style={[base, style]}>
      <View style={inner}>
        {head}
        {children}
      </View>
    </View>
  )
}

export function CardTitle({ children }: { children: ReactNode }) {
  const c = useColors()
  return (
    <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600', letterSpacing: 1.04, textTransform: 'uppercase' }}>{children}</Text>
  )
}

export function Notice({ children }: { children: ReactNode }) {
  const c = useColors()
  return (
    <View style={{ backgroundColor: c.accentSoft, borderColor: c.noticeLine, borderWidth: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, gap: 10 }}>
      {children}
    </View>
  )
}

export function ErrorText({ error }: { error: unknown }) {
  const c = useColors()
  if (!error) return null
  const msg = error instanceof Error ? error.message : String(error)
  return <Text style={{ color: c.danger, fontSize: 14 }}>{msg}</Text>
}

export function Heading({ children }: { children: ReactNode }) {
  const c = useColors()
  return <Text style={{ color: c.text, fontSize: 30, fontWeight: '700', letterSpacing: -0.6 }}>{children}</Text>
}

export function Muted({ children }: { children: ReactNode }) {
  return <T muted>{children}</T>
}

// ---- chips, pills, segmented ----------------------------------------------------------------------------

export function Chip({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors()
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999, backgroundColor: c.surface2 }, style]}>
      {typeof children === 'string' ? <Text style={{ color: c.text, fontSize: 14 }}>{children}</Text> : children}
    </View>
  )
}

/** "Label <b>value</b>" inside a chip. */
export function ChipText({ label, value, valueColor }: { label?: string; value: string; valueColor?: string }) {
  const c = useColors()
  return (
    <Text style={{ color: c.text, fontSize: 14 }}>
      {label ? `${label} ` : ''}
      <Text style={{ fontWeight: '600', color: valueColor ?? c.text }}>{value}</Text>
    </Text>
  )
}

export function Chips({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  const s = useStyles((c) =>
    StyleSheet.create({
      wrap: { flexDirection: 'row', backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 14, padding: 3, gap: 2 },
      item: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 11, paddingHorizontal: 4 },
      on: { backgroundColor: c.accent },
      text: { color: c.muted, fontWeight: '600', fontSize: 14 },
      textOn: { color: c.onAccent },
    }),
  )
  return (
    <View style={s.wrap} accessibilityRole="tablist">
      {options.map((o) => (
        <Pressable
          key={String(o.value)}
          onPress={() => {
            Haptics.selectionAsync()
            onChange(o.value)
          }}
          style={[s.item, o.value === value && s.on]}
        >
          <Text numberOfLines={1} style={[s.text, o.value === value && s.textOn]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  )
}

export function Pill({ label, on, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  const c = useColors()
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync()
        onPress()
      }}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: on ? c.accent : c.line,
        backgroundColor: on ? c.accentSoft : c.surface,
      }}
    >
      <Text style={{ color: on ? c.text : c.muted, fontWeight: '600', fontSize: 14 }}>{label}</Text>
    </Pressable>
  )
}

export function PillScroller({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
      {children}
    </ScrollView>
  )
}

// ---- buttons ---------------------------------------------------------------------------------------------

export function Button({
  title,
  onPress,
  busy,
  disabled,
  variant = 'primary',
  small,
  icon: Icon,
  style,
}: {
  title: string
  onPress?: () => void
  busy?: boolean
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
  small?: boolean
  icon?: Icon
  style?: StyleProp<ViewStyle>
}) {
  const c = useColors()
  const off = busy || disabled
  const fg = variant === 'primary' ? c.onAccent : variant === 'danger' ? c.danger : c.text
  return (
    <Pressable
      accessibilityRole="button"
      disabled={off}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onPress?.()
      }}
      style={({ pressed }) => [
        {
          minHeight: small ? 38 : 50,
          paddingVertical: small ? 6 : 12,
          paddingHorizontal: small ? 14 : 20,
          borderRadius: small ? 12 : 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: variant === 'primary' ? c.accent : variant === 'secondary' ? c.surface2 : 'transparent',
          borderWidth: variant === 'primary' ? 0 : 1,
          borderColor: variant === 'danger' ? c.danger : c.line,
        },
        off && { opacity: 0.5 },
        pressed && { opacity: 0.75 },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {Icon && <Icon size={small ? 16 : 18} color={fg} />}
          <Text style={{ color: fg, fontWeight: '600', fontSize: small ? 14 : 16 }}>{title}</Text>
        </>
      )}
    </Pressable>
  )
}

export function IconButton({ icon: Icon, onPress, disabled, label }: { icon: Icon; onPress: () => void; disabled?: boolean; label: string }) {
  const c = useColors()
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: c.line,
        backgroundColor: c.surface,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.3 : pressed ? 0.7 : 1,
      })}
    >
      <Icon size={20} color={c.text} />
    </Pressable>
  )
}

// ---- lists -----------------------------------------------------------------------------------------------

export function List({ children }: { children: ReactNode }) {
  return <View>{children}</View>
}

/** A row in a list; `last` removes the divider. Pass onPress to make it tappable (adds a chevron unless chevron={false}). */
export function ListItem({
  children,
  onPress,
  last,
  chevron = true,
  me,
  style,
}: {
  children: ReactNode
  onPress?: () => void
  last?: boolean
  chevron?: boolean
  me?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const c = useColors()
  const body = (
    <>
      {children}
      {onPress && chevron && <ChevronRight size={18} color={c.muted} />}
    </>
  )
  const base: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: me ? 10 : 4,
    minHeight: 52,
    borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth * 2,
    borderBottomColor: c.line,
    ...(me ? { backgroundColor: c.accentSoft, borderRadius: 12, marginHorizontal: -6 } : null),
  }
  if (!onPress) return <View style={[base, style]}>{body}</View>
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.6 }, style]}>
      {body}
    </Pressable>
  )
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const c = useColors()
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.surface2, borderColor: c.line, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: c.text, fontWeight: '700', fontSize: size * 0.38 }}>{initials(name)}</Text>
    </View>
  )
}

export function Rank({ n }: { n: number }) {
  const c = useColors()
  return (
    <View style={{ width: 22, alignItems: 'center' }}>
      <Text style={[{ color: n === 1 ? c.gold : c.muted, fontWeight: '700', fontSize: 16 }, TABULAR]}>{n}</Text>
    </View>
  )
}

export function Value({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useColors()
  return <Text style={[{ color: c.text, fontWeight: '600', fontSize: 16 }, TABULAR, style]}>{children}</Text>
}

export function Kv({ label, value, last }: { label: string; value: ReactNode; last?: boolean }) {
  const c = useColors()
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 7, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth * 2, borderBottomColor: c.line }}>
      <Text style={{ color: c.muted, fontSize: 15 }}>{label}</Text>
      <Text style={[{ color: c.text, fontSize: 15, flexShrink: 1, textAlign: 'right' }, TABULAR]}>{value}</Text>
    </View>
  )
}

export function Meter({ fraction }: { fraction: number }) {
  const c = useColors()
  return (
    <View style={{ height: 8, borderRadius: 8, backgroundColor: c.surface2, overflow: 'hidden' }}>
      <View style={{ height: '100%', borderRadius: 8, backgroundColor: c.accent, width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }} />
    </View>
  )
}

export function Divider() {
  const c = useColors()
  return <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: c.line }} />
}

// ---- forms -----------------------------------------------------------------------------------------------

export function Field({ label, style, grow, ...props }: { label?: string; grow?: boolean } & TextInputProps) {
  const c = useColors()
  const [focus, setFocus] = useState(false)
  return (
    <View style={[{ gap: 6 }, grow && { flex: 1 }]}>
      {label ? <Text style={{ color: c.muted, fontSize: 14 }}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={c.muted}
        selectionColor={c.accent}
        keyboardAppearance="dark"
        {...props}
        onFocus={(e) => {
          setFocus(true)
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocus(false)
          props.onBlur?.(e)
        }}
        style={[
          {
            minHeight: 48,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 14,
            backgroundColor: c.surface2,
            borderWidth: focus ? 2 : 1,
            borderColor: focus ? c.accent : c.line,
            color: c.text,
            fontSize: 16, // 16px+ stops iOS zooming on focus
          },
          style,
        ]}
      />
    </View>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  const c = useColors()
  const x = useRef(new Animated.Value(on ? 1 : 0)).current
  useEffect(() => {
    Animated.timing(x, { toValue: on ? 1 : 0, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }).start()
  }, [on, x])
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      onPress={() => {
        Haptics.selectionAsync()
        onChange(!on)
      }}
      style={{ width: 52, height: 32, borderRadius: 999, backgroundColor: on ? c.accent : c.surface2, borderColor: on ? c.accent : c.line, borderWidth: 1 }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: 3,
          left: 3,
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: !on && c.knob === '#120000' ? c.muted : c.knob,
          transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }],
        }}
      />
    </Pressable>
  )
}

/** Looks like the web's <select>: a field that opens a native-style list sheet. */
export function SelectField<V extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string
  value: V
  options: { value: V; label: string }[]
  onChange: (v: V) => void
}) {
  const c = useColors()
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value)
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={{ color: c.muted, fontSize: 14 }}>{label}</Text> : null}
      <Pressable
        onPress={() => setOpen(true)}
        style={{ minHeight: 48, paddingHorizontal: 14, borderRadius: 14, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Text style={{ color: c.text, fontSize: 16 }}>{current?.label ?? ''}</Text>
        <ChevronRight size={18} color={c.muted} style={{ transform: [{ rotate: '90deg' }] }} />
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        {options.map((o, i) => (
          <ListItem
            key={String(o.value)}
            last={i === options.length - 1}
            chevron={false}
            onPress={() => {
              onChange(o.value)
              setOpen(false)
            }}
          >
            <Text style={{ color: c.text, fontSize: 17, flex: 1 }}>{o.label}</Text>
            {o.value === value && <Check size={20} color={c.accent} />}
          </ListItem>
        ))}
      </Sheet>
    </View>
  )
}

/** Bottom sheet / popup used for pickers and the web's <dialog> popups. */
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const c = useColors()
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={onClose} />
      <View
        style={{
          backgroundColor: c.surface,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          borderColor: c.line,
          borderWidth: 1,
          paddingHorizontal: 18,
          paddingTop: 16,
          paddingBottom: insets.bottom + 16,
          maxHeight: '75%',
        }}
      >
        {title ? <Text style={{ color: c.text, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>{title}</Text> : null}
        <ScrollView bounces={false}>{children}</ScrollView>
      </View>
    </Modal>
  )
}

// ---- misc ------------------------------------------------------------------------------------------------

export function Spinner() {
  const c = useColors()
  return <ActivityIndicator color={c.accent} style={{ marginVertical: 40 }} />
}

export function Centered({ children }: { children: ReactNode }) {
  const c = useColors()
  return <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
}

export function StatusDot({ tone = 'muted' }: { tone?: 'ok' | 'bad' | 'muted' }) {
  const c = useColors()
  return <View style={{ width: 8, height: 8, borderRadius: 4, marginRight: 6, backgroundColor: tone === 'ok' ? c.teal : tone === 'bad' ? c.danger : c.muted }} />
}

export function Steps({ items }: { items: ReactNode[] }) {
  const c = useColors()
  return (
    <View style={{ gap: 14 }}>
      {items.map((it, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: c.accent, fontWeight: '700', fontSize: 14 }}>{i + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>{it}</View>
        </View>
      ))}
    </View>
  )
}

// ---- date / time pickers (native iOS compact pickers inside a field-shaped box) --------------------------

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}
const p2 = (n: number) => String(n).padStart(2, '0')

export function DateField({ label, value, onChange, max }: { label?: string; value: string; onChange: (iso: string) => void; max?: string }) {
  const c = useColors()
  return (
    <View style={{ gap: 6, flex: 1 }}>
      {label ? <Text style={{ color: c.muted, fontSize: 14 }}>{label}</Text> : null}
      <View style={{ minHeight: 48, borderRadius: 14, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.line, justifyContent: 'center', paddingHorizontal: 8, alignItems: 'flex-start' }}>
        <DateTimePicker
          mode="date"
          display="compact"
          themeVariant="dark"
          accentColor={c.accent}
          value={parseISODate(value)}
          maximumDate={max ? parseISODate(max) : undefined}
          onValueChange={(_e, d) => d && onChange(`${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`)}
        />
      </View>
    </View>
  )
}

export function TimeField({ label, value, onChange }: { label?: string; value: string; onChange: (hhmm: string) => void }) {
  const c = useColors()
  const [h, m] = value.split(':').map(Number)
  const d = new Date()
  d.setHours(h || 0, m || 0, 0, 0)
  return (
    <View style={{ gap: 6, flex: 1 }}>
      {label ? <Text style={{ color: c.muted, fontSize: 14 }}>{label}</Text> : null}
      <View style={{ minHeight: 48, borderRadius: 14, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.line, justifyContent: 'center', paddingHorizontal: 8, alignItems: 'flex-start' }}>
        <DateTimePicker
          mode="time"
          display="compact"
          themeVariant="dark"
          accentColor={c.accent}
          value={d}
          onValueChange={(_e, t) => t && onChange(`${p2(t.getHours())}:${p2(t.getMinutes())}`)}
        />
      </View>
    </View>
  )
}

/** The web's centred <dialog> popup: dimmed backdrop, rounded card, tap outside to close. */
export function Popup({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const c = useColors()
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Pressable style={{ ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={onClose} />
        <View style={{ width: '100%', maxWidth: 360, maxHeight: '86%', backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 20, padding: 18 }}>
          {children}
        </View>
      </View>
    </Modal>
  )
}

/** A small stat tile ("peek-stat"): label over a bold value. */
export function StatTile({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  const c = useColors()
  return (
    <View style={{ backgroundColor: c.surface2, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, ...(wide ? { width: '100%' } : { flexBasis: '48%', flexGrow: 1 }) }}>
      <T muted small>{label}</T>
      <Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>{value}</Text>
    </View>
  )
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <Button
      small
      variant="secondary"
      title={done ? 'Copied' : label}
      icon={done ? Check : undefined}
      onPress={async () => {
        await Clipboard.setStringAsync(text)
        setDone(true)
        setTimeout(() => setDone(false), 1800)
      }}
    />
  )
}
