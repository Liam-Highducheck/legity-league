import type { ColorValue } from 'react-native'
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
      <Tabs.Screen name="garden" options={tab('Garden', Sprout)} />
      <Tabs.Screen name="trends" options={tab('Trends', ChartColumn)} />
      <Tabs.Screen name="me" options={tab('Me', User)} />
    </Tabs>
  )
}
