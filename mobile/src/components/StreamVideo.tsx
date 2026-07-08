import React, { useEffect, useRef } from 'react'
import { View, Platform, StyleSheet } from 'react-native'
import type { Track } from 'livekit-client'

interface StreamVideoProps {
  track: Track | undefined | null
  isLocal?: boolean
}

// ── Web: attach track to a <video> element ─────────────────────────────────

function WebVideo({ track, isLocal }: { track: Track; isLocal: boolean }) {
  const ref = useRef<any>(null)

  useEffect(() => {
    if (!ref.current) return
    track.attach(ref.current)
    return () => {
      track.detach(ref.current!)
    }
  }, [track])

  return React.createElement('video', {
    ref,
    style: { width: '100%', height: '100%', objectFit: 'cover' },
    autoPlay: true,
    playsInline: true,
    muted: isLocal,
  })
}

// ── Native: use @livekit/react-native VideoView ────────────────────────────

let NativeVideoView: any = null
if (Platform.OS !== 'web') {
  try {
    NativeVideoView = require('@livekit/react-native').VideoView
  } catch (e) {
    console.warn('StreamVideo: @livekit/react-native not available', e)
  }
}

function NativeVideo({ track, isLocal }: { track: Track; isLocal: boolean }) {
  if (!NativeVideoView) return <View style={styles.container} />

  return (
    <NativeVideoView
      key={track.sid ?? 'track'}
      videoTrack={track}
      style={StyleSheet.absoluteFill}
      objectFit="cover"
      mirror={isLocal}          // Mirror front camera for creator
      zOrder={isLocal ? 1 : 0}  // Ensure it renders correctly
    />
  )
}

// ── Public component ───────────────────────────────────────────────────────

export function StreamVideo({ track, isLocal = false }: StreamVideoProps) {
  if (!track) return <View style={styles.container} />

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <WebVideo track={track} isLocal={isLocal} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <NativeVideo track={track} isLocal={isLocal} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
})
