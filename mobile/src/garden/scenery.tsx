import { memo } from 'react'
import { View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Path } from 'react-native-svg'
import { Petals } from './Ambient'
import { DaySky, Sky } from './Sky'

/** Layered hills along the bottom of the scene, with a few tiny pines on the far ridge. */
const Hills = memo(function Hills({ width, height, dusk }: { width: number; height: number; dusk: boolean }) {
  const h = height * 0.36
  const far = dusk ? '#1a2250' : '#c9e5c4'
  const near = dusk ? '#131a3c' : '#aad6a6'
  const tree = dusk ? '#10163a' : '#8fc48c'
  return (
    <Svg width={width} height={h} style={{ position: 'absolute', left: 0, bottom: 0 }} viewBox={`0 0 ${width} ${h}`}>
      <Path d={`M0 ${h * 0.45} C${width * 0.22} ${h * 0.2} ${width * 0.42} ${h * 0.5} ${width * 0.64} ${h * 0.32} S${width * 0.9} ${h * 0.18} ${width} ${h * 0.3} L${width} ${h} L0 ${h}Z`} fill={far} />
      {[[0.12, 0.34], [0.17, 0.3], [0.27, 0.33], [0.71, 0.28], [0.77, 0.24], [0.92, 0.22]].map(([fx, fy], i) => (
        <Path key={i} d={`M${width * fx} ${h * fy} l-5 14 l10 0Z M${width * fx} ${h * fy + 7} l-6 14 l12 0Z`} fill={tree} />
      ))}
      <Path d={`M0 ${h * 0.7} C${width * 0.3} ${h * 0.5} ${width * 0.55} ${h * 0.78} ${width * 0.8} ${h * 0.6} S${width * 0.95} ${h * 0.58} ${width} ${h * 0.62} L${width} ${h} L0 ${h}Z`} fill={near} />
    </Svg>
  )
})

/**
 * The whole garden screen's backdrop: the sky (stars, moon and mist by night, sun and clouds by day), hills on the horizon,
 * and drifting petals. Everything animated here runs natively.
 */
export const SceneBackdrop = memo(function SceneBackdrop({
  width, height, dusk, still, topInset,
}: { width: number; height: number; dusk: boolean; still?: boolean; topInset: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height }}>
      <LinearGradient
        colors={dusk ? ['#0b0f2b', '#18204a', '#2c3568'] : ['#9fd2f0', '#cde8f2', '#eef6e2']}
        locations={[0, 0.55, 1]}
        style={{ position: 'absolute', left: 0, top: 0, width, height }}
      />
      {dusk ? <Sky width={width} height={height} still={still} topInset={topInset} /> : <DaySky width={width} height={height} still={still} topInset={topInset} />}
      <Hills width={width} height={height} dusk={dusk} />
      <Petals width={width} height={height} still={still} />
    </View>
  )
})
