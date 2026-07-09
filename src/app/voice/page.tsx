"use client";

/**
 * `/voice` — Olivia voice mode (Track E Session 17).
 *
 * Pi-style minimalism: dark canvas, single 240px breathing orb at the
 * optical centre, mic toggle, no chrome. Esc returns to `/`. Space
 * also toggles the mic (matches the footer hint).
 *
 * S17 wires the full STT → chat → TTS chain end-to-end:
 *
 *   1. Mic press → `MediaRecorder.start()` → orb state = "listening"
 *   2. Mic press again → `MediaRecorder.stop()` → orb state = "thinking"
 *   3. `dataavailable` collects chunks; `stop` POSTs the blob to
 *      `/api/voice/transcribe` (Deepgram primary / Whisper fallback)
 *   4. Transcript → `/api/olivia/chat` (9-model cascade) → reply
 *   5. Reply → `/api/voice/synthesize` (ElevenLabs / OpenAI TTS) →
 *      base64 audio → HTMLAudioElement → orb state = "speaking"
 *   6. Audio `ended` → orb state = "idle", reply persists as quote
 *
 * Each stage degrades gracefully:
 *   - No `MediaRecorder` support → friendly error, mic disabled
 *   - STT not configured (503) → show error, fall through to "idle"
 *   - Chat error → show error, fall through
 *   - TTS not configured → still surface the text reply (no audio)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AvatarOrb, type AvatarOrbState } from "@/components/primitives";

type Stage = "idle" | "listening" | "thinking" | "speaking" | "error";

const STAGE_TO_ORB: Record<Stage, AvatarOrbState> = {
  idle: "idle",
  listening: "listening",
  thinking: "thinking",
  speaking: "speaking",
  error: "error",
};

const STAGE_CAPTION: Record<Stage, string> = {
  idle: "Tap the mic to begin",
  listening: "Listening — speak",
  thinking: "Thinking…",
  speaking: "Olivia speaking",
  error: "Something went wrong",
};

interface VoiceError {
  stage: Stage;
  message: string;
}

export default function VoicePage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [reply, setReply] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<VoiceError | null>(null);
  const [supported, setSupported] = useState(true);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /* Detect browser support up front. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setSupported(false);
    }
  }, []);

  /* Cleanup on unmount — stop mic + free stream + abort audio. */
  useEffect(() => {
    return () => {
      try {
        recorderRef.current?.stop();
      } catch {
        /* ignore */
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioRef.current?.pause();
    };
  }, []);

  const playReplyAudio = useCallback(
    async (text: string) => {
      try {
        const res = await fetch("/api/voice/synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, personaId: "olivia" }),
        });
        if (!res.ok) {
          /* TTS not configured / failed — leave text on screen, settle. */
          setStage("idle");
          return;
        }
        const data = (await res.json()) as {
          audio?: string;
          mimeType?: string;
        };
        if (!data.audio) {
          setStage("idle");
          return;
        }
        const audio = new Audio(`data:${data.mimeType ?? "audio/mpeg"};base64,${data.audio}`);
        audioRef.current = audio;
        audio.onended = () => setStage("idle");
        audio.onerror = () => setStage("idle");
        setStage("speaking");
        await audio.play();
      } catch {
        setStage("idle");
      }
    },
    [],
  );

  const sendToChat = useCallback(
    async (text: string) => {
      try {
        setTranscript(text);
        setStage("thinking");
        const res = await fetch("/api/olivia/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, pageContext: "/voice" }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { reply?: string };
        const replyText = data.reply ?? "(no reply)";
        setReply(replyText);
        await playReplyAudio(replyText);
      } catch (err) {
        setError({
          stage: "thinking",
          message: err instanceof Error ? err.message : "Chat failed",
        });
        setStage("error");
        window.setTimeout(() => setStage("idle"), 1800);
      }
    },
    [playReplyAudio],
  );

  const sendBlobToTranscribe = useCallback(
    async (blob: Blob) => {
      try {
        const fd = new FormData();
        fd.append("audio", blob, "speech.webm");
        const res = await fetch("/api/voice/transcribe", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          if (res.status === 503) {
            setError({
              stage: "thinking",
              message: "STT not configured — set DEEPGRAM_API_KEY or OPENAI_API_KEY",
            });
            setStage("error");
            window.setTimeout(() => setStage("idle"), 2500);
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as {
          success?: boolean;
          transcript?: string;
        };
        const text = data.transcript?.trim();
        if (!text) {
          setError({ stage: "thinking", message: "No speech detected" });
          setStage("error");
          window.setTimeout(() => setStage("idle"), 1500);
          return;
        }
        await sendToChat(text);
      } catch (err) {
        setError({
          stage: "thinking",
          message: err instanceof Error ? err.message : "Transcription failed",
        });
        setStage("error");
        window.setTimeout(() => setStage("idle"), 1800);
      }
    },
    [sendToChat],
  );

  const startListening = useCallback(async () => {
    if (!supported) return;
    setError(null);
    setReply(null);
    setTranscript(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      /* Pick a mime type the browser can record. */
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        if (blob.size === 0) {
          setStage("idle");
          return;
        }
        void sendBlobToTranscribe(blob);
      };

      recorder.start();
      setStage("listening");
    } catch (err) {
      setError({
        stage: "listening",
        message:
          err instanceof Error && err.name === "NotAllowedError"
            ? "Microphone permission denied — check browser settings"
            : err instanceof Error
              ? err.message
              : "Could not start recording",
      });
      setStage("error");
      window.setTimeout(() => setStage("idle"), 2500);
    }
  }, [supported, sendBlobToTranscribe]);

  const stopListening = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (recorder.state !== "inactive") {
      recorder.stop();
      setStage("thinking");
    }
    recorderRef.current = null;
  }, []);

  const handleMic = useCallback(() => {
    if (stage === "listening") {
      stopListening();
    } else if (stage === "idle" || stage === "error") {
      void startListening();
    }
    /* "thinking" or "speaking" — do nothing, wait for chain to settle. */
  }, [stage, startListening, stopListening]);

  /* Esc returns home; Space toggles the mic. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        router.push("/");
      } else if (e.key === " " || e.code === "Space") {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
        e.preventDefault();
        handleMic();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, handleMic]);

  const orbState: AvatarOrbState = STAGE_TO_ORB[stage];
  const captionText = STAGE_CAPTION[stage];
  const captionColor =
    stage === "listening"
      ? "var(--aether-primary)"
      : stage === "thinking"
        ? "var(--aurum-primary)"
        : stage === "speaking"
          ? "var(--aurum-soft)"
          : stage === "error"
            ? "var(--coral-down)"
            : "var(--fg-tertiary)";

  return (
    <main
      style={{
        minHeight: "100dvh",
        background:
          "radial-gradient(circle at 50% 35%, var(--canvas-recess) 0%, var(--canvas-base) 70%)",
        color: "var(--fg-primary)",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        position: "relative",
      }}
    >
      <header
        style={{
          padding: "24px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--aurum-primary)",
          }}
        >
          Voice mode · Olivia
        </span>
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label="Close voice mode"
          style={{
            padding: "6px 12px",
            background: "var(--canvas-recess)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            color: "var(--fg-tertiary)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Esc · Close
        </button>
      </header>

      <section
        style={{
          display: "grid",
          placeItems: "center",
          gap: 32,
          padding: 32,
        }}
      >
        <AvatarOrb size={240} state={orbState} label="Olivia voice mode" />

        <div style={{ display: "grid", placeItems: "center", gap: 12 }}>
          <span
            aria-live="polite"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: captionColor,
            }}
          >
            {captionText}
          </span>
          {transcript && (
            <p
              style={{
                margin: 0,
                maxWidth: 640,
                color: "var(--fg-tertiary)",
                fontSize: "var(--text-sm)",
                textAlign: "center",
                fontStyle: "italic",
              }}
            >
              You said: &quot;{transcript}&quot;
            </p>
          )}
          {reply && (
            <blockquote
              style={{
                margin: 0,
                maxWidth: 640,
                padding: "14px 18px",
                borderRadius: "var(--radius-lg)",
                background: "var(--canvas-recess)",
                borderLeft: "2px solid var(--aurum-primary)",
                color: "var(--fg-primary)",
                fontSize: "var(--text-md)",
                lineHeight: 1.55,
                fontStyle: "italic",
                textAlign: "left",
                boxShadow: "0 30px 80px rgba(0,0,0,0.32)",
              }}
            >
              {reply}
            </blockquote>
          )}
          {error && (
            <p
              role="alert"
              style={{
                margin: 0,
                maxWidth: 640,
                color: "var(--coral-down)",
                fontSize: "var(--text-2xs)",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                textAlign: "center",
              }}
            >
              {error.message}
            </p>
          )}
          {!supported && (
            <p
              role="alert"
              style={{
                margin: 0,
                maxWidth: 640,
                color: "var(--coral-down)",
                fontSize: "var(--text-sm)",
                textAlign: "center",
              }}
            >
              Your browser doesn&apos;t support MediaRecorder. Voice mode requires
              Chrome / Edge / Safari 14.1+.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleMic}
          disabled={!supported || stage === "thinking" || stage === "speaking"}
          aria-pressed={stage === "listening"}
          aria-label={stage === "listening" ? "Stop listening" : "Start listening"}
          style={{
            width: 88,
            height: 88,
            borderRadius: "var(--radius-full)",
            background:
              stage === "listening"
                ? "linear-gradient(135deg, var(--aether-primary), var(--aurum-primary))"
                : stage === "thinking"
                  ? "linear-gradient(135deg, var(--surface-2), var(--surface-3))"
                  : "linear-gradient(135deg, var(--aurum-primary), var(--aurum-soft))",
            color:
              stage === "thinking" ? "var(--fg-tertiary)" : "var(--fg-on-accent)",
            border: "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            cursor:
              !supported || stage === "thinking" || stage === "speaking"
                ? "not-allowed"
                : "pointer",
            opacity: !supported ? 0.45 : 1,
            boxShadow:
              "0 30px 80px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255,255,255,0.15)",
            transition:
              "background var(--duration-default) var(--ease-out-quart), transform var(--duration-micro) var(--ease-out-quart)",
          }}
        >
          {stage === "listening" ? "■" : stage === "thinking" ? "…" : "●"}
        </button>
      </section>

      <footer
        style={{
          padding: "20px 32px",
          textAlign: "center",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-2xs)",
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: "var(--fg-tertiary)",
        }}
      >
        Press space to toggle · Esc to close · ⌘K from any surface
      </footer>
    </main>
  );
}
