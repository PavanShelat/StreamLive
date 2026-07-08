// src/components/FollowButton.tsx
// Follow/Unfollow button with optimistic UI and Supabase persistence

import { useState, useEffect } from 'react'
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Colors } from '@/constants/Colors'

interface FollowButtonProps {
  creatorId: string
}

export function FollowButton({ creatorId }: FollowButtonProps) {
  const { user } = useAuth()
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    checkFollowStatus()
  }, [user, creatorId])

  const checkFollowStatus = async () => {
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user!.id)
      .eq('creator_id', creatorId)
      .single()
    setIsFollowing(!!data)
    setLoading(false)
  }

  const toggleFollow = async () => {
    if (!user || loading) return
    setLoading(true)

    if (isFollowing) {
      // Unfollow
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('creator_id', creatorId)
      setIsFollowing(false)
    } else {
      // Follow
      await supabase
        .from('follows')
        .insert({ follower_id: user.id, creator_id: creatorId })
      setIsFollowing(true)
    }
    setLoading(false)
  }

  if (!user || user.id === creatorId) return null

  return (
    <TouchableOpacity
      style={[styles.button, isFollowing ? styles.following : styles.notFollowing]}
      onPress={toggleFollow}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading
        ? <ActivityIndicator color={isFollowing ? Colors.brand.textSecondary : '#fff'} size="small" />
        : <Text style={[styles.text, isFollowing && styles.textFollowing]}>
            {isFollowing ? '✓ Following' : '+ Follow'}
          </Text>
      }
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  notFollowing: {
    backgroundColor: Colors.brand.primary,
  },
  following: {
    backgroundColor: Colors.brand.surface,
    borderWidth: 1,
    borderColor: Colors.brand.border,
  },
  text: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  textFollowing: {
    color: Colors.brand.textSecondary,
  },
})
