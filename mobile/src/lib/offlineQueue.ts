// src/lib/offlineQueue.ts
// Manages a local FIFO queue of unsent chat messages using AsyncStorage (or localStorage on Web).
// Drained automatically when network connectivity is restored.

import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

const QUEUE_KEY = '@broadcasting/offline_message_queue'

export interface QueuedMessage {
  id: string            // UUID — used for deduplication on retry
  streamId: string
  body: string
  clientTimestamp: string  // ISO string
}

// Platform-agnostic storage wrapper
const storage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return window.localStorage.getItem(key)
    }
    return AsyncStorage.getItem(key)
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      window.localStorage.setItem(key, value)
      return
    }
    await AsyncStorage.setItem(key, value)
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      window.localStorage.removeItem(key)
      return
    }
    await AsyncStorage.removeItem(key)
  }
}

export async function enqueueMessage(msg: QueuedMessage): Promise<void> {
  const existing = await getQueue()
  existing.push(msg)
  await storage.setItem(QUEUE_KEY, JSON.stringify(existing))
}

export async function getQueue(): Promise<QueuedMessage[]> {
  try {
    const raw = await storage.getItem(QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export async function clearQueue(): Promise<void> {
  await storage.removeItem(QUEUE_KEY)
}

export async function removeFromQueue(id: string): Promise<void> {
  const existing = await getQueue()
  const filtered = existing.filter((m) => m.id !== id)
  await storage.setItem(QUEUE_KEY, JSON.stringify(filtered))
}

