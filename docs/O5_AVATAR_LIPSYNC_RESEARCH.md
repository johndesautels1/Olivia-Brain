# O5 · Avatar Lip-Sync Upgrade — Research Memo

> **Track O Session O5 (per BUILD_SEQUENCE.md).** Investigation phase. This memo names the specific bottlenecks in the current pipeline, verified against code at HEAD `949a97f`, and proposes a phased implementation sequence. **No code changes here** — this is the research deliverable that the next session(s) execute against.
>
> **Status as of 2026-05-09.** Track O has O3 (W-003 perceived chat latency via streaming) and O4 (W-004 citation-first RAG) closed. O5 closes W-005 (avatar lip-sync) and is the last Track O item.

---

## TL;DR

The avatar pipeline ships PCM in **one big bang** after ElevenLabs finishes generating the entire reply. Time-to-first-mouth-movement = full TTS generation duration (1–3 s for a typical 200-character reply, longer for the 5,000-char ceiling). That's the dominant perceived-latency contributor.

Three flagged improvements in HANDOFF.md map to specific code points:

| HANDOFF rubric | Code point | Real impact |
|---|---|---|
| Audio buffer pre-roll | `src/app/api/olivia/liveavatar/speak/route.ts:83-103` collects all chunks server-side before returning | **High** — eliminating this turns 1–3 s "silent waiting" into ~75–250 ms first-syllable. Single biggest UX win. |
| Phoneme alignment | ElevenLabs `with-timestamps` endpoint exists; LiveAvatar LITE inference is opaque to us | **Medium**, vendor-dependent. Need to confirm LiveAvatar accepts external phoneme cues. |
| Chunk-boundary stutter | Today there's no chunking, so no stutter — but introducing pre-roll (above) creates this risk if the SaaS treats each chunk as a new utterance | Mitigation comes packaged with pre-roll — design the queue once. |

Plus **six** additional improvement vectors I found in the code that aren't on the HANDOFF list — some are one-line wins, some are vendor work.

**Recommended phased sequence:**
1. **O5a (single session)** — Streaming pre-roll: forward ElevenLabs chunks straight through to LiveAvatar instead of buffering. Includes the queue/boundary mitigation.
2. **O5b (single session)** — Auto-interrupt on new reply + correct text-truncation handling.
3. **O5c (multi-session)** — Add Tavus + A/B harness per BUILD_SEQUENCE Track O5. Wire abstraction into `src/lib/avatar/`.
4. **O5d (research-only)** — Phoneme alignment feasibility test against LiveAvatar / Tavus / Simli APIs.

---

## 1 · Current pipeline — verified end-to-end

```
                           ┌─── /api/olivia/chat (or /chat/stream) ───┐
                           │   cascade → text reply                    │
                           └────────────────┬──────────────────────────┘
                                            │ "lastReply" prop
                                            ▼
        ┌────────────────────── OliviaVideoAvatar.tsx ──────────────────────┐
        │                                                                    │
        │  useEffect [lastReply] ───► speakReply(text)                       │
        │                              │                                     │
        │                              ▼                                     │
        │  POST /api/olivia/liveavatar/speak (text)                          │
        └────────────────────┬──────────────────────────────────────────────┘
                             │
                             ▼
        ┌──── /api/olivia/liveavatar/speak/route.ts ──────────────────────┐
        │                                                                  │
        │  POST ElevenLabs /v1/text-to-speech/{voice}/stream                │
        │       ?output_format=pcm_24000                                    │
        │       model_id: eleven_multilingual_v2                            │
        │                                                                  │
        │  WHILE (chunk = await reader.read())                              │
        │    chunks.push(chunk)        ◄── ⚠ ALL chunks buffered here      │
        │                                                                  │
        │  return { audio: base64(merged) }                                 │
        └────────────────────┬─────────────────────────────────────────────┘
                             │ (single response, after full TTS done)
                             ▼
        ┌────────────────────── OliviaVideoAvatar.tsx ──────────────────────┐
        │                                                                    │
        │  ws.send(JSON.stringify({ type: "agent.speak", audio: base64 }))   │
        │                              │                                     │
        │                              ▼                                     │
        │                        LiveKit / HeyGen LITE Mode                  │
        │                        infers visemes from PCM                     │
        │                        renders video with lip-sync                 │
        │                              │                                     │
        │  ◄── video track via LiveKit RoomEvent.TrackSubscribed ────        │
        │                                                                    │
        └────────────────────────────────────────────────────────────────────┘
```

