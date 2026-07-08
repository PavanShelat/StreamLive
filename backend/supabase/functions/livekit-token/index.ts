// Supabase Edge Function: livekit-token
// Path: supabase/functions/livekit-token/index.ts
// Generates a signed LiveKit JWT for a participant joining a room.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// LiveKit token generation (pure Deno — no Node deps)
// We implement a minimal JWT signer compatible with LiveKit's format.

const LIVEKIT_API_KEY    = Deno.env.get('LIVEKIT_API_KEY')!
const LIVEKIT_API_SECRET = Deno.env.get('LIVEKIT_API_SECRET')!
const SUPABASE_URL       = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY  = Deno.env.get('SUPABASE_ANON_KEY')!

// ── Minimal HS256 JWT ──────────────────────────────────────────────────────────

async function signJwt(payload: object, secret: string): Promise<string> {
  const header  = { alg: 'HS256', typ: 'JWT' }
  const encode  = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const data    = `${encode(header)}.${encode(payload)}`
  const key     = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig     = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  const sigB64  = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  return `${data}.${sigB64}`
}

function buildLiveKitToken(
  apiKey: string,
  apiSecret: string,
  roomName: string,
  participantIdentity: string,
  isPublisher: boolean,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const grants = {
    roomJoin: true,
    room: roomName,
    canPublish: isPublisher,
    canSubscribe: true,
    canPublishData: true,
  }
  const payload = {
    iss: apiKey,
    sub: participantIdentity,
    iat: now,
    exp: now + 3600, // 1 hour
    nbf: now,
    video: grants,
    metadata: '',
  }
  return signJwt(payload, apiSecret)
}

// ── Handler ───────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    }

    // Decode JWT manually (bypassing strict validation as requested)
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Missing auth header' }), { status: 401, headers: corsHeaders })

    let userId: string;
    try {
      const token = authHeader.replace('Bearer ', '').trim()
      const parts = token.split('.')
      if (parts.length !== 3) throw new Error('Invalid token format')
      const payload = JSON.parse(atob(parts[1]))
      userId = payload.sub
      if (!userId) throw new Error('No sub in JWT')
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JWT structure' }), { status: 401, headers: corsHeaders })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // Parse body
    const { roomName, role } = await req.json() as { roomName: string; role: 'host' | 'viewer' }
    if (!roomName || !role) {
      return new Response('Missing roomName or role', { status: 400 })
    }

    // Fetch username for display
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single()

    const identity  = profile?.username ?? userId
    const isPublisher = role === 'host'

    const token = await buildLiveKitToken(
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET,
      roomName,
      identity,
      isPublisher,
    )

    return new Response(JSON.stringify({ token, identity }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    console.error('livekit-token error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
    })
  }
})
