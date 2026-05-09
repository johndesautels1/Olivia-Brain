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
import { MarkdownReply } from "./reply-renderer";
import type { ReplyProvenance } from "./HomeComposer";

export interface HomeHeroProps {
  state: AvatarOrbState;
  onClick: () => void;
  /** Most recent Olivia reply — quoted beneath the headline. */
  lastReply?: string | null;
  /** Provenance metadata for the latest reply — provider/model/duration.
   *  Renders as a Bloomberg-style mono caption beneath the blockquote. */
  lastProvenance?: ReplyProvenance | null;
}

const STATE_CAPTION: Record<AvatarOrbState, string> = {
  idle: "Olivia · ready",
  listening: "Olivia · listening",
  thinking: "Olivia · thinking",
  speaking: "Olivia · speaking",
  error: "Olivia · momentarily offline",
  connecting: "Olivia · connecting",
};

export function HomeHero({ state, onClick, lastReply, lastProvenance }: HomeHeroProps) {
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
        <div
          aria-live="polite"
          style={{
            maxWidth: 720,
            padding: "16px 20px",
            borderRadius: "var(--radius-lg)",
            background: "var(--canvas-recess)",
            borderLeft: "2px solid var(--aurum-primary)",
            color: "var(--fg-secondary)",
            fontSize: "var(--text-sm)",
            lineHeight: 1.55,
            textAlign: "left",
            boxShadow: "0 30px 80px rgba(0,0,0,0.32)",
            display: "grid",
            gap: 8,
          }}
        >
          <MarkdownReply text={lastReply ?? ""} />
          {lastProvenance && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-2xs)",
                color: "var(--fg-tertiary)",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                paddingTop: 4,
                borderTop: "1px solid var(--border-subtle)",
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {lastProvenance.spokeLabel &&
                lastProvenance.spoke &&
                lastProvenance.spoke !== "general" && (
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "var(--radius-full)",
                      background: "var(--aether-mute)",
                      border: "1px solid var(--border-aether)",
                      color: "var(--aether-primary)",
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {lastProvenance.spokeLabel}
                  </span>
                )}
              <span style={{ color: "var(--aurum-primary)" }}>
                {lastProvenance.provider}
                {lastProvenance.provider !== lastProvenance.model && (
                  <>
                    <span style={{ opacity: 0.5, padding: "0 4px" }}>·</span>
                    {lastProvenance.model}
                  </>
                )}
              </span>
              {lastProvenance.durationMs !== undefined && (
                <span className="tabular-nums">
                  {lastProvenance.durationMs}ms
                </span>
              )}
              <span style={{ opacity: 0.6 }}>{lastProvenance.source}</span>
            </span>
          )}
        </div>
      )}
    </section>
  );
}
