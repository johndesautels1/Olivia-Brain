# LTM Avatar Configuration — The Contract Olivia Brain Must Honour

> **Last audited:** 2026-05-02 against `D:\London-Tech-Map` HEAD.
> **Authoritative source files:** referenced inline. If the LTM file changes, this doc is wrong — re-audit.

---

## TL;DR — The Single Most Important Fact

**LTM does NOT use HeyGen Streaming Avatar for Olivia in production.** The user calls it "HeyGen" colloquially (because the vendor was acquired/rebranded and `package.json` still lists `@heygen/liveavatar-web-sdk`), but the actual real-time talking-head pipeline runs through **LiveAvatar** (`api.liveavatar.com`) in **LITE mode** — meaning **LTM brings its own STT, LLM, and TTS** and LiveAvatar only renders the lip-synced face over WebRTC/LiveKit.

There are **three distinct avatar pipelines** in LTM. Olivia Brain only inherits #1. Don't confuse them:

| # | Pipeline | Vendor | Used For | Real-time? |
|---|----------|--------|----------|------------|
| 1 | **LiveAvatar LITE (Olivia)** | api.liveavatar.com | Live conversational Olivia (chat panel, /olivia, Studio circle) | YES — WebRTC streaming |
| 2 | **HeyGen v3 Avatar V (Cristiano)** | api.heygen.com | Pre-rendered analysis result videos | NO — render & poll |
| 3 | **HeyGen v2 video/generate (legacy Olivia video mode)** | api.heygen.com | A separate "video reply" mode at `/api/olivia/video` (likely orphaned/unused) | NO — render & poll |

Olivia Brain inherits **#1 only**. Pipelines #2 and #3 stay in LTM untouched.

---

## 1. SDK & Versions

`D:\London-Tech-Map\package.json`:

```json
"@heygen/liveavatar-web-sdk": "^0.0.12",
"@heygen/streaming-avatar": "^2.1.0",
"livekit-client": "^2.18.0",
"openai": "^6.32.0"
```

- `@heygen/liveavatar-web-sdk` (v0.0.12) — used by `LiveAvatarPlayer.tsx` for the **Cristiano analysis result** flow only (uses `LiveAvatarSession`, `SessionEvent`, `SessionState` — see `src/components/analysis/LiveAvatarPlayer.tsx` lines 5–8).
- `@heygen/streaming-avatar` (v2.1.0) — installed but **not imported anywhere active** under `src/components/olivia/` or `src/lib/olivia/`. Treat as dead weight.
- `livekit-client` (v2.18.0) — the real workhorse. Olivia's primary `OliviaVideoAvatar.tsx` connects to LiveKit directly with `Room`, `RoomEvent`, `Track`, `RemoteTrackPublication` from `livekit-client`. It does **not** use the HeyGen SDK at all. The session config (URL + JWT) comes from LiveAvatar's `/v1/sessions/start` response.
- `openai` (v6.32.0) — used server-side for the chat brain (GPT-4o tool calling).

**Olivia Brain implication:** you only need `livekit-client` to replicate the Olivia path. The two `@heygen/*` packages can stay if you want `LiveAvatarPlayer` parity for analysis videos, but they are not on the conversational hot path.

---

## 2. Server vs Browser Split

| Concern | Where | File |
|---------|-------|------|
| `LIVEAVATAR_API_KEY` | **Server only** — never exposed to browser | `src/lib/liveavatar/client.ts` (line 35) |
| Session token creation (`POST /v1/sessions/token`) | Server | `src/lib/liveavatar/client.ts:106-120` |
| Session start (`POST /v1/sessions/start`) | Server | `src/lib/liveavatar/client.ts:125-128` |
| LiveKit room JWT | Server-issued, browser-consumed | Returned in API response from `/api/olivia/liveavatar` |
| WebRTC video/audio playback | Browser | `OliviaVideoAvatar.tsx` |
| Browser-side mic capture | **Not in this flow** — see §5 | — |
| ElevenLabs TTS call | Server | `src/app/api/olivia/liveavatar/speak/route.ts` |
| LLM (GPT-4o) call | Server | `src/lib/olivia/chat.ts` (called from `/api/olivia/chat`) |
| WebSocket to LiveAvatar (for `agent.speak`) | **Browser** opens it directly using the `ws_url` returned by `/v1/sessions/start` | `OliviaVideoAvatar.tsx:281` |

