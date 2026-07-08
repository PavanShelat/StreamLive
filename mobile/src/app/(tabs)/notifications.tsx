// src/app/(tabs)/notifications.tsx — In-app notification feed

import { useEffect, useState } from 'react'
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  TouchableOpacity, ActivityIndicator
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Colors } from '@/constants/Colors'

interface Notification {
  id: string
  title: string
  body: string
  read: boolean
  created_at: string
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function NotificationItem({ item, onRead }: { item: Notification; onRead: (id: string) => void }) {
  return (
    <TouchableOpacity
      style={[styles.item, !item.read && styles.itemUnread]}
      onPress={() => onRead(item.id)}
      activeOpacity={0.75}
    >
      <View style={styles.itemLeft}>
        <Text style={styles.itemIcon}>
          {item.title.includes('Live') ? '🔴' : item.title.includes('Milestone') ? '🎉' : '📣'}
        </Text>
      </View>
      <View style={styles.itemBody}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemText}>{item.body}</Text>
        <Text style={styles.itemTime}>{timeAgo(item.created_at)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  )
}

export default function NotificationsScreen() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadNotifications()

    // Realtime subscription for new notifications
    const channel = supabase
      .channel(`notifications-${user.id}-${Math.random()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  const loadNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications(data ?? [])
    setLoading(false)
  }

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
  }

  const markAllRead = async () => {
    await supabase.from('notifications').update({ read: true }).eq('user_id', user!.id).eq('read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.brand.primary} size="large" />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Text style={styles.unreadText}>{unreadCount} unread</Text>
        </View>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => <NotificationItem item={item} onRead={markRead} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>Follow creators to get notified when they go live</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.brand.bg },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.brand.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  pageTitle: { color: Colors.brand.textPrimary, fontSize: 26, fontWeight: '700' },
  markAllBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: Colors.brand.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.brand.border },
  markAllText: { color: Colors.brand.textSecondary, fontSize: 12 },
  unreadBanner: { marginHorizontal: 20, marginBottom: 12, backgroundColor: Colors.brand.primary + '22', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  unreadText: { color: Colors.brand.primary, fontWeight: '700', fontSize: 13 },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: Colors.brand.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.brand.border },
  itemUnread: { borderColor: Colors.brand.primary + '55', backgroundColor: Colors.brand.primary + '11' },
  itemLeft: { paddingTop: 2 },
  itemIcon: { fontSize: 22 },
  itemBody: { flex: 1 },
  itemTitle: { color: Colors.brand.textPrimary, fontWeight: '700', fontSize: 14, marginBottom: 3 },
  itemText: { color: Colors.brand.textSecondary, fontSize: 13, lineHeight: 18 },
  itemTime: { color: Colors.brand.textMuted, fontSize: 11, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.brand.primary, marginTop: 5 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { color: Colors.brand.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySubtitle: { color: Colors.brand.textSecondary, fontSize: 14, textAlign: 'center', paddingHorizontal: 30 },
})
