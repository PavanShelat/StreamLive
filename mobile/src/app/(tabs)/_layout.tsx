// src/app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router'
import { Colors } from '@/constants/Colors'
import { View, Text, StyleSheet } from 'react-native'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

function TabIcon({ label, icon, focused }: { label: string; icon: string; focused: boolean }) {
  return (
    <View style={[tabStyles.tab, focused && tabStyles.tabFocused]}>
      <Text style={[tabStyles.icon, focused && tabStyles.iconFocused]}>{icon}</Text>
    </View>
  )
}

const tabStyles = StyleSheet.create({
  tab: { alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 10 },
  tabFocused: { backgroundColor: Colors.brand.primary + '22' },
  icon: { fontSize: 22, color: Colors.brand.textMuted },
  iconFocused: { color: Colors.brand.primary },
})

function NotificationDot({ userId }: { userId: string }) {
  const [hasUnread, setHasUnread] = useState(false)

  useEffect(() => {
    const check = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)
      setHasUnread((count ?? 0) > 0)
    }
    check()

    const channel = supabase
      .channel(`notif-dot-${userId}-${Math.random()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => setHasUnread(true))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  return (
    <View>
      <Text style={{ fontSize: 22, color: hasUnread ? Colors.brand.primary : Colors.brand.textMuted }}>🔔</Text>
      {hasUnread && <View style={{ position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.brand.live }} />}
    </View>
  )
}

export default function TabsLayout() {
  const { user } = useAuth()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.brand.surface,
          borderTopColor: Colors.brand.border,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Browse" icon="📡" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="go-live"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Go Live" icon="🔴" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="digests"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Leaderboard" icon="🏆" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarIcon: ({ focused }) =>
            user
              ? <NotificationDot userId={user.id} />
              : <TabIcon label="Notifications" icon="🔔" focused={focused} />,
        }}
      />
    </Tabs>
  )
}
