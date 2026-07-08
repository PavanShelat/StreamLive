// src/app/stream/[id].tsx — Viewer: Watch live stream

import { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ActivityIndicator, Alert, Platform
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Room, RoomEvent, Track } from 'livekit-client'

// Conditionally require LiveKit globals to prevent crashes in Expo Go
try {
  if (Platform.OS !== 'web') {
    const { registerGlobals } = require('@livekit/react-native')
    registerGlobals()
  }
} catch (e) {
  console.warn('LiveKit React Native not available (likely running in Expo Go). Streaming will not work.')
}

import { supabase } from '@/lib/supabase'
import { getLiveKitToken } from '@/lib/livekit'
import { useAuth } from '@/context/AuthContext'
import { useChat } from '@/hooks/useChat'
import { ViewerCount } from '@/components/ViewerCount'
import { FollowButton } from '@/components/FollowButton'
import { ChatBox } from '@/components/ChatBox'
import { Colors } from '@/constants/Colors'
import { LIVEKIT_WS_URL } from '@/constants/config'

import { StreamVideo } from '@/components/StreamVideo'

interface StreamInfo {
  id: string
  title: string
  viewer_count: number
  status: string
  creator_id: string
  livekit_room_name: string
  profiles: { username: string }
}

export default function WatchStreamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [stream, setStream] = useState<StreamInfo | null>(null)
  const [connecting, setConnecting] = useState(true)
  const [connected, setConnected] = useState(false)
  const roomRef = useRef<Room | null>(null)
  const [remoteVideoTrack, setRemoteVideoTrack] = useState<Track | null>(null)
  const { messages, sendMessage, isOnline, syncing } = useChat(id)

  // Load stream info
  useEffect(() => {
    supabase
      .from('streams')
      .select('id, title, viewer_count, status, creator_id, livekit_room_name, profiles(username)')
      .eq('id', id)
      .single()
      .then(({ data }) => setStream(data as unknown as StreamInfo))
  }, [id])

  // Watch for stream end
  useEffect(() => {
    const channel = supabase
      .channel(`stream-status-${id}-${Math.random()}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'streams', filter: `id=eq.${id}` },
        (payload) => {
          if (payload.new.status === 'ended') {
            Alert.alert('Stream Ended', 'The creator has ended this stream.', [
              { text: 'OK', onPress: () => router.back() }
            ])
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id])

  // Connect to LiveKit + increment viewer count
  useEffect(() => {
    if (!stream || !user) return

    let isMounted = true
    let room: Room | null = null

    const connect = async () => {
      try {
        const { token } = await getLiveKitToken(stream.livekit_room_name, 'viewer')
        if (!isMounted) return
        
        // Increment viewer count via RPC immediately upon getting token
        await supabase.rpc('increment_viewer_count', { stream_id: id })
        if (!isMounted) return
        
        room = new Room()
        roomRef.current = room
        room.on(RoomEvent.Disconnected, () => {
          if (isMounted) setConnected(false)
        })
        room.on(RoomEvent.TrackSubscribed, (track) => {
          if (isMounted && track.kind === Track.Kind.Video) {
            setRemoteVideoTrack(track)
          }
        })
        room.on(RoomEvent.TrackUnsubscribed, (track) => {
          if (isMounted && track.kind === Track.Kind.Video) {
            setRemoteVideoTrack(null)
          }
        })
        await room.connect(LIVEKIT_WS_URL, token)
        
        // Check for tracks that were already published + subscribed before we connected
        // (e.g. web creator started stream before this viewer opened the page)
        let foundExisting = false
        room.remoteParticipants.forEach((p) => {
          p.trackPublications.forEach((pub) => {
            if (!foundExisting && pub.kind === Track.Kind.Video && pub.track && pub.isSubscribed) {
              setRemoteVideoTrack(pub.track as any)
              foundExisting = true
            }
          })
        })

        // If no subscribed track yet, wait a moment then check again
        // (subscription can take a few hundred ms after connect)
        if (!foundExisting) {
          setTimeout(() => {
            if (!isMounted) return
            room?.remoteParticipants.forEach((p) => {
              p.trackPublications.forEach((pub) => {
                if (pub.kind === Track.Kind.Video && pub.track && pub.isSubscribed) {
                  setRemoteVideoTrack(pub.track as any)
                }
              })
            })
          }, 1500)
        }

        if (isMounted) setConnected(true)
      } catch (err) {
        console.error('LiveKit connect error', err)
      } finally {
        if (isMounted) setConnecting(false)
      }
    }
    connect()

    return () => {
      isMounted = false
      if (room) room.disconnect()
      else if (roomRef.current) roomRef.current.disconnect()
      // Decrement viewer count on leave
      supabase.rpc('decrement_viewer_count', { stream_id: id })
    }
  }, [stream, user, id])

  const handleBack = async () => {
    await roomRef.current?.disconnect()
    await supabase.rpc('decrement_viewer_count', { stream_id: id })
    router.back()
  }

  if (!stream) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.brand.primary} size="large" />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        {/* We keep the back button in the header but moved the details below the video */}
      </View>

      {/* Video area */}
      <View style={styles.videoContainer}>
        {remoteVideoTrack ? (
          <StreamVideo track={remoteVideoTrack} isLocal={false} />
        ) : (
          connecting ? (
            <>
              <ActivityIndicator color={Colors.brand.primary} size="large" />
              <Text style={styles.videoPlaceholderText}>Joining stream…</Text>
            </>
          ) : (
            <Text style={styles.videoPlaceholderText}>
              {connected ? '📡 Stream connected, waiting for video…' : '⚠️ Connecting…'}
            </Text>
          )
        )}
      </View>

      {/* Stream Info (Below Video) */}
      <View style={styles.streamInfoContainer}>
        <View style={styles.creatorInfoRow}>
          <View style={styles.headerCenter}>
            <Text style={styles.streamTitle} numberOfLines={1}>{stream.title}</Text>
            <Text style={styles.creatorName}>@{stream.profiles?.username}</Text>
          </View>
          <FollowButton creatorId={stream.creator_id} />
        </View>

        {/* Viewer count + live badge */}
        <View style={styles.viewerRow}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <ViewerCount streamId={id} initialCount={stream.viewer_count} />
        </View>
      </View>

      {/* Chat */}
      <View style={styles.chatArea}>
        <ChatBox messages={messages} onSend={sendMessage} isOnline={isOnline} syncing={syncing} />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.brand.bg },
  loading: { flex: 1, backgroundColor: Colors.brand.bg, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.brand.surface, justifyContent: 'center', alignItems: 'center' },
  backIcon: { color: Colors.brand.textPrimary, fontSize: 18 },
  headerCenter: { flex: 1, justifyContent: 'center' },
  streamTitle: { color: Colors.brand.textPrimary, fontWeight: '700', fontSize: 16, marginBottom: 2 },
  creatorName: { color: Colors.brand.textSecondary, fontSize: 13 },
  videoContainer: { height: 260, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', gap: 12 },
  videoPlaceholderText: { color: Colors.brand.textSecondary, fontSize: 14 },
  streamInfoContainer: { paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: Colors.brand.border },
  creatorInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between' },
  viewerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.brand.live, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4, gap: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  chatArea: { flex: 1 },
})
