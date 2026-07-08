// src/components/ViewerCount.tsx
// Real-time viewer count indicator — subscribes to stream updates

import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/Colors'

interface ViewerCountProps {
  streamId: string
  initialCount?: number
  size?: 'small' | 'large'
}

export function ViewerCount({ streamId, initialCount = 0, size = 'small' }: ViewerCountProps) {
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    const channel = supabase
      .channel(`viewer-count-${streamId}-${Math.random()}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'streams', filter: `id=eq.${streamId}` },
        (payload) => {
          if (typeof payload.new.viewer_count === 'number') {
            setCount(payload.new.viewer_count)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [streamId])

  const isLarge = size === 'large'

  return (
    <View style={[styles.container, isLarge && styles.containerLarge]}>
      <View style={styles.dot} />
      <Text style={[styles.text, isLarge && styles.textLarge]}>
        {count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count} watching
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  containerLarge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.brand.live,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  textLarge: {
    fontSize: 16,
    fontWeight: '700',
  },
})
