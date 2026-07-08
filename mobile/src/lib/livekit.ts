// src/lib/livekit.ts
// Helper to fetch a signed LiveKit JWT from our Supabase Edge Function

import { supabase } from './supabase'
import { SUPABASE_URL } from '@/constants/config'

export type LiveKitRole = 'host' | 'viewer'

export interface LiveKitTokenResponse {
  token: string
  identity: string
}

export async function getLiveKitToken(
  roomName: string,
  role: LiveKitRole,
): Promise<LiveKitTokenResponse> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const response = await fetch(`${SUPABASE_URL}/functions/v1/livekit-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ roomName, role }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`LiveKit token error: ${errorText}`)
  }

  return response.json()
}

export async function logStreamMetadata(
  streamId: string,
  viewerCount: number,
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  try {
    await fetch(`${SUPABASE_URL}/functions/v1/stream-metadata`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ streamId, viewerCount }),
    })
  } catch {
    // Non-fatal — metadata logging should not disrupt streaming
    console.warn('Metadata logging failed')
  }
}