**The bottleneck:** the speak route opens ElevenLabs's `/stream` endpoint (which delivers audio as it's generated) but then **fully buffers the response server-side** at lines 87–94 before returning. The client-side `agent.speak` WebSocket message carries the complete PCM in one payload. LiveAvatar can't begin lip-sync until the last byte arrives.

The endpoint comment even acknowledges this: *"Uses the /stream endpoint (faster time-to-first-byte than batch) but collects all chunks server-side so the client receives one complete audio payload."* The faster TTFB benefit of `/stream` is wasted because we serialize back into a batch.

---

## 2 · OB ↔ LTM avatar code diff

I diff'd OB's three avatar surfaces against LTM's three. Findings:

### `OliviaVideoAvatar.tsx`
- **Behaviorally identical** to LTM's 773-line version.
- OB's 867 lines = LTM's 773 + 94 lines of inline-styles (`style={{ display: "flex", … }}` alongside the existing Tailwind classes) + the `adminKey` Bearer-token plumbing for pre-Clerk auth.
- The inline styles are because OB's design system is canonical-CSS-tokens-only (no Tailwind utility theme); LTM has Tailwind. Both render the same thing.
- **No logic delta.** The PCM-as-one-blob send is identical in both files (LTM line 332-336, OB line 360-364).

### `StudioOliviaAvatar.tsx`
- **NOT YET PORTED to OB.** LTM has it at `src/components/studio/StudioOliviaAvatar.tsx` (303 lines). It wraps `OliviaVideoAvatar` in a circular frame with breathing/pulse animations + responsive sizing + click-to-connect. **Pure visual chrome** — no audio pipeline change.
- Could be ported as part of any UI polish work; doesn't move the lip-sync needle.

### `LiveAvatarPlayer.tsx`
- **NOT YET PORTED to OB.** LTM has it at `src/components/analysis/LiveAvatarPlayer.tsx` (440 lines).
- Uses **`@heygen/liveavatar-web-sdk`** — a different vendor pattern than `OliviaVideoAvatar`'s LiveKit-based LITE Mode.
- Calls `session.repeat(text)` — HeyGen handles TTS + lip-sync entirely server-side. **No client-side PCM, no ElevenLabs.**
- This is a meaningfully different cost/quality profile and worth treating as a separate vendor in the O5c A/B (alongside Tavus). HeyGen full-stack avatar streaming would compete with our ElevenLabs+LiveKit-LITE pipeline on lip-sync quality but at HeyGen's own TTS quality.

