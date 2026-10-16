import type { ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { BlurView } from 'expo-blur'

/** Frosted-glass surface for the controls floating over the garden scene. */
export function Glass({ children, style, radius = 22, intensity = 28 }: { children: ReactNode; style?: StyleProp<ViewStyle>; radius?: number; intensity?: number }) {
  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' }, style]}>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={{ backgroundColor: 'rgba(10, 14, 38, 0.5)' }}>{children}</View>
    </View>
  )
}
