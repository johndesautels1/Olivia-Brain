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
import { Room, RoomEvent, Track, RemoteTrackPublication } from "livekit-client";

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

/** Avatar connection state — exported for parent components using hideOverlays */
export type AvatarState = "disconnected" | "connecting" | "connected" | "speaking" | "error";

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
 * Generate a timestamped filename for the recording
 */
function generateRecordingFilename(): string {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);
  return `olivia-session-${timestamp}.webm`;
}

/**
 * Track O5a — Streaming pre-roll helpers.
 *
 * Encode a PCM chunk to base64 in 32KB sub-batches so we don't blow the
 * call-stack of `String.fromCharCode.apply` (it has a per-arity ceiling
 * around 65,535 args in V8 / WebKit). Joining `parts` once at the end
 * is faster than O(n) string concatenation.
 */
function uint8ToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  const parts: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const slice = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
    // `apply` accepts array-likes; Uint8Array qualifies. Cast to number[]
    // to satisfy TS's stricter overload signature.
    parts.push(String.fromCharCode.apply(null, slice as unknown as number[]));
  }
  return btoa(parts.join(""));
}

/**
 * Track O5a — pre-roll chunk thresholds.
 *
 * PCM 16-bit 24 kHz = 48 bytes/ms. We send the first chunk as soon as
 * we have ~125 ms of audio (so the avatar's mouth starts moving fast),
 * then ~250 ms thereafter (smooth, well below the per-message 1 MB cap
 * that LiveAvatar LITE Mode enforces — see docs/HEYGEN_LTM_CONFIG.md).
 */
const FIRST_CHUNK_BYTES = 6_000;
const TARGET_CHUNK_BYTES = 12_000;

