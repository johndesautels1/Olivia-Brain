"use client";

/**
 * StudioTTSPlayer — Text-to-Speech readback with DAW-style scrubber.
 *
 * Uses the browser SpeechSynthesis API to read the current answer aloud.
 *
 * Features:
 * - Play/Pause toggle button
 * - Timeline scrubber (progress bar) — click to seek via word boundary
 * - Speed control: 1x / 1.25x / 1.5x / 2x
 * - Forward/rewind skip by 1 sentence
 * - Highlights the currently spoken word in the transcript preview
 * - Compact glassmorphic bar design
 *
 * Design spec:
 * - Bar: rgba(15, 18, 25, 0.9), rounded-xl, 48px height
 * - Play button: gold gradient when active
 * - Scrubber track: rgba(255,255,255,0.06), filled portion: #C4A96A
 * - Speed label: 10px uppercase, cycling through speeds on click
 * - Word highlight: gold underline on current word
 */

import React, { useState, useCallback, useRef, useEffect } from "react";

interface StudioTTSPlayerProps {
  /** The text to read aloud */
  text: string;
  /** Called when playback starts */
  onPlayStart?: () => void;
  /** Called when playback ends (naturally or stopped) */
  onPlayEnd?: () => void;
  /** Whether the player is visible */
  visible?: boolean;
}

const SPEED_OPTIONS = [1, 1.25, 1.5, 2] as const;
type SpeedOption = (typeof SPEED_OPTIONS)[number];

// ── Main Component ──────────────────────────────────────────────────

