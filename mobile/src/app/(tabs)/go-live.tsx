// src/app/(tabs)/go-live.tsx — Creator: Start & manage a live stream

import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator, ScrollView, Platform
} from 'react-native'
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
import { getLiveKitToken, logStreamMetadata } from '@/lib/livekit'
import { useAuth } from '@/context/AuthContext'
import { ViewerCount } from '@/components/ViewerCount'
import { ChatBox } from '@/components/ChatBox'
import { useChat } from '@/hooks/useChat'
import { Colors } from '@/constants/Colors'
import { LIVEKIT_WS_URL, METADATA_INTERVAL_MS } from '@/constants/config'
import { StreamVideo } from '@/components/StreamVideo'
function ActiveStream({ stream, room, onEnd }: {
  stream: { id: string; title: string; viewer_count: number }
  room: Room | null
  onEnd: () => void
}) {
  const { messages, sendMessage, isOnline, syncing } = useChat(stream.id)
  const metadataTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const [localVideoTrack, setLocalVideoTrack] = useState<Track | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')

  // Log metadata every 60s
  useEffect(() => {
    const tick = async () => {
      const { data } = await supabase
        .from('streams')
        .select('viewer_count')
        .eq('id', stream.id)
        .single()
      logStreamMetadata(stream.id, data?.viewer_count ?? 0)
    }
    metadataTimer.current = setInterval(tick, METADATA_INTERVAL_MS)
    return () => { if (metadataTimer.current) clearInterval(metadataTimer.current) }
  }, [stream.id])

  // Extract local video track
  useEffect(() => {
    if (!room) return
    const updateTrack = () => {
      const track = room.localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack
      setLocalVideoTrack(track ?? null)
    }
    updateTrack()
    room.on(RoomEvent.LocalTrackPublished, updateTrack)
    room.on(RoomEvent.LocalTrackUnpublished, updateTrack)
    return () => {
      room.off(RoomEvent.LocalTrackPublished, updateTrack)
      room.off(RoomEvent.LocalTrackUnpublished, updateTrack)
    }
  }, [room])

  const confirmEnd = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to end the stream?')) {
        onEnd()
      }
    } else {
      Alert.alert('End Stream', 'Are you sure you want to end the stream?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End Stream', style: 'destructive', onPress: onEnd },
      ])
    }
  }

  const toggleCamera = async () => {
    if (!localVideoTrack || Platform.OS === 'web') return
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user'
    
    // Fallback: If LiveKit's LocalVideoTrack provides restartTrack, use it.
    if (typeof (localVideoTrack as any).restartTrack === 'function') {
      try {
        await (localVideoTrack as any).restartTrack({ facingMode: newFacingMode })
        setFacingMode(newFacingMode)
        return
      } catch (e) {
        console.warn('Failed to restartTrack', e)
      }
    }
    
    // Fallback: Try react-native-webrtc's internal API
    const mst = (localVideoTrack as any).mediaStreamTrack
    if (mst && typeof mst._switchCamera === 'function') {
      mst._switchCamera()
      setFacingMode(newFacingMode)
    }
  }

  return (
    <View style={styles.activeContainer}>
      {/* Video preview (LiveKit renders natively on device or HTML5 video on web) */}
      <View style={styles.videoPreview}>
        {localVideoTrack ? (
          <StreamVideo track={localVideoTrack} isLocal={true} />
        ) : (
          <Text style={styles.videoPreviewText}>📹 Camera Live</Text>
        )}
        <View style={styles.overlayRow}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <ViewerCount streamId={stream.id} initialCount={stream.viewer_count} size="large" />
        </View>
        <View style={styles.bottomControls}>
          {Platform.OS !== 'web' && localVideoTrack && (
            <TouchableOpacity style={styles.flipBtn} onPress={toggleCamera}>
              <Text style={styles.flipBtnText}>🔄 Flip</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.endBtn} onPress={confirmEnd}>
            <Text style={styles.endBtnText}>⏹ End Stream</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat */}
      <View style={styles.chatArea}>
        <Text style={styles.chatTitle}>💬 Live Chat</Text>
        <ChatBox
          messages={messages}
          onSend={sendMessage}
          isOnline={isOnline}
          syncing={syncing}
        />
      </View>
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function GoLiveScreen() {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [currentStream, setCurrentStream] = useState<{ id: string; title: string; viewer_count: number } | null>(null)
  const roomRef = useRef<Room | null>(null)

  // Check if creator already has an active stream
  useEffect(() => {
    if (!user) return
    supabase
      .from('streams')
      .select('id, title, viewer_count')
      .eq('creator_id', user.id)
      .eq('status', 'live')
      .single()
      .then(({ data }) => {
        if (data) {
          setCurrentStream(data)
          setStreaming(true)
        }
      })
  }, [user])

  const notifyFollowers = async (streamId: string, streamTitle: string) => {
    try {
      // Get creator username
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user!.id)
        .single()
      const creatorName = profile?.username ?? 'Someone'

      // Get all followers
      const { data: followers } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('creator_id', user!.id)

      if (!followers || followers.length === 0) return

      // Insert one notification per follower using service-role via RPC
      // We use individual inserts since RLS allows reading, and the app user
      // can write notifications for other users via a SECURITY DEFINER function
      const notifications = followers.map((f) => ({
        user_id: f.follower_id,
        title: '🔴 Live Now!',
        body: `${creatorName} just started a stream: ${streamTitle}`,
      }))

      await supabase.from('notifications').insert(notifications)
    } catch (e) {
      console.warn('Failed to notify followers:', e)
    }
  }

  const startStream = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a stream title')
      return
    }
    setLoading(true)
    try {
      const roomName = `stream-${user!.id}-${Date.now()}`

      // 1. Create stream record in Supabase
      const { data: stream, error } = await supabase
        .from('streams')
        .insert({
          creator_id: user!.id,
          title: title.trim(),
          livekit_room_name: roomName,
          status: 'live',
        })
        .select()
        .single()

      if (error || !stream) throw new Error(error?.message ?? 'Failed to create stream')

      // 2. Notify followers directly (fire-and-forget, no n8n dependency)
      notifyFollowers(stream.id, stream.title)

      // 3. Get LiveKit token
      const { token } = await getLiveKitToken(roomName, 'host')

      // 3. Connect to LiveKit room
      const room = new Room()
      roomRef.current = room
      await room.connect(LIVEKIT_WS_URL, token)
      await room.localParticipant.enableCameraAndMicrophone()

      setCurrentStream(stream)
      setStreaming(true)
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to start stream')
    } finally {
      setLoading(false)
    }
  }

  const endStream = async () => {
    if (!currentStream) return
    setLoading(true)
    try {
      // 1. Disconnect from LiveKit
      await roomRef.current?.disconnect()
      roomRef.current = null

      // 2. Update stream status (triggers n8n webhook via Supabase)
      await supabase
        .from('streams')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', currentStream.id)

      setStreaming(false)
      setCurrentStream(null)
      setTitle('')
      if (Platform.OS === 'web') {
        window.alert('Stream Ended: Your highlights are being generated!')
      } else {
        Alert.alert('Stream Ended', 'Your highlights are being generated!')
      }
    } catch (err: any) {
      if (Platform.OS === 'web') {
        window.alert('Error: ' + (err.message ?? 'Failed to end stream'))
      } else {
        Alert.alert('Error', err.message ?? 'Failed to end stream')
      }
    } finally {
      setLoading(false)
    }
  }

  if (streaming && currentStream) {
    return <ActiveStream stream={currentStream} room={roomRef.current} onEnd={endStream} />
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.pageTitle}>Go Live</Text>
        <Text style={styles.pageSubtitle}>Start broadcasting to your followers</Text>

        {/* Stream title input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Stream Title</Text>
          <TextInput
            style={styles.input}
            placeholder="What's your stream about?"
            placeholderTextColor={Colors.brand.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={80}
          />
        </View>

        {/* Tips */}
        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>📋 Quick Checklist</Text>
          {['Good lighting in your space', 'Stable internet connection', 'Camera & microphone ready'].map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <Text style={styles.tipCheck}>✓</Text>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* Start button */}
        <TouchableOpacity
          style={[styles.startBtn, (loading || !title.trim()) && styles.btnDisabled]}
          onPress={startStream}
          disabled={loading || !title.trim()}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <>
                <View style={styles.startDot} />
                <Text style={styles.startBtnText}>Start Streaming</Text>
              </>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.brand.bg },
  inner: { padding: 24 },
  pageTitle: { color: Colors.brand.textPrimary, fontSize: 28, fontWeight: '700', marginBottom: 4 },
  pageSubtitle: { color: Colors.brand.textSecondary, fontSize: 15, marginBottom: 32 },
  inputGroup: { marginBottom: 24 },
  label: { color: Colors.brand.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: Colors.brand.surface, borderWidth: 1, borderColor: Colors.brand.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: Colors.brand.textPrimary, fontSize: 16 },
  tips: { backgroundColor: Colors.brand.surface, borderRadius: 14, padding: 16, marginBottom: 32, borderWidth: 1, borderColor: Colors.brand.border },
  tipsTitle: { color: Colors.brand.textPrimary, fontWeight: '700', fontSize: 14, marginBottom: 12 },
  tipRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tipCheck: { color: Colors.brand.success, fontSize: 14, fontWeight: '700' },
  tipText: { color: Colors.brand.textSecondary, fontSize: 14 },
  startBtn: { backgroundColor: Colors.brand.live, borderRadius: 16, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: Colors.brand.live, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 8 },
  btnDisabled: { opacity: 0.5 },
  startDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 0.3 },
  // Active stream styles
  activeContainer: { flex: 1, backgroundColor: Colors.brand.bg },
  videoPreview: { height: 280, backgroundColor: '#000', position: 'relative', justifyContent: 'center', alignItems: 'center' },
  videoPreviewText: { color: Colors.brand.textSecondary, fontSize: 18 },
  overlayRow: { position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.brand.live, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, gap: 5 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  bottomControls: { position: 'absolute', bottom: 14, right: 14, flexDirection: 'row', gap: 10 },
  flipBtn: { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  flipBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  endBtn: { backgroundColor: Colors.brand.error, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  endBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  chatArea: { flex: 1 },
  chatTitle: { color: Colors.brand.textPrimary, fontWeight: '700', fontSize: 16, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.brand.border },
})
