# StreamLive — Setup Guide

> Follow every step **in order**. Do not skip ahead.

---

## Prerequisites

Install these tools before anything else:

| Tool | Purpose | Install |
|---|---|---|
| Node.js (v18+) | Run the mobile app | https://nodejs.org |
| Docker Desktop | Run n8n locally | https://www.docker.com/products/docker-desktop |
| Supabase CLI | Apply DB migration & deploy edge functions | Installed in Step 4 below |
| Expo Go (phone app) | Run the app on your device | iOS App Store / Google Play Store |

---

## Step 1 — Get Your Supabase Credentials

Supabase is the database, auth, and realtime layer.

1. Go to [https://supabase.com](https://supabase.com) → sign up or log in
2. Click **New Project**
   - Project name: anything you like (e.g. `streamlive`)
   - **Database Password:** choose a strong password — write it down, you will need it
   - Region: closest to you
3. Click **Create new project** — wait ~2 minutes for it to provision
4. Once ready, go to: **Settings (⚙ icon, bottom-left) → API**
5. Copy and save these 3 values:

```
Project URL:        https://xxxxxxxxxxxx.supabase.co
Anon public key:    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Service role key:   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Also note your **Project Reference ID** — it is the part between `https://` and `.supabase.co` in your URL:

```
https://xxxxxxxxxxxx.supabase.co
         ^^^^^^^^^^^^
         This is your Project Ref ID
```

---

## Step 2 — Get Your LiveKit Credentials

LiveKit handles the real-time video streaming.

1. Go to [https://cloud.livekit.io](https://cloud.livekit.io) → sign up
2. Click **New Project** → give it a name → select the **free tier**
3. From your project dashboard, copy:

```
WebSocket URL:  wss://yourproject.livekit.cloud
API Key:        livekit-api-XXXXXXXXX
API Secret:     xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Step 3 — Create Your Environment File

> 📁 **File location:** `p:\Projects\Broadcasting_Event\mobile\.env`

This file does not exist yet. Create it by copying the example template:

**In PowerShell:**
```powershell
copy p:\Projects\Broadcasting_Event\mobile\.env.example `
     p:\Projects\Broadcasting_Event\mobile\.env
```

Then open `mobile\.env` in any text editor and fill in your values:

```env
# Supabase — from Step 1
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# LiveKit — from Step 2
EXPO_PUBLIC_LIVEKIT_WS_URL=wss://yourproject.livekit.cloud

# n8n (leave as-is for local setup)
EXPO_PUBLIC_N8N_BASE_URL=http://localhost:5678
```

Save the file before moving on.

---

## Step 4 — Install the Supabase CLI

```powershell
npm install -g supabase
```

Verify it installed:
```powershell
supabase --version
```

---

## Step 5 — Apply the Database Migration

This creates all tables, RLS policies, and stored procedures in your Supabase project automatically — no manual SQL required.

```powershell
# Log in to Supabase (opens a browser window)
supabase login

# Move into the backend folder
cd p:\Projects\Broadcasting_Event\backend

# Link to your project (replace xxxxxxxxxxxx with your Project Ref ID from Step 1)
supabase link --project-ref xxxxxxxxxxxx

# Apply the migration
supabase db push
```

When prompted for the database password, enter the one you set in Step 1.

You should see output like:
```
Applying migration 001_initial_schema.sql...
Done.
```

---

## Step 6 — Deploy the Edge Functions

Still inside the `backend` folder:

```powershell
# Set the LiveKit secrets the edge functions need
supabase secrets set LIVEKIT_API_KEY=livekit-api-XXXXXXXXX
supabase secrets set LIVEKIT_API_SECRET=your_livekit_secret

# Deploy both functions
supabase functions deploy livekit-token
supabase functions deploy stream-metadata
```

> **Note:** You do NOT need to set `SUPABASE_SERVICE_ROLE_KEY` as a secret — Supabase automatically injects it (along with `SUPABASE_URL` and `SUPABASE_ANON_KEY`) into every Edge Function as built-in environment variables.

Verify they are live: in the Supabase dashboard go to **Edge Functions** — you should see `livekit-token` and `stream-metadata` listed as **Active**.

---

## Step 7 — Start n8n

Make sure **Docker Desktop is open and running**, then:

```powershell
cd p:\Projects\Broadcasting_Event
docker compose up -d
```

Wait about 30 seconds, then open: [http://localhost:5678](http://localhost:5678)

Log in with:
- Username: `admin`
- Password: `Broadcasting123`

---

## Step 8 — Configure n8n (Browser UI)

### 8a. Add Supabase Database Credential

n8n needs direct Postgres access to read and write your Supabase database.

1. In n8n → click **Settings** (bottom-left) → **Credentials** → **Add Credential**
2. Search for `PostgreSQL` → select it
3. Fill in exactly:

   | Field | Value |
   |---|---|
   | **Name** | `Supabase Postgres` (must match exactly) |
   | **Host** | `db.xxxxxxxxxxxx.supabase.co` (your project ref from Step 1) |
   | **Port** | `5432` |
   | **Database** | `postgres` |
   | **User** | `postgres` |
   | **Password** | Your database password from Step 1 |
   | **SSL** | ✅ Enable SSL |

4. Click **Test Connection** → should say **Connection successful**
5. Click **Save**

### 8b. Import the 4 Workflows

In n8n: **Workflows → ⋮ (top-right menu) → Import from File**

Import each file from the `n8n-workflow/` folder, one at a time:

| File to import | What it does |
|---|---|
| `n8n-workflow\follower-notification.json` | Notifies all followers when a creator goes live |
| `n8n-workflow\milestone-alert.json` | Alerts creator when viewer count hits 100 or 200 |
| `n8n-workflow\highlight-generation.json` | Detects peak moments and writes highlights to Supabase |
| `n8n-workflow\daily-digest.json` | Runs daily at midnight and stores top stream stats |

After importing each workflow:
- Open it → toggle the **Active** switch in the top-right corner to ON

---

## Step 9 — Set Up Supabase Webhooks

These connect database events to your n8n workflows.

In Supabase dashboard → **Database → Webhooks → Create a new hook**

Create these 3 webhooks:

**Webhook 1**
| Field | Value |
|---|---|
| Name | `stream-started` |
| Table | `streams` |
| Events | ✅ INSERT |
| URL | `http://localhost:5678/webhook/stream-started` |

**Webhook 2**
| Field | Value |
|---|---|
| Name | `stream-ended` |
| Table | `streams` |
| Events | ✅ UPDATE |
| URL | `http://localhost:5678/webhook/stream-ended` |

**Webhook 3**
| Field | Value |
|---|---|
| Name | `metadata-logged` |
| Table | `stream_metadata_log` |
| Events | ✅ INSERT |
| URL | `http://localhost:5678/webhook/metadata-logged` |

> ⚠️ **Important:** Supabase webhooks fire from Supabase's servers, so `localhost:5678` will not be reachable. To make webhooks work during the demo, use [ngrok](https://ngrok.com):
> ```powershell
> ngrok http 5678
> ```
> Copy the `https://xxxx.ngrok.io` URL it gives you and replace `http://localhost:5678` in all 3 webhook URLs above.

---

## Step 10 — Run the Mobile App

```powershell
cd p:\Projects\Broadcasting_Event\mobile
npm start
```

- Scan the QR code with **Expo Go** on your phone, or
- Press `a` for Android emulator, `i` for iOS simulator (macOS only)

---

## Step 11 — Verify Everything Works

### Phase 1 — Streaming

1. Register **two accounts** (creator + viewer) on two devices / Expo Go instances
2. **Creator:** tap 🔴 → enter a title → **Start Streaming** → allow camera & mic
3. **Viewer:** tap 📡 → stream appears in the list → tap it → see the video
4. **Viewer:** send a chat message → appears on both devices in real time
5. **Viewer:** tap **+ Follow**
6. **Creator:** tap **End Stream** → viewer gets redirected

### Phase 2 — Offline Chat

1. **Viewer:** turn on Airplane Mode
2. Type 3 messages → offline 📵 banner shows, messages queued locally
3. Turn off Airplane Mode → "Syncing…" banner → messages appear in correct order, no duplicates

### Phase 3 — Automations

Check results in Supabase **Table Editor**:

| Action | Table to check | Expected result |
|---|---|---|
| Creator goes live | `notifications` | One row per follower |
| Viewer count hits 100 | `notifications` | One row for the creator |
| Stream ends | `highlights` | Rows with timestamps + reasons |
| Daily digest | `daily_digests` | One row for today |

---

## Stop & Restart

```powershell
# Stop n8n
docker compose down

# Restart n8n (data is preserved)
docker compose up -d
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `supabase link` fails | Double-check your Project Ref ID — it's in your Supabase URL |
| `supabase db push` asks for password repeatedly | Enter the exact DB password set in Step 1 |
| Edge Functions return 401 | Verify secrets: `supabase secrets list` — re-set if missing |
| App shows blank screen | Check `mobile\.env` exists and has no typos in the URL or key |
| n8n webhooks not firing | Use ngrok as described in Step 9 |
| Camera/mic not working in Expo Go | Grant permissions in your phone's Settings app for Expo Go |
| Docker not starting | Open Docker Desktop and wait until it shows "Running" before retrying |
