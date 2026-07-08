# CONTENTS

Abstract
Business Objectives
KPI
Success Criteria
User Journeys
Scenarios
User Flow
Functional Requirements
Model Requirements
Data Requirements
Prompt Requirements
Testing & Measurement
Risks & Mitigations
Costs
Assumptions & Dependencies
Compliance/Privacy/Legal
GTM/Rollout Plan

## 📝 Abstract

This is a 48-hour solo technical assignment from BuildableLabs (Wildcard Generalist Engineer track): build a real-time live event broadcasting system. Creators broadcast video, viewers watch and chat in real time, and n8n automation handles notifications, viewer-count alerts, and post-stream highlight generation. The build has three phases — core streaming, offline chat resilience, and automation — all delivered with full feature scope (no cuts), starting from scratch, using free-tier services only: React Native + Expo (mobile, iOS + Android), Supabase (realtime DB, auth, webhooks), and LiveKit (video streaming SDK). Success is defined as all listed features working end-to-end for submission, not business metrics.

## 🎯 Business Objectives

* Demonstrate ability to design and ship a real-time, multi-service system (video + chat + automation) within a hard 48-hour constraint
* Prove competency across the full stack: mobile (RN/Expo), realtime backend (Supabase), video infra (LiveKit), and workflow automation (n8n)
* Pass BuildableLabs' evaluation criteria for the Wildcard Generalist Engineer assignment with a fully functional, demoable MVP across all 3 phases

## 📊 KPI

Note: this is an assignment, not a product launch — "KPIs" here are pass/fail delivery signals, not growth metrics.

| GOAL                        | METRIC                                   | QUESTION                                                 |
| --------------------------- | ----------------------------------------- | --------------------------------------------------------- |
| Phase 1 delivery            | All 5 core features working live          | Can a creator stream and a viewer watch + chat + follow?  |
| Phase 2 delivery            | Offline chat sync with correct ordering   | Do offline messages queue, sync, and merge without loss?  |
| Phase 3 delivery            | All 4 automations firing correctly        | Do notifications, alerts, highlights, and digest all work?|
| Submission completeness     | All 4 submission artifacts present        | Repo, prompt doc, n8n export, working app — all delivered?|

## 🏆 Success Criteria

* Creator can start and end a live stream from the mobile app
* Viewer can browse, join, and watch a live stream, and follow/unfollow the creator
* Live viewer count updates in real time for both creator and viewers
* Chat messages sync across all connected viewers in real time
* Offline viewers can queue chat messages locally; on reconnect, messages sync in correct order and merge without conflict or loss
* On stream start, all followers of that creator receive a notification
* Creator receives an alert when viewer count crosses defined milestones (e.g. 100, 200)
* On stream end, a highlight list is generated from stream metadata and stored in Supabase
* A daily digest of top streams is produced
* All 4 submission artifacts (GitHub repo with `/mobile /backend /n8n-workflow`, prompt-sharing doc, n8n workflow export, working app) are complete and demoable

## 🚶‍♀️ User Journeys

**Creator journey:** Opens app → starts a live stream → sees live viewer count tick up → reads incoming chat → gets milestone alerts (100/200 viewers) → ends stream → highlight list is generated automatically in the background.

**Viewer journey:** Opens app → browses active streams → joins one → watches video, sees live viewer count → sends chat messages (works even if briefly offline, syncing once reconnected) → follows the creator → later receives a push notification next time that creator goes live.

## 📖 Scenarios

* Creator starts a stream with zero followers online — no notifications fire, stream still runs normally
* Creator starts a stream with 50 followers — all 50 receive a "creator is live" notification via n8n
* Viewer loses network mid-chat, sends 3 messages offline, reconnects — messages sync in original order, merged correctly with messages sent by others during the gap
* Stream crosses 100 concurrent viewers — creator receives a milestone alert; crosses 200 — receives another
* Stream ends — n8n reads logged metadata (viewer count over time, chat volume per minute), detects peaks, and writes a highlight list to Supabase
* End of day — n8n compiles and stores a digest of the day's top streams (by peak viewers or total chat volume)

## 🕹️ User Flow

**Happy path (Creator):**
Login → Home → Start Stream → LiveKit session initializes → Stream goes live → Supabase logs stream_start event → webhook fires to n8n → n8n notifies followers → Creator sees live viewer count + chat → viewer count milestone hit → n8n alerts creator → Creator ends stream → Supabase logs stream_end event → webhook fires to n8n → n8n runs highlight detection → highlights stored in Supabase.