/** Mark a perf event if the API is present. Skipped silently in SSR. */
function markPerf(name: string): void {
  if (typeof performance !== "undefined" && typeof performance.mark === "function") {
    try {
      performance.mark(name);
    } catch {
      // Ignore — duplicates or invalid names just no-op.
    }
  }
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
}, ref) {
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
  const roomRef = useRef<Room | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const lastSpokenRef = useRef<string>("");
  const sessionIdRef = useRef<string>("");

  // ── Refs for recording ──
  const audioElementRef = useRef<HTMLMediaElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingBlobRef = useRef<Blob | null>(null);
  const recordingUrlRef = useRef<string | null>(null);

  // Build auth headers (pre-Clerk Bearer token, optional)
  const authHeaders = useCallback((): HeadersInit => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (adminKey) {
      headers["Authorization"] = `Bearer ${adminKey}`;
    }
    return headers;
  }, [adminKey]);

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

  const disconnectSession = useCallback(() => {
    // Clean up recording state machine properly when disconnecting
    // Only cleanup if actively recording - preserve ready recordings
    if (recordingState === "recording" || recordingState === "processing") {
      cleanupRecording();
    }

    if (wsRef.current) {
      try { wsRef.current.close(); } catch { /* ignore */ }
      wsRef.current = null;
    }
    if (roomRef.current) {
      try { roomRef.current.disconnect(); } catch { /* ignore */ }
      roomRef.current = null;
    }

    // Clear audio element reference
    audioElementRef.current = null;

    sessionIdRef.current = "";
    setState("disconnected");
    onSpeakingChange?.(false);
    onDisconnect?.();
  }, [onSpeakingChange, onDisconnect, recordingState, cleanupRecording, setState]);

  const connectSession = useCallback(async () => {
    setState("connecting");
    setErrorMessage(null);

    try {
      // 1. Create LiveAvatar session via our API
      const res = await fetch("/api/olivia/liveavatar", {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();

      if (!res.ok || !data.livekitUrl || !data.livekitToken) {
        throw new Error(data.error || "Failed to create avatar session");
      }

      sessionIdRef.current = data.sessionId;

      // 2. Connect to LiveKit room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      room.on(RoomEvent.TrackSubscribed, (track, publication: RemoteTrackPublication) => {
        if (track.kind === Track.Kind.Video && videoRef.current) {
          track.attach(videoRef.current);
        }
        if (track.kind === Track.Kind.Audio) {
          const audioEl = track.attach();
          audioEl.volume = 1.0;
          // Store reference for recording - we need this to capture audio
          audioElementRef.current = audioEl;
        }
        // Suppress unused variable warning
        void publication;
      });

      room.on(RoomEvent.Disconnected, () => {
        setState("disconnected");
        onSpeakingChange?.(false);
      });

      await room.connect(data.livekitUrl, data.livekitToken);
      roomRef.current = room;

      // 3. Connect WebSocket for avatar commands (if URL provided)
      if (data.websocketUrl) {
        const ws = new WebSocket(data.websocketUrl);
        ws.onopen = () => {
          console.log("[LiveAvatar] WebSocket connected");
        };
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "agent.speak_started") {
              setState("speaking");
              onSpeakingChange?.(true);
            } else if (msg.type === "agent.speak_ended") {
              setState("connected");
              onSpeakingChange?.(false);
            } else if (msg.type === "session.state_updated" && msg.state === "closed") {
              disconnectSession();
            }
          } catch { /* ignore malformed */ }
        };
        ws.onerror = () => {
          console.error("[LiveAvatar] WebSocket error");
        };
        wsRef.current = ws;
      }

      setState("connected");
      onReady?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to connect avatar";
      setErrorMessage(msg);
      setState("error");
    }
  }, [onReady, onSpeakingChange, disconnectSession, setState, authHeaders]);

  /**
   * Track O5a — streaming pre-roll path.
   *
   * Returns true if we successfully streamed all chunks and emitted
   * `agent.speak_end`. Returns false on any failure (network error,
   * server fallback JSON, ws closed mid-stream) so the caller can fall
   * back to the non-streaming `/speak` path. Never throws.
   *
   * Performance marks (read via `performance.getEntriesByName(...)`):
   *   olivia-speak-start          — fetch initiated
   *   olivia-speak-first-byte     — first PCM byte arrived from server
   *   olivia-speak-first-chunk    — first `agent.speak` ws message sent
   *   olivia-speak-done           — speak_end sent
   * Plus the existing `agent.speak_started` ws event from LiveAvatar
   * marks the moment lip-sync actually begins. Together they isolate
   * which segment of the pipeline owns each ms of latency.
   */
  const speakReplyStreaming = useCallback(
    async (text: string): Promise<boolean> => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return false;

      markPerf("olivia-speak-start");

      let res: Response;
      try {
        res = await fetch("/api/olivia/liveavatar/speak-stream", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ text: text.slice(0, 5000) }),
        });
      } catch (err) {
        console.warn("[LiveAvatar] speak-stream fetch failed:", err);
        return false;
      }

      if (!res.ok) return false;

      // Distinguish a real PCM stream from the JSON fallback the server
      // returns when ElevenLabs is unconfigured / errored before bytes
      // streamed. Header is more reliable than Content-Type because some
      // proxies normalize the latter.
      if (res.headers.get("X-Olivia-Audio-Format") !== "pcm_24000") {
        return false;
      }

      if (!res.body) return false;

      const reader = res.body.getReader();
      let buffer = new Uint8Array(0);
      let firstChunkSent = false;
      let firstByteSeen = false;

      const appendToBuffer = (chunk: Uint8Array): void => {
        const merged = new Uint8Array(buffer.length + chunk.length);
        merged.set(buffer, 0);
        merged.set(chunk, buffer.length);
        buffer = merged;
      };

      const flushChunk = (chunk: Uint8Array): boolean => {
        if (ws.readyState !== WebSocket.OPEN) return false;
        ws.send(
          JSON.stringify({
            type: "agent.speak",
            audio: uint8ToBase64(chunk),
          }),
        );
        if (!firstChunkSent) {
          firstChunkSent = true;
          markPerf("olivia-speak-first-chunk");
        }
        return true;
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value || value.length === 0) continue;

          if (!firstByteSeen) {
            firstByteSeen = true;
            markPerf("olivia-speak-first-byte");
          }

          appendToBuffer(value);

          const target = firstChunkSent ? TARGET_CHUNK_BYTES : FIRST_CHUNK_BYTES;
          while (buffer.length >= target) {
            const chunk = buffer.slice(0, target);
            buffer = buffer.slice(target);
            if (!flushChunk(chunk)) return false;
          }
        }

        if (buffer.length > 0) {
          if (!flushChunk(buffer)) return false;
          buffer = new Uint8Array(0);
        }

        if (ws.readyState !== WebSocket.OPEN) return false;

        // Signal end of utterance so LiveAvatar settles the mouth back
        // to neutral instead of holding the last viseme open. Per LITE
        // Mode protocol (HEYGEN_LTM_CONFIG.md §4 — Pinned WS format).
        ws.send(
          JSON.stringify({
            type: "agent.speak_end",
            event_id: `spk_${Date.now()}`,
          }),
        );
        markPerf("olivia-speak-done");
        return true;
      } catch (err) {
        console.warn("[LiveAvatar] speak-stream interrupted:", err);
        // Don't try to recover the partial utterance — let LiveAvatar's
        // own server-side timeout settle the mouth. Caller decides
        // whether to retry via the fallback path; for a partial mid-
        // stream failure that would mean speaking the same text twice.
        return false;
      }
    },
    [authHeaders],
  );

  /**
   * Track O5a — non-streaming fallback path. Original /speak shape:
   * server buffers full PCM, returns base64 JSON, client sends one
   * `agent.speak` message. Slower TTFM but doesn't depend on the
   * streaming response surviving end-to-end.
   */
  const speakReplyFallback = useCallback(
    async (text: string): Promise<void> => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      try {
        const res = await fetch("/api/olivia/liveavatar/speak", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ text: text.slice(0, 5000) }),
        });
        const data = await res.json();

        if (data.fallback || !data.audio) return;

        ws.send(
          JSON.stringify({
            type: "agent.speak",
            audio: data.audio,
          }),
        );
      } catch (err) {
        console.error("[LiveAvatar] speak fallback error:", err);
      }
    },
    [authHeaders],
  );

  // Send TTS audio when new reply arrives. Try the streaming path first
  // (Track O5a — pre-roll for ~8-40× faster time-to-first-mouth-movement);
  // only invoke the non-streaming fallback if the stream path declines
  // (server fallback JSON, network error, ws-not-open).
  const speakReply = useCallback(
    async (text: string): Promise<void> => {
      const streamed = await speakReplyStreaming(text);
      if (!streamed) {
        await speakReplyFallback(text);
      }
    },
    [speakReplyStreaming, speakReplyFallback],
  );

  // React to new replies. Track O5b — if a prior reply is still being
  // spoken when a new one arrives, send `agent.interrupt` to clear the
  // queue so the user hears the new reply right away instead of waiting
  // for the old one to finish. (LITE Mode otherwise queues utterances.)
  useEffect(() => {
    if (
      lastReply &&
      lastReply !== lastSpokenRef.current &&
      (state === "connected" || state === "speaking")
    ) {
      lastSpokenRef.current = lastReply;

      if (state === "speaking" && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "agent.interrupt",
            event_id: `int_${Date.now()}`,
          }),
        );
      }

      speakReply(lastReply);
    }
  }, [lastReply, state, speakReply]);

  // Keep session alive
  useEffect(() => {
    if (state !== "connected" && state !== "speaking") return;

    const keepAlive = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "session.keep_alive",
          event_id: `ka_${Date.now()}`,
        }));
      }
    }, 4 * 60 * 1000); // Every 4 minutes (session closes after 5 min idle)

    return () => clearInterval(keepAlive);
  }, [state]);

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
      const filename = generateRecordingFilename();
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
  }, [recordingState]);

  // Expose control methods via ref
  useImperativeHandle(ref, () => ({
    // ── Connection controls (for hideOverlays mode) ──
    connect: connectSession,
    disconnect: disconnectSession,
    getState: () => state,

    // ── Playback controls ──
    interrupt: () => {
      // Send interrupt command to stop current speech
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "agent.interrupt",
          event_id: `int_${Date.now()}`,
        }));
        setState("connected");
        onSpeakingChange?.(false);
      }
    },
    replayLast: () => {
      // Replay the last spoken message
      const lastMessage = lastSpokenRef.current;
      if (lastMessage && (state === "connected" || state === "speaking")) {
        // Clear the ref so the useEffect doesn't block it
        lastSpokenRef.current = "";
        // Re-set it and trigger speak
        lastSpokenRef.current = lastMessage;
        speakReply(lastMessage);
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
    onSpeakingChange,
    startRecording,
    stopRecording,
    downloadRecording,
    cleanupRecording,
    recordingState,
    recordingError,
    setState,
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
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                  Start Live Avatar
                </button>
                <p className="text-xs text-center px-4" style={{ fontSize: "0.75rem", textAlign: "center", padding: "0 16px", color: "var(--muted)" }}>
                  Connect to see Olivia respond in real-time
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
                  Connecting to Olivia&apos;s avatar...
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
              Olivia is speaking
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
