/**
 * OLIVIA BRAIN - AVATAR TYPES
 * ============================
 *
 * Shared types for avatar generation and rendering.
 *
 * Avatar Providers:
 * - Simli: Primary realtime avatar for Olivia™
 * - SadTalker (Replicate): Judge presentations for Cristiano™
 * - HeyGen: Fallback + async branded video
 * - D-ID: Fallback interactive avatar
 * - Tavus: Track O5c — A/B candidate (phoneme-input claim flagged for verification)
 */

import type { PersonaId } from "@/lib/voice/types";

export type AvatarProvider = "simli" | "sadtalker" | "heygen" | "did" | "tavus";

export type EmotionState =
  | "neutral"
  | "happy"
  | "confident"
  | "thoughtful"
  | "concerned"
  | "emphatic"
  | "welcoming";

export type GestureState =
  | "idle"
  | "speaking"
  | "listening"
  | "nodding"
  | "thinking"
  | "presenting"
  | "emphasizing";

export interface AvatarIdentity {
  personaId: PersonaId;
  name: string;
  role: string;
  visualDescription: string;
  voiceCharacteristics: string;
  defaultEmotion: EmotionState;
  defaultGesture: GestureState;
  primaryProvider: AvatarProvider;
  fallbackProviders: AvatarProvider[];
  allowedEmotions: EmotionState[];
  allowedGestures: GestureState[];
}

export interface AvatarSessionConfig {
  personaId: PersonaId;
  provider?: AvatarProvider;
  emotion?: EmotionState;
  gesture?: GestureState;
  audioSource?: "elevenlabs" | "openai";
}

export interface AvatarSession {
  sessionId: string;
  personaId: PersonaId;
  provider: AvatarProvider;
  status: "initializing" | "ready" | "speaking" | "listening" | "ended" | "error";
  createdAt: Date;
  videoStreamUrl?: string;
  audioStreamUrl?: string;
}

export interface AvatarVideoRequest {
  personaId: PersonaId;
  text: string;
  emotion?: EmotionState;
  gesture?: GestureState;
  outputFormat?: "mp4" | "webm";
}

export interface AvatarVideoResult {
  videoUrl: string;
  durationMs: number;
  provider: AvatarProvider;
  personaId: PersonaId;
}

export interface RealtimeAvatarConfig {
  personaId: PersonaId;
  onVideoFrame?: (frame: ArrayBuffer) => void;
  onAudioChunk?: (chunk: ArrayBuffer) => void;
  onStateChange?: (state: AvatarSession["status"]) => void;
  onError?: (error: Error) => void;
}

export interface AvatarServiceStatus {
  simli: { configured: boolean; available: boolean };
  sadtalker: { configured: boolean; available: boolean };
  heygen: { configured: boolean; available: boolean };
  did: { configured: boolean; available: boolean };
  tavus: { configured: boolean; available: boolean };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Track O5c-Lift — vendor-pluggable realtime avatar handle.
 *
 * Each vendor adapter (liveavatar, simli, tavus) returns one of these
 * via its `create<Vendor>LiveHandle()` function. The OliviaVideoAvatar
 * component dispatches all lifecycle calls through this interface so
 * the React layer is no longer coupled to any single vendor's SDK.
 *
 * Symmetry across vendors today:
 * - `liveavatar`: full implementation. connect → LiveKit join + WS.
 *   speak → PCM stream via /api/olivia/liveavatar/speak-stream with
 *   the existing fallback to /speak. interrupt → agent.interrupt WS
 *   message. The OliviaVideoAvatar production component runs on this.
 * - `simli`: server-proxied speak-only. connect creates a Simli
 *   session via the existing adapter; attachVideo is a no-op until a
 *   future session wires the Simli WebRTC SDK. Used by the avatar-
 *   eval harness for TTFM measurement.
 * - `tavus`: server-proxied speak-only. connect creates a Tavus
 *   conversation via the existing adapter; attachVideo is a no-op
 *   until a future session wires the Daily SDK. Same harness-only
 *   contract as simli.
 *
 * Why a non-event-emitter `on()` instead of EventTarget: keeps the
 * handle vendor-SDK-agnostic and lets each adapter use whatever
 * underlying mechanism it wants (LiveKit RoomEvent, plain callbacks,
 * etc.) without leaking that choice into the React layer.
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * Connection state machine shared by every vendor handle. Canonical
 * home for this type — `OliviaVideoAvatar` re-exports it for
 * back-compat with `src/app/test-avatar/page.tsx` and any future
 * consumers that still import it from the component.
 */
export type AvatarState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "speaking"
  | "error";

/**
 * Why a `speak()` call resolved without producing audio.
 * - `voice_unavailable`: server fallback JSON or upstream errored.
 * - `ws_closed`: WebSocket dropped mid-stream (LiveAvatar only).
 * - `stream_aborted`: a newer reply pre-empted this one — usually NOT
 *   a user-visible failure; OliviaVideoAvatar omits it from the UI.
 */
export type SpeakErrorReason =
  | "voice_unavailable"
  | "ws_closed"
  | "stream_aborted";

/**
 * Events the handle emits. Each listener is invoked synchronously
 * and any exception it throws is logged and swallowed — the handle
 * never lets a misbehaving listener break its internal lifecycle.
 */
export interface LiveAvatarHandleEventMap {
  stateChange: (state: AvatarState) => void;
  /**
   * Fires once the handle has an audio HTMLMediaElement available for
   * MediaRecorder capture (LiveKit's `track.attach()` returns one).
   * Tavus + Simli stub handles never fire this event because they
   * don't render audio client-side.
   */
  audioElementReady: (el: HTMLMediaElement) => void;
}

/** Options shared by every vendor handle factory. */
export interface CreateLiveAvatarHandleOptions {
  /**
   * Pre-Clerk Bearer token forwarded as `Authorization: Bearer <token>`
   * on every server-bound call. When undefined, calls go without
   * the header (the route reads cookies). Mirrors `OliviaVideoAvatar`'s
   * `adminKey` prop.
   */
  adminKey?: string;