**Happy path (Viewer):**
Login → Browse streams → Tap stream → Join via LiveKit → Watch video + see live viewer count → Send chat message → (if offline) message queued locally → reconnect → queued messages sync in order → Follow creator → (later) receive notification when creator goes live again.

**Alternate path (Offline chat):**
Viewer sends message while offline → message stored in local queue with client-side timestamp → connectivity restored → client syncs queued messages to Supabase → Supabase merges by timestamp with messages from other viewers sent during the gap → all viewers see consistent, correctly ordered chat history.

## 🧰 Functional Requirements

| SECTION              | SUB-SECTION           | USER STORY & EXPECTED BEHAVIORS | SCREENS |
| --------------------- | --------------------- | -------------------------------- | ------- |
| Streaming (Creator)  | Start Stream          | As a creator, I can start a live stream so viewers can join and watch. LiveKit session initializes; Supabase logs stream_start. | TBD |
| Streaming (Creator)  | End Stream            | As a creator, I can end my stream so viewers are disconnected and highlight generation begins. Supabase logs stream_end, triggers webhook. | TBD |
| Streaming (Viewer)   | Browse & Join         | As a viewer, I can browse live streams and join one to watch video in real time via LiveKit. | TBD |
| Streaming (Viewer)   | Follow/Unfollow       | As a viewer, I can follow or unfollow a creator so I get notified when they go live. | TBD |
| Viewer Count          | Real-time count       | As a creator/viewer, I see live viewer count update in real time as people join/leave. | TBD |
| Chat                 | Send/Receive          | As a viewer, I can send chat messages that sync in real time across all viewers of that stream. | TBD |
| Chat (Offline)       | Local Queue           | As a viewer, my chat messages are queued locally if I lose connectivity. | TBD |
| Chat (Offline)       | Sync & Merge          | As a viewer, once reconnected, my queued messages sync in correct order and merge with others' messages without loss or duplication. | TBD |
| Automation           | Follower Notification | As a follower, I'm notified when a creator I follow starts a stream, via n8n reacting to a Supabase webhook. | TBD |
| Automation           | Viewer Milestone Alert| As a creator, I'm alerted when viewer count crosses defined thresholds (e.g. 100, 200). | TBD |
| Automation           | Highlight Generation  | As a creator, when my stream ends, n8n reads logged metadata, detects peaks, and stores a highlight list in Supabase. | TBD |
| Automation           | Daily Digest          | As a stakeholder, a daily digest of top streams is generated automatically. | TBD |

## 📐 Model Requirements

Not applicable in the traditional LLM sense — this project does not use a language model for core functionality. The "intelligence" here is rule-based peak detection (viewer-count/chat-rate thresholds), not ML/LLM inference.

| SPECIFICATION          | REQUIREMENT                       | RATIONALE |
| ----------------------- | ---------------------------------- | --------- |
| Open vs Proprietary     | N/A — no LLM used                  | Highlight/alert logic is rule-based, not model-based |
| Context Window          | N/A                                 | N/A |
| Modalities               | Video (LiveKit), text (chat, notifications) | Core product surfaces |
| Fine Tuning Capability  | N/A                                  | No model in the loop |
| Latency                  | Video: sub-second join time; Chat: <1s sync; Viewer count: near real-time (few seconds) | Live experience requires low perceived lag |
| Parameters               | N/A                                   | N/A |

## 🧮 Data Requirements

* **Stream metadata logging (for highlight generation):** while a stream is live, log timestamp, current viewer count, and chat message count per minute to Supabase
* **Peak detection rules (Assumption — no rubric given):**
  - Viewer count crosses a milestone (e.g. 100, 200) → flag as highlight-worthy moment with reason "Viewer count crossed X"
  - Chat message rate exceeds a rolling baseline by a set multiple (e.g. 2–3x average) → flag as highlight-worthy moment with reason "High chat activity"
* **Data flow for highlights:** Stream ends → n8n reads metadata log from Supabase → applies peak-detection rules → builds highlight list (timestamp + reason) → writes back to Supabase
* **Chat data:** stored with sender ID, stream ID, timestamp (client-generated for offline messages), and message body; conflict resolution by timestamp ordering on sync
* **Follower data:** creator-follower relationship table in Supabase, used both for the app's Follow/Unfollow UI and as the source list for n8n's notification workflow
* **Retention:** no explicit retention requirements given (assignment scope) — Assumption: keep all data for the duration of the assignment/demo, no long-term retention policy needed

## 💬 Prompt Requirements

