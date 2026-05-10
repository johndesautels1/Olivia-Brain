/**
 * OLIVIA BRAIN - LIVEAVATAR LITE ADAPTER (THIN)
 * ==============================================
 *
 * Track O5c session 3.
 *
 * LiveAvatar LITE is the production realtime avatar surface today
 * (`OliviaVideoAvatar.tsx` → `/api/olivia/liveavatar/*`). The full
 * client lifecycle — LiveKit WebRTC join, `agent.speak` WebSocket
 * messages, MediaRecorder capture — lives in `OliviaVideoAvatar` and
 * stays there for now (the abstraction lift was scoped out of S3).
 *
 * What this file owns:
 * - A `liveavatar` first-class entry in the avatar abstraction so the
 *   harness UI and decision-rubric page can probe it without
 *   importing `OliviaVideoAvatar`'s internals.
 * - `isLiveAvatarConfigured()` so the harness can enable/disable its
 *   live-trigger button.
 *
 * What this file deliberately does NOT own (yet):
 * - WebSocket connection lifecycle. That stays inside
 *   `OliviaVideoAvatar` until the abstraction lift lands.
 * - `createSession` / `sendAudio` / `endSession` style functions —
 *   they would mirror `simli.ts`, but the LiveAvatar protocol is
 *   browser-WebSocket-driven and OliviaVideoAvatar already implements
 *   it. Duplicating it here would create two sources of truth.
 *
 * If you're tempted to expand this file: read
 * `docs/HEYGEN_LTM_CONFIG.md` first — the WebSocket message format is
 * pinned by LTM's working integration and any drift is dangerous.
 */

import { getServerEnv } from "@/lib/config/env";
import { Room, RoomEvent, Track, type RemoteTrackPublication } from "livekit-client";
import type {
  AvatarState,
  CreateLiveAvatarHandleOptions,
  LiveAvatarHandle,
  LiveAvatarHandleEventMap,
  SpeakErrorReason,
} from "./types";

export function isLiveAvatarConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.LIVEAVATAR_API_KEY && env.LIVEAVATAR_OLIVIA_AVATAR_ID);
}

/**
 * Non-secret config exposed to clients for harness wiring.
 * NEVER include the API key here — only IDs that are safe in the
 * browser (matches the LTM convention; the avatar ID is rendered into
 * client-side LiveKit join URLs anyway).
 */
export interface LiveAvatarPublicConfig {
  oliviaAvatarId: string | null;
}

export function getLiveAvatarPublicConfig(): LiveAvatarPublicConfig {
  const env = getServerEnv();
  return {
    oliviaAvatarId: env.LIVEAVATAR_OLIVIA_AVATAR_ID ?? null,
  };
}

/**
 * Speak-stream endpoint path. Exposed so the harness's live-trigger
 * button has a single source of truth for the URL it POSTs to.
 */
export const LIVEAVATAR_SPEAK_STREAM_PATH =
  "/api/olivia/liveavatar/speak-stream";

