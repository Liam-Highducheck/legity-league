// The native counterpart of web/src/styles.css + web/src/components/ui.tsx: same tokens, spacing and shapes.
import { createContext, useContext, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Animated,
  Dimensions,
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
import { Check, ChevronDown, ChevronLeft, ChevronRight, type LucideProps } from 'lucide-react-native'
import { initials } from '@legity/core/format'
import { RADIUS, useColors, useStyles } from '../lib/theme'

type Icon = ComponentType<LucideProps>

/**
 * True inside screens that sit under a native navigation header (pushed screens). The header owns the status bar area and
 * the Back button, so the content must not add the top safe-area padding itself.
 */
export const HeaderContext = createContext(false)
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
  const underHeader = useContext(HeaderContext) && !tabs
  // Keyboard avoidance needs to know how far this view sits from the top of the window (the header height).
  const [top, setTop] = useState(0)
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={top}
      onLayout={(e) => {
        const target = e.target as unknown as { measureInWindow?: (cb: (x: number, y: number) => void) => void }
        target.measureInWindow?.((_x, y) => setTop(y))
      }}
    >
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="never"
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.muted} /> : undefined}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: padTop ? (underHeader ? 14 : insets.top + 14) : 0,
          paddingBottom: tabs ? 24 : insets.bottom + 32,
          gap,
        }}
      >
        {children}
      </ScrollView>
      {/* content scrolls under the status bar otherwise; keep the clock readable */}
      {!underHeader && <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: c.bg }} />}
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

export function PageHead({ title, right }: { title: string; right?: ReactNode; /** the native header provides Back; kept so call sites read the same as the web */ back?: boolean }) {
  const c = useColors()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 40, marginBottom: 16 }}>
      <Text style={{ color: c.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.6, flexShrink: 1 }}>{title}</Text>
      {right}
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
          // primary keeps an (invisible) border so every variant has the same box
          borderWidth: 1,
          borderColor: variant === 'primary' ? 'transparent' : variant === 'danger' ? c.danger : c.line,
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

/**
 * The web's `outline: 2px solid var(--accent); outline-offset: 1px`. Drawn as an overlay outside the field so
 * focusing never changes the field's own border or content size (changing borderWidth would nudge the text).
 */
export function FocusRing({ on, radius = 14 }: { on: boolean; radius?: number }) {
  const c = useColors()
  if (!on) return null
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderRadius: radius + 3, borderWidth: 2, borderColor: c.accent }}
    />
  )
}

// ---- forms -----------------------------------------------------------------------------------------------

export function Field({ label, style, grow, ...props }: { label?: string; grow?: boolean } & TextInputProps) {
  const c = useColors()
  const [focus, setFocus] = useState(false)
  return (
    <View style={[{ gap: 6 }, grow && { flex: 1 }]}>
      {label ? <Text style={{ color: c.muted, fontSize: 14 }}>{label}</Text> : null}
      <View>
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
            borderWidth: 1,
            borderColor: c.line,
            color: c.text,
            fontSize: 16, // 16px+ stops iOS zooming on focus
          },
          style,
        ]}
      />
      <FocusRing on={focus} />
      </View>
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

export interface MenuOption<V> {
  value: V
  label: string
  /** shown in the accent colour (an action rather than a choice) */
  accent?: boolean
}

/**
 * A menu that drops down from its trigger (like a native <select> / iOS pull-down menu), flipping above when there is
 * no room below. Tap outside to dismiss. The selected option is scrolled into view for long lists.
 */
