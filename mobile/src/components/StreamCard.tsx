// src/components/StreamCard.tsx
// Card shown in the Browse Streams feed — displays thumbnail placeholder, creator, viewer count

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { Colors } from '@/constants/Colors'

interface Stream {
  id: string
  title: string
  viewer_count: number
  started_at: string
  profiles: {
    username: string
  }
}

interface StreamCardProps {
  stream: Stream
}

function formatViewers(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return count.toString()
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  return `${Math.floor(diff / 3600)}h`
}

export function StreamCard({ stream }: StreamCardProps) {
  const router = useRouter()

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/stream/${stream.id}`)}
      activeOpacity={0.85}
    >
      {/* Thumbnail placeholder */}
      <View style={styles.thumbnail}>
        <Text style={styles.thumbnailIcon}>▶</Text>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <View style={styles.viewerBadge}>
          <Text style={styles.viewerBadgeText}>👁 {formatViewers(stream.viewer_count)}</Text>
        </View>
      </View>

      {/* Info row */}
      <View style={styles.info}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {stream.profiles?.username?.[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.title} numberOfLines={1}>{stream.title}</Text>
          <Text style={styles.creator}>@{stream.profiles?.username}</Text>
        </View>
        <Text style={styles.time}>{timeAgo(stream.started_at)}</Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.brand.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.brand.border,
  },
  thumbnail: {
    height: 180,
    backgroundColor: Colors.brand.surfaceHigh,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  thumbnailIcon: {
    fontSize: 48,
    color: Colors.brand.textMuted,
  },
  liveBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: Colors.brand.live,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  viewerBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  textBlock: { flex: 1 },
  title: {
    color: Colors.brand.textPrimary,
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 2,
  },
  creator: {
    color: Colors.brand.textSecondary,
    fontSize: 12,
  },
  time: {
    color: Colors.brand.textMuted,
    fontSize: 11,
  },
})
