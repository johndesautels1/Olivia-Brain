"use client";

/**
 * OliviaVideoAvatar — LiveAvatar LITE Mode WebRTC Streaming
 *
 * Real-time avatar that speaks Olivia's replies via LiveKit WebRTC.
 * Flow: connect session → receive reply text → TTS via ElevenLabs →
 *       send PCM audio via WebSocket → avatar lip-syncs in real-time.
 *
 * Recording: Uses MediaRecorder API to capture video+audio streams,
 * combining LiveKit's separate tracks into a downloadable WebM file.
 *
 * ─── PORT NOTE (Olivia Brain, session 2) ─────────────────────────────────
 * Copied from D:\London-Tech-Map\src\components\olivia\OliviaVideoAvatar.tsx.
 * LTM original is read-only and untouched.
 *
 * The only delta from LTM is the `adminKey` prop: Olivia Brain's
 * /api/olivia/liveavatar(/speak) routes are gated by requireAdminKey
 * (Authorization: Bearer <ADMIN_API_KEY>) until Clerk is wired in week 1.
 * When `adminKey` is set, it is forwarded as the Bearer token on the two
 * fetch calls. LTM, which uses Clerk, does not need this — and that path
 * (omit prop) still works against any unguarded server.
 * ──────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { createLiveAvatarHandle } from "@/lib/avatar";
import type { LiveAvatarPersonaId } from "@/lib/avatar/personas";
import type { AvatarState, LiveAvatarHandle, LiveAvatarProvider } from "@/lib/avatar/types";

/**
 * Per-persona display label set. The component is persona-aware as of
 * the 2026-05-24 LiveAvatar persona refactor — Cristiano mounts the
 * same component as Olivia with `personaId="cristiano"`. All visible
 * strings flow through this table so adding a third persona is a
 * one-row diff (and TypeScript's `Record<LiveAvatarPersonaId, ...>`
 * makes the build fail if you forget). i18n upgrade later — for now
 * all strings English per the product surface.
 */
interface PersonaLabels {
  /** Display name used in the speaking indicator. */
  name: string;
  /** Connect button copy. */
  connectButton: string;
  /** Connecting spinner copy. */
  connectingText: string;
  /** Help text under the connect button. */
  helpText: string;
  /** Speaking indicator copy. */
  speakingText: string;
  /** Recording filename prefix (used for the downloaded .webm). */
  recordingFilenamePrefix: string;
}

const PERSONA_LABELS: Record<LiveAvatarPersonaId, PersonaLabels> = {
  olivia: {
    name: "Olivia",
    connectButton: "Start Live Avatar",
    connectingText: "Connecting to Olivia’s avatar…",
    helpText: "Connect to see Olivia respond in real-time",
    speakingText: "Olivia is speaking",
    recordingFilenamePrefix: "olivia-session",
  },
  cristiano: {
    name: "Cristiano",
    connectButton: "Summon the Judge",
    connectingText: "The Judge is taking the bench…",
    helpText: "Connect to hear Cristiano’s verdict",
    speakingText: "Cristiano delivers the verdict",
    recordingFilenamePrefix: "cristiano-session",
  },
};