export function DropdownMenu<V extends string | number>({
  options,
  value,
  onChange,
  align = 'left',
  minWidth,
  children,
}: {
  options: MenuOption<V>[]
  value?: V
  onChange: (v: V) => void
  align?: 'left' | 'right'
  minWidth?: number
  children: (open: () => void, isOpen: boolean) => ReactNode
}) {
  const c = useColors()
  const insets = useSafeAreaInsets()
  const anchor = useRef<View>(null)
  const scroll = useRef<ScrollView>(null)
  const fade = useRef(new Animated.Value(0)).current
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [visible, setVisible] = useState(false)
  const { width: screenW, height: screenH } = Dimensions.get('window')

  const ROW = 48
  const open = () => {
    anchor.current?.measureInWindow((x, y, w, h) => {
      setRect({ x, y, w, h })
      setVisible(true)
      fade.setValue(0)
      Animated.timing(fade, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }).start()
    })
  }
  const close = (after?: () => void) => {
    Animated.timing(fade, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
      setVisible(false)
      after?.()
    })
  }

  let layout: { left: number; top: number; width: number; maxHeight: number; above: boolean } | null = null
  if (rect) {
    const width = Math.min(Math.max(rect.w, minWidth ?? 220), screenW - 32)
    const left = Math.min(Math.max(16, align === 'right' ? rect.x + rect.w - width : rect.x), screenW - width - 16)
    const spaceBelow = screenH - insets.bottom - (rect.y + rect.h) - 16
    const spaceAbove = rect.y - insets.top - 16
    const contentH = options.length * ROW + 8
    const above = spaceBelow < Math.min(contentH, 260) && spaceAbove > spaceBelow
    const maxHeight = Math.min(contentH, 360, above ? spaceAbove : spaceBelow)
    layout = { left, width, maxHeight, above, top: above ? rect.y - 6 - maxHeight : rect.y + rect.h + 6 }
  }
  const selected = options.findIndex((o) => o.value === value)

  return (
    <>
      <View ref={anchor} collapsable={false}>
        {children(open, visible)}
      </View>
      <Modal visible={visible} transparent animationType="none" onRequestClose={() => close()} statusBarTranslucent>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} />
        {layout && (
          <Animated.View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              left: layout.left,
              top: layout.top,
              width: layout.width,
              maxHeight: layout.maxHeight,
              opacity: fade,
              transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [layout.above ? 6 : -6, 0] }) }],
              backgroundColor: c.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: c.line,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOpacity: 0.45,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 },
              elevation: 12,
            }}
          >
            <ScrollView
              ref={scroll}
              bounces={false}
              contentContainerStyle={{ paddingVertical: 4 }}
              onLayout={() => selected > 2 && scroll.current?.scrollTo({ y: (selected - 2) * ROW, animated: false })}
            >
              {options.map((o, i) => (
                <Pressable
                  key={String(o.value)}
                  onPress={() => {
                    Haptics.selectionAsync()
                    close(() => onChange(o.value))
                  }}
                  style={({ pressed }) => ({
                    height: ROW,
                    paddingHorizontal: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    backgroundColor: pressed ? c.surface2 : 'transparent',
                    borderTopWidth: i > 0 ? StyleSheet.hairlineWidth * 2 : 0,
                    borderTopColor: c.line,
                  })}
                >
                  <Text numberOfLines={1} style={{ flex: 1, color: o.accent ? c.accent : c.text, fontSize: 16, fontWeight: o.value === value ? '600' : '400' }}>
                    {o.label}
                  </Text>
                  {o.value === value && <Check size={18} color={c.accent} />}
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        )}
      </Modal>
    </>
  )
}

/** Looks like the web's <select>: a field that drops its options down underneath. */
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
  const current = options.find((o) => o.value === value)
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={{ color: c.muted, fontSize: 14 }}>{label}</Text> : null}
      <DropdownMenu options={options} value={value} onChange={onChange}>
        {(open, isOpen) => (
          <View>
            <Pressable
              onPress={open}
              accessibilityRole="button"
              style={{
                minHeight: 48,
                paddingHorizontal: 14,
                borderRadius: 14,
                backgroundColor: c.surface2,
                borderWidth: 1,
                borderColor: c.line,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <Text numberOfLines={1} style={{ color: c.text, fontSize: 16, flex: 1 }}>{current?.label ?? ''}</Text>
              <ChevronDown size={18} color={c.muted} />
            </Pressable>
            <FocusRing on={isOpen} />
          </View>
        )}
      </DropdownMenu>
    </View>
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