  /**
   * Which persona's avatar to provision and speak as. Defaults to
   * "olivia" so legacy zero-arg callers (the historical Olivia-only
   * surface) keep their behavior. Set to "cristiano" for the Judge
   * verdict surfaces (`CristianoReEvaluation`, WarRoom, etc.).
   *
   * The value is forwarded as `{ personaId }` on the session-create
   * and speak POST bodies. The server resolves the persona to its
   * LiveAvatar avatar id and ElevenLabs voice id via
   * `src/lib/avatar/personas.ts`. Adding a new LiveAvatar-eligible
   * persona requires changes in three places per the comment in
   * `src/lib/avatar/personas.ts` — TypeScript will flag every miss.
   */
  personaId?: "olivia" | "cristiano";
}

/**
 * Vendors that can produce a LiveAvatarHandle today.
 *
 * - `liveavatar`: HeyGen's LITE Mode realtime path (same vendor as the
 *   `heygen` adapter; different product tier — LITE Mode = realtime
 *   WebRTC streaming, the regular HeyGen surface = async video
 *   generation). Treated as a distinct vendor here because the API
 *   surface, env vars (`LIVEAVATAR_API_KEY` vs `HEYGEN_API_KEY`), and
 *   client lifecycle are different.
 * - `simli`: Simli's realtime WebRTC avatar (full SDK lift deferred).
 * - `tavus`: Tavus's conversation API (Daily SDK lift deferred).
 *
 * `did` and `sadtalker` aren't in this list — D-ID has a streaming
 * surface that isn't wired through OliviaVideoAvatar yet, and
 * SadTalker is an async Replicate job (no realtime path at all).
 * `AvatarProvider` (above) routes async video generation and includes
 * those two; `LiveAvatarProvider` is realtime-only.
 */
export type LiveAvatarProvider = "liveavatar" | "simli" | "tavus";

/**
 * Vendor-agnostic realtime avatar handle. Each adapter implements
 * this with a different underlying transport (LiveKit + WS, Daily,
 * Simli WebRTC). `OliviaVideoAvatar` and the avatar-eval harness
 * both dispatch through this contract.
 */
export interface LiveAvatarHandle {
  readonly provider: LiveAvatarProvider;

  /**
   * Open the realtime channel. Resolves when the vendor reports the
   * session is ready to render video / speak. Fails on
   * env-not-configured or vendor-unreachable. Idempotent — calling
   * twice on an already-connected handle resolves immediately.
   */
  connect(): Promise<void>;

  /**
   * Tear down WebRTC, websocket, abort in-flight speaks. Idempotent;
   * safe to call from React unmount even if connect() never ran.
   */
  disconnect(): void;

  /**
   * Speak the given text. Each vendor handles TTS internally. Returns
   * `{ reason }` when no audio was produced; resolves with `{}` (no
   * reason) on the success path. Aborts via `signal` resolve to
   * `{ reason: "stream_aborted" }`. Never throws.
   */
  speak(
    text: string,
    signal: AbortSignal,
  ): Promise<{ reason?: SpeakErrorReason }>;

  /**
   * Stop in-progress speech and clear the vendor's queue. No-op when
   * not currently speaking.
   */
  interrupt(): void;

  /**
   * Attach the vendor's video MediaStream (or equivalent) to the given
   * <video> element. For vendors whose handles are speak-only today
   * (simli, tavus), this is a no-op — see the comment block at the
   * top of this section for what's deferred.
   */
  attachVideo(el: HTMLVideoElement): void;

  /**
   * Subscribe to a lifecycle event. Returns an unsubscribe function;
   * call it from React's effect cleanup.
   */
  on<E extends keyof LiveAvatarHandleEventMap>(
    event: E,
    listener: LiveAvatarHandleEventMap[E],
  ): () => void;
}
