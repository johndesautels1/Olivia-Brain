"use client";

/**
 * `HomeHero` — the protagonist on `/`.
 *
 * Bond × Bentley × mid-century: a single 240px orb on dark canvas
 * with generous negative space. The orb IS the product. Sub-agent
 * ring (council mode) shows live cascade activity beneath the orb
 * caption.
 *
 * State semantics:
 *   - idle       — quiet ambient breathing
 *   - listening  — aether ring, voice mode active
 *   - thinking   — aurum + aether twin pulse, cascade in flight
 *   - speaking   — aurum solid, reply rendering
 *
 * Click → toggles avatar pulse (parent owns state) so a demo viewer
 * can see the protagonist react.
 */

import { AvatarOrb, type AvatarOrbState } from "@/components/primitives";

export interface HomeHeroProps {
  state: AvatarOrbState;
  onClick: () => void;
}

const STATE_CAPTION: Record<AvatarOrbState, string> = {
  idle: "Olivia · ready",
  listening: "Olivia · listening",
  thinking: "Olivia · thinking",
  speaking: "Olivia · speaking",
  error: "Olivia · momentarily offline",
  connecting: "Olivia · connecting",
};

export function HomeHero({ state, onClick }: HomeHeroProps) {
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
    </section>
  );
}
