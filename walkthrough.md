# StreamLive — Build Walkthrough

## What Was Built

A complete real-time live broadcasting system across all 3 phases from the PRD.

## Project Structure Created

```
Broadcasting_Event/
├── README.md                         ← Full setup guide
├── docker-compose.yml                ← n8n self-hosted setup
│
├── mobile/                           ← React Native + Expo app
│   ├── app.json                      ← Updated: StreamLive, dark mode, permissions
│   ├── .env.example                  ← Credential template
│   └── src/
│       ├── app/
│       │   ├── _layout.tsx           ← Auth-gated root layout
│       │   ├── (auth)/
│       │   │   ├── _layout.tsx
│       │   │   ├── login.tsx         ← Branded login screen
│       │   │   └── register.tsx      ← Registration with username
│       │   ├── (tabs)/
│       │   │   ├── _layout.tsx       ← Tab bar with notification dot
│       │   │   ├── index.tsx         ← Browse streams (home)
│       │   │   ├── go-live.tsx       ← Creator: start/end stream
│       │   │   ├── notifications.tsx ← In-app notification feed
│       │   │   └── digests.tsx       ← Leaderboard of top daily streams
│       │   └── stream/
│       │       └── [id].tsx          ← Viewer: watch stream
│       ├── components/
│       │   ├── StreamCard.tsx        ← LIVE badge, viewer count, creator info
│       │   ├── ChatBox.tsx           ← Chat UI with offline banner
│       │   ├── ViewerCount.tsx       ← Realtime viewer counter
│       │   └── FollowButton.tsx      ← Follow/Unfollow with optimistic UI
│       ├── hooks/
│       │   └── useChat.ts            ← Phase 1+2: online+offline chat logic
│       ├── lib/
│       │   ├── supabase.ts           ← Supabase client (AsyncStorage sessions)
│       │   ├── livekit.ts            ← Token fetch + metadata logging
│       │   └── offlineQueue.ts       ← AsyncStorage FIFO message queue
│       ├── context/
│       │   └── AuthContext.tsx       ← Session + profile context
│       └── constants/
│           ├── Colors.ts             ← Design system (dark, vibrant palette)
│           └── config.ts             ← Env-driven configuration
│
├── backend/
│   ├── README.md
│   └── supabase/
│       ├── migrations/
│       │   └── 001_initial_schema.sql  ← Full DB schema + RLS + RPCs
│       └── functions/
│           ├── livekit-token/index.ts  ← JWT generation (pure Deno, no deps)
│           └── stream-metadata/index.ts ← Per-minute metadata logging
│
└── n8n-workflow/
    ├── README.md
    ├── follower-notification.json    ← Notifies followers on stream start
    ├── milestone-alert.json          ← Alerts creator at 100/200 viewers
    ├── highlight-generation.json     ← Detects peaks, writes highlights
    └── daily-digest.json             ← Daily cron: top 10 streams
```

## Key Design Decisions

| Decision | Rationale |
|---|---|
| `client_timestamp` on messages | Enables correct ordering of offline messages merged with online messages |
| AsyncStorage FIFO queue | Phase 2 offline resilience — messages persist across app restarts |
| NetInfo + drain-on-reconnect | Automatic sync without user action when connectivity restored |
| In-app notifications via Supabase | n8n writes to `notifications` table → Realtime subscription in app shows them instantly |
| Supabase RPC for viewer count | Atomic increment/decrement prevents race conditions |
| Pure Deno JWT in edge function | No external npm packages needed — works in Supabase's Deno runtime |

## TypeScript

**✅ 0 TypeScript errors** — confirmed with `npx tsc --noEmit`

## Next Steps (User Action Required)

> [!IMPORTANT]
> **You need to provide credentials before running the app.**

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Run `backend/supabase/migrations/001_initial_schema.sql` in the SQL Editor
3. Copy the credentials into `mobile/.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
4. Set up 3 Database Webhooks (see `README.md` for URLs)
5. Deploy edge functions (see `backend/README.md`)

### 2. LiveKit
1. Create a free project at [cloud.livekit.io](https://cloud.livekit.io)
2. Copy WSS URL into `mobile/.env`:
   ```
   EXPO_PUBLIC_LIVEKIT_WS_URL=wss://xxx.livekit.cloud
   ```
3. Set API Key + Secret as Supabase edge function secrets

### 3. n8n
```bash
# From project root:
docker compose up -d
# Open http://localhost:5678 (admin / broadcasting123)
# Import each JSON from n8n-workflow/
# Set up Supabase Postgres credentials
# Activate all 4 workflows
```

### 4. Run the App
```bash
cd mobile
cp .env.example .env
# Fill in your credentials
npm start
# Press 'a' for Android, 'i' for iOS
```
