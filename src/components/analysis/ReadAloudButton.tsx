"use client";

import { useState, useCallback, useRef } from "react";

interface ReadAloudButtonProps {
  /** Callback returning the text to read (preferred for dynamic content) */
  getText?: () => string;
  /** Static text to read (alternative for server components) */
  text?: string;
  /** Optional label override */
  label?: string;
}

export function ReadAloudButton({ getText, text, label = "Read Aloud" }: ReadAloudButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    if (speechRef.current && typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      speechRef.current = null;
    }
    setSpeaking(false);
  }, []);

  const browserTTSFallback = useCallback((spokenText: string) => {
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    utterance.lang = "en-GB";

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.lang.startsWith("en-GB") && v.name.toLowerCase().includes("female")
    );
    if (preferred) utterance.voice = preferred;

    speechRef.current = utterance;
    utterance.onend = () => {
      setSpeaking(false);
      speechRef.current = null;
    };
    utterance.onerror = () => {
      setSpeaking(false);
      speechRef.current = null;
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const handleToggle = useCallback(async () => {
    if (speaking) {
      stopPlayback();
      return;
    }

    const content = getText ? getText() : (text ?? "");
    if (!content.trim()) return;

    setSpeaking(true);

    try {
      const res = await fetch("/api/emilia/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });

      if (res.ok) {
        const contentType = res.headers.get("Content-Type") || "";

        if (contentType.includes("audio/mpeg") || contentType.includes("audio/")) {
          // ElevenLabs AI voice — play audio blob
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audioRef.current = audio;

          audio.onended = () => {
            setSpeaking(false);
            audioRef.current = null;
            URL.revokeObjectURL(url);
          };
          audio.onerror = () => {
            setSpeaking(false);
            audioRef.current = null;
            URL.revokeObjectURL(url);
          };

          await audio.play();
          return;
        }

        // JSON fallback response — use browser Speech API
        const data = await res.json();
        if (data.fallback) {
          browserTTSFallback(data.text || content);
          return;
        }
      }

      // Non-OK response — fall back to browser TTS
      browserTTSFallback(content);
    } catch {
      // Network error — fall back to browser TTS
      browserTTSFallback(content);
    }
  }, [speaking, getText, text, stopPlayback, browserTTSFallback]);

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
        speaking
          ? "border-brand-600/40 bg-brand-600/15 text-brand-400"
          : "border-[var(--card-border)] bg-[rgba(255,255,255,0.03)] text-[var(--muted)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--foreground)]"
      }`}
      title={speaking ? "Stop reading" : label}
    >
      {speaking ? (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
        </svg>
      )}
      {speaking ? "Stop" : label}
    </button>
  );
}
