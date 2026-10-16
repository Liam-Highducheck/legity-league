import type { ColorValue } from 'react-native'
import { StyleSheet } from 'react-native'
import { BlurView } from 'expo-blur'
import { Tabs } from 'expo-router'
import { ChartColumn, Moon, Sprout, Trophy, User } from 'lucide-react-native'
import { useColors } from '../../../lib/theme'

export default function TabsLayout() {
  const c = useColors()
  const tab = (title: string, Icon: typeof Moon) => ({
    title,
    tabBarIcon: ({ color }: { color: ColorValue }) => <Icon size={24} strokeWidth={1.9} color={color} />,
  })
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: c.bg },
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: { backgroundColor: c.tabbarBg, borderTopColor: c.line, borderTopWidth: 1 },
      }}
    >
      <Tabs.Screen name="index" options={tab('Today', Moon)} />
      <Tabs.Screen name="league" options={tab('League', Trophy)} />
      {/* the garden draws underneath its tab bar, so the bar turns to frosted glass on this tab only */}
      <Tabs.Screen
        name="garden"
        options={{
          ...tab('Garden', Sprout),
          tabBarActiveTintColor: '#bcd0ff',
          tabBarInactiveTintColor: 'rgba(238,240,255,0.7)',
          tabBarStyle: { position: 'absolute', backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0 },
          tabBarBackground: () => <BlurView tint="dark" intensity={45} style={StyleSheet.absoluteFill} />,
        }}
      />
      <Tabs.Screen name="trends" options={tab('Trends', ChartColumn)} />
      <Tabs.Screen name="me" options={tab('Me', User)} />
    </Tabs>
  )
}