/* ─────────────────────────────────────────────────────────────────────────────
 * Track O5c-Lift S2 — LiveAvatarHandle implementation for HeyGen LITE Mode.
 *
 * Lifts the LiveKit Room + WebSocket + PCM-streaming-with-fallback
 * lifecycle out of `src/components/olivia/OliviaVideoAvatar.tsx` into a
 * vendor-agnostic factory so the React component can dispatch through
 * `LiveAvatarHandle` instead of holding its own connection state.
 *
 * Behavior parity with the C1 OliviaVideoAvatar baseline (which still
 * holds the original copy until the C3 refactor folds it back to using
 * this factory):
 *
 * - connect(): POST /api/olivia/liveavatar (returns LiveKit creds + WS
 *   URL), join the LiveKit Room, attach video on the configured
 *   element, emit `audioElementReady` once a remote audio track lands,
 *   open the LITE Mode WebSocket. Idempotent — second call while
 *   connected resolves immediately.
 *
 * - speak(text, signal): try the streaming pre-roll path
 *   (/speak-stream → ws.agent.speak chunks → ws.agent.speak_end);
 *   if that declines (server fallback JSON, ws closed, abort), fall
 *   back to /speak (full-buffered base64). Resolves with `{}` on
 *   success and `{ reason }` on every failure mode (`stream_aborted`,
 *   `voice_unavailable`, `ws_closed`). Internal AbortController
 *   serializes in-flight speaks so a newer reply pre-empts the older
 *   one without PCM interleave on the wire.
 *
 * - interrupt(): sends `agent.interrupt` over the WS to clear the
 *   vendor-side queue. Safe no-op when not currently speaking.
 *
 * - attachVideo(el): sets the target element. If a video track has
 *   already landed (late attach after track-subscribed), re-attaches
 *   it now. If called before connect, the next track-subscribed event
 *   will pick it up.
 *
 * - on(event, listener): subscribe to `stateChange` /
 *   `audioElementReady`. Returns an unsubscribe function. Listener
 *   exceptions are caught + logged so a misbehaving listener can't
 *   break the handle's internal state machine.
 *
 * What this factory does NOT do (intentional):
 * - MediaRecorder capture. That's React-state-shaped (the recording
 *   state machine is tightly bound to the component's lifecycle) and
 *   stays in OliviaVideoAvatar where it can keep using `useState`.
 *   The handle exposes the audio HTMLMediaElement via
 *   `audioElementReady` so the component's recorder picks it up.
 * - Auto-interrupt-on-new-reply. That's a React-effect concern
 *   keyed to the `lastReply` prop and stays in the component too.
 *   The component just calls `handle.interrupt()` then
 *   `handle.speak()` when the reply changes.
 * ───────────────────────────────────────────────────────────────────── */

/**
 * Pre-roll chunk thresholds (mirror of OliviaVideoAvatar's constants).
 * PCM 16-bit 24 kHz = 48 bytes/ms. First chunk goes early (~125 ms of
 * audio) so lip-sync starts fast; subsequent chunks ~250 ms. Both stay
 * well below the per-message 1 MB cap LiveAvatar LITE Mode enforces
 * (see docs/HEYGEN_LTM_CONFIG.md).
 */
const FIRST_CHUNK_BYTES = 6_000;
const TARGET_CHUNK_BYTES = 12_000;

/**
 * Encode a PCM chunk to base64 in 32 KB sub-batches so we don't blow
 * `String.fromCharCode.apply`'s per-arity ceiling (~65,535 args in V8).
 * Joining the parts once at the end is faster than O(n) string
 * concatenation. Mirror of OliviaVideoAvatar's helper.
 */
function uint8ToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  const parts: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const slice = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
    parts.push(String.fromCharCode.apply(null, slice as unknown as number[]));
  }
  return btoa(parts.join(""));
}

/**
 * Mark a perf event if `performance.mark` is present. Skipped silently
 * in SSR / older runtimes. The harness + dev tools read these via
 * `performance.getEntriesByName` to isolate which segment of the
 * pipeline owns each ms of latency:
 *   olivia-speak-start          — fetch initiated
 *   olivia-speak-first-byte     — first PCM byte arrived
 *   olivia-speak-first-chunk    — first agent.speak ws message sent
 *   olivia-speak-done           — speak_end sent
 */
function markPerf(name: string): void {
  if (typeof performance !== "undefined" && typeof performance.mark === "function") {
    try {
      performance.mark(name);
    } catch {
      /* ignore — duplicates / invalid names just no-op */
    }
  }
}

/**
 * Factory for the LiveAvatar (HeyGen LITE Mode) realtime handle.
 *
 * Each call returns an independent handle bound to its own LiveKit
 * Room + WebSocket. Multiple handles can coexist in the same app
 * (e.g. one per persona, or one for the production component plus a
 * second for the avatar-eval harness).
 */
