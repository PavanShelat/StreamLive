import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, ScrollView } from 'react-native'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/Colors'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface DigestStats {
  total_streams: number
  top_stream_title: string
  top_stream_viewers: number
  top_creator_username: string
  top_creator_followers_gained: number
  most_active_chat_title: string
  most_active_chat_messages: number
  total_live_hours: number
}

interface DigestRow {
  digest_date: string
  top_streams: DigestStats
}

export default function DigestsScreen() {
  const insets = useSafeAreaInsets()
  const [digest, setDigest] = useState<DigestRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDigest = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_digests')
        .select('*')
        .order('digest_date', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching digest:', error)
      } else {
        setDigest(data || null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDigest()
  }, [])

  const onRefresh = () => {
    setRefreshing(true)
    fetchDigest()
  }

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.brand.primary} />
      </View>
    )
  }

  const dateString = digest
    ? new Date(digest.digest_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
    : ''

  return (
    <ScrollView 
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.primary} />
      }
    >
      <Text style={styles.headerTitle}>🏆 Leaderboard</Text>
      
      {!digest || !digest.top_streams ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📉</Text>
          <Text style={styles.emptyTitle}>No Digest Yet</Text>
          <Text style={styles.emptySubtitle}>
            The daily digest hasn't run yet, or there were no streams in the past 24 hours.
          </Text>
        </View>
      ) : (
        <View style={styles.digestCard}>
          <Text style={styles.cardHeader}>📅 Daily Streaming Digest – {dateString}</Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.statLine}>
            <Text style={styles.highlight}>{digest.top_streams.total_streams}</Text> streams went live today
          </Text>
          
          <Text style={styles.statLine}>
            🥇 <Text style={styles.label}>Top Stream:</Text> "{digest.top_streams.top_stream_title}" – <Text style={styles.highlight}>{digest.top_streams.top_stream_viewers}</Text> viewers
          </Text>
          
          <Text style={styles.statLine}>
            👑 <Text style={styles.label}>Top Creator:</Text> {digest.top_streams.top_creator_username} (<Text style={styles.success}>+{digest.top_streams.top_creator_followers_gained} followers</Text>)
          </Text>
          
          <Text style={styles.statLine}>
            💬 <Text style={styles.label}>Most Active Chat:</Text> "{digest.top_streams.most_active_chat_title}"
          </Text>
          
          <Text style={styles.statLine}>
            ⏱️ <Text style={styles.label}>Total Live Hours:</Text> <Text style={styles.highlight}>{digest.top_streams.total_live_hours}</Text>
          </Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.brand.bg },
  scrollContent: { paddingBottom: 40 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: Colors.brand.textPrimary, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  digestCard: {
    backgroundColor: Colors.brand.surface,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.brand.border,
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.brand.textPrimary,
    marginBottom: 16,
    letterSpacing: 0.5
  },
  divider: {
    height: 1,
    backgroundColor: Colors.brand.border,
    marginBottom: 20
  },
  statLine: {
    fontSize: 15,
    color: Colors.brand.textSecondary,
    marginBottom: 16,
    lineHeight: 24
  },
  label: {
    color: Colors.brand.textPrimary,
    fontWeight: '700'
  },
  highlight: {
    color: Colors.brand.primary,
    fontWeight: '800'
  },
  success: {
    color: Colors.brand.success,
    fontWeight: '700'
  },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, marginTop: 100 },
  emptyIcon: { fontSize: 60, marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: Colors.brand.textPrimary, marginBottom: 10 },
  emptySubtitle: { fontSize: 15, color: Colors.brand.textSecondary, textAlign: 'center', lineHeight: 22 }
})