// Type for HTML elements with captureStream - use local assertions instead of global declarations
interface HTMLElementWithCaptureStream {
  captureStream(frameRate?: number): MediaStream;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Types & Interfaces
 * ───────────────────────────────────────────────────────────────────────────── */

interface Props {
  onReady?: () => void;
  onDisconnect?: () => void;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onRecordingStateChange?: (state: RecordingState) => void;
  /** Called when avatar state changes — allows parent to render custom overlays */
  onStateChange?: (state: AvatarState) => void;
  lastReply?: string;
  /**
   * When true, hides internal disconnected/connecting/error overlays.
   * Parent component is responsible for rendering appropriate UI and calling connect().
   * Use this when embedding in custom containers (e.g., circular frames).
   */
  hideOverlays?: boolean;
  /**
   * Pre-Clerk Bearer token for /api/olivia/liveavatar(/speak) auth.
   * When set, sent as `Authorization: Bearer ${adminKey}`.
   * In production (Clerk-wired), leave undefined — the routes will read auth from cookies.
   */
  adminKey?: string;
  /**
   * Track O5e — fires when BOTH speak paths (streaming and the
   * fallback /speak route) fail to send any audio for a given reply.
   * The text reply still surfaces in chat; this lets the parent
   * surface a "voice unavailable" indicator instead of leaving the
   * user wondering why the avatar's mouth never moved.
   *
   * Reason is one of: "voice_unavailable" (server fallback JSON or
   * upstream errored), "ws_closed" (WebSocket dropped mid-stream),
   * "stream_aborted" (a newer reply pre-empted this one — usually
   * NOT a user-visible failure, omit from UI).
   */
  onSpeakError?: (reason: "voice_unavailable" | "ws_closed" | "stream_aborted") => void;
  /**
   * Track O5c-Lift — vendor selector. Defaults to "liveavatar"
   * (HeyGen LITE Mode), the only provider whose handle has a fully
   * functional realtime path today. "tavus" and "simli" return honest-
   * stub handles whose connect/speak surface a clearly-labelled
   * deferred-implementation error — the UI for those vendors will
   * just show the error overlay until their server routes + SDKs
   * land in a follow-up session.
   */
  provider?: LiveAvatarProvider;
  /**
   * Persona to provision the LiveAvatar session for. Defaults to
   * "olivia" so existing call sites keep their behavior unchanged.
   * Set to "cristiano" for the Judge verdict surfaces — same wire
   * pipeline, different LiveAvatar avatar id + ElevenLabs voice id
   * (resolved server-side by `src/lib/avatar/personas.ts`).
   *
   * Visual strings (connect button, status indicators, recording
   * filename) swap to the persona's label set automatically.
   */
  personaId?: LiveAvatarPersonaId;
}

/** Recording state machine */
export type RecordingState =
  | "idle"        // Not recording, no recording available
  | "recording"   // Currently recording
  | "processing"  // Converting chunks to blob
  | "ready"       // Recording complete, ready for download
  | "error";      // Recording failed

/** Recording error types for specific handling */
export type RecordingError =
  | "not_supported"      // Browser doesn't support MediaRecorder
  | "no_stream"          // No video/audio stream available
  | "permission_denied"  // User denied permission
  | "encoding_failed"    // Failed to encode recording
  | "unknown";           // Unexpected error

/**
 * Avatar connection state — re-exported from `@/lib/avatar/types` so
 * parents using `hideOverlays` can keep importing it from this file.
 * Track O5c-Lift moved the canonical home to `types.ts` so the new
 * `LiveAvatarHandle` interface (server-importable) can reference it.
 */
export type { AvatarState } from "@/lib/avatar/types";

export interface OliviaVideoAvatarRef {
  // Connection controls — use when hideOverlays={true}
  connect: () => Promise<void>;
  disconnect: () => void;
  getState: () => AvatarState;

  // Playback controls
  interrupt: () => void;
  replayLast: () => void;
  getLastReply: () => string;

  // Recording controls
  startRecording: () => Promise<boolean>;
  stopRecording: () => void;
  downloadRecording: () => boolean;
  clearRecording: () => void;
  getRecordingState: () => RecordingState;
  getRecordingError: () => RecordingError | null;
  isRecordingSupported: () => boolean;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Utility Functions
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * Check if MediaRecorder is supported in the current browser
 */
function isMediaRecorderSupported(): boolean {
  return typeof window !== "undefined" &&
         typeof MediaRecorder !== "undefined" &&
         typeof (HTMLVideoElement.prototype as unknown as HTMLElementWithCaptureStream).captureStream === "function";
}

/**
 * Get the best supported MIME type for recording
 * Prefers VP9 for quality, falls back to VP8, then generic WebM
 */
function getSupportedMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;

  const mimeTypes = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];

  for (const mimeType of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return null;
}

/**
 * Generate a timestamped filename for the recording. Prefix varies
 * per persona ("olivia-session-…webm" / "cristiano-session-…webm")
 * so downloads from a multi-persona session don't collide and the
 * filename tells you which avatar you captured.
 */
function generateRecordingFilename(prefix: string): string {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);
  return `${prefix}-${timestamp}.webm`;
}

