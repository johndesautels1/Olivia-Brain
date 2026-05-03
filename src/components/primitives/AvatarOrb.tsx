"use client";

/**
 * `AvatarOrb` — full implementation (Session 15).
 *
 * The single most-recognizable piece of Olivia chrome
 * (`docs/01_UI_DESIGN_SYSTEM.md` § 6.1). Five sizes (40 / 56 / 96 /
 * 240), six states, optional LiveAvatar video stream, optional
 * council-mode orbital sub-agent dots, and the Cristiano gold-
 * saturated judge transition.
 *
 * # Surface contract
 *
 * The prop shape is unchanged from the Session-14 placeholder. New
 * optional props (`subAgents`, `intent`, `apiBase`, `adminKey`,
 * `lastReply`, `onReady`, `onDisconnect`, `onSpeakingChange`) extend
 * but never break. `Header`, `RailLeft`, `Inspector` (S14 consumers)
 * require zero updates.
 *
 * # Council mode (§ 6.4)
 *
 * When `subAgents` is supplied, dots orbit the orb at evenly-spaced
 * angles, each in its assigned colour:
 *
 *   - Olivia (orchestrator) — `--aurum-primary`
 *   - Cristiano (judge)     — `--aurum-primary`, saturated
 *   - Research              — `--aether-primary`
 *   - Persona               — `--mint-up`
 *   - Math                  — `--sky-info`
 *   - Multilingual          — `--coral-down-mute`
 *
 * Each contributing dot pulses + draws a faint connecting line to
 * the orb. No gimmicks — the visualization tracks real cascade
 * activity passed in by the caller.
 *
 * # Cristiano transition (§ 6.3)
 *
 * When `intent === "judge"` and `state === "speaking"`, the orb
 * briefly transitions to gold-saturated fill + a 1-second swell. The
 * user always knows when a unilateral judge call has happened.
 *
 * # LiveAvatar wrapping
 *
 * At size 240 OR when `hasVideo` is true, the orb mounts
 * `OliviaVideoAvatar` clipped to its circular shape. Smaller sizes
 * (40/56/96) keep the glyph + state animation — they are status
 * indicators, not video surfaces.
 *
 * # Accessibility
 *
 * - Aurum focus ring via global `:focus-visible`.
 * - `aria-label` always present (defaults to "Olivia").
 * - `aria-live="polite"` while speaking / thinking so the orb's state
 *   announcements don't interrupt critical announcements.
 * - All animations respect `prefers-reduced-motion: reduce` via the
 *   global media query in `base.css`.
 */

import { Suspense, lazy, useId } from "react";

/** All recognised avatar states (per § 6.1). */
export type AvatarOrbState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "error"
  | "connecting";

/** Discrete sizes from § 6.1 — header / card / inspector / hero. */
export type AvatarOrbSize = 40 | 56 | 96 | 240;

/** Sub-agent identifier (§ 6.4 — colour assignments). */
export type SubAgentKind =
  | "olivia"
  | "cristiano"
  | "research"
  | "persona"
  | "math"
  | "multilingual";

export interface SubAgent {
  kind: SubAgentKind;
  /** Whether the agent is currently contributing (drives the pulse + line). */
  active?: boolean;
  /** Optional accessible label override. */
  label?: string;
}

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
   * Hides the glyph when true. Implied true at size 240 by default.
   */
  hasVideo?: boolean;
  /** Active intent — drives the Cristiano gold transition (§ 6.3). */
  intent?: "draft" | "research" | "math" | "judge" | "smalltalk";
  /** Council-mode sub-agents (§ 6.4). */
  subAgents?: SubAgent[];
  /** Admin key for LiveAvatar gate (forwarded). */
  adminKey?: string;
  /** Text Olivia should speak when the avatar connects. */
  lastReply?: string;
  /** Forwarded LiveAvatar callbacks. */
  onReady?: () => void;
  onDisconnect?: () => void;
  onSpeakingChange?: (speaking: boolean) => void;
}

/* Lazy-load the LiveAvatar so the orb is cheap when no video is needed
   and the small-size status indicator is the only mount. */
const LazyOliviaVideoAvatar = lazy(() =>
  import("@/components/olivia/OliviaVideoAvatar").then((m) => ({
    default: m.OliviaVideoAvatar,
  })),
);

/** § 6.4 — colour assignment per sub-agent kind. */
const SUB_AGENT_COLORS: Record<SubAgentKind, string> = {
  olivia: "var(--aurum-primary)",
  cristiano: "var(--aurum-primary)",
  research: "var(--aether-primary)",
  persona: "var(--mint-up)",
  math: "var(--sky-info)",
  multilingual: "var(--coral-down-mute)",
};

const SUB_AGENT_LABELS: Record<SubAgentKind, string> = {
  olivia: "Olivia (orchestrator)",
  cristiano: "Cristiano (judge)",
  research: "Research",
  persona: "Persona",
  math: "Math",
  multilingual: "Multilingual",
};

