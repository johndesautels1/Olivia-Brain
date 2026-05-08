"use client";

/**
 * `HomeCenter` — center-pane composition for `/`.
 *
 * Track U owns this surface — replaces the Session-14 scaffolding hero
 * that read like an internal README. Composes:
 *
 *   - Hero zone: 240px AvatarOrb + activity ticker + composer (U2)
 *   - KPI tile grid (U4)
 *   - Recent work strip (U4)
 *
 * The aesthetic — Bond × Bentley × mid-century × Fortune-50 × modern —
 * is enforced via canonical tokens (`tokens.css`). No raw hex.
 */

import type { ReactNode } from "react";
import { HomeHero } from "./HomeHero";
import { HomeComposer } from "./HomeComposer";
import { ActivityTicker } from "./ActivityTicker";
import { KpiTileGrid } from "./KpiTileGrid";
import { RecentWorkStrip } from "./RecentWorkStrip";
import type { AvatarOrbState } from "@/components/primitives";
import type { NavSection, Slide } from "@/lib/studio/types";

export interface HomeCenterProps {
  navSection: NavSection;
  avatarState: AvatarOrbState;
  onAvatarClick: () => void;
  appliedSummary: string | null;
  slides: readonly Slide[];
}

export function HomeCenter({
  avatarState,
  onAvatarClick,
  appliedSummary,
  slides,
}: HomeCenterProps) {
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
      <HomeHero state={avatarState} onClick={onAvatarClick} />
      <ActivityTicker />
      <HomeComposer />
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
}): ReactNode {
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
