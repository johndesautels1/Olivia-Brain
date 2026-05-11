"use client";

/**
 * StudioVoiceInput — Pulsing gold orb with Web Speech API dictation.
 *
 * Features:
 * - Gold pulsing gradient orb — click/tap to start/stop recording
 * - Web Speech API (SpeechRecognition) for live transcription
 * - Per-word confidence indicators: green (>80%), amber (50-79%), red (<50%)
 * - Waveform visualization ring around the orb during recording
 * - Interim transcript display (gray) + final transcript (white)
 * - Auto-stops after 5s silence
 * - Fires onTranscript with the final text when user stops or auto-stops
 * - Fires onDictationStateChange so parent can react to recording state
 *
 * Design spec:
 * - Orb: 64px circle, gold gradient, pulsing scale animation when active
 * - Waveform ring: 4px ring around orb, animates with audio
 * - Transcript: below orb, 13px, inline word-level confidence coloring
 * - Status label: 10px uppercase beneath orb
 */

import React, { useState, useCallback, useRef, useEffect } from "react";

// ── Types ────────────────────────────────────────────────────────────

export interface TranscriptWord {
  word: string;
  confidence: number;
  isFinal: boolean;
}

export interface VoiceTranscriptResult {
  text: string;
  words: TranscriptWord[];
  averageConfidence: number;
}

interface StudioVoiceInputProps {
  /** Called with final transcript when dictation ends */
  onTranscript: (result: VoiceTranscriptResult) => void;
  /** Called when dictation state changes (recording/idle) */
  onDictationStateChange?: (isRecording: boolean) => void;
  /** Whether voice input is disabled (e.g. during save) */
  disabled?: boolean;
  /** Compact mode — smaller orb for inline placement */
  compact?: boolean;
}

// ── Check browser support ────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSpeechRecognition(): any {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return SR || null;
}

// ── Confidence color helper ──────────────────────────────────────────

function confidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "#22c55e"; // green
  if (confidence >= 0.5) return "#eab308"; // amber
  return "#ef4444"; // red
}

// ── Waveform animation dots ──────────────────────────────────────────