export function AvatarOrb({
  state = "idle",
  size = 56,
  onClick,
  label = "Olivia",
  glyph = "O",
  hasVideo,
  intent,
  subAgents,
  adminKey,
  lastReply,
  onReady,
  onDisconnect,
  onSpeakingChange,
}: AvatarOrbProps) {
  const ringId = useId();

  const cristianoVerdict = intent === "judge" && state === "speaking";
  const showVideo = hasVideo ?? size === 240;

  /* Map state → ring style (§ 6.1). Aurum + Aether twin-pulse for
     "thinking" is the signature animation; Cristiano verdict adds
     a saturated gold swell on top. */
  const ringStyle: React.CSSProperties = (() => {
    const base: React.CSSProperties = {
      borderRadius: "50%",
      position: "absolute",
      inset: -4,
      pointerEvents: "none",
    };
    if (cristianoVerdict) {
      return {
        ...base,
        boxShadow:
          "0 0 0 3px var(--aurum-primary), 0 0 36px rgba(196, 169, 106, 0.55)",
        animation: "olivia-orb-cristiano-swell 1.0s ease-out",
      };
    }
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
          boxShadow:
            "0 0 0 2px var(--aurum-primary), 0 0 32px rgba(196, 169, 106, 0.35)",
        };
      case "error":
        return {
          ...base,
          boxShadow: "0 0 0 2px var(--coral-down), 0 0 16px var(--coral-down-glow)",
          animation: "olivia-orb-shake var(--duration-default) ease-in-out",
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
          boxShadow:
            "0 0 0 1px var(--border-aurum), 0 0 12px rgba(196, 169, 106, 0.10)",
          animation: "olivia-orb-pulse 4s ease-in-out infinite",
        };
    }
  })();

  const glyphFontSize = Math.round(size * 0.4);
  const Element = onClick ? "button" : "div";
  const orbitRadius = size / 2 + 18;
  const subAgentDotSize = Math.max(6, Math.round(size * 0.10));

  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        width: size + (subAgents ? 64 : 0),
        height: size + (subAgents ? 64 : 0),
        flexShrink: 0,
      }}
    >
      <Element
        type={onClick ? "button" : undefined}
        onClick={onClick}
        aria-label={label}
        aria-live={
          state === "thinking" || state === "speaking" ? "polite" : undefined
        }
        data-state={state}
        data-intent={intent}
        data-orb-id={ringId}
        data-cristiano={cristianoVerdict || undefined}
        style={{
          position: "absolute",
          top: subAgents ? "50%" : 0,
          left: subAgents ? "50%" : 0,
          transform: subAgents ? "translate(-50%, -50%)" : undefined,
          width: size,
          height: size,
          borderRadius: "50%",
          background: cristianoVerdict
            ? "radial-gradient(circle at 30% 25%, var(--aurum-soft) 0%, var(--aurum-primary) 70%, var(--canvas-recess) 100%)"
            : "radial-gradient(circle at 30% 25%, var(--surface-3) 0%, var(--surface-1) 60%, var(--canvas-recess) 100%)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid var(--border-aurum)",
          cursor: onClick ? "pointer" : "default",
          padding: 0,
          color: cristianoVerdict ? "var(--fg-on-accent)" : "var(--aurum-primary)",
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: glyphFontSize,
          letterSpacing: "-0.02em",
          overflow: "hidden",
          transition:
            "background var(--duration-default) var(--ease-out-quart), color var(--duration-default) var(--ease-out-quart)",
        }}
      >
        <span style={ringStyle} aria-hidden="true" />

        {showVideo ? (
          <Suspense fallback={<span aria-hidden="true">{glyph}</span>}>
            <span
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                overflow: "hidden",
              }}
            >
              <LazyOliviaVideoAvatar
                adminKey={adminKey}
                lastReply={lastReply}
                onReady={onReady}
                onDisconnect={onDisconnect}
                onSpeakingChange={onSpeakingChange}
                hideOverlays
              />
            </span>
          </Suspense>
        ) : (
          <span aria-hidden="true" style={{ position: "relative" }}>
            {glyph}
          </span>
        )}
      </Element>

      {/* Council-mode orbital sub-agent dots (§ 6.4). */}
      {subAgents && subAgents.length > 0 && (
        <span
          role="img"
          aria-label={`${subAgents.length} sub-agents`}
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
          }}
        >
          {subAgents.map((agent, i) => {
            const angle = (i / subAgents.length) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * orbitRadius;
            const y = Math.sin(angle) * orbitRadius;
            const color = SUB_AGENT_COLORS[agent.kind];
            return (
              <span
                key={`${agent.kind}-${i}`}
                aria-label={agent.label ?? SUB_AGENT_LABELS[agent.kind]}
                role="img"
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: subAgentDotSize,
                  height: subAgentDotSize,
                  borderRadius: "var(--radius-full)",
                  background: color,
                  opacity: agent.active ? 1 : 0.35,
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                  boxShadow: agent.active
                    ? `0 0 12px ${color}`
                    : "none",
                  animation: agent.active
                    ? "olivia-orb-pulse 1.4s ease-in-out infinite"
                    : undefined,
                  transition: "opacity var(--duration-default) var(--ease-out-quart)",
                }}
              />
            );
          })}
        </span>
      )}

      <style>{`
        @keyframes olivia-orb-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.65; transform: scale(1.04); }
        }
        @keyframes olivia-orb-twin-pulse {
          0%, 100% {
            box-shadow:
              0 0 0 2px var(--aurum-primary),
              0 0 0 4px var(--aether-primary),
              0 0 28px var(--aether-glow);
          }
          50% {
            box-shadow:
              0 0 0 4px var(--aurum-primary),
              0 0 0 2px var(--aether-primary),
              0 0 36px var(--aether-glow);
          }
        }
        @keyframes olivia-orb-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        @keyframes olivia-orb-cristiano-swell {
          0% {
            box-shadow:
              0 0 0 2px var(--aurum-primary),
              0 0 16px rgba(196, 169, 106, 0.20);
          }
          50% {
            box-shadow:
              0 0 0 4px var(--aurum-primary),
              0 0 48px rgba(196, 169, 106, 0.65);
          }
          100% {
            box-shadow:
              0 0 0 3px var(--aurum-primary),
              0 0 36px rgba(196, 169, 106, 0.55);
          }
        }
      `}</style>
    </span>
  );
}