### Audio path libraries
- `src/lib/voice/elevenlabs.ts` — full ElevenLabs client. Uses `eleven_turbo_v2_5` (~250 ms TTFB).
- `src/app/api/olivia/liveavatar/speak/route.ts` — uses `eleven_multilingual_v2` (~500 ms TTFB).
- **Inconsistency:** the avatar speak path uses the slower model. The voice/* path is faster. Quick win to align them. (Or use `eleven_flash_v2_5` — ~75 ms TTFB, the newest/fastest as of 2026-Q1.)

### Avatar provider abstraction
- `src/lib/avatar/index.ts` lists Simli / SadTalker / HeyGen / D-ID with fallback chain.
- **`OliviaVideoAvatar` doesn't use this abstraction at all** — it goes directly to LiveAvatar LITE Mode via `/api/olivia/liveavatar`.
- That's a structural opportunity: pull `OliviaVideoAvatar` behind the abstraction so vendor swaps (Tavus, full HeyGen, etc.) become declarative.

---

## 3 · The three HANDOFF-flagged improvements, analyzed

### 3.A · Audio buffer pre-roll  ◄ biggest single win

**Current:** `speak/route.ts` opens ElevenLabs `/stream` then while-loops every chunk into an array, merges, base64s, returns. Client gets the full blob. Sends to LiveAvatar in one WebSocket message.

**Proposed:** stream chunks straight through.

Two implementation paths:

**Path 1: client-side proxy of the ElevenLabs stream.** Replace the JSON-body POST/response shape with a `Transfer-Encoding: chunked` response that pipes ElevenLabs's body to the client. Client reads each chunk with a `ReadableStream` reader and sends each to LiveAvatar via WebSocket. Pros: server stays thin, client stays in control. Cons: client must split base64 boundaries cleanly (PCM frames are easy because they're 16-bit aligned — chunk size in bytes, not samples).

**Path 2: server-side WebSocket bridge.** Server holds both the ElevenLabs stream and the LiveAvatar WebSocket and pumps chunks across. Pros: no client refactor for chunking math. Cons: requires server-held WebSocket connection to LiveAvatar (we currently delegate that to the browser); breaks our current stateless `/api/olivia/liveavatar/speak` shape.

**Recommendation: Path 1.** Aligns with how Track O3 (`/api/olivia/chat/stream`) already does it — `ReadableStream`, manual chunk boundaries, falls back to non-streaming on error.

LiveAvatar LITE accepts either single `agent.speak` with full audio OR a sequence of `agent.speak_audio_chunk` messages followed by `agent.speak_end`. The latter is the path we want. (Verify: HEYGEN_LTM_CONFIG.md — referenced in BUILD_SEQUENCE — should have the protocol spec; not read in this research pass.)

**Expected impact:**
- Time-to-first-mouth-movement: ~1–3 s → ~75–250 ms (depending on which model). **8–40× improvement.**
- TTS gen happens in parallel with playback instead of serial — total perceived completion stays similar, but the UX feels live.
- Compounds with O3 (text streaming) — the user sees the reply text streaming AND hears the avatar speaking simultaneously.

### 3.B · Phoneme alignment

**Current:** none. LiveAvatar LITE Mode infers visemes from PCM amplitude. Quality is "decent" — visible mouth movement, English vowels usually distinct, but consonants like `m/p/b` (lip-closures) are inconsistent.

**Available data we don't use:** ElevenLabs has `text-to-speech/{voice}/stream/with-timestamps` which returns alignment JSON alongside the audio:

```json
{
  "alignment": {
    "characters": ["H", "e", "l", "l", "o"],
    "character_start_times_seconds": [0.0, 0.05, 0.12, 0.18, 0.24],
    "character_end_times_seconds": [0.05, 0.12, 0.18, 0.24, 0.30]
  }
}
```

This is *character-level* timing, not phoneme-level. To get phoneme alignment we'd need a separate phonemizer (e.g., `phonemize` library, or Whisper `--word_timestamps` for inverse alignment).

**Vendor reality check:**
- **LiveAvatar LITE / HeyGen Streaming SDK** — proprietary; viseme inference is server-side. No documented hook for external phoneme metadata. Likely a no-op even if we send it.
- **Simli** — Simli's API explicitly accepts viseme/phoneme metadata; their pipeline supports external lip-sync drivers.
- **Tavus** — Tavus does phoneme-driven sync server-side; client sends text + audio.

**Recommendation: park until O5c.** Phoneme alignment only pays off when paired with a vendor that consumes it. If we add Tavus/Simli in O5c, phoneme alignment becomes a meaningful follow-up. With LiveAvatar-only it's research-noise.

### 3.C · Chunk-boundary stutter

**Current:** no chunking → no stutter. But this is also why pre-roll is missing.

**Risk when implementing 3.A:** if we send chunks as separate `agent.speak_audio_chunk` messages and the SaaS treats each as a discrete utterance, mouth animations could reset between chunks. Mitigation:
1. Use `agent.speak_audio_chunk` (continuation) not `agent.speak` (new utterance) for all chunks after the first.
2. Always close with `agent.speak_end` so the SaaS knows when to settle the mouth back to neutral.
3. Buffer ~50 ms of audio at the avatar end (the SaaS likely already does this) so chunk gaps under that threshold don't cause stutter.

This isn't a separate task — it's a design constraint for 3.A.

---

## 4 · Additional improvement vectors I found in code

These aren't in HANDOFF's list but are real issues. Numbered so future work can reference them.

### 4.1 · No interruption on new reply (USER-FACING BUG)

`src/components/olivia/OliviaVideoAvatar.tsx:371-380` — `useEffect [lastReply]` triggers `speakReply(lastReply)` whenever `lastReply` changes. But `speakReply` doesn't `interrupt` first. If the user fires a second message while the first is still being spoken, the avatar queues both and speaks them back-to-back. Fix: call `interrupt()` (already exposed at line 575-583) before `speakReply` when `state === "speaking"`. Single-session.

### 4.2 · Silent text truncation at 2,000 chars

`OliviaVideoAvatar.tsx:352` — `text.slice(0, 2000)`. The user sees the full markdown reply but only the first 2,000 chars get spoken. No UI feedback. Long pitch-coach replies / valuation walkthroughs lose the second half.

The route accepts up to 5,000 chars (`speak/route.ts:40`). Why does the client truncate to 2,000? Almost certainly a stale safety limit from when LiveAvatar's queue was shorter. Either bump to 5,000 to match the route, or chunk-and-stream past 5,000 (after 3.A is done, this becomes natural).

### 4.3 · No fallback when speak fails

`OliviaVideoAvatar.tsx:343-368` — if `/speak` returns 500 or `fallback: true`, the catch logs to console but the avatar stays silent. The user reads the text reply (fine) but the avatar never moved at all (bad — looks broken).

Suggested fix: when `data.fallback` is true, send `agent.speak` with a placeholder TTS-less command (e.g., a neutral mouth-movement loop) OR send the avatar into a brief "thinking" pulse so the silence is intentional rather than dead.

### 4.4 · No telemetry on lip-sync end-to-end latency

No Langfuse spans, no `performance.mark` calls, no stopwatching of `lastReply set → first viseme`. Without baseline numbers we can't validate that any of these improvements actually moved the needle.

Suggested: emit performance marks at four points:
- `lastReply-set` (client receives reply text)
- `speak-fetch-start` (POST to `/speak` opens)
- `speak-fetch-first-byte` (first body byte arrives at client)
- `ws-speak-sent` (WebSocket message sent)
- `lk-speaking-event` (RoomEvent.TrackSubscribed → state becomes speaking)

Plus a server span around the ElevenLabs call. Together these isolate where time is spent: cascade → TTS gen → server pipe → client → WebSocket → SaaS render.

### 4.5 · `useEffect [lastReply, state, speakReply]` race window

`speakReply` is recreated on every render via `useCallback([])` — but its dep array is `[]` (LTM) or `[authHeaders]` (OB). Stable. No issue there. However, `useEffect [lastReply, state, speakReply]` can fire twice if `state` flips during a single async speakReply call (state goes `connected → speaking → connected` while speakReply is awaiting). The `lastSpokenRef` guard prevents re-speaking the same text but does NOT prevent double-firing for *different* texts that arrive in quick succession.

This is the flip side of 4.1: even with auto-interrupt, the queue ordering can interleave.

Suggested: serialize via a ref-held `isSpeaking` boolean; only allow one in-flight `speakReply`; queue followups; drop pre-empted ones.

### 4.6 · Inconsistent ElevenLabs model across routes

| File | Model |
|---|---|
| `src/lib/voice/elevenlabs.ts:129` | `eleven_turbo_v2_5` (~250 ms TTFB) |
| `src/app/api/olivia/liveavatar/speak/route.ts:62` | `eleven_multilingual_v2` (~500 ms TTFB) |

Speak path uses the slower model. Switching to `eleven_turbo_v2_5` halves TTFB. Switching to `eleven_flash_v2_5` (newest, ~75 ms TTFB, lossy quality vs turbo) gets us another ~3× drop. Trade-off: flash has slightly worse prosody.

Recommendation: speak path uses `eleven_turbo_v2_5`. Reserve flash for a future "ultra-low-latency" mode if voice mode (Track E) needs it. Single-line change.

---

## 5 · Vendor track per BUILD_SEQUENCE.md O5

> *"Add **Tavus** as a vendor in `src/lib/avatar/tavus.ts`. A/B harness compares Tavus vs Simli vs HeyGen on the same 30-script suite. Best vendor wins primary, others stay as fallback chain."* — BUILD_SEQUENCE.md

**Implementation outline (multi-session):**

1. **`src/lib/avatar/tavus.ts`** — adapter following the same shape as `simli.ts` / `heygen.ts`. Tavus API: `POST /v2/conversations` to create a session, returns a WebRTC join URL. Speak via REST `POST /v2/conversations/{id}/utterance`.

2. **A/B harness at `/admin/avatar-eval`** — input: 30-script suite (already conceptual; needs actual scripts written). Output: side-by-side video grid + perceived-MOS scoring form. Persist scores to a new `AvatarEvalRun` Prisma model.

3. **Decision rubric — the 30 scripts should cover:**
   - 5 short utterances ("Yes." / "Tell me more." / "London.") — tests onset latency
   - 5 medium (1-sentence: "The pre-money is 6.5 million pounds." / "Series A timing concerns me." / etc.) — tests connected speech
   - 5 number-heavy ("Forty-two-point-three percent CAGR over the last six quarters.") — tests prosody on tabular nums
   - 5 plosives-heavy ("Big banks back bigger banks." / "Pretty pink pansies.") — tests `b/p/m` lip closures
   - 5 multilingual ("Bonjour." / "Hola, qué tal." / "Guten Tag.") — tests if model handles non-English
   - 5 long-form (3+ sentences, > 30 s) — tests sustained sync, breath placement

4. **Selection algorithm:** ranked by (latency rank × 0.4) + (lip-sync MOS × 0.4) + (cost-per-min × 0.2). Cost matters because per-min metering scales with embed-everywhere usage.

**Note for the implementer:** Tavus and Simli are competitors with similar feature sets but very different cost structures. Tavus is more expensive but has tighter phoneme accuracy (per their own benchmarks, which are obviously biased). Simli is cheaper, slightly looser sync but excellent latency. HeyGen is mature, expensive, beautiful. Decision is per-tenant in production (white-label tenants pick their own).

---

## 6 · Recommended sequence

| Phase | Scope | Sessions | Risk | Win |
|---|---|---|---|---|
| **O5a** | Streaming pre-roll (#3.A) — change `/speak` route to chunked response, client splits + forwards via `agent.speak_audio_chunk`. Includes baseline telemetry (#4.4). | 1 | Medium — protocol detail of `agent.speak_audio_chunk` needs verification against HEYGEN_LTM_CONFIG. | Largest. 8-40× perceived latency drop. |
| **O5b** | Auto-interrupt + truncation fix + speed model swap (#4.1, #4.2, #4.6) — three small wins in one session. | 1 | Low. | Medium. Polish. |
| **O5c** | Tavus + A/B harness per BUILD_SEQUENCE. Includes pulling `OliviaVideoAvatar` behind `src/lib/avatar/`. | 3 | High — vendor integration is genuinely multi-session. | Long-term. Locks vendor decision; enables phoneme alignment work. |
| **O5d** | Phoneme alignment feasibility test (#3.B) once O5c lands a vendor that supports it. | 1 (research only) | n/a | Caps lip-sync quality ceiling. |
| **O5e (deferred)** | Race-condition hardening (#4.5) + fallback UX (#4.3). | 1 | Low. | Low — fixes edge cases. |

**Critical-path pick if forced to one session:** O5a. The pre-roll fix is the dominant UX improvement; everything else is incremental.

---

## 7 · Test rubric

After O5a lands, the user-perceived improvement should be measurable:

| Metric | Before (today) | After O5a target |
|---|---|---|
| Time-to-first-mouth-movement (median, 200-char reply) | ~1.2 s | < 250 ms |
| Time-to-first-mouth-movement (p95) | ~3 s | < 500 ms |
| End-to-end "ask → fully spoken" (200-char reply) | ~3.5 s | ~3.5 s (unchanged — TTS gen is in parallel, not faster) |
| Stutter events / minute on continuous chat | 0 (no chunking) | 0 (validated against `agent.speak_audio_chunk` semantics) |
| Avatar lip-sync MOS (subjective, blinded 30-script test) | baseline | ≥ baseline |

For O5c (vendor swap), the rubric needs MOS scoring done by 3+ independent raters on the same 30 scripts across all candidate vendors. Ranked picks.

---

## 8 · Files cited (verified at HEAD `949a97f`)

- `src/components/olivia/OliviaVideoAvatar.tsx` (867 lines)
- `src/app/api/olivia/liveavatar/speak/route.ts` (110 lines)
- `src/app/api/olivia/liveavatar/route.ts` (session-create, not modified by O5)
- `src/lib/voice/elevenlabs.ts` (199 lines)
- `src/lib/avatar/index.ts` (213 lines, abstraction not currently used by the live avatar path)
- `D:\London-Tech-Map\src\components\olivia\OliviaVideoAvatar.tsx` (LTM — 773 lines, behaviorally identical)
- `D:\London-Tech-Map\src\components\studio\StudioOliviaAvatar.tsx` (LTM — 303 lines, NOT YET PORTED)
- `D:\London-Tech-Map\src\components\analysis\LiveAvatarPlayer.tsx` (LTM — 440 lines, alternate vendor pattern via `@heygen/liveavatar-web-sdk`, NOT YET PORTED)

## 9 · Out of scope for this memo

- HEYGEN_LTM_CONFIG.md protocol verification (need to read; flagged as next-session prerequisite for O5a)
- Actual MOS evaluation of current vendor (subjective; needs the harness)
- Cost-per-minute math for the vendor matrix (Tavus, Simli, HeyGen pricing pages — and per-tenant negotiation)

---

*Memo author: next-agent session 2026-05-09. Locked HEAD `949a97f`. No code changed by this work — research only. Implementation choice belongs to the founder.*