export const OliviaVideoAvatar = forwardRef<OliviaVideoAvatarRef, Props>(function OliviaVideoAvatar({
  onReady,
  onDisconnect,
  onSpeakingChange,
  onRecordingStateChange,
  onStateChange,
  lastReply,
  hideOverlays = false,
  adminKey,
  onSpeakError,
  provider = "liveavatar",
  personaId = "olivia",
}, ref) {
  const labels = PERSONA_LABELS[personaId];
  // ── Avatar state ──
  const [state, setStateInternal] = useState<AvatarState>("disconnected");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Wrapper to notify parent of state changes
  const setState = useCallback((newState: AvatarState) => {
    setStateInternal(newState);
    onStateChange?.(newState);
  }, [onStateChange]);

  // ── Recording state ──
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingError, setRecordingError] = useState<RecordingError | null>(null);

  // ── Refs for avatar ──
  const videoRef = useRef<HTMLVideoElement>(null);
  // Track O5c-Lift — single handle replaces the LiveKit Room +
  // WebSocket + AbortController refs. The handle owns all of those
  // internally; the component only sees the LiveAvatarHandle surface.
  const handleRef = useRef<LiveAvatarHandle | null>(null);
  const lastSpokenRef = useRef<string>("");
  // AbortController for the LATEST speak() call — used by interrupt /
  // unmount to cancel an in-progress utterance. The handle also
  // serializes speaks internally (pre-empts older ones), so this is a
  // belt-and-braces external cancel for parent-driven aborts.
  const speakAbortRef = useRef<AbortController | null>(null);

  // ── Refs for recording ──
  const audioElementRef = useRef<HTMLMediaElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingBlobRef = useRef<Blob | null>(null);
  const recordingUrlRef = useRef<string | null>(null);

  // ── Latest-callback refs ──
  // The handle's listeners are subscribed once on mount (long-lived);
  // these refs let the listeners always invoke the most recent prop
  // callback without resubscribing on every re-render.
  const onStateChangeRef = useRef(onStateChange);
  const onSpeakingChangeRef = useRef(onSpeakingChange);
  const onSpeakErrorRef = useRef(onSpeakError);
  const onReadyRef = useRef(onReady);
  const onDisconnectRef = useRef(onDisconnect);
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
    onSpeakingChangeRef.current = onSpeakingChange;
    onSpeakErrorRef.current = onSpeakError;
    onReadyRef.current = onReady;
    onDisconnectRef.current = onDisconnect;
  });

  // ── Notify parent of recording state changes ──
  useEffect(() => {
    onRecordingStateChange?.(recordingState);
  }, [recordingState, onRecordingStateChange]);

  // ── Clean up recording resources ──
  const cleanupRecording = useCallback(() => {
    // Stop any active recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore errors during cleanup
      }
    }
    mediaRecorderRef.current = null;

    // Clear recorded data
    recordedChunksRef.current = [];
    recordingBlobRef.current = null;

    // Revoke any existing blob URL to prevent memory leaks
    if (recordingUrlRef.current) {
      URL.revokeObjectURL(recordingUrlRef.current);
      recordingUrlRef.current = null;
    }

    setRecordingState("idle");
    setRecordingError(null);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupRecording();
      disconnectSession();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handle init + listener subscription (Track O5c-Lift) ──
  //
  // The handle owns LiveKit + WebSocket + speak streaming + keep-alive
  // internally. The component subscribes once per (provider, adminKey)
  // pair and translates handle events into local state + parent
  // callbacks. Listeners read the latest callback fns via refs so a
  // parent re-rendering with new closures doesn't tear down the
  // subscription.
  useEffect(() => {
    const handle = createLiveAvatarHandle({ provider, adminKey, personaId });
    handleRef.current = handle;

    const unsubState = handle.on("stateChange", (next) => {
      setStateInternal(next);
      onStateChangeRef.current?.(next);
      if (next === "speaking") {
        onSpeakingChangeRef.current?.(true);
      } else if (next === "connected") {
        // Fired both on initial connect and after a speak ends.
        onSpeakingChangeRef.current?.(false);
      } else if (next === "disconnected") {
        onSpeakingChangeRef.current?.(false);
        onDisconnectRef.current?.();
      }
    });

    const unsubAudio = handle.on("audioElementReady", (el) => {
      // MediaRecorder reads from this element when capturing.
      audioElementRef.current = el;
    });

    // Late attach — if the <video> element is already mounted, point
    // the handle at it now. Otherwise the next track-subscribed
    // event will pick it up.
    if (videoRef.current) handle.attachVideo(videoRef.current);

    return () => {
      unsubState();
      unsubAudio();
      // Belt-and-braces: also abort any in-flight speak the component
      // initiated, in case the handle's internal abort hasn't fired yet.
      if (speakAbortRef.current) {
        try { speakAbortRef.current.abort(); } catch { /* ignore */ }
        speakAbortRef.current = null;
      }
      handle.disconnect();
      handleRef.current = null;
    };
  }, [provider, adminKey, personaId]);

  const disconnectSession = useCallback(() => {
    // Recording state machine cleanup mirrors the pre-lift behavior:
    // only tear down if actively recording — preserve completed
    // recordings so the founder can still download them after the
    // avatar disconnects.
    if (recordingState === "recording" || recordingState === "processing") {
      cleanupRecording();
    }
    if (speakAbortRef.current) {
      try { speakAbortRef.current.abort(); } catch { /* ignore */ }
      speakAbortRef.current = null;
    }
    handleRef.current?.disconnect();
    // The "disconnected" stateChange listener fires onDisconnect /
    // onSpeakingChange(false) — no need to dispatch them here.
  }, [recordingState, cleanupRecording]);

  const connectSession = useCallback(async () => {
    setErrorMessage(null);
    const handle = handleRef.current;
    if (!handle) {
      // Shouldn't happen — handleRef is set by the mount effect.
      // Defensive only; surfacing the message helps debug if it does.
      setErrorMessage("Avatar handle not initialized");
      return;
    }
    try {
      await handle.connect();
      onReadyRef.current?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to connect avatar";
      setErrorMessage(msg);
      // The handle's connect() already transitions state to "error"
      // before re-throwing; the listener above mirrors that into
      // local state. No need to setState("error") here.
    }
  }, []);

  // Track O5c-Lift — speak / streaming / fallback all moved into the
  // LiveAvatar handle (`src/lib/avatar/liveavatar.ts`). The component
  // now just calls `handleRef.current.speak(text, signal)` and lets
  // the handle own the streaming + fallback + abort + perf-mark
  // semantics. See the C2 commit (3e4048a) for the lifted code.
  const speakReply = useCallback(
    async (text: string): Promise<void> => {
      const handle = handleRef.current;
      if (!handle) return;

      // Pre-empt any in-flight speak the component owns, then create
      // a fresh controller for this one. The handle ALSO serializes
      // speaks internally; the external controller exists so the
      // component can cancel from interrupt() / unmount.
      speakAbortRef.current?.abort();
      const controller = new AbortController();
      speakAbortRef.current = controller;

      const result = await handle.speak(text, controller.signal);
      if (speakAbortRef.current === controller) speakAbortRef.current = null;

      // Don't surface stream_aborted to the parent — that's the
      // natural pre-emption case when a newer reply arrived.
      if (result.reason && result.reason !== "stream_aborted") {
        onSpeakErrorRef.current?.(result.reason);
      }
    },
    [],
  );

  // React to new replies. Track O5b — auto-interrupt if a prior reply
  // is still being spoken so the user hears the new reply immediately.
  // The handle's interrupt() sends agent.interrupt over the WS; speak()
  // then begins the next utterance. The handle internally serializes
  // speaks too (newer pre-empts older), so even without the explicit
  // interrupt() we'd get correct ordering — interrupt() just shortens
  // the gap.
  //
  // Track O5c-Lift removed: keepAlive useEffect — session.keep_alive
  // every 4 minutes now lives inside the handle, started in connect()
  // and cleared in disconnect(). Component no longer has WS access.
  useEffect(() => {
    if (
      lastReply &&
      lastReply !== lastSpokenRef.current &&
      (state === "connected" || state === "speaking") &&
      handleRef.current
    ) {
      lastSpokenRef.current = lastReply;

      if (state === "speaking") {
        handleRef.current.interrupt();
      }

      void speakReply(lastReply);
    }
  }, [lastReply, state, speakReply]);

  /* ─────────────────────────────────────────────────────────────────────────────
   * Recording Functions
   * ───────────────────────────────────────────────────────────────────────────── */

  /**
   * Start recording the avatar session
   * Combines video and audio streams from LiveKit into a single MediaRecorder
   * @returns Promise<boolean> - true if recording started successfully
   */
  const startRecording = useCallback(async (): Promise<boolean> => {
    // Validate prerequisites
    if (!isMediaRecorderSupported()) {
      console.error("[Recording] MediaRecorder not supported in this browser");
      setRecordingError("not_supported");
      setRecordingState("error");
      return false;
    }

    if (state !== "connected" && state !== "speaking") {
      console.error("[Recording] Cannot record - avatar not connected");
      setRecordingError("no_stream");
      setRecordingState("error");
      return false;
    }

    if (!videoRef.current) {
      console.error("[Recording] No video element available");
      setRecordingError("no_stream");
      setRecordingState("error");
      return false;
    }

    // Clean up any previous recording
    cleanupRecording();

    try {
      // Get the best supported MIME type
      const mimeType = getSupportedMimeType();
      if (!mimeType) {
        console.error("[Recording] No supported MIME type found");
        setRecordingError("not_supported");
        setRecordingState("error");
        return false;
      }

      // Capture video stream from the video element (use type assertion for captureStream)
      const videoStream = (videoRef.current as unknown as HTMLElementWithCaptureStream).captureStream();
      if (!videoStream || videoStream.getTracks().length === 0) {
        console.error("[Recording] Failed to capture video stream");
        setRecordingError("no_stream");
        setRecordingState("error");
        return false;
      }

      // Create combined stream with video tracks
      const combinedStream = new MediaStream();

      // Add video tracks
      videoStream.getVideoTracks().forEach(track => {
        combinedStream.addTrack(track);
      });

      // Try to capture audio from the audio element if available (use type assertion for captureStream)
      if (audioElementRef.current) {
        try {
          const audioStream = (audioElementRef.current as unknown as HTMLElementWithCaptureStream).captureStream();
          audioStream.getAudioTracks().forEach(track => {
            combinedStream.addTrack(track);
          });
          console.log("[Recording] Audio track added from audio element");
        } catch (audioErr) {
          console.warn("[Recording] Could not capture audio:", audioErr);
          // Continue without audio - video-only recording is better than nothing
        }
      } else {
        console.warn("[Recording] No audio element available - recording video only");
      }

      // Create MediaRecorder with optimal settings
      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
      });

      // Handle data available event
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      recorder.onstop = () => {
        console.log("[Recording] Recording stopped, processing chunks...");
        setRecordingState("processing");

        try {
          if (recordedChunksRef.current.length === 0) {
            console.error("[Recording] No data recorded");
            setRecordingError("encoding_failed");
            setRecordingState("error");
            return;
          }

          // Create blob from recorded chunks
          const blob = new Blob(recordedChunksRef.current, { type: mimeType });
          recordingBlobRef.current = blob;

          // Create downloadable URL
          recordingUrlRef.current = URL.createObjectURL(blob);

          console.log(`[Recording] Recording ready: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
          setRecordingState("ready");
        } catch (err) {
          console.error("[Recording] Failed to process recording:", err);
          setRecordingError("encoding_failed");
          setRecordingState("error");
        }
      };

      // Handle recording errors
      recorder.onerror = (event) => {
        console.error("[Recording] MediaRecorder error:", event);
        setRecordingError("encoding_failed");
        setRecordingState("error");
      };

      // Start recording with 1-second chunks for progressive saving
      recorder.start(1000);
      mediaRecorderRef.current = recorder;

      console.log(`[Recording] Started recording with MIME type: ${mimeType}`);
      setRecordingState("recording");
      setRecordingError(null);
      return true;
    } catch (err) {
      console.error("[Recording] Failed to start recording:", err);
      setRecordingError("unknown");
      setRecordingState("error");
      return false;
    }
  }, [state, cleanupRecording]);

  /**
   * Stop the current recording
   * The onstop handler will process chunks and create the downloadable blob
   */
  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current) {
      console.warn("[Recording] No active recorder to stop");
      return;
    }

    if (mediaRecorderRef.current.state === "inactive") {
      console.warn("[Recording] Recorder already stopped");
      return;
    }

    try {
      mediaRecorderRef.current.stop();
      console.log("[Recording] Stop requested");
    } catch (err) {
      console.error("[Recording] Error stopping recorder:", err);
      setRecordingError("unknown");
      setRecordingState("error");
    }
  }, []);

  /**
   * Download the recorded video file
   * @returns boolean - true if download was triggered
   */
  const downloadRecording = useCallback((): boolean => {
    if (recordingState !== "ready" || !recordingUrlRef.current || !recordingBlobRef.current) {
      console.warn("[Recording] No recording available to download");
      return false;
    }

    try {
      const filename = generateRecordingFilename(labels.recordingFilenamePrefix);
      const link = document.createElement("a");
      link.href = recordingUrlRef.current;
      link.download = filename;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log(`[Recording] Download triggered: ${filename}`);
      return true;
    } catch (err) {
      console.error("[Recording] Failed to trigger download:", err);
      return false;
    }
  }, [recordingState, labels.recordingFilenamePrefix]);

  // Expose control methods via ref
  useImperativeHandle(ref, () => ({
    // ── Connection controls (for hideOverlays mode) ──
    connect: connectSession,
    disconnect: disconnectSession,
    getState: () => state,

    // ── Playback controls ──
    interrupt: () => {
      // Track O5c-Lift — handle owns the ws.send. The "connected"
      // state transition + onSpeakingChange(false) come back to the
      // component via the handle's stateChange listener; no need to
      // dispatch them here directly.
      handleRef.current?.interrupt();
    },
    replayLast: () => {
      const lastMessage = lastSpokenRef.current;
      if (lastMessage && (state === "connected" || state === "speaking")) {
        // Clear-then-restore so the lastReply useEffect's dedupe check
        // doesn't block this manual re-fire.
        lastSpokenRef.current = "";
        lastSpokenRef.current = lastMessage;
        void speakReply(lastMessage);
      }
    },
    getLastReply: () => lastSpokenRef.current,

    // ── Recording controls ──
    startRecording,
    stopRecording,
    downloadRecording,
    clearRecording: cleanupRecording,
    getRecordingState: () => recordingState,
    getRecordingError: () => recordingError,
    isRecordingSupported: () => isMediaRecorderSupported(),
  }), [
    state,
    connectSession,
    disconnectSession,
    speakReply,
    startRecording,
    stopRecording,
    downloadRecording,
    cleanupRecording,
    recordingState,
    recordingError,
  ]);

  return (
    <div className="flex flex-col items-center gap-3" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      {/* Video container */}
      <div
        className="relative w-full overflow-hidden rounded-xl"
        style={{
          position: "relative",
          width: "100%",
          overflow: "hidden",
          borderRadius: 12,
          aspectRatio: "16/9",
          background: "rgba(10, 14, 26, 0.8)",
          border: `1px solid ${
            state === "speaking"
              ? "rgba(196, 169, 106, 0.4)"
              : state === "connected"
              ? "rgba(196, 169, 106, 0.2)"
              : "rgba(196, 169, 106, 0.1)"
          }`,
          transition: "border-color 0.3s ease",
        }}
      >
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          autoPlay
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: state === "connected" || state === "speaking" ? "block" : "none",
          }}
        />

        {/* Status overlays — hidden when parent provides custom UI via hideOverlays */}
        {!hideOverlays && state !== "connected" && state !== "speaking" && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            {state === "disconnected" && (
              <>
                <button
                  onClick={connectSession}
                  className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all hover:scale-105"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 20px",
                    borderRadius: 8,
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    background: "rgba(196, 169, 106, 0.15)",
                    border: "1px solid rgba(196, 169, 106, 0.3)",
                    color: "#C4A96A",
                    cursor: "pointer",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                  {labels.connectButton}
                </button>
                <p className="text-xs text-center px-4" style={{ fontSize: "0.75rem", textAlign: "center", padding: "0 16px", color: "var(--muted)" }}>
                  {labels.helpText}
                </p>
              </>
            )}

            {state === "connecting" && (
              <>
                <div
                  className="h-8 w-8 animate-spin rounded-full"
                  style={{
                    height: 32,
                    width: 32,
                    borderRadius: "50%",
                    border: "2px solid rgba(196, 169, 106, 0.2)",
                    borderTop: "2px solid #C4A96A",
                    animation: "olivia-spin 0.8s linear infinite",
                  }}
                />
                <p className="text-xs" style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                  {labels.connectingText}
                </p>
              </>
            )}

            {state === "error" && (
              <>
                <p className="text-sm text-center px-4" style={{ fontSize: "0.875rem", textAlign: "center", padding: "0 16px", color: "#f87171" }}>
                  {errorMessage || "Avatar connection failed"}
                </p>
                <button
                  onClick={connectSession}
                  className="rounded-lg px-4 py-2 text-sm font-medium transition-all"
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#f87171",
                    cursor: "pointer",
                  }}
                >
                  Try Again
                </button>
                <p className="text-xs px-4 text-center" style={{ fontSize: "0.75rem", padding: "0 16px", textAlign: "center", color: "var(--muted)" }}>
                  Chat and voice modes still work without video
                </p>
              </>
            )}
          </div>
        )}

        {/* Speaking indicator */}
        {state === "speaking" && (
          <div
            className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{
              position: "absolute",
              bottom: 8,
              left: 8,
              display: "flex",
              alignItems: "center",
              gap: 6,
              borderRadius: 999,
              padding: "4px 10px",
              background: "rgba(0, 0, 0, 0.6)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span
              className="h-2 w-2 rounded-full animate-pulse"
              style={{ height: 8, width: 8, borderRadius: "50%", background: "#C4A96A", animation: "olivia-pulse 1.5s ease-in-out infinite" }}
            />
            <span className="text-[10px] font-medium" style={{ fontSize: 10, fontWeight: 500, color: "#C4A96A" }}>
              {labels.speakingText}
            </span>
          </div>
        )}

        {/* Connected indicator */}
        {state === "connected" && (
          <div
            className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{
              position: "absolute",
              bottom: 8,
              left: 8,
              display: "flex",
              alignItems: "center",
              gap: 6,
              borderRadius: 999,
              padding: "4px 10px",
              background: "rgba(0, 0, 0, 0.6)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ height: 8, width: 8, borderRadius: "50%", background: "#4ADE80" }}
            />
            <span className="text-[10px] font-medium" style={{ fontSize: 10, fontWeight: 500, color: "var(--muted)" }}>
              Live — send a message
            </span>
          </div>
        )}

        {/* Disconnect button */}
        {(state === "connected" || state === "speaking") && (
          <button
            onClick={disconnectSession}
            className="absolute top-2 right-2 flex items-center gap-1 rounded-full px-2 py-1 transition-opacity hover:opacity-80"
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              display: "flex",
              alignItems: "center",
              gap: 4,
              borderRadius: 999,
              padding: "4px 8px",
              background: "rgba(0, 0, 0, 0.6)",
              backdropFilter: "blur(8px)",
              cursor: "pointer",
              border: "none",
            }}
            title="Disconnect avatar"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-[10px]" style={{ fontSize: 10, color: "#f87171" }}>End</span>
          </button>
        )}
      </div>
      {/* Tiny inline keyframes so spinner/pulse work without Tailwind */}
      <style>{`
        @keyframes olivia-spin { to { transform: rotate(360deg); } }
        @keyframes olivia-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
});
