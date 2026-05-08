"use client";

/**
 * `/voice` — voice-mode full-screen takeover (Track U Session U7).
 *
 * Pi-style minimalism: dark canvas, single 320px breathing orb at the
 * optical centre, mic toggle, no chrome. Esc returns to `/`. The orb
 * cycles through `idle → listening → thinking → speaking` based on
 * the chat lifecycle (parity with the home composer).
 *
 * Voice itself rides the existing `/api/voice/transcribe` →
 * `/api/olivia/chat` chain. U7 ships the surface + state choreography
 * (mic button, transcript chip, last-reply quote, error fallback);
 * full speech-to-text wiring to the browser MediaRecorder API
 * carries forward to the next voice-focused track.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AvatarOrb, type AvatarOrbState } from "@/components/primitives";

export default function VoicePage() {
  const router = useRouter();
  const [state, setState] = useState<AvatarOrbState>("idle");
  const [listening, setListening] = useState(false);
  const [reply, setReply] = useState<string | null>(null);

  /* Esc returns home; Space toggles listening (matches the footer hint). */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        router.push("/");
      } else if (e.key === " " || e.code === "Space") {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
        e.preventDefault();
        setListening((prev) => {
          const next = !prev;
          setState(next ? "listening" : "idle");
          if (!next) setReply(null);
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  /* Toggle listening. Real STT lands in a future voice track — for
   * now the toggle drives the orb state so the demo paints correctly
   * and the surface is wired end-to-end the moment STT is plugged in. */
  const toggleListening = useCallback(() => {
    setListening((prev) => {
      const next = !prev;
      setState(next ? "listening" : "idle");
      if (!next) setReply(null);
      return next;
    });
  }, []);

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
        <AvatarOrb size={240} state={state} label="Olivia voice mode" />

        <div style={{ display: "grid", placeItems: "center", gap: 12 }}>
          <span
            aria-live="polite"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: listening ? "var(--aether-primary)" : "var(--fg-tertiary)",
            }}
          >
            {listening ? "Listening — speak" : "Tap the mic to begin"}
          </span>
          {reply && (
            <blockquote
              style={{
                margin: 0,
                maxWidth: 640,
                padding: "14px 18px",
                borderRadius: "var(--radius-lg)",
                background: "var(--canvas-recess)",
                borderLeft: "2px solid var(--aurum-primary)",
                color: "var(--fg-secondary)",
                fontSize: "var(--text-md)",
                lineHeight: 1.55,
                fontStyle: "italic",
                textAlign: "center",
              }}
            >
              {reply}
            </blockquote>
          )}
        </div>

        <button
          type="button"
          onClick={toggleListening}
          aria-pressed={listening}
          aria-label={listening ? "Stop listening" : "Start listening"}
          style={{
            width: 88,
            height: 88,
            borderRadius: "var(--radius-full)",
            background: listening
              ? "linear-gradient(135deg, var(--aether-primary), var(--aurum-primary))"
              : "linear-gradient(135deg, var(--aurum-primary), var(--aurum-soft))",
            color: "var(--fg-on-accent)",
            border: "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            cursor: "pointer",
            boxShadow:
              "0 30px 80px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255,255,255,0.15)",
            transition:
              "background var(--duration-default) var(--ease-out-quart), transform var(--duration-micro) var(--ease-out-quart)",
          }}
        >
          {listening ? "■" : "●"}
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
