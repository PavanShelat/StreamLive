// src/constants/config.ts
// Centralized app configuration — replace placeholders with real values after setup

// ─── Supabase ────────────────────────────────────────────────────────────────
// 1. Go to https://supabase.com and create a new project
// 2. Settings → API → copy "Project URL" and "anon public" key
export const SUPABASE_URL     = process.env.EXPO_PUBLIC_SUPABASE_URL     ?? 'https://YOUR_PROJECT_ID.supabase.co'
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'YOUR_SUPABASE_ANON_KEY'

// ─── LiveKit ─────────────────────────────────────────────────────────────────
// 1. Go to https://cloud.livekit.io and create a free project
// 2. Copy the "WebSocket URL" (wss://your-project.livekit.cloud)
export const LIVEKIT_WS_URL = process.env.EXPO_PUBLIC_LIVEKIT_WS_URL ?? 'wss://YOUR_PROJECT.livekit.cloud'

// ─── n8n ─────────────────────────────────────────────────────────────────────
// Your local n8n instance — used for webhook testing in development
export const N8N_BASE_URL = process.env.EXPO_PUBLIC_N8N_BASE_URL ?? 'http://localhost:5678'

// ─── Stream Metadata Interval ────────────────────────────────────────────────
// How often (ms) the creator's app POSTs metadata to the edge function
export const METADATA_INTERVAL_MS = 60_000 // 60 seconds

// ─── Viewer Milestone Thresholds (informational — enforced in n8n) ────────────
export const VIEWER_MILESTONES = [100, 200, 500, 1000]
