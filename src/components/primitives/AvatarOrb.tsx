"use client";

/**
 * `AvatarOrb` — primitive (placeholder).
 *
 * The single most-recognizable piece of Olivia chrome
 * (`docs/01_UI_DESIGN_SYSTEM.md` § 6.1). Five sizes (40 / 56 / 96 / 240),
 * six states (idle / listening / thinking / speaking / error /
 * connecting). Wraps the `OliviaVideoAvatar` LiveAvatar element when
 * active.
 *
 * # Session 14 scope
 *
 * This file ships the **placeholder** primitive — a styled circle with
 * the aurum + aether twin-pulse animation and a static glyph. The full
 * implementation (LiveAvatar wrapping, council-mode orbital agent
 * dots, Cristiano gold-saturated transition) lands in Session 15
 * alongside `ConsensusDots`, `Badge`, `CompletionRing`, and
 * `DeckDetailModal`.
 *
 * Keeping the surface contract stable from S14 means the workspace
 * `Header`, `RailLeft` avatar pad, and `Inspector` Olivia tab can
 * import from `@/components/primitives` immediately and not move when
 * the full implementation lands.
 */

import { useId } from "react";

/** All recognised avatar states. Must stay in sync with § 6.1. */
export type AvatarOrbState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "error"
  | "connecting";

/** Discrete sizes from § 6.1 — header / card / inspector / hero. */
export type AvatarOrbSize = 40 | 56 | 96 | 240;

export interface AvatarOrbProps {
  /** Visual state. Defaults to `"idle"`. */
  state?: AvatarOrbState;
  /** Pixel diameter. Defaults to `56` (inspector-default). */
  size?: AvatarOrbSize;
  /** Click handler — typically opens Olivia panel or starts session. */
  onClick?: () => void;
  /** Accessible label for screen readers. */
  label?: string;
  /** Glyph / initial in the centre. Defaults to `"O"`. */
  glyph?: string;
  /**
   * Whether the orb is currently rendering live video (LiveAvatar).
   * Hides the glyph when true.  Wired in S15.
   */
  hasVideo?: boolean;
}

/**
 * Render the orb at the requested state + size.
 *
 * Pure presentational — no async, no state, no observed effects.
 * State changes drive the animation purely through CSS.
 */
export function AvatarOrb({
  state = "idle",
  size = 56,
  onClick,
  label = "Olivia",
  glyph = "O",
  hasVideo = false,
}: AvatarOrbProps) {
  const ringId = useId();

  /* Map state → ring style.  Aurum = decisions, Aether = computation
     (§ 1.3 — never mixed in a single component, except the AvatarOrb
     which is the bridge between the two and explicitly allowed to
     show both during the "thinking" twin-pulse signature animation). */
  const ringStyle: React.CSSProperties = (() => {
    const base: React.CSSProperties = {
      borderRadius: "50%",
      position: "absolute",
      inset: -4,
      pointerEvents: "none",
    };
    switch (state) {
      case "listening":
        return {
          ...base,
          boxShadow: "0 0 0 2px var(--aether-primary), 0 0 24px var(--aether-glow)",
          animation: "olivia-orb-pulse 1.6s ease-in-out infinite",
        };
      case "thinking":
        return {
          ...base,
          boxShadow:
            "0 0 0 2px var(--aurum-primary), 0 0 0 4px var(--aether-primary), 0 0 28px var(--aether-glow)",
          animation: "olivia-orb-twin-pulse 0.6s ease-in-out infinite",
        };
      case "speaking":
        return {
          ...base,
          boxShadow: "0 0 0 2px var(--aurum-primary), 0 0 32px rgba(196, 169, 106, 0.35)",
        };
      case "error":
        return {
          ...base,
          boxShadow: "0 0 0 2px var(--coral-down), 0 0 16px var(--coral-down-glow)",
        };
      case "connecting":
        return {
          ...base,
          boxShadow: "0 0 0 2px var(--aurum-primary)",
          opacity: 0.6,
          animation: "olivia-orb-pulse 1.0s ease-in-out infinite",
        };
      case "idle":
      default:
        return {
          ...base,
          boxShadow: "0 0 0 1px var(--border-aurum), 0 0 12px rgba(196, 169, 106, 0.10)",
          animation: "olivia-orb-pulse 4s ease-in-out infinite",
        };
    }
  })();

  const glyphFontSize = Math.round(size * 0.40);

  const Element = onClick ? "button" : "div";

  return (
    <Element
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-label={label}
      aria-live={state === "thinking" || state === "speaking" ? "polite" : undefined}
      data-state={state}
      data-orb-id={ringId}
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        background:
          "radial-gradient(circle at 30% 25%, var(--surface-3) 0%, var(--surface-1) 60%, var(--canvas-recess) 100%)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid var(--border-aurum)",
        cursor: onClick ? "pointer" : "default",
        flexShrink: 0,
        padding: 0,
        color: "var(--aurum-primary)",
        fontFamily: "var(--font-display)",
        fontWeight: 600,
        fontSize: glyphFontSize,
        letterSpacing: "-0.02em",
      }}
    >
      <span style={ringStyle} aria-hidden="true" />
      {!hasVideo && (
        <span aria-hidden="true" style={{ position: "relative" }}>
          {glyph}
        </span>
      )}
      {/* Reduced-motion + keyframes are co-located so the component
          stays self-contained.  Both keyframes are no-ops under
          `prefers-reduced-motion: reduce` per `base.css`. */}
      <style>{`
        @keyframes olivia-orb-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.65; transform: scale(1.04); }
        }
        @keyframes olivia-orb-twin-pulse {
          0%, 100% { box-shadow: 0 0 0 2px var(--aurum-primary), 0 0 0 4px var(--aether-primary), 0 0 28px var(--aether-glow); }
          50% { box-shadow: 0 0 0 4px var(--aurum-primary), 0 0 0 2px var(--aether-primary), 0 0 36px var(--aether-glow); }
        }
      `}</style>
    </Element>
  );
}
