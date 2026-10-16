import type { ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'

/**
 * A translucent dark surface for the controls floating over the garden scene. Plain translucent fill, a hairline border and
 * continuous (squircle) corners: stacking a blur view under `overflow: hidden` gave chamfered, near-octagonal corners on iOS.
 */
export function Glass({ children, style, radius = 22 }: { children: ReactNode; style?: StyleProp<ViewStyle>; radius?: number; intensity?: number }) {
  return (
    <View style={[{ borderRadius: radius, borderCurve: 'continuous', backgroundColor: 'rgba(11, 15, 40, 0.74)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }, style]}>
      {children}
    </View>
  )
}