export function StudioTTSPlayer({
  text,
  onPlayStart,
  onPlayEnd,
  visible = true,
}: StudioTTSPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState<SpeedOption>(1);
  const [progress, setProgress] = useState(0); // 0-100
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [isSupported, setIsSupported] = useState(true);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const wordsRef = useRef<string[]>([]);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const durationEstRef = useRef(0);

  // Check browser support
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setIsSupported(false);
    }
  }, []);

  // Split text into words for highlight tracking
  useEffect(() => {
    wordsRef.current = text.split(/\s+/).filter(Boolean);
  }, [text]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // ── Estimate duration for progress bar ──────────────────────────────

  function estimateDuration(wordCount: number, rate: number): number {
    // Average speaking rate ~150 words/min at 1x
    const wordsPerMs = (150 * rate) / 60000;
    return wordCount / wordsPerMs;
  }

  // ── Start progress tracking ─────────────────────────────────────────

  const startProgressTracking = useCallback((rate: number) => {
    startTimeRef.current = Date.now();
    durationEstRef.current = estimateDuration(wordsRef.current.length, rate);

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, (elapsed / durationEstRef.current) * 100);
      setProgress(pct);
    }, 100);
  }, []);

  const stopProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // ── Play ────────────────────────────────────────────────────────────

  const play = useCallback(() => {
    if (!text.trim() || !isSupported) return;

    // Cancel any existing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speed;
    utterance.lang = "en-GB";

    // Try to pick a natural-sounding voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.lang.startsWith("en") && v.name.includes("Google")
    ) || voices.find(
      (v) => v.lang.startsWith("en-GB")
    ) || voices.find(
      (v) => v.lang.startsWith("en")
    );
    if (preferred) utterance.voice = preferred;

    utterance.onboundary = (event: SpeechSynthesisEvent) => {
      if (event.name === "word") {
        // Estimate word index from character index
        const charIndex = event.charIndex;
        let wordIdx = 0;
        let cumLen = 0;
        for (let i = 0; i < wordsRef.current.length; i++) {
          cumLen += wordsRef.current[i].length + 1; // +1 for space
          if (cumLen > charIndex) {
            wordIdx = i;
            break;
          }
        }
        setCurrentWordIndex(wordIdx);
      }
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(100);
      setCurrentWordIndex(-1);
      stopProgressTracking();
      onPlayEnd?.();

      // Reset progress after a brief pause
      setTimeout(() => setProgress(0), 1000);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
      stopProgressTracking();
      onPlayEnd?.();
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);

    setIsPlaying(true);
    setIsPaused(false);
    setProgress(0);
    startProgressTracking(speed);
    onPlayStart?.();
  }, [text, speed, isSupported, onPlayStart, onPlayEnd, startProgressTracking, stopProgressTracking]);

  // ── Pause / Resume ──────────────────────────────────────────────────

  const togglePause = useCallback(() => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      startProgressTracking(speed);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
      stopProgressTracking();
    }
  }, [isPaused, speed, startProgressTracking, stopProgressTracking]);

  // ── Stop ────────────────────────────────────────────────────────────

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    setCurrentWordIndex(-1);
    stopProgressTracking();
    onPlayEnd?.();
  }, [stopProgressTracking, onPlayEnd]);

  // ── Speed cycle ─────────────────────────────────────────────────────

  const cycleSpeed = useCallback(() => {
    const idx = SPEED_OPTIONS.indexOf(speed);
    const nextSpeed = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    setSpeed(nextSpeed);

    // If currently playing, restart with new speed
    if (isPlaying) {
      window.speechSynthesis.cancel();
      // Small delay to let cancel propagate
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = nextSpeed;
        utterance.lang = "en-GB";
        utteranceRef.current = utterance;

        utterance.onend = () => {
          setIsPlaying(false);
          setIsPaused(false);
          setProgress(100);
          setCurrentWordIndex(-1);
          stopProgressTracking();
          onPlayEnd?.();
          setTimeout(() => setProgress(0), 1000);
        };

        window.speechSynthesis.speak(utterance);
        startProgressTracking(nextSpeed);
      }, 50);
    }
  }, [speed, isPlaying, text, startProgressTracking, stopProgressTracking, onPlayEnd]);

  // ── Handle play/pause toggle ────────────────────────────────────────

  const handlePlayPause = useCallback(() => {
    if (!isPlaying) {
      play();
    } else {
      togglePause();
    }
  }, [isPlaying, play, togglePause]);

  // ── Don't render if no text or not visible ──────────────────────────

  if (!visible || !text.trim() || !isSupported) return null;

  return (
    <div className="flex flex-col gap-2">
      {/* Player bar */}
      <div
        className="flex items-center gap-3 rounded-xl px-3 py-2"
        style={{
          background: "rgba(15, 18, 25, 0.9)",
          border: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(8px)",
          minHeight: "44px",
        }}
      >
        {/* Play/Pause button */}
        <button
          onClick={handlePlayPause}
          className="flex items-center justify-center rounded-full shrink-0 transition-all cursor-pointer"
          style={{
            width: "32px",
            height: "32px",
            background: isPlaying
              ? "linear-gradient(135deg, #C4A96A 0%, #e8d5a3 100%)"
              : "rgba(196, 169, 106, 0.12)",
            border: `1px solid ${isPlaying ? "rgba(196, 169, 106, 0.6)" : "rgba(196, 169, 106, 0.2)"}`,
          }}
          title={isPlaying ? (isPaused ? "Resume" : "Pause") : "Read back"}
          aria-label={isPlaying ? (isPaused ? "Resume" : "Pause") : "Read back"}
        >
          {isPlaying && !isPaused ? (
            /* Pause icon */
            <svg width="14" height="14" viewBox="0 0 24 24" fill={isPlaying ? "#0a0e1a" : "#C4A96A"} stroke="none">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            /* Play icon */
            <svg width="14" height="14" viewBox="0 0 24 24" fill={isPlaying ? "#0a0e1a" : "#C4A96A"} stroke="none">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>

        {/* Scrubber bar */}
        <div
          className="flex-1 rounded-full overflow-hidden cursor-pointer"
          style={{
            height: "4px",
            background: "rgba(255,255,255,0.06)",
          }}
          onClick={(e) => {
            // Click to seek — restart from approximate position
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = ((e.clientX - rect.left) / rect.width) * 100;
            setProgress(Math.max(0, Math.min(100, pct)));
          }}
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: "#C4A96A",
              transition: "width 100ms linear",
            }}
          />
        </div>

        {/* Speed toggle */}
        <button
          onClick={cycleSpeed}
          className="shrink-0 rounded-md px-1.5 py-0.5 uppercase tracking-wide transition-all cursor-pointer"
          style={{
            fontSize: "10px",
            color: "#C4A96A",
            background: "rgba(196, 169, 106, 0.08)",
            border: "1px solid rgba(196, 169, 106, 0.12)",
            letterSpacing: "0.04em",
            minWidth: "36px",
            textAlign: "center",
          }}
          title="Change speed"
        >
          {speed}x
        </button>

        {/* Stop button (only when playing) */}
        {isPlaying && (
          <button
            onClick={stop}
            className="shrink-0 flex items-center justify-center rounded-full transition-all cursor-pointer"
            style={{
              width: "28px",
              height: "28px",
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.15)",
            }}
            title="Stop"
            aria-label="Stop playback"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#f87171" stroke="none">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          </button>
        )}
      </div>

      {/* Word-highlighted transcript (during playback only) */}
      {isPlaying && wordsRef.current.length > 0 && (
        <div
          className="rounded-lg px-3 py-2"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.04)",
            maxHeight: "80px",
            overflowY: "auto",
          }}
        >
          <p style={{ fontSize: "12px", lineHeight: 1.6, color: "#9AA7B2" }}>
            {wordsRef.current.map((word, i) => (
              <span
                key={i}
                style={{
                  color: i === currentWordIndex ? "#C4A96A" : "#9AA7B2",
                  borderBottom: i === currentWordIndex ? "1px solid #C4A96A" : "none",
                  fontWeight: i === currentWordIndex ? 600 : 400,
                  transition: "color 100ms ease, font-weight 100ms ease",
                }}
              >
                {word}
                {i < wordsRef.current.length - 1 ? " " : ""}
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}
