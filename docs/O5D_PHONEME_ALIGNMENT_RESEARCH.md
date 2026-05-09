# O5d · Phoneme Alignment Feasibility — Research Memo

> **Conclusion: REJECT.** Phoneme alignment as framed in
> `O5_AVATAR_LIPSYNC_RESEARCH.md §3.B` is not feasible with any of
> Olivia Brain's currently-integrated lip-sync vendors. None of them
> accept phoneme/viseme metadata as input — they all do audio-driven
> viseme inference server-side. Closing O5d. Track O reaches
> completion modulo the vendor-evaluation work in O5c.

---

## TL;DR

| Vendor | OB integration | Accepts phoneme/viseme input? |
|---|---|---|
| **LiveAvatar LITE** (HeyGen Streaming) | `OliviaVideoAvatar.tsx` + `/api/olivia/liveavatar/*` (the production path) | **No.** WebSocket `agent.speak` accepts only `audio` (base64 PCM). Verified against `docs/HEYGEN_LTM_CONFIG.md §4` and `src/lib/liveavatar/types.ts:218-221`. |
| **Simli** | `src/lib/avatar/simli.ts` | **No.** `sendAudioToSimli` accepts only `audioChunk: ArrayBuffer`. The `/v1/sessions/{id}/audio` endpoint takes raw PCM. |
| **HeyGen async** (different from LITE) | `src/lib/avatar/heygen.ts` | **No.** Voice input is either `type: "text"` (HeyGen TTS internal) or `type: "audio"` (audio URL). No phoneme channel. |
| **D-ID** | `src/lib/avatar/did.ts` | **No.** `script.type: "text"` or `script.type: "audio"`. No phoneme channel. |
| **SadTalker** (Replicate) | `src/lib/avatar/sadtalker.ts` | **No.** `driven_audio: <url>` only. The model is audio-conditional by architecture — no phoneme conditioning surface. |

The premise in the O5 research memo (that "Simli explicitly accepts viseme/phoneme metadata; their pipeline supports external lip-sync drivers") was **incorrect** based on what's actually wired in OB. Whatever advanced phoneme-input capability Simli may expose at lower API tiers is not part of our integration, and our PCM-in path is the same as HeyGen's and D-ID's.

This is the scenario the O5 memo flagged as the kill condition: *"With LiveAvatar-only it's research-noise. Recommendation: park until O5c [adds Tavus]."* O5c may surface a vendor that DOES accept phoneme input (Tavus, NVIDIA Audio2Face, or similar research-grade engines), at which point we revisit. Until then, O5d is closed REJECTED.

---

## 1 · What we investigated

### 1.1 · The data source side

ElevenLabs has `/v1/text-to-speech/{voice_id}/stream/with-timestamps` (and the non-streaming sibling). It returns audio bytes alongside an `alignment` JSON:

```json
{
  "alignment": {
    "characters": ["H", "e", "l", "l", "o"],
    "character_start_times_seconds": [0.0, 0.05, 0.12, 0.18, 0.24],
    "character_end_times_seconds":   [0.05, 0.12, 0.18, 0.24, 0.30]
  }
}
```

This is **character-level timing**, not phoneme-level. To get phonemes we'd need to:

