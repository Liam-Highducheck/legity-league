import type { ReactNode } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, radius } from '../lib/theme'

/** Full-screen scroll container with safe-area padding that keeps inputs above the keyboard. */
export function Screen({ children, gap = 14 }: { children: ReactNode; gap?: number }) {
  const insets = useSafeAreaInsets()
  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.fill}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 20,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          gap,
        }}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

export function Heading({ children }: { children: ReactNode }) {
  return <Text style={styles.heading}>{children}</Text>
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>
}

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null
  const msg = error instanceof Error ? error.message : String(error)
  return <Text style={styles.error}>{msg}</Text>
}

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        selectionColor={colors.accent}
        {...props}
        style={[styles.input, props.style]}
      />
    </View>
  )
}

export function Button({
  title,
  onPress,
  busy,
  disabled,
  variant = 'primary',
}: {
  title: string
  onPress: () => void
  busy?: boolean
  disabled?: boolean
  variant?: 'primary' | 'secondary'
}) {
  const off = busy || disabled
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.btn,
        variant === 'secondary' && styles.btnSecondary,
        off && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={colors.onAccent} />
      ) : (
        <Text style={[styles.btnText, variant === 'secondary' && { color: colors.text }]}>{title}</Text>
      )}
    </Pressable>
  )
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <View style={styles.seg}>
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segItem, o.value === value && styles.segOn]}>
          <Text style={[styles.segText, o.value === value && { color: colors.text }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  )
}

export function Centered({ children }: { children: ReactNode }) {
  return <View style={[styles.fill, { alignItems: 'center', justifyContent: 'center' }]}>{children}</View>
}

export function Spinner() {
  return <ActivityIndicator color={colors.accent} />
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  heading: { color: colors.text, fontSize: 30, fontWeight: '700', letterSpacing: -0.5 },
  muted: { color: colors.muted, fontSize: 15 },
  error: { color: colors.danger, fontSize: 15 },
  label: { color: colors.muted, fontSize: 14 },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    color: colors.text,
    fontSize: 17, // 16px+ avoids any zoom-on-focus behaviour
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  btn: { backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  btnSecondary: { backgroundColor: colors.surface2 },
  btnText: { color: colors.onAccent, fontSize: 17, fontWeight: '600' },
  card: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius, padding: 16, gap: 6 },
  seg: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, padding: 3 },
  segItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  segOn: { backgroundColor: colors.surface2 },
  segText: { color: colors.muted, fontSize: 15, fontWeight: '600' },
})