**Critical contract:** `LIVEAVATAR_API_KEY`, `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `HEYGEN_API_KEY` are **NEVER** sent to the browser. Only the LiveKit URL+JWT and the LiveAvatar `ws_url` (which is session-scoped) cross the wire. This is the hybrid pattern: **secrets server-side, RTC direct browser→LiveKit, and audio commands browser→LiveAvatar WebSocket**.

---

## 3. Session Lifecycle (Authoritative Flow)

```
USER LOADS PAGE
  └─ <OliviaVideoAvatar /> renders disconnected with a "Start Live Avatar" button
USER CLICKS START
  ├─ Browser: fetch POST /api/olivia/liveavatar  (no body)
  │
  ├─ Server (api/olivia/liveavatar/route.ts):
  │   1. Clerk auth check — 401 if signed out
  │   2. rateLimit: 5 req / 600_000 ms / "olivia-liveavatar"
  │   3. Calls createAndStartSession() from src/lib/olivia/liveavatar.ts
  │      ├─ POST https://api.liveavatar.com/v1/sessions/token
  │      │  Headers: { "X-API-KEY": LIVEAVATAR_API_KEY }
  │      │  Body: {
  │      │    avatar_id: process.env.LIVEAVATAR_OLIVIA_AVATAR_ID,
  │      │    mode: "LITE",
  │      │    video_settings: { quality: "high", encoding: "H264" }
  │      │  }
  │      │  → returns { data: { session_id, session_token } }
  │      │
  │      └─ POST https://api.liveavatar.com/v1/sessions/start
  │         Headers: { Authorization: `Bearer ${session_token}` }
  │         Body: (none)
  │         → returns { data: { session_id, livekit_url, livekit_client_token, ws_url, max_session_duration } }
  │
  └─ Server returns to browser:
       { sessionId, livekitUrl, livekitToken, websocketUrl }

BROWSER CONNECTS
  ├─ const room = new Room({ adaptiveStream: true, dynacast: true })
  ├─ room.on(RoomEvent.TrackSubscribed) → attach video track to <video>, audio track to in-memory element
  ├─ await room.connect(livekitUrl, livekitToken)
  └─ const ws = new WebSocket(websocketUrl)  // LiveAvatar control channel
       ws.onmessage handles:
         - "agent.speak_started" → setState("speaking")
         - "agent.speak_ended"   → setState("connected")
         - "session.state_updated" with state==="closed" → disconnectSession()

USER SENDS A MESSAGE (chat textbox)
  ├─ OliviaProvider.sendMessage(text)
  │   POST /api/olivia/chat { message, conversationId, pageContext, pipelineContext?, documentContext? }
  │   → Server: GPT-4o with tools, returns { reply, conversationId, messageId, toolCalls }
  │
  ├─ OliviaProvider sets messages[]; new lastReply prop is forwarded to <OliviaVideoAvatar lastReply={...} />
  │
  ├─ OliviaVideoAvatar useEffect detects lastReply changed → calls speakReply(text)
  │   ├─ POST /api/olivia/liveavatar/speak { text: text.slice(0, 2000) }
  │   │   Server:
  │   │     POST https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_OLIVIA_VOICE_ID}/stream?output_format=pcm_24000
  │   │     Headers: { "xi-api-key": ELEVENLABS_API_KEY }
  │   │     Body: {
  │   │       text,
  │   │       model_id: "eleven_multilingual_v2",
  │   │       voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true }
  │   │     }
  │   │     → reads PCM stream, concatenates chunks, returns { audio: base64(pcm_24000) }
  │   │
  │   └─ Browser receives { audio }; sends one WebSocket frame:
  │       ws.send(JSON.stringify({ type: "agent.speak", audio: base64 }))
  │
  └─ LiveAvatar lip-syncs the avatar to that PCM, streams the talking face over LiveKit;
     browser already has the LiveKit subscription so the <video> updates automatically.

