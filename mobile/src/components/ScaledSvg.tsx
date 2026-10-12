import { useState, type ReactNode } from 'react'
import { View } from 'react-native'
import Svg from 'react-native-svg'

/** An SVG that fills its container's width and keeps the aspect ratio of its viewBox (the web's `width="100%"`). */
export function ScaledSvg({ w, h, children }: { w: number; h: number; children: ReactNode }) {
  const [width, setWidth] = useState(0)
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ width: '100%' }}>
      {width > 0 && (
        <Svg width={width} height={(h * width) / w} viewBox={`0 0 ${w} ${h}`}>
          {children}
        </Svg>
      )}
    </View>
  )
}