export function createLiveAvatarLiveHandle(
  opts: CreateLiveAvatarHandleOptions = {},
): LiveAvatarHandle {
  // ── internal state (closure-bound — no module-level singletons) ──
  let state: AvatarState = "disconnected";
  let room: Room | null = null;
  let ws: WebSocket | null = null;
  let videoTarget: HTMLVideoElement | null = null;
  let audioEl: HTMLMediaElement | null = null;
  let speakAbort: AbortController | null = null;
  // De-dupe concurrent connect() calls — the second resolves to the
  // first's outcome instead of creating a second LiveKit session.
  let connectInFlight: Promise<void> | null = null;
  // LiveAvatar LITE Mode closes idle sessions after ~5 minutes. Send
  // a keep-alive every 4 minutes while connected so the session
  // doesn't drop out from under the consumer. Owned by the handle
  // (was a useEffect in OliviaVideoAvatar before the C3 lift).
  let keepAliveTimer: ReturnType<typeof setInterval> | null = null;

  const stateListeners = new Set<LiveAvatarHandleEventMap["stateChange"]>();
  const audioListeners = new Set<LiveAvatarHandleEventMap["audioElementReady"]>();

  function setState(next: AvatarState): void {
    if (state === next) return;
    state = next;
    for (const listener of stateListeners) {
      try {
        listener(next);
      } catch (err) {
        console.error("[liveavatar-handle] stateChange listener threw:", err);
      }
    }
  }

  function emitAudioReady(el: HTMLMediaElement): void {
    audioEl = el;
    for (const listener of audioListeners) {
      try {
        listener(el);
      } catch (err) {
        console.error("[liveavatar-handle] audioElementReady listener threw:", err);
      }
    }
  }

  function authHeaders(): HeadersInit {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (opts.adminKey) headers["Authorization"] = `Bearer ${opts.adminKey}`;
    return headers;
  }

  async function connect(): Promise<void> {
    if (state === "connected" || state === "speaking") return;
    if (connectInFlight) return connectInFlight;

    connectInFlight = (async () => {
      setState("connecting");
      try {
        const sessionRes = await fetch("/api/olivia/liveavatar", {
          method: "POST",
          headers: authHeaders(),
        });
        const sessionData = (await sessionRes.json()) as {
          livekitUrl?: string;
          livekitToken?: string;
          websocketUrl?: string;
          error?: string;
        };
        if (!sessionRes.ok || !sessionData.livekitUrl || !sessionData.livekitToken) {
          throw new Error(sessionData.error ?? `Session creation failed (${sessionRes.status})`);
        }

        const livekitRoom = new Room({ adaptiveStream: true, dynacast: true });
        livekitRoom.on(RoomEvent.TrackSubscribed, (track, publication: RemoteTrackPublication) => {
          if (track.kind === Track.Kind.Video && videoTarget) {
            track.attach(videoTarget);
          }
          if (track.kind === Track.Kind.Audio) {
            const el = track.attach();
            el.volume = 1.0;
            emitAudioReady(el);
          }
          void publication;
        });
        livekitRoom.on(RoomEvent.Disconnected, () => {
          // Remote-initiated disconnect — mirror to handle state so
          // observers see the same final transition as a local disconnect().
          setState("disconnected");
        });

        await livekitRoom.connect(sessionData.livekitUrl, sessionData.livekitToken);
        room = livekitRoom;

        if (sessionData.websocketUrl) {
          const socket = new WebSocket(sessionData.websocketUrl);
          socket.onopen = () => {
            console.log("[liveavatar-handle] WebSocket connected");
          };
          socket.onmessage = (event: MessageEvent) => {
            try {
              const msg = JSON.parse(event.data) as { type?: string; state?: string };
              if (msg.type === "agent.speak_started") setState("speaking");
              else if (msg.type === "agent.speak_ended") setState("connected");
              else if (msg.type === "session.state_updated" && msg.state === "closed") disconnect();
            } catch {
              /* ignore malformed */
            }
          };
          socket.onerror = () => {
            console.error("[liveavatar-handle] WebSocket error");
          };
          ws = socket;
        }

        setState("connected");

        // Start the keep-alive heartbeat. Cleared in disconnect().
        if (keepAliveTimer) clearInterval(keepAliveTimer);
        keepAliveTimer = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            try {
              ws.send(
                JSON.stringify({
                  type: "session.keep_alive",
                  event_id: `ka_${Date.now()}`,
                }),
              );
            } catch {
              /* ignore — the next disconnect will clean up */
            }
          }
        }, 4 * 60 * 1000);
      } catch (err) {
        setState("error");
        throw err;
      } finally {
        connectInFlight = null;
      }
    })();

    return connectInFlight;
  }

  function disconnect(): void {
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
    if (speakAbort) {
      try {
        speakAbort.abort();
      } catch {
        /* ignore */
      }
      speakAbort = null;
    }
    if (ws) {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      ws = null;
    }
    if (room) {
      try {
        room.disconnect();
      } catch {
        /* ignore */
      }
      room = null;
    }
    audioEl = null;
    setState("disconnected");
  }

  /**
   * Streaming pre-roll path. Resolves true if all PCM chunks were sent
   * and `agent.speak_end` was emitted. Resolves false on any failure
   * (network, server fallback JSON, ws closed mid-stream, abort) so
   * the caller can try `speakFallback`. Never throws.
   */
  async function speakStreaming(text: string, signal: AbortSignal): Promise<boolean> {
    const socket = ws;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    if (signal.aborted) return false;

    markPerf("olivia-speak-start");

    let res: Response;
    try {
      res = await fetch(LIVEAVATAR_SPEAK_STREAM_PATH, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ text: text.slice(0, 5000) }),
        signal,
      });
    } catch (err) {
      if (signal.aborted) return false;
      console.warn("[liveavatar-handle] speak-stream fetch failed:", err);
      return false;
    }

    if (!res.ok) return false;
    if (res.headers.get("X-Olivia-Audio-Format") !== "pcm_24000") return false;
    if (!res.body) return false;

    const reader = res.body.getReader();
    let buffer = new Uint8Array(0);
    let firstChunkSent = false;
    let firstByteSeen = false;

    const onAbort = () => {
      try {
        reader.cancel();
      } catch {
        /* ignore */
      }
    };
    signal.addEventListener("abort", onAbort, { once: true });

    try {
      while (true) {
        if (signal.aborted) return false;
        const { done, value } = await reader.read();
        if (done) break;
        if (!value || value.length === 0) continue;

        if (!firstByteSeen) {
          firstByteSeen = true;
          markPerf("olivia-speak-first-byte");
        }

        const merged = new Uint8Array(buffer.length + value.length);
        merged.set(buffer, 0);
        merged.set(value, buffer.length);
        buffer = merged;

        const target = firstChunkSent ? TARGET_CHUNK_BYTES : FIRST_CHUNK_BYTES;
        while (buffer.length >= target) {
          if (signal.aborted) return false;
          if (socket.readyState !== WebSocket.OPEN) return false;
          const chunk = buffer.slice(0, target);
          buffer = buffer.slice(target);
          socket.send(JSON.stringify({ type: "agent.speak", audio: uint8ToBase64(chunk) }));
          if (!firstChunkSent) {
            firstChunkSent = true;
            markPerf("olivia-speak-first-chunk");
          }
        }
      }

      if (signal.aborted) return false;

      if (buffer.length > 0) {
        if (socket.readyState !== WebSocket.OPEN) return false;
        socket.send(JSON.stringify({ type: "agent.speak", audio: uint8ToBase64(buffer) }));
      }

      if (socket.readyState !== WebSocket.OPEN) return false;
      socket.send(JSON.stringify({ type: "agent.speak_end", event_id: `spk_${Date.now()}` }));
      markPerf("olivia-speak-done");
      return true;
    } catch (err) {
      if (signal.aborted) return false;
      console.warn("[liveavatar-handle] speak-stream interrupted:", err);
      return false;
    } finally {
      signal.removeEventListener("abort", onAbort);
    }
  }

  /**
   * Non-streaming fallback. Server buffers full PCM, returns base64
   * JSON, the handle sends one `agent.speak` over the ws. Slower TTFM
   * but doesn't depend on the streaming response surviving end-to-end.
   */
  async function speakFallback(text: string, signal: AbortSignal): Promise<boolean> {
    const socket = ws;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    if (signal.aborted) return false;

    try {
      const res = await fetch("/api/olivia/liveavatar/speak", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ text: text.slice(0, 5000) }),
        signal,
      });
      const data = (await res.json()) as { audio?: string; fallback?: boolean };

      if (signal.aborted) return false;
      if (data.fallback || !data.audio) return false;
      if (socket.readyState !== WebSocket.OPEN) return false;

      socket.send(JSON.stringify({ type: "agent.speak", audio: data.audio }));
      return true;
    } catch (err) {
      if (signal.aborted) return false;
      console.error("[liveavatar-handle] speak fallback error:", err);
      return false;
    }
  }

  async function speak(
    text: string,
    externalSignal: AbortSignal,
  ): Promise<{ reason?: SpeakErrorReason }> {
    // Pre-empt any in-flight speak so its remaining chunks don't
    // interleave with this new utterance.
    if (speakAbort) {
      try {
        speakAbort.abort();
      } catch {
        /* ignore */
      }
    }
    const controller = new AbortController();
    speakAbort = controller;

    if (externalSignal.aborted) {
      controller.abort();
      if (speakAbort === controller) speakAbort = null;
      return { reason: "stream_aborted" };
    }
    const onExternalAbort = () => {
      try {
        controller.abort();
      } catch {
        /* ignore */
      }
    };
    externalSignal.addEventListener("abort", onExternalAbort, { once: true });

    try {
      const streamed = await speakStreaming(text, controller.signal);
      if (controller.signal.aborted) return { reason: "stream_aborted" };
      if (streamed) return {};

      const fellBack = await speakFallback(text, controller.signal);
      if (controller.signal.aborted) return { reason: "stream_aborted" };
      if (!fellBack) {
        const reason: SpeakErrorReason =
          ws?.readyState === WebSocket.OPEN ? "voice_unavailable" : "ws_closed";
        return { reason };
      }
      return {};
    } finally {
      externalSignal.removeEventListener("abort", onExternalAbort);
      if (speakAbort === controller) speakAbort = null;
    }
  }

  function interrupt(): void {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "agent.interrupt", event_id: `int_${Date.now()}` }));
    }
  }

  function attachVideo(el: HTMLVideoElement): void {
    videoTarget = el;
    // Late attach — if a video track has already landed before the
    // caller bound an element, re-attach it now so the element
    // actually shows the stream instead of waiting for the next track.
    if (room) {
      for (const participant of room.remoteParticipants.values()) {
        for (const publication of participant.videoTrackPublications.values()) {
          if (publication.track) publication.track.attach(el);
        }
      }
    }
  }

  function on<E extends keyof LiveAvatarHandleEventMap>(
    event: E,
    listener: LiveAvatarHandleEventMap[E],
  ): () => void {
    if (event === "stateChange") {
      const l = listener as LiveAvatarHandleEventMap["stateChange"];
      stateListeners.add(l);
      return () => {
        stateListeners.delete(l);
      };
    }
    if (event === "audioElementReady") {
      const l = listener as LiveAvatarHandleEventMap["audioElementReady"];
      audioListeners.add(l);
      // Late subscriber — fire immediately if the audio element is
      // already known so the listener doesn't miss it.
      if (audioEl) {
        try {
          l(audioEl);
        } catch (err) {
          console.error("[liveavatar-handle] audioElementReady listener threw:", err);
        }
      }
      return () => {
        audioListeners.delete(l);
      };
    }
    return () => {
      /* unknown event — no-op unsubscribe */
    };
  }

  return {
    provider: "liveavatar",
    connect,
    disconnect,
    speak,
    interrupt,
    attachVideo,
    on,
  };
}
