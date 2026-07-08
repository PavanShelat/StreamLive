// Supabase Edge Function: stream-metadata
// Path: supabase/functions/stream-metadata/index.ts
// Called every 60s by the creator's app to log viewer count + chat rate.
// This data is later used by n8n for highlight detection.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL            = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY       = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    // Authenticate
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return new Response('Unauthorized', { status: 401 })

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return new Response('Unauthorized', { status: 401 })

    const { streamId, viewerCount } = await req.json() as {
      streamId: string
      viewerCount: number
    }
    if (!streamId || viewerCount === undefined) {
      return new Response('Missing streamId or viewerCount', { status: 400 })
    }

    // Verify caller is the stream creator
    const { data: stream, error: streamErr } = await supabase
      .from('streams')
      .select('creator_id, status')
      .eq('id', streamId)
      .single()

    if (streamErr || !stream) return new Response('Stream not found', { status: 404 })
    if (stream.creator_id !== user.id) return new Response('Forbidden', { status: 403 })
    if (stream.status !== 'live') return new Response('Stream is not live', { status: 400 })

    // Count messages in the last 60 seconds using service role client
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString()

    const { count: messageCount } = await serviceClient
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('stream_id', streamId)
      .gte('created_at', oneMinuteAgo)

    // Insert metadata snapshot
    const { error: insertErr } = await serviceClient
      .from('stream_metadata_log')
      .insert({
        stream_id: streamId,
        viewer_count: viewerCount,
        message_count_per_minute: messageCount ?? 0,
      })

    if (insertErr) {
      console.error('Metadata insert error:', insertErr)
      return new Response('Insert failed', { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    console.error('stream-metadata error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