function WaveformDots({ isActive }: { isActive: boolean }) {
  const dotCount = 5;
  return (
    <div className="flex items-center gap-0.5" style={{ height: "16px" }}>
      {Array.from({ length: dotCount }).map((_, i) => (
        <div
          key={i}
          className="rounded-full"
          style={{
            width: "3px",
            background: isActive ? "#C4A96A" : "rgba(255,255,255,0.1)",
            transition: "height 150ms ease, background 200ms ease",
            height: isActive ? `${6 + Math.sin(Date.now() / 200 + i * 1.2) * 6}px` : "3px",
            animation: isActive ? `studioWaveDot 0.6s ease-in-out ${i * 0.1}s infinite alternate` : "none",
          }}
        />
      ))}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export function StudioVoiceInput({
  onTranscript,
  onDictationStateChange,
  disabled = false,
  compact = false,
}: StudioVoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [finalWords, setFinalWords] = useState<TranscriptWord[]>([]);
  const [isSupported, setIsSupported] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const orbRef = useRef<HTMLButtonElement>(null);

  // Check browser support on mount
  useEffect(() => {
    if (!getSpeechRecognition()) {
      setIsSupported(false);
    }
  }, []);

  // Animate waveform dots while recording
  useEffect(() => {
    if (!isRecording) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    function tick() {
      // Force re-render for waveform animation
      orbRef.current?.style.setProperty(
        "--wave-phase",
        String(Date.now())
      );
      animFrameRef.current = requestAnimationFrame(tick);
    }
    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRecording]);

  // ── Stop recording and emit final result ────────────────────────────

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    setIsRecording(false);
    onDictationStateChange?.(false);
  }, [onDictationStateChange]);

  // ── Emit the transcript ─────────────────────────────────────────────

  const emitTranscript = useCallback(
    (words: TranscriptWord[]) => {
      if (words.length === 0) return;

      const text = words.map((w) => w.word).join(" ");
      const avgConf =
        words.reduce((sum, w) => sum + w.confidence, 0) / words.length;

      onTranscript({
        text,
        words,
        averageConfidence: Math.round(avgConf * 100) / 100,
      });
    },
    [onTranscript]
  );

  // ── Start recording ─────────────────────────────────────────────────

  const startRecording = useCallback(() => {
    const SRClass = getSpeechRecognition();
    if (!SRClass) {
      setErrorMsg("Voice input not supported in this browser");
      return;
    }

    setErrorMsg(null);
    setInterimText("");
    setFinalWords([]);

    const recognition = new SRClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-GB";
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;

    // Track accumulated final words across multiple result events
    let accumulatedWords: TranscriptWord[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      // Reset silence timer on every result
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        stopRecording();
      }, 5000);

      let interim = "";
      const newFinalWords: TranscriptWord[] = [];

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const alt = result[0];
        const transcript = alt.transcript.trim();
        const confidence = alt.confidence || 0.5;

        if (result.isFinal) {
          // Split into individual words with confidence
          const words = transcript.split(/\s+/).filter(Boolean);
          for (const w of words) {
            newFinalWords.push({ word: w, confidence, isFinal: true });
          }
        } else {
          interim += transcript + " ";
        }
      }

      if (newFinalWords.length > 0) {
        accumulatedWords = [...accumulatedWords, ...newFinalWords];
        setFinalWords([...accumulatedWords]);
      }

      setInterimText(interim.trim());
    };

    recognition.onend = () => {
      // Emit whatever we have when recognition ends
      if (accumulatedWords.length > 0) {
        emitTranscript(accumulatedWords);
      }

      setIsRecording(false);
      onDictationStateChange?.(false);
      setInterimText("");
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error === "no-speech") {
        // Auto-stop on no speech — not really an error
        stopRecording();
        return;
      }
      if (event.error === "aborted") return;

      console.error("[StudioVoiceInput] Recognition error:", event.error);
      setErrorMsg(
        event.error === "not-allowed"
          ? "Microphone access denied"
          : `Voice error: ${event.error}`
      );
      stopRecording();
    };

    recognition.start();
    setIsRecording(true);
    onDictationStateChange?.(true);

    // Auto-stop after 5s of silence
    silenceTimerRef.current = setTimeout(() => {
      stopRecording();
    }, 5000);
  }, [stopRecording, emitTranscript, onDictationStateChange]);

  // ── Toggle handler ─────────────────────────────────────────────────

  const handleToggle = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, stopRecording, startRecording]);

  // ── Cleanup on unmount ─────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  // ── Render ─────────────────────────────────────────────────────────

  const orbSize = compact ? 44 : 64;
  const ringSize = orbSize + 12;

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2">
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: `${orbSize}px`,
            height: `${orbSize}px`,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .97-.2 1.9-.54 2.73" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>
        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)" }}>
          Not supported
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Orb container with pulsing ring */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: `${ringSize}px`, height: `${ringSize}px` }}
      >
        {/* Animated ring (visible during recording) */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: isRecording
              ? "2px solid rgba(196, 169, 106, 0.4)"
              : "2px solid transparent",
            animation: isRecording ? "studioOrbPulseRing 1.5s ease-in-out infinite" : "none",
            transition: "border 300ms ease",
          }}
        />

        {/* The gold orb button */}
        <button
          ref={orbRef}
          onClick={handleToggle}
          disabled={disabled}
          className="relative rounded-full flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed"
          style={{
            width: `${orbSize}px`,
            height: `${orbSize}px`,
            background: isRecording
              ? "linear-gradient(135deg, #C4A96A 0%, #e8d5a3 50%, #C4A96A 100%)"
              : "linear-gradient(135deg, rgba(196, 169, 106, 0.15) 0%, rgba(196, 169, 106, 0.08) 100%)",
            border: isRecording
              ? "2px solid rgba(196, 169, 106, 0.8)"
              : "1px solid rgba(196, 169, 106, 0.2)",
            boxShadow: isRecording
              ? "0 0 24px rgba(196, 169, 106, 0.3), 0 0 48px rgba(196, 169, 106, 0.1)"
              : "none",
            animation: isRecording ? "studioOrbPulse 2s ease-in-out infinite" : "none",
            opacity: disabled ? 0.3 : 1,
          }}
          title={isRecording ? "Stop dictation" : "Start dictation"}
          aria-label={isRecording ? "Stop dictation" : "Start dictation"}
        >
          {/* Mic icon */}
          <svg
            width={compact ? 18 : 24}
            height={compact ? 18 : 24}
            viewBox="0 0 24 24"
            fill="none"
            stroke={isRecording ? "#0a0e1a" : "#C4A96A"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>
      </div>

      {/* Status label */}
      <div className="flex items-center gap-2">
        {isRecording && <WaveformDots isActive={isRecording} />}
        <span
          className="uppercase tracking-wide"
          style={{
            fontSize: "10px",
            color: isRecording ? "#C4A96A" : "rgba(255,255,255,0.25)",
            letterSpacing: "0.08em",
          }}
        >
          {isRecording ? "Listening..." : "Voice"}
        </span>
      </div>

      {/* Error message */}
      {errorMsg && (
        <span style={{ fontSize: "11px", color: "#f87171" }}>
          {errorMsg}
        </span>
      )}

      {/* Live transcript display */}
      {(finalWords.length > 0 || interimText) && (
        <div
          className="w-full max-w-md rounded-lg px-3 py-2"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Final words with confidence coloring */}
          <span style={{ fontSize: "13px", lineHeight: 1.6 }}>
            {finalWords.map((w, i) => (
              <span
                key={i}
                style={{
                  color: confidenceColor(w.confidence),
                  borderBottom:
                    w.confidence < 0.8
                      ? `1px dashed ${confidenceColor(w.confidence)}`
                      : "none",
                }}
                title={`Confidence: ${Math.round(w.confidence * 100)}%`}
              >
                {w.word}
                {i < finalWords.length - 1 || interimText ? " " : ""}
              </span>
            ))}

            {/* Interim (not yet finalized) */}
            {interimText && (
              <span style={{ color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
                {interimText}
              </span>
            )}
          </span>
        </div>
      )}

      {/* CSS keyframes for orb animations */}
      <style jsx>{`
        @keyframes studioOrbPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        @keyframes studioOrbPulseRing {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.15); opacity: 0.1; }
        }
        @keyframes studioWaveDot {
          0% { height: 3px; }
          100% { height: 14px; }
        }
      `}</style>
    </div>
  );
}