Not applicable — no LLM/prompt-driven components in this system. Highlight generation and alerts are rule-based (see Data Requirements), not prompted.

## 🧪 Testing & Measurement

* **Phase 1 test plan:** manually verify start/end stream, join/watch, follow/unfollow, live viewer count accuracy with 2+ concurrent test viewers, and chat sync across all watching clients
* **Phase 2 test plan:** simulate offline mode on one viewer client, send messages while offline, reconnect, and confirm correct ordering and merge against messages sent by other viewers during the same window
* **Phase 3 test plan:** trigger a stream start and confirm follower notifications fire via n8n; simulate viewer count crossing 100/200 and confirm creator alert fires; end a stream and confirm highlight list is generated and stored correctly; confirm daily digest runs and produces expected output
* **No formal rubric exists** — the bar is "does each listed feature work as demoed," verified via manual end-to-end walkthroughs of all 3 phases before submission
* **Rollback/guardrail:** none needed at assignment scope — no live user base at risk

## ⚠️ Risks & Mitigations

| RISK                                                        | MITIGATION                                                                 |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| LiveKit/video integration takes longer than expected          | Set up LiveKit account and a minimal working stream first (hour 1–2) before building surrounding features |
| n8n webhook wiring from Supabase is unreliable or misconfigured | Test the webhook → n8n trigger path early and in isolation before building full workflows on top of it |
| Full scope (no cuts) within 48 hours causes time overrun       | Strict time-boxing per phase; if behind schedule, re-negotiate scope rather than sacrificing quality silently |
| From-scratch setup (accounts, keys, project init) eats early hours | Budget the first 1–2 hours explicitly for provisioning (Supabase project, LiveKit account, Expo init, n8n self-host setup) |
| Offline chat merge logic produces duplicate or out-of-order messages | Use client-generated timestamps + a deterministic merge/sort strategy; test explicitly with simulated offline scenarios |
| Peak-detection thresholds for highlights feel arbitrary without a rubric | Use sensible, documented default thresholds (marked as Assumptions) and keep them easily tunable |

## 💰 Costs

* **Development costs:** solo effort, 48-hour time-boxed build; no external QA or data labeling costs
* **Operational costs:** all services on free tiers —
  - Supabase: free tier (realtime DB, auth, webhooks)
  - LiveKit: free tier (video streaming SDK)
  - n8n: self-hosted (no cloud subscription cost)
  - Expo: free tier for build/dev tooling
* No paid infrastructure required for this assignment

## 🔗 Assumptions & Dependencies

* Full scope (no feature cuts) within 48 hours is achievable with tight time-boxing per phase — flagged as the primary execution risk
* Setup/provisioning time (Supabase, LiveKit, Expo, self-hosted n8n) must be budgeted in the first 1–2 hours
* All services will remain within free-tier limits for the duration of build and demo
* No formal BuildableLabs scoring rubric exists; "MVP" is defined as all listed features functioning end-to-end
* Peak-detection thresholds for highlight generation (e.g. 100/200 viewer milestones, chat-rate multiplier) are proposed defaults, not specified by BuildableLabs — revisable
* Dependency: Supabase real-time webhooks must reliably trigger n8n workflows without polling
* Dependency: LiveKit free tier supports the expected demo load (small number of concurrent test viewers)

## 🔒 Compliance/Privacy/Legal

* No regulatory or compliance requirements specified — this is a technical assignment, not a production consumer product
* No PII handling beyond basic auth (email/username) and follower relationships; no sensitive data categories involved
* Data governance: minimal — data exists only for the duration of the assignment/demo; no long-term retention or deletion policy required at this scope

## 📣 GTM/Rollout Plan

Not applicable in the traditional sense (no market launch) — repurposed as a submission/delivery timeline:

* **Milestone 1 (Hours 1–2):** Environment setup — Supabase project, LiveKit account, Expo init, n8n self-host
* **Milestone 2 (Phase 1 build):** Core streaming — start/end stream, join/watch, follow/unfollow, live viewer count, chat sync
* **Milestone 3 (Phase 2 build):** Offline chat queue, sync, and merge logic
* **Milestone 4 (Phase 3 build):** n8n automation — follower notifications, milestone alerts, highlight generation, daily digest
* **Milestone 5 (Final hours):** End-to-end testing across all phases, polish if time remains, prepare submission artifacts (repo structure, prompt-sharing doc, n8n export, working app demo)
* **Submission:** GitHub repo (`/mobile /backend /n8n-workflow`), prompt-sharing doc, n8n workflow export, working app
