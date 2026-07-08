// src/hooks/useChat.ts
// Phase 1 + Phase 2: Real-time chat with offline queue support
// - Online: sends directly to Supabase
// - Offline: queues in AsyncStorage, drains on reconnect

import { useState, useEffect, useRef } from 'react'
import NetInfo from '@react-native-community/netinfo'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import {
  enqueueMessage,
  getQueue,
  removeFromQueue,
  QueuedMessage,
} from '@/lib/offlineQueue'

export interface ChatMessage {
  id: string
  sender_id: string
  sender_username: string
  body: string
  client_timestamp: string
  created_at: string
}

export function useChat(streamId: string) {
  const { user, profile } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isOnline, setIsOnline] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const isSyncing = useRef(false)

  // ── 1. Load initial messages ───────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('stream_id', streamId)
        .order('client_timestamp', { ascending: true })
        .limit(200)
      if (data) setMessages(data)
    }
    load()
  }, [streamId])

  // ── 2. Subscribe to realtime inserts ──────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${streamId}-${Math.random()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `stream_id=eq.${streamId}` },
        (payload) => {
          setMessages((prev) => {
            const exists = prev.find((m) => m.id === payload.new.id)
            if (exists) return prev
            const updated = [...prev, payload.new as ChatMessage]
            return updated.sort(
              (a, b) => new Date(a.client_timestamp).getTime() - new Date(b.client_timestamp).getTime()
            )
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [streamId])

  // ── 3. Monitor connectivity — drain queue on reconnect ────────────────────
  useEffect(() => {
    const unsub = NetInfo.addEventListener(async (state) => {
      const online = !!state.isConnected
      setIsOnline(online)

      if (online && !isSyncing.current) {
        isSyncing.current = true
        setSyncing(true)
        await drainOfflineQueue()
        isSyncing.current = false
        setSyncing(false)
      }
    })
    return unsub
  }, [streamId])

  // ── 4. Send a message (online or offline) ─────────────────────────────────
  const sendMessage = async (body: string) => {
    if (!user || !profile || !body.trim()) return

    const now = new Date().toISOString()
    // Generate a valid UUID v4 format to avoid Postgres 22P02 error
    const msgId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })

    if (!isOnline) {
      // Queue offline
      await enqueueMessage({
        id: msgId,
        streamId,
        body: body.trim(),
        clientTimestamp: now,
      })
      // Optimistic local display
      setMessages((prev) =>
        [...prev, {
          id: msgId,
          sender_id: user.id,
          sender_username: profile.username,
          body: body.trim(),
          client_timestamp: now,
          created_at: now,
        }].sort((a, b) =>
          new Date(a.client_timestamp).getTime() - new Date(b.client_timestamp).getTime()
        )
      )
      return
    }

    // Send online
    await supabase.from('messages').insert({
      id: msgId,
      stream_id: streamId,
      sender_id: user.id,
      sender_username: profile.username,
      body: body.trim(),
      client_timestamp: now,
    })
  }

  // ── 5. Drain offline queue ────────────────────────────────────────────────
  const drainOfflineQueue = async () => {
    const queue = await getQueue()
    const forThisStream = queue.filter((m) => m.streamId === streamId)
    if (forThisStream.length === 0) return

    for (const msg of forThisStream) {
      const { error } = await supabase.from('messages').insert({
        id: msg.id,
        stream_id: msg.streamId,
        sender_id: user!.id,
        sender_username: profile!.username,
        body: msg.body,
        client_timestamp: msg.clientTimestamp,
      })
      if (!error) {
        await removeFromQueue(msg.id)
      }
    }
  }

  return { messages, sendMessage, isOnline, syncing }
}