KEEP-ALIVE
  └─ Every 4 minutes (because LiveAvatar idle-timeouts at 5 min):
       ws.send({ type: "session.keep_alive", event_id: `ka_${Date.now()}` })

USER CLICKS "End" / NAVIGATES AWAY / UNMOUNTS
  ├─ ws.close()
  ├─ room.disconnect()
  └─ (Note: the browser does NOT call /api/liveavatar/stop in the OliviaVideoAvatar path —
      that endpoint exists and works, but only LiveAvatarPlayer.tsx (Cristiano) calls it.
      The Olivia path relies on idle timeout to free LiveAvatar credits. ⚠ Fragility note.)
```

---

## 4. Configuration Values — Pinned Contracts

These values are loaded from Vercel env at runtime. **Olivia Brain must accept the same env var names or provide a translation layer.**

### From `D:\London-Tech-Map\.env.vercel` (live values for the LiveAvatar Olivia path):

| Env Var | Purpose | Live Value (UUID format → preserve format) |
|---------|---------|---------------------------------------------|
| `LIVEAVATAR_API_KEY` | LiveAvatar X-API-KEY header | `b7aebc48-dcba-11f0-a99e-066a7fa2e369` |
| `LIVEAVATAR_OLIVIA_AVATAR_ID` | UUID of Olivia's avatar in LiveAvatar dashboard | `a9870a4c-20a2-4f2a-993f-b004c00068c7` |
| `LIVEAVATAR_OLIVIA_VOICE_ID` | LiveAvatar's own voice (NOT used in LITE mode) | `""` (empty — LITE bypasses LiveAvatar TTS) |
| `ELEVENLABS_API_KEY` | xi-api-key for TTS | `d141…03f` |
| `ELEVENLABS_OLIVIA_VOICE_ID` | Olivia's ElevenLabs voice | `rVk0ZvRulp6xrYJkGztP` |
| `OPENAI_API_KEY` | Brain (GPT-4o tool calling) | `sk-proj-…` |

> ⚠️ **The LiveAvatar API key happens to be identical to `HEYGEN_API_KEY`** in this codebase — they are both `b7aebc48-dcba-11f0-a99e-066a7fa2e369`. This is because LiveAvatar = HeyGen post-rebrand and they share the same account. Don't assume one without the other; load both from env.

### Pinned LiveAvatar request body (`src/lib/olivia/liveavatar.ts:48-55`):

```ts
const body = {
  avatar_id: process.env.LIVEAVATAR_OLIVIA_AVATAR_ID,
  mode: "LITE",                // ← non-negotiable; FULL mode would force LiveAvatar's own LLM/TTS
  video_settings: {
    quality: "high",
    encoding: "H264",
  },
  // (max_session_duration: 600 in client.ts, NOT set in olivia/liveavatar.ts)
};
```

The duplicate session-creation file at `src/lib/liveavatar/client.ts` adds:
```ts
is_sandbox: false,
max_session_duration: 600,  // 10 minutes max
```

### Pinned ElevenLabs body (`src/app/api/olivia/liveavatar/speak/route.ts:70-79`):

```ts
{
  text,
  model_id: "eleven_multilingual_v2",
  voice_settings: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.3,
    use_speaker_boost: true,
  }
}
```
With output format `pcm_24000` as a **query parameter** (not a body field — important).

### Pinned WebSocket message format (LITE mode):

**Send → LiveAvatar:**
```json
{ "type": "agent.speak",         "audio": "<base64 PCM 16-bit 24kHz>" }
{ "type": "agent.speak_end",     "event_id": "evt_..." }
{ "type": "agent.interrupt",     "event_id": "int_..." }
{ "type": "agent.start_listening", "event_id": "..." }
{ "type": "agent.stop_listening",  "event_id": "..." }
{ "type": "session.keep_alive",  "event_id": "ka_..." }
```

**Receive ← LiveAvatar:**
```json
{ "type": "session.state_updated", "state": "connected"|"connecting"|"closing"|"closed" }
{ "type": "agent.speak_started",   "event_id": "...", "task": { "id": "..." } }
{ "type": "agent.speak_ended",     "event_id": "...", "task": { "id": "..." } }
```

Audio constraints (from `src/lib/liveavatar/types.ts:218-221` and `websocket.ts:8-9`):
- **PCM 16-bit, 24,000 Hz sample rate**
- **base64 encoded**
- **~1 second chunks recommended, max 1MB per packet**
- LTM's current implementation buffers the entire ElevenLabs stream server-side and sends ONE `agent.speak` message — this works because typical Olivia replies are under 10 seconds → under 1 MB. Olivia Brain should keep this single-shot pattern OR re-implement chunking; do not assume the avatar accepts 5+ MB blobs.

### LiveKit `Room` config (`OliviaVideoAvatar.tsx:252-255`):
```ts
new Room({
  adaptiveStream: true,
  dynacast: true,
})
```

---

## 5. Voice Path

### Outbound (Olivia speaks)
- **TTS**: ElevenLabs streaming endpoint, model `eleven_multilingual_v2`, format `pcm_24000`. Audio is collected server-side, base64-encoded, and shipped to LiveAvatar via the `agent.speak` WebSocket frame.
- **NOT** HeyGen's built-in TTS. NOT the `LIVEAVATAR_OLIVIA_VOICE_ID` (it's empty).
- Lip sync is performed by LiveAvatar (their model) using the PCM audio LTM provides.

### Inbound (user speaks)
- **There is no STT in the live avatar path.** The user types into a chat textbox; that text goes to GPT-4o.
- There is a separate `/api/olivia/voice/process` endpoint and Twilio call routes (`/api/olivia/call/*`) for telephony, but those are not part of the live video avatar flow.
- Browser native `SpeechSynthesisUtterance` exists as a **fallback** in `OliviaProvider.tsx:381-407` only when ElevenLabs is unconfigured AND when in plain "voice" mode (not video mode).

**Implication for Olivia Brain:** if you want voice-input → live avatar, you must add STT (Whisper / Deepgram / Web Speech) yourself. LTM never built it for the avatar.

---

## 6. Streaming Protocol

```
┌─────────────────────┐         ┌──────────────────────────┐
│   Browser (React)   │         │   Vercel Edge / Node     │
│ OliviaVideoAvatar   │         │   /api/olivia/*          │
└─────────────────────┘         └──────────────────────────┘
        │                                    │
        │  POST /api/olivia/liveavatar       │
        │ ─────────────────────────────────► │
        │                                    │  POST liveavatar.com /v1/sessions/token
        │                                    │ ─────────────────────►
        │                                    │  POST liveavatar.com /v1/sessions/start
        │                                    │ ─────────────────────►
        │                                    │ ◄───── { livekit_url, livekit_client_token, ws_url }
        │ ◄───── { livekitUrl, livekitToken, │
        │          websocketUrl, sessionId } │
        │                                    │
        │  WebRTC (LiveKit)  ◄────────────────────────── LiveKit Cloud (avatar video+audio published by LiveAvatar)
        │  ─────────────────────────────────────────►
        │                                    │
        │  WebSocket (control)  ◄─────────────────────── LiveAvatar ws_url
        │  ─────────────────────────────────────────►   (agent.speak, keep_alive, interrupt, etc.)
        │                                    │
        │  POST /api/olivia/liveavatar/speak  │
        │ ─────────────────────────────────► │
        │                                    │  POST elevenlabs.io /v1/text-to-speech/{voice}/stream?output_format=pcm_24000
        │                                    │ ─────────────────────►
        │                                    │ ◄───── PCM 24kHz stream
        │ ◄───── { audio: base64 }           │
        │                                    │
        │  ws.send({ type: "agent.speak", audio })
        │ ─────────────────────────────────► (direct to LiveAvatar)
```

**One-line summary:** WebRTC for the video/audio downlink (browser ↔ LiveKit), WebSocket for the control uplink (browser ↔ LiveAvatar), HTTPS for everything else (browser ↔ LTM API ↔ vendors). Origin = LiveAvatar's render farm (publishes to LiveKit). Termination = the user's `<video>` element.

---

## 7. Integration Touchpoints in LTM (every place that mounts or talks to the avatar)

Files that import or reference `OliviaVideoAvatar` / `liveavatar`:

| File | Role |
|------|------|
| `src/components/olivia/OliviaVideoAvatar.tsx` | The avatar component itself (684 LOC) |
| `src/components/olivia/OliviaProvider.tsx` | Owns `mode === "video"`, supplies `lastReply` |
| `src/components/olivia/OliviaChatPanel.tsx` | Mounts the avatar inside the slide-out panel |
| `src/components/olivia/OliviaPageChat.tsx` | Mounts the avatar on the standalone `/olivia` page |
| `src/components/olivia/OliviaDisplayScreen.tsx` | Mounts the avatar in the dashboard display screen |
| `src/components/studio/StudioOliviaAvatar.tsx` | Wraps `OliviaVideoAvatar` in the circular Studio frame (240px / 120px responsive) with breathing/pulse animations and `hideOverlays={true}` |
| `src/components/studio/PreparationStudio.tsx` | Mounts `StudioOliviaAvatar` |
| `src/components/analysis/AnalysisEntityMatch.tsx` | Mounts `LiveAvatarPlayer` (the **separate** Cristiano/HeyGen-SDK flow — different code path) |
| `src/components/analysis/LiveAvatarPlayer.tsx` | Uses `@heygen/liveavatar-web-sdk` directly with `LiveAvatarSession`/`session.repeat(text)` — Cristiano analysis only |

API routes:

| Route | Purpose |
|-------|---------|
| `POST /api/olivia/liveavatar` | Olivia's session create+start (used by `OliviaVideoAvatar`) |
| `POST /api/olivia/liveavatar/speak` | ElevenLabs TTS → base64 PCM |
| `POST /api/olivia/chat` | GPT-4o brain (independent of avatar; produces `reply` text) |
| `POST /api/olivia/voice` | Plain ElevenLabs MP3 for non-avatar voice mode |
| `POST /api/liveavatar/session` | Generic session creator used by `LiveAvatarPlayer` (Cristiano) |
| `POST /api/liveavatar/keep-alive` | Server-side keep-alive (LiveAvatarPlayer only — OliviaVideoAvatar uses WebSocket keep_alive) |
| `POST /api/liveavatar/stop` | Server-side stop (LiveAvatarPlayer only) |
| `GET  /api/liveavatar/transcript?sessionId=` | Pulls LiveAvatar's own transcript (not used for storage; LTM stores its own messages) |
| `POST /api/liveavatar/script` | Builds Cristiano analysis narration (HeyGen flow) |
| `POST /api/olivia/video` | **Legacy** HeyGen v2 talking-photo render (`HEYGEN_OLIVIA_AVATAR_ID=54d715432c27452fb8211bb28417c824`, `HEYGEN_OLIVIA_VOICE_ID=f10c70dd5d7b4910afcc491e6cf508fb`) — appears not wired to current Olivia chat UI |

---

## 8. Tools / Agentic Hookup

**The avatar has no awareness of tools.** The brain (GPT-4o tool calling) lives in `src/lib/olivia/chat.ts` and is invoked via `POST /api/olivia/chat`. Tool calls execute server-side; only the resulting `reply` text is returned to the browser, which then forwards that text to ElevenLabs → LiveAvatar.

**Key contract:** the avatar is a dumb mouth. All intelligence is upstream of the `lastReply` prop. Olivia Brain can swap the brain (Anthropic Claude, custom agent stack, anything) and the avatar keeps working as long as it produces a string.

The brain wiring:
- `OliviaProvider.sendMessage` → `POST /api/olivia/chat` with `{ message, conversationId, pageContext, pipelineContext?, documentContext? }`.
- Server: `processOliviaMessage()` in `src/lib/olivia/chat.ts` runs GPT-4o with function calling. System prompt comes from `src/lib/olivia/knowledge-base.ts` `buildOliviaSystemPrompt()` which queries Prisma for live counts (documents, organisations, districts, collections).
- Returns `{ reply, conversationId, messageId, toolCalls }`. UI displays `reply`. Avatar speaks `reply`.

---

## 9. Stop / Interrupt / Barge-In

- **Interrupt** (e.g., user clicks "stop" while avatar is speaking): `OliviaVideoAvatarRef.interrupt()` sends `{ type: "agent.interrupt", event_id: "int_<ts>" }` over the WebSocket and locally sets state to "connected".
- **Replay last**: `OliviaVideoAvatarRef.replayLast()` re-pipes the last reply through the speak path. Useful for retries.
- **Mute**: not implemented at the avatar layer. The audio element volume is hard-coded to 1.0 (`OliviaVideoAvatar.tsx:263`).
- **End call** ("End" button / unmount): closes WebSocket, disconnects LiveKit room, clears refs. Does **not** call `/api/liveavatar/stop` — relies on LiveAvatar's idle timeout to release credits. ⚠ Olivia Brain should consider calling `stopSession()` explicitly to be a better citizen.
- **Barge-in (user speaking interrupts avatar)**: not implemented. There's no STT and no microphone capture in the live avatar path.

---

## 10. Persistence

Prisma models in `D:\London-Tech-Map\prisma\schema.prisma` (lines 1908-1969):

```prisma
model OliviaConversation {
  id           String   @id @default(cuid())
  userId       String?
  sessionToken String   @unique @default(cuid())
  title        String?
  pageContext  String?
  mode         String   @default("chat")     // "chat" | "voice" | "video"
  isArchived   Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  messages     OliviaMessage[]
  presentations OliviaPresentation[]
}

model OliviaMessage {
  id             String   @id @default(cuid())
  conversationId String
  role           String                  // "user" | "assistant" | "tool"
  content        String   @db.Text
  toolName       String?
  toolArgs       Json?
  toolResult     Json?
  metadata       Json?
  createdAt      DateTime @default(now())
}

model OliviaPresentation {
  id             String   @id @default(cuid())
  conversationId String?
  userId         String?
  generationId   String?
  status         String   @default("pending")
  gammaUrl       String?
  exportUrl      String?
  exportFormat   String?
  title          String?
  inputSummary   String?  @db.Text
  metadata       Json?
}

// Plus OliviaConsent (GDPR layer) at line 1973+ — review separately if Olivia Brain stores user data.
```

**What is stored:** every user/assistant message text, tool calls/results, and conversation metadata.
**What is NOT stored:** the LiveKit video stream, the WebRTC audio, the ElevenLabs PCM audio, the LiveAvatar session_id (notable gap — LTM does not persist `sessionId` against a conversation).

LiveAvatar itself stores its own transcript on its servers, retrievable for ~1 hour after session end via `GET /v1/sessions/{id}/transcript`. LTM doesn't currently use that data — it's stored independently by GPT-4o.

**Local recording:** `OliviaVideoAvatar` can record the live video+audio to a downloadable WebM via `MediaRecorder` (`startRecording`/`stopRecording`/`downloadRecording`). VP9+Opus preferred, fallback chain: `vp9,opus → vp8,opus → vp9 → vp8 → webm`. Bitrate 2.5 Mbps. Files named `olivia-session-<ISO timestamp>.webm`. **Browser-only — never uploaded to LTM servers.**

---

## 11. Error Handling / Fallbacks

| Failure | What happens |
|---------|--------------|
| `LIVEAVATAR_API_KEY` missing | `/api/olivia/liveavatar` returns `503 "LiveAvatar not configured"`. UI shows error overlay with "Try Again" button. Chat and voice modes still work. |
| `LIVEAVATAR_OLIVIA_AVATAR_ID` missing | `lib/olivia/liveavatar.ts` throws → 500 propagated as "Failed to start avatar session." |
| LiveAvatar 401 | Mapped to "Avatar service authentication failed." |
| LiveAvatar timeout/abort | Mapped to "Avatar service timed out. Please try again." |
| LiveKit `room.connect` rejects | `OliviaVideoAvatar` setState("error") with the raw error message |
| WebSocket fails to open | The avatar still connects to LiveKit (video plays the idle/listening loop), but `speakReply` no-ops because `wsRef.current` is null. User sees Olivia silent but visible. ⚠ Silent failure — Olivia Brain should surface this. |
| ElevenLabs API down or 5xx | `/api/olivia/liveavatar/speak` returns `{ fallback: true, text, reason }`. `OliviaVideoAvatar.speakReply` short-circuits — avatar stays silent. The chat reply text is still rendered in the message list. |
| ElevenLabs not configured | Same fallback path. |
| LiveAvatar session times out at 5 min idle | LiveAvatar sends `session.state_updated` with `state: "closed"` over WS → `disconnectSession()` runs. UI returns to disconnected state; user must click Start again. |
| Keep-alive missed | If WebSocket disconnects, the 4-min `setInterval` continues to call `wsRef.current.send` but it's a no-op because the WS is closed. Idle timeout will trigger. ⚠ |
| `MediaRecorder` not supported | `RecordingState` set to "error" with `RecordingError: "not_supported"`. Recording UI hidden; rest of avatar works. |

---

## 12. Things Olivia Brain Must NOT Change Without Care

1. **`mode: "LITE"`** in the session token request. Switching to FULL mode hands LLM and TTS to LiveAvatar and the entire ElevenLabs+GPT-4o pipeline becomes irrelevant — but you also lose all of LTM's brain customisation, system prompt, and tool calls.
2. **PCM 16-bit / 24 kHz / base64**. LiveAvatar enforces this exact format for `agent.speak`. ElevenLabs format `pcm_24000` matches. Don't switch to MP3 or different sample rates.
3. **The 5-minute idle timeout**. The 4-min keep-alive is the only thing keeping the session alive. If you change WebSocket strategy you must keep the keep-alive cadence.
4. **The single-shot audio buffering pattern**. LTM collects the entire ElevenLabs stream into one `agent.speak` message. If you want true streaming lip-sync (lower latency), you must implement chunking — and chunks must be < 1 MB and ~1 second each.
5. **Avatar UUID format**. `LIVEAVATAR_OLIVIA_AVATAR_ID = a9870a4c-20a2-4f2a-993f-b004c00068c7` is a LiveAvatar-side resource. Re-creating Olivia in HeyGen Streaming Avatar dashboard (different product) gives you a different ID format and breaks this contract.
6. **LiveKit `adaptiveStream: true, dynacast: true`** are tuned for face-on-low-bandwidth. Disabling them increases bitrate and jitter.
7. **Session lifecycle currently leaks credits** because the Olivia path doesn't call `/api/liveavatar/stop`. If Olivia Brain wants to fix this (good idea), it must also handle the case where `stopSession` 500s because the session has already idle-timed-out — the existing endpoint already handles this gracefully.
8. **`HEYGEN_API_KEY === LIVEAVATAR_API_KEY`** in current env. They're set independently and could diverge if the user rotates one but not the other. Olivia Brain should treat them as separate.
9. **WebSocket URL is single-use, session-scoped, and short-lived.** Don't try to cache or reuse.
10. **The "speak" route slices `text` to 2000 chars** before sending to ElevenLabs (`OliviaVideoAvatar.tsx:324`), even though the route allows 5000. Long replies get truncated mid-sentence. ⚠ Existing bug; preserve or fix consciously.

---

## 13. Quick Reference — Olivia Brain Implementation Checklist

To preserve LTM behaviour exactly:

- [ ] Install `livekit-client@^2.18.0` in Olivia Brain.
- [ ] Implement server endpoint that mirrors `POST /api/olivia/liveavatar` with the same request body to LiveAvatar.
- [ ] Implement server endpoint that mirrors `POST /api/olivia/liveavatar/speak` (ElevenLabs streaming PCM_24000 → base64).
- [ ] Reuse the same env var names: `LIVEAVATAR_API_KEY`, `LIVEAVATAR_OLIVIA_AVATAR_ID`, `ELEVENLABS_API_KEY`, `ELEVENLABS_OLIVIA_VOICE_ID`. (Or supply a translation in your config.)
- [ ] Connect to LiveKit room with `{ adaptiveStream: true, dynacast: true }`.
- [ ] Open WebSocket to `ws_url` immediately after; don't wait for first user message.
- [ ] Handle `session.state_updated`, `agent.speak_started`, `agent.speak_ended` events.
- [ ] Send `session.keep_alive` every 4 minutes (or 3 to be safe).
- [ ] On reply text → fetch PCM → send `agent.speak` (single message OK, chunking better).
- [ ] On user "stop" → send `agent.interrupt`.
- [ ] On unmount → close WS, disconnect Room, AND call `/v1/sessions/stop` (improvement over LTM).
- [ ] Reuse `OliviaConversation`/`OliviaMessage` Prisma models or copy them; don't introduce schema drift.
- [ ] If Olivia Brain adds STT (mic input), do not touch the LiveAvatar control channel — it's not built for inbound audio in LITE mode.

---

## Appendix A — Verbatim Prompt Header

System prompt opening (`src/lib/olivia/knowledge-base.ts`):

```
You are Olivia, the AI guide for CLUES London Tech Map (clueslondon.com). You are
a professional, knowledgeable British AI assistant who helps users navigate the
platform and build their companies.

## YOUR IDENTITY
- Name: Olivia
- Role: Platform guide and strategic advisor for the CLUES London Tech Map
- Tone: Professional, warm, authoritative, concise. Not chatty or casual. You
  speak like a senior associate at a top London advisory firm.
- You use British English spelling (organisation, colour, analyse, etc.)
- You never make up data. ...
```

The full prompt is dynamically assembled with live Prisma counts (`stats.documentCount`, `stats.organisationCount`, etc.). If Olivia Brain runs against a different database, the counts will differ but the persona remains the same.

## Appendix B — File Inventory (single-source list)

```
D:\London-Tech-Map\src\components\olivia\OliviaVideoAvatar.tsx     (684 LOC) ★ primary
D:\London-Tech-Map\src\components\olivia\OliviaProvider.tsx        (506 LOC) ★ state owner
D:\London-Tech-Map\src\components\olivia\OliviaChatPanel.tsx
D:\London-Tech-Map\src\components\olivia\OliviaPageChat.tsx
D:\London-Tech-Map\src\components\olivia\OliviaDisplayScreen.tsx
D:\London-Tech-Map\src\components\studio\StudioOliviaAvatar.tsx
D:\London-Tech-Map\src\components\studio\PreparationStudio.tsx
D:\London-Tech-Map\src\components\analysis\LiveAvatarPlayer.tsx    (Cristiano flow — separate)
D:\London-Tech-Map\src\components\analysis\AnalysisEntityMatch.tsx
D:\London-Tech-Map\src\lib\olivia\liveavatar.ts                    ★ session create+start
D:\London-Tech-Map\src\lib\olivia\knowledge-base.ts                  system prompt
D:\London-Tech-Map\src\lib\liveavatar\client.ts                    ★ generic client (Cristiano)
D:\London-Tech-Map\src\lib\liveavatar\websocket.ts                   alt WS impl (unused by Olivia)
D:\London-Tech-Map\src\lib\liveavatar\types.ts                       ★ all LiveAvatar types
D:\London-Tech-Map\src\lib\liveavatar\index.ts
D:\London-Tech-Map\src\lib\analysis\heygen.ts                        Cristiano render flow
D:\London-Tech-Map\src\app\api\olivia\liveavatar\route.ts          ★ session endpoint
D:\London-Tech-Map\src\app\api\olivia\liveavatar\speak\route.ts    ★ TTS endpoint
D:\London-Tech-Map\src\app\api\olivia\chat\route.ts                ★ brain
D:\London-Tech-Map\src\app\api\olivia\voice\route.ts                 plain TTS (non-avatar mode)
D:\London-Tech-Map\src\app\api\olivia\video\route.ts                 legacy HeyGen v2 render
D:\London-Tech-Map\src\app\api\liveavatar\session\route.ts           Cristiano-style session
D:\London-Tech-Map\src\app\api\liveavatar\keep-alive\route.ts
D:\London-Tech-Map\src\app\api\liveavatar\stop\route.ts
D:\London-Tech-Map\src\app\api\liveavatar\transcript\route.ts
D:\London-Tech-Map\src\app\api\liveavatar\script\route.ts
D:\London-Tech-Map\.env.vercel                                     ★ env values (DO NOT COMMIT)
D:\London-Tech-Map\package.json
D:\London-Tech-Map\prisma\schema.prisma   (lines 1908-2000+ for OliviaConversation, OliviaMessage, OliviaPresentation, OliviaConsent)
```

★ = required reading for any Olivia Brain port.
