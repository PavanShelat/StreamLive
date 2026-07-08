# n8n Workflows

This directory contains the 4 n8n automation workflows for the StreamLive broadcasting app.

## Workflows

| File | Trigger | Action |
|---|---|---|
| `follower-notification.json` | Supabase webhook: stream INSERT (status=live) | Notifies all followers of the creator |
| `milestone-alert.json` | Supabase webhook: stream_metadata_log INSERT | Alerts creator when viewer count hits 100 or 200 |
| `highlight-generation.json` | Supabase webhook: stream UPDATE (status=ended) | Detects peaks, writes highlights to Supabase |
| `daily-digest.json` | Cron (daily midnight IST) | Compiles top 10 streams and stores digest |

## Import Instructions

1. Start n8n: `docker compose up -d` from the project root
2. Open http://localhost:5678 (admin / broadcasting123)
3. **Workflows → Import from file** → select each JSON file
4. **Set up Supabase credentials** (required for Postgres nodes):
   - Settings → Credentials → Add → PostgreSQL
   - Name: `Supabase Postgres`
   - Host: `db.YOUR_PROJECT_ID.supabase.co`
   - Port: `5432`
   - Database: `postgres`
   - User: `postgres`
   - Password: your Supabase database password
5. **Activate** each workflow using the toggle

## Supabase Webhook Setup

In Supabase Dashboard → Database → Webhooks:

| Webhook Name | Table | Events | Filter | n8n URL |
|---|---|---|---|---|
| stream-started | streams | INSERT | — | `http://localhost:5678/webhook/stream-started` |
| stream-ended | streams | UPDATE | — | `http://localhost:5678/webhook/stream-ended` |
| metadata-logged | stream_metadata_log | INSERT | — | `http://localhost:5678/webhook/metadata-logged` |

> **Note:** For production, replace `localhost:5678` with your n8n instance's public URL (e.g., via ngrok or cloud deployment).

## Highlight Detection Logic

The `highlight-generation` workflow applies these rules:
- **Viewer milestones:** Flags moments when `viewer_count` first crosses 100, 200, 500, or 1000
- **Chat spikes:** Flags minutes where `message_count_per_minute > 2× rolling average` (min threshold: 5 msgs/min)
