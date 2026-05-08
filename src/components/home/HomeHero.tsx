"use client";

/**
 * `HomeHero` — the protagonist on `/`.
 *
 * Bond × Bentley × mid-century: a single 240px orb on dark canvas
 * with generous negative space. The orb IS the product. Last reply
 * renders as a quoted whisper beneath the headline so the user has
 * a breadcrumb of Olivia's most recent thought.
 *
 * State semantics:
 *   - idle       — quiet ambient breathing
 *   - listening  — aether ring, voice mode active
 *   - thinking   — aurum + aether twin pulse, cascade in flight
 *   - speaking   — aurum solid, reply rendering
 */

import { AvatarOrb, type AvatarOrbState } from "@/components/primitives";

export interface HomeHeroProps {
  state: AvatarOrbState;
  onClick: () => void;
  /** Most recent Olivia reply — quoted beneath the headline. */
  lastReply?: string | null;
}

const STATE_CAPTION: Record<AvatarOrbState, string> = {
  idle: "Olivia · ready",
  listening: "Olivia · listening",
  thinking: "Olivia · thinking",
  speaking: "Olivia · speaking",
  error: "Olivia · momentarily offline",
  connecting: "Olivia · connecting",
};

export function HomeHero({ state, onClick, lastReply }: HomeHeroProps) {
  const showReply = Boolean(lastReply && state !== "thinking");

  return (
    <section
      aria-label="Olivia hero zone"
      style={{
        display: "grid",
        placeItems: "center",
        gap: 20,
        paddingBlock: 32,
      }}
    >
      <AvatarOrb
        size={240}
        state={state}
        onClick={onClick}
        label="Talk to Olivia"
      />

      <div style={{ display: "grid", placeItems: "center", gap: 6 }}>
        <span
          aria-live="polite"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--aurum-primary)",
          }}
        >
          {STATE_CAPTION[state]}
        </span>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-4xl)",
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "var(--fg-primary)",
            textAlign: "center",
            lineHeight: 1.05,
          }}
        >
          The Chief Intelligence Officer
        </h1>
        <p
          style={{
            margin: 0,
            maxWidth: 560,
            color: "var(--fg-tertiary)",
            fontSize: "var(--text-sm)",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          One brain across Florida real estate, international relocation,
          the London tech ecosystem, two-city comparison metrics, heart
          health recovery, and London transit — embedded, gateway, or
          standalone.
        </p>
      </div>

      {showReply && (
        <blockquote
          aria-live="polite"
          style={{
            margin: 0,
            maxWidth: 640,
            padding: "14px 18px",
            borderRadius: "var(--radius-lg)",
            background: "var(--canvas-recess)",
            borderLeft: "2px solid var(--aurum-primary)",
            color: "var(--fg-secondary)",
            fontSize: "var(--text-sm)",
            lineHeight: 1.55,
            fontStyle: "italic",
            textAlign: "left",
          }}
        >
          {lastReply}
        </blockquote>
      )}
    </section>
  );
}
