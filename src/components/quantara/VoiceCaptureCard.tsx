"use client";

/**
 * `VoiceCaptureCard` — Q7 voice-mode entry point.
 *
 * Renders next to the Q3 auto-fill card in the IntakeSidebar. Clicking
 * "Speak to Olivia" requests microphone permission via
 * `navigator.mediaDevices.getUserMedia`, starts a `MediaRecorder`,
 * streams chunks while the founder talks, then on Stop:
 *
 *   1. POSTs the audio blob to `/api/voice/transcribe` (existing C3
 *      route) → transcript string.
 *   2. POSTs the transcript to `/api/founder-intake/voice-extract` (Q7
 *      route) → cascade-derived `QuantaraSuggestion[]`.
 *   3. Hands the suggestions to the parent so they merge into the
 *      existing IntakeForm suggestion map (same accept/reject flow as
 *      Q3 auto-fill).
 *
 * Graceful fallback: when `MediaRecorder` is unavailable (JSDOM,
 * older browsers, blocked permission), the button surfaces the
 * underlying error rather than failing silently.
 */

import { useCallback, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

import type { QuantaraValues } from "@/lib/quantara";
import type { QuantaraSuggestion } from "@/lib/quantara/auto-fill";

export type VoiceCaptureState =
  | { kind: "idle" }
  | { kind: "recording" }
  | { kind: "transcribing" }
  | { kind: "extracting" }
  | { kind: "ready"; transcript: string; suggestionCount: number }
  | { kind: "error"; message: string };

export interface VoiceCaptureCardProps {
  /** Current canonical Quantara values — passed to the extract endpoint
   *  so the cascade can skip already-filled fields. */
  values: QuantaraValues;
  /** Receive the cascade-derived suggestions when extraction completes. */
  onSuggestions: (suggestions: ReadonlyArray<QuantaraSuggestion>) => void;
}

const TRANSCRIBE_API = "/api/voice/transcribe";
const EXTRACT_API = "/api/founder-intake/voice-extract";

export function VoiceCaptureCard({
  values,
  onSuggestions,
}: VoiceCaptureCardProps) {
  const [state, setState] = useState<VoiceCaptureState>({ kind: "idle" });
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleStart = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("MediaRecorder" in window)) {
      setState({
        kind: "error",
        message: "Voice mode is not supported in this browser.",
      });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        /* Always release the mic — keeping it open after stop is the
           single most-reported voice-mode bug across audio apps. */
        for (const track of stream.getTracks()) {
          track.stop();
        }

        await runTranscribeAndExtract(blob, mimeType);
      };

      recorder.start();
      recorderRef.current = recorder;
      setState({ kind: "recording" });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Microphone permission denied or unavailable.";
      setState({ kind: "error", message });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  const handleStop = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    setState({ kind: "transcribing" });
    recorder.stop();
    recorderRef.current = null;
  }, []);

  const runTranscribeAndExtract = useCallback(
    async (blob: Blob, mimeType: string) => {
      const transcribeController = new AbortController();
      const transcribeTimeout = setTimeout(
        () => transcribeController.abort(),
        30_000,
      );
      try {
        const formData = new FormData();
        formData.append("audio", blob, `capture.${mimeFromExt(mimeType)}`);
        const transcribeRes = await fetch(TRANSCRIBE_API, {
          method: "POST",
          body: formData,
          signal: transcribeController.signal,
        });
        const transcribeData = (await transcribeRes.json()) as {
          success?: boolean;
          transcript?: string;
          error?: string;
          message?: string;
        };
        if (!transcribeRes.ok || !transcribeData.transcript) {
          const msg =
            transcribeData.message ??
            transcribeData.error ??
            `Transcription failed (HTTP ${transcribeRes.status}).`;
          setState({ kind: "error", message: msg });
          return;
        }
        const transcript = transcribeData.transcript;

        setState({ kind: "extracting" });

        const extractController = new AbortController();
        const extractTimeout = setTimeout(
          () => extractController.abort(),
          25_000,
        );
        try {
          const extractRes = await fetch(EXTRACT_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transcript, currentValues: values }),
            signal: extractController.signal,
          });
          const extractData = (await extractRes.json()) as {
            ok?: boolean;
            suggestions?: QuantaraSuggestion[];
            error?: string;
          };
          if (!extractRes.ok || !extractData.ok) {
            setState({
              kind: "error",
              message:
                extractData.error ??
                `Voice extraction failed (HTTP ${extractRes.status}).`,
            });
            return;
          }
          const suggestions = extractData.suggestions ?? [];
          onSuggestions(suggestions);
          setState({
            kind: "ready",
            transcript,
            suggestionCount: suggestions.length,
          });
        } finally {
          clearTimeout(extractTimeout);
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Network error during voice processing.";
        setState({ kind: "error", message });
      } finally {
        clearTimeout(transcribeTimeout);
      }
    },
    [values, onSuggestions],
  );

  const isBusy =
    state.kind === "transcribing" || state.kind === "extracting";
  const recording = state.kind === "recording";

  return (
    <section
      aria-label="Voice mode"
      style={{
        padding: 16,
        background: "var(--surface-1)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-2xs)",
          fontWeight: 600,
          color: "var(--fg-tertiary)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Voice mode
      </div>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-xs)",
          color: "var(--fg-secondary)",
          lineHeight: 1.45,
        }}
      >
        Speak naturally — Olivia transcribes, then proposes fields you can accept
        or reject inline.
      </div>

      <button
        type="button"
        onClick={recording ? handleStop : handleStart}
        disabled={isBusy}
        aria-pressed={recording}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "10px 14px",
          background: recording
            ? "var(--coral-down-mute)"
            : "var(--aether-mute)",
          border: `1px solid ${
            recording ? "var(--coral-down)" : "var(--border-aether)"
          }`,
          borderRadius: "var(--radius-md)",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          color: recording ? "var(--coral-down)" : "var(--aether-primary)",
          cursor: isBusy ? "not-allowed" : "pointer",
          opacity: isBusy ? 0.6 : 1,
          touchAction: "manipulation",
          transition:
            "background var(--duration-default) var(--ease-out-quart), color var(--duration-default) var(--ease-out-quart)",
        }}
      >
        {recording ? (
          <>
            <Square size={14} strokeWidth={2.4} />
            Stop &amp; transcribe
          </>
        ) : (
          <>
            <Mic size={14} strokeWidth={2} />
            {state.kind === "transcribing"
              ? "Transcribing…"
              : state.kind === "extracting"
                ? "Extracting…"
                : "Speak to Olivia"}
          </>
        )}
      </button>

      {state.kind === "ready" && (
        <div
          role="status"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-xs)",
            color: "var(--mint-up)",
            lineHeight: 1.4,
          }}
        >
          Olivia heard {wordCount(state.transcript)} words and surfaced{" "}
          {state.suggestionCount}{" "}
          {state.suggestionCount === 1 ? "suggestion" : "suggestions"}. Review
          and accept inline.
        </div>
      )}
      {state.kind === "error" && (
        <div
          role="alert"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-xs)",
            color: "var(--coral-down)",
            lineHeight: 1.4,
          }}
        >
          {state.message}
        </div>
      )}
    </section>
  );
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

function mimeFromExt(mimeType: string): string {
  const map: Record<string, string> = {
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mp4": "m4a",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
  };
  return map[mimeType] ?? "webm";
}
