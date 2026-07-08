// src/app/(tabs)/index.tsx — Browse Live Streams

import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, SafeAreaView, TextInput
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { StreamCard } from '@/components/StreamCard'
import { Colors } from '@/constants/Colors'
import { useAuth } from '@/context/AuthContext'

interface Stream {
  id: string
  title: string
  viewer_count: number
  started_at: string
  profiles: { username: string }
}

export default function BrowseScreen() {
  const { profile, signOut } = useAuth()
  const [streams, setStreams] = useState<Stream[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')

  const loadStreams = useCallback(async () => {
    const { data } = await supabase
      .from('streams')
      .select('id, title, viewer_count, started_at, profiles(username)')
      .eq('status', 'live')
      .order('viewer_count', { ascending: false })
    setStreams((data as unknown as Stream[]) ?? [])
  }, [])

  useEffect(() => {
    loadStreams()

    // Realtime: refresh when streams table changes
    const channel = supabase
      .channel('browse-streams')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'streams' }, loadStreams)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadStreams])

  const onRefresh = async () => {
    setRefreshing(true)
    await loadStreams()
    setRefreshing(false)
  }

  const filtered = streams.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.profiles?.username?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good to see you,</Text>
          <Text style={styles.username}>@{profile?.username ?? '…'}</Text>
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Section title */}
      <View style={styles.sectionRow}>
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveLabel}>LIVE NOW</Text>
        </View>
        <Text style={styles.streamCount}>{streams.length} streams</Text>
      </View>

      {/* Search */}
      <TextInput
        style={styles.search}
        placeholder="Search streams or creators…"
        placeholderTextColor={Colors.brand.textMuted}
        value={search}
        onChangeText={setSearch}
      />

      {/* Stream list */}
      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => <StreamCard stream={item} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📡</Text>
            <Text style={styles.emptyTitle}>No live streams yet</Text>
            <Text style={styles.emptySubtitle}>Go to the 🔴 tab to start broadcasting!</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.brand.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
  greeting: { color: Colors.brand.textSecondary, fontSize: 13 },
  username: { color: Colors.brand.textPrimary, fontSize: 18, fontWeight: '700' },
  signOutBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: Colors.brand.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.brand.border },
  signOutText: { color: Colors.brand.textSecondary, fontSize: 13 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.brand.live + '22', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.brand.live },
  liveLabel: { color: Colors.brand.live, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  streamCount: { color: Colors.brand.textMuted, fontSize: 13 },
  search: { marginHorizontal: 20, marginBottom: 14, backgroundColor: Colors.brand.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: Colors.brand.textPrimary, fontSize: 14, borderWidth: 1, borderColor: Colors.brand.border },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: Colors.brand.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySubtitle: { color: Colors.brand.textSecondary, fontSize: 14, textAlign: 'center' },
})
