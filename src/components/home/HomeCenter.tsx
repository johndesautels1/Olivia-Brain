"use client";

/**
 * `HomeCenter` — center-pane composition for `/`.
 *
 * Track U owns this surface. Composes (top-to-bottom):
 *
 *   - Hero zone:        240px AvatarOrb (state-reactive) + tagline    (U2)
 *   - Activity ticker:  Bloomberg-style live foundation status        (U2)
 *   - Composer:         Cursor-style chips + /api/olivia/chat wiring  (U2)
 *   - KPI tile grid:    Today / Agents / Next                         (U4)
 *   - Recent work:      Artifact strip                                 (U4)
 *
 * State:
 *   - `chatState` drives the hero orb (idle → thinking → speaking).
 *   - `lastReply` rendered as quote beneath the hero.
 *   - `audit` callback bubbles to parent for the audit log.
 *
 * The aesthetic — Bond × Bentley × mid-century × Fortune-50 × modern —
 * is enforced via canonical tokens (`tokens.css`). No raw hex.
 */

import { useCallback, useState } from "react";
import { HomeHero } from "./HomeHero";
import { HomeComposer } from "./HomeComposer";
import { ActivityTicker } from "./ActivityTicker";
import { KpiTileGrid } from "./KpiTileGrid";
import { RecentWorkStrip } from "./RecentWorkStrip";
import type { AvatarOrbState } from "@/components/primitives";
import type { Slide } from "@/lib/studio/types";

export interface HomeCenterProps {
  /** External avatar pulse (header click). Overrides chat state when active. */
  externalPulse: boolean;
  onAvatarClick: () => void;
  appliedSummary: string | null;
  slides: readonly Slide[];
  onAudit?: (text: string) => void;
}

export function HomeCenter({
  externalPulse,
  onAvatarClick,
  appliedSummary,
  slides,
  onAudit,
}: HomeCenterProps) {
  const [chatState, setChatState] = useState<AvatarOrbState>("idle");
  const [lastReply, setLastReply] = useState<string | null>(null);

  const audit = useCallback(
    (text: string) => onAudit?.(text),
    [onAudit],
  );

  const handleReply = useCallback((reply: string) => {
    setLastReply(reply);
    setChatState("speaking");
    /* Settle to idle after a moment. */
    window.setTimeout(() => setChatState("idle"), 2400);
  }, []);

  const heroState: AvatarOrbState = externalPulse ? "thinking" : chatState;

  return (
    <div
      style={{
        maxWidth: 1120,
        marginInline: "auto",
        display: "grid",
        gap: 32,
        paddingBlock: 16,
      }}
    >
      <HomeHero
        state={heroState}
        onClick={onAvatarClick}
        lastReply={lastReply}
      />
      <ActivityTicker />
      <HomeComposer
        onStateChange={setChatState}
        onReply={handleReply}
        onAudit={audit}
      />
      <KpiTileGrid />
      <RecentWorkStrip />

      {appliedSummary && (
        <AppliedBreadcrumb summary={appliedSummary} slides={slides} />
      )}
    </div>
  );
}

function AppliedBreadcrumb({
  summary,
  slides,
}: {
  summary: string;
  slides: readonly Slide[];
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        padding: 12,
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-aether)",
        background: "var(--aether-mute)",
        color: "var(--fg-primary)",
        fontSize: "var(--text-sm)",
        display: "grid",
        gap: 4,
      }}
    >
      <strong style={{ color: "var(--aether-primary)" }}>Library →</strong>
      <span>{summary}</span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-2xs)",
          color: "var(--fg-tertiary)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {slides.length} slides queued: {slides.map((s) => s.type).join(" · ")}
      </span>
    </div>
  );
}