1. Use a phonemizer (e.g., `phonemize` npm package wrapping eSpeak) to convert reply text → phoneme sequence.
2. Time-align phonemes against the character timestamps from ElevenLabs (interpolate within each character's duration).
3. Optionally convert phonemes → visemes (e.g., 44 English phonemes → 14 visemes via the Disney/Preston Blair mapping).

The ElevenLabs side is feasible. The character-timestamp data is real and obtainable. The blocker is downstream — see §1.2.

### 1.2 · The consumption side (vendors)

I read all five integrations end-to-end. Findings, with code citations:

**LiveAvatar LITE** (`src/components/olivia/OliviaVideoAvatar.tsx`):
- Outbound WS commands per `src/lib/liveavatar/types.ts:218-253`:
  - `agent.speak` — `{ type, audio: <base64 PCM> }`. **No phoneme field.**
  - `agent.speak_end`, `agent.interrupt`, `agent.start_listening`, `agent.stop_listening`, `session.keep_alive`. None carry visual metadata.
- Verified against `docs/HEYGEN_LTM_CONFIG.md §4` ("Pinned WebSocket message format"), which is the canonical contract sourced from LTM's working integration. The contract is **fixed** — adding new message types isn't something we can do unilaterally; it requires a HeyGen API change.
- LiveAvatar LITE Mode is, by design, "you provide PCM, we infer visemes." Their FULL Mode lets HeyGen's own model do TTS + visemes, but that's higher latency and not what we want.

**Simli** (`src/lib/avatar/simli.ts`):
- `sendAudioToSimli(sessionId, audioChunk: ArrayBuffer)` posts raw PCM to `/v1/sessions/{id}/audio` with content-type `audio/pcm`. **One field: the audio bytes.**
- `createSimliSession` has `audio_format: "pcm_16000"` parameter — they want raw audio.
- `updateSimliEmotion` is the only viseme-adjacent surface, and it sets EXPRESSION (smile, frown), not phonemes.
- The Simli docs at `https://docs.simli.com/api-reference` (referenced in `simli.ts:30`) MAY expose a phoneme endpoint at a different path, but our wrapper doesn't use it. Adding phoneme support would require re-architecting our integration plus presumably a different Simli pricing tier.

**HeyGen async** (`src/lib/avatar/heygen.ts:96-114`):
- `voice.type` is enum `"text" | "audio"`. Text = HeyGen's TTS pipeline. Audio = bring-your-own URL.
- Neither path takes phoneme input. The lip-sync model runs server-side from whichever audio-source the request specifies.

**D-ID** (`src/lib/avatar/did.ts:92-101`):
- Same pattern: `script.type: "text"` or `"audio"`. No phoneme channel.

**SadTalker** (`src/lib/avatar/sadtalker.ts:83-93`):
- Replicate input: `source_image` + `driven_audio` URL. The model is open-source (cjwbw/sadtalker on Replicate) and could conceivably be replaced with a phoneme-conditional alternative (e.g., Wav2Lip with phoneme aux input), but that's a research-grade fork — out of scope.
- We could also feed audio + text to a different open-source model (e.g., MuseTalk, EMO) but again that's research, not "feasibility."

### 1.3 · What WOULD accept phoneme input

Based on broader industry knowledge (NOT verified against current docs in this session — flag low-confidence):

- **NVIDIA Audio2Face / Omniverse** — research-grade, accepts phoneme animation curves. High-quality but heavy infrastructure.
- **Reallusion iClone** — animation tool, takes phoneme tracks. Not a streaming SaaS.
- **Some Wav2Lip forks** — research models that accept phoneme conditioning alongside audio. Not productized.

Tavus (planned for O5c) — confidence is uncertain. The O5 research memo claimed "Tavus does phoneme-driven sync server-side; client sends text + audio." Worth verifying when O5c lands.

**None** of the consumer-facing avatar SaaS products that match Olivia's deployment profile (sub-second latency, browser-renderable, REST/WebSocket integration) commonly expose a phoneme input. The industry-standard pattern is audio-conditional viseme inference, which is what every one of our wired vendors does.

---

## 2 · Why we shouldn't try anyway

Even if we found a vendor that accepts phoneme input, here's the cost-benefit:

### 2.1 · Cost

- **Phonemizer (text → phoneme):** add `phonemize` npm package + eSpeak runtime (or use Web-Speech-API's phoneme output, browser-dependent). ~1 session of integration work.
- **Time-alignment math:** map character timestamps (from ElevenLabs `with-timestamps`) onto phoneme stream. Non-trivial — phonemes don't align cleanly to character boundaries (e.g., "rough" = 3 phonemes / 5 characters). ~1 session of careful math + tests.
- **Vendor integration:** change the speak-stream route to dual-channel (audio + phoneme metadata) + change the client to forward both. ~1 session.
- **Total: ~3 sessions** to land phoneme alignment IF we had a vendor that accepted it. We don't.

### 2.2 · Benefit

The user-perceived gap "Olivia's mouth doesn't quite match her voice" is dominated by:

1. **Latency** between voice and lip-movement — *the dominant contributor.* Already addressed by O5a (~8-40× TTFM improvement).
2. **Visual fidelity of the avatar itself** — controlled by vendor selection. Addressed by O5c.
3. **Voice quality** — controlled by ElevenLabs voice settings (already tuned in `speak-stream/route.ts:64-68`).
4. **Viseme accuracy on consonants** — the area phoneme alignment would actually help. Limited delta in absolute MOS terms, especially when paired with high-quality audio.

A blinded MOS test comparing audio-driven vs phoneme-driven on the same vendor would likely show <5 points difference (out of 100), where users typically notice >10. That's a poor return on 3 sessions of work.

### 2.3 · Strategic angle

The Olivia surface targets "affluent professionals who notice when something's off" (`01_UI_DESIGN_SYSTEM.md` audience definition). Their feel-test for avatars is probably:

- Does it look me-in-the-eye? (vendor)
- Does it speak when I expect it to? (latency)
- Is the voice warm? (TTS)
- Does the mouth move at all? (yes, via current viseme inference)

Phoneme-perfect lip-closures are a level of polish that arrives MUCH later in the polish curve, and only matters if everything above it is already great. Today the latency is the gating factor. After O5a + O5c the visual quality is the gating factor. After both of those land, we can revisit whether anyone even notices viseme accuracy — strong likelihood: not enough to pay for it.

---

## 3 · Recommendation

Close O5d as REJECTED. Track O completion status:

| Item | Status |
|---|---|
| O3 — token-streaming chat (W-003) | ✅ closed prior session |
| O4 — citation-first RAG (W-004) | ✅ closed prior session |
| O5a — streaming pre-roll | ✅ this session, commit `d793fa9` |
| O5b — auto-interrupt + 5000 chars + turbo | ✅ this session, commit `14594e9` |
| O5e — abort serialization + onSpeakError | ✅ this session, commit `e55967b` |
| **O5d — phoneme alignment** | **❌ REJECTED — this memo, commit forthcoming** |
| O5c — Tavus + A/B harness | 📋 multi-session, future |

W-005 (avatar lip-sync upgrade) is functionally closed by O5a/b/e — the user-perceived "voice and mouth don't match" gap is dominated by latency, and that's now ~8-40× better. The remaining vendor work (O5c) is enhancement, not weakness-closure.

---

## 4 · If we ever revisit

Conditions that would re-open O5d:

1. O5c surfaces a vendor that DOES accept phoneme input (need to verify Tavus's actual API surface — flagged uncertain).
2. A user-facing complaint specifically about consonant lip-closures (e.g., "her mouth doesn't close on M sounds") — current vendor's audio-driven viseme is good enough until proven otherwise.
3. A new vendor we add that's research-grade (NVIDIA Audio2Face for high-stakes verdict moments? Cristiano™ verdict announcements only, not chat?). Cost-prohibitive for chat but possibly worth it for set-piece content.

In any of those cases, the implementation path is documented in §2.1 and the data source is verified in §1.1. Future work can pick up from there.

---

*Memo author: 2026-05-09 session. HEAD `e55967b`. No code changed by this work — research only. Closes O5d as REJECTED on cost-benefit grounds.*
