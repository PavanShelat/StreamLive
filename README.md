# StreamLive — Real-Time Live Broadcasting App

> 48-hour BuildableLabs Wildcard Generalist Engineer assignment

## Overview

A full-stack real-time live broadcasting platform featuring:
- 📱 **Mobile app** (React Native + Expo) for iOS and Android
- 🎥 **LiveKit** for real-time video streaming
- 🗄️ **Supabase** for database, auth, realtime, and webhooks
- 🤖 **n8n** for automation workflows

## Project Structure

```
Broadcasting_Event/
├── mobile/           # React Native + Expo app
├── backend/          # Supabase schema + Edge Functions
├── n8n-workflow/     # n8n automation workflow exports
├── docker-compose.yml  # n8n self-hosted setup
└── prd.md
```

---

## 🚀 Quick Start

### Step 1: Supabase Setup

1. Go to [supabase.com](https://supabase.com) → Create New Project
2. Note your **Project URL** and **anon public key** from Settings → API
3. Note your **service_role key** (for Edge Functions)
4. Run the schema migration:
   - Open the SQL Editor in your Supabase dashboard
   - Paste and run: `backend/supabase/migrations/001_initial_schema.sql`
5. Set up webhooks (for n8n integration):
   - Dashboard → Database → Webhooks → Create new webhook
   - **Webhook 1:** Table = `streams`, Events = `INSERT`, Filter = `status=live`, URL = `http://localhost:5678/webhook/stream-started`
   - **Webhook 2:** Table = `streams`, Events = `UPDATE`, Filter = `status=ended`, URL = `http://localhost:5678/webhook/stream-ended`
   - **Webhook 3:** Table = `stream_metadata_log`, Events = `INSERT`, URL = `http://localhost:5678/webhook/metadata-logged`

### Step 2: LiveKit Setup

1. Go to [cloud.livekit.io](https://cloud.livekit.io) → Create project (free tier)
2. Note your **WebSocket URL** (e.g., `wss://your-project.livekit.cloud`)
3. Note your **API Key** and **API Secret** from the project dashboard

### Step 3: Deploy Supabase Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_ID

# Set secrets for Edge Functions
supabase secrets set LIVEKIT_API_KEY=your_api_key
supabase secrets set LIVEKIT_API_SECRET=your_api_secret
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Deploy functions
supabase functions deploy livekit-token
supabase functions deploy stream-metadata
```

### Step 4: n8n Setup

```bash
# Start n8n with Docker Compose
docker compose up -d

# Open n8n at http://localhost:5678
# Username: admin
# Password: broadcasting123

# Import workflows:
# n8n UI → Workflows → Import from file → select each JSON in n8n-workflow/
# Then activate each workflow
# Set up Supabase Postgres credentials in n8n:
#   Settings → Credentials → Add → PostgreSQL
#   Host: db.YOUR_PROJECT_ID.supabase.co
#   Port: 5432
#   Database: postgres
#   User: postgres
#   Password: your_supabase_db_password
```

### Step 5: Mobile App Setup

```bash
cd mobile

# Copy and fill in your credentials
cp .env.example .env
# Edit .env with your Supabase URL, anon key, and LiveKit WS URL

# Start development server
npm start

# Run on device/simulator
npm run android  # Android
npm run ios      # iOS (macOS only)
```

---

## 📋 Features by Phase

### Phase 1 — Core Streaming
- ✅ Email/password authentication
- ✅ Browse live streams (real-time list updates)
- ✅ Creator: start/end stream with LiveKit
- ✅ Viewer: join stream and watch video
- ✅ Live viewer count (real-time Supabase subscription)
- ✅ Real-time chat across all viewers
- ✅ Follow/Unfollow creators

### Phase 2 — Offline Chat Resilience
- ✅ Detect network connectivity via `@react-native-community/netinfo`
- ✅ Queue messages in `AsyncStorage` when offline
- ✅ Drain queue on reconnect in original timestamp order
- ✅ Deduplicate by message ID (no duplicate sends on retry)
- ✅ Merge with online messages by `client_timestamp`
- ✅ UI banner shows offline/syncing status

### Phase 3 — n8n Automation
- ✅ Follower notification on stream start
- ✅ Creator milestone alert at 100/200 viewers
- ✅ Highlight generation on stream end (viewer peaks + chat spikes)
- ✅ Daily digest of top streams at midnight

---

## 🏗️ Architecture

```
Mobile App (Expo)
    │
    ├── Supabase Auth (login/register)
    ├── Supabase Realtime (streams, messages, notifications)
    ├── Supabase Edge Functions (LiveKit token, metadata logging)
    └── LiveKit Cloud (WebRTC video streaming)
         │
         └── Supabase DB ──→ Webhooks ──→ n8n
                                              ├── Follower Notification workflow
                                              ├── Milestone Alert workflow
                                              ├── Highlight Generation workflow
                                              └── Daily Digest workflow (cron)
```

---

## 🧪 Testing Checklist

### Phase 1
- [ ] Register two accounts (creator + viewer)
- [ ] Creator starts a stream → appears in Browse list
- [ ] Viewer joins → video visible, viewer count increments
- [ ] Viewer sends chat → appears for creator and all viewers
- [ ] Viewer follows creator
- [ ] Creator ends stream → viewers redirected

### Phase 2
- [ ] Viewer puts device in airplane mode
- [ ] Viewer types 3 messages (offline banner shows)
- [ ] Reconnect → messages sync in original order
- [ ] No duplicates in chat

### Phase 3
- [ ] Creator starts stream → check `notifications` table for follower entries
- [ ] Simulate 100 viewers → check `notifications` table for creator alert
- [ ] Creator ends stream → check `highlights` table for generated entries
- [ ] Trigger n8n daily cron manually → check `daily_digests` table

---

## 📦 Submission Artifacts

- `mobile/` — React Native + Expo app source
- `backend/` — Supabase schema and Edge Functions
- `n8n-workflow/` — All 4 workflow exports (import to n8n UI)
- This README
