"use client";

/**
 * `CompletionRing` — SVG circular progress indicator.
 *
 * Reference: `docs/01_UI_DESIGN_SYSTEM.md` § 8.2 + `STUDIO_OLIVIA_DESIGN.md` § 2.1.
 *
 * # Tier rules
 *
 * Same color tiers as `Badge` so a card carrying both reads visually
 * coherent (§ 2.1 — score-tier colours unified across primitives).
 *
 * | Value | Stroke           |
 * |-------|------------------|
 * | ≥ 80  | `--mint-up`      |
 * | 50-79 | `--amber-warn`   |
 * | 1-49  | `--coral-down`   |
 * | 0     | `--border-strong`|
 *
 * # Animation
 *
 * `stroke-dashoffset` and `stroke` transitions on 500ms / 300ms
 * respectively; freeze entirely under `prefers-reduced-motion: reduce`
 * via the global `*` rule in `base.css`.
 *
 * # Accessibility
 *
 * Renders as `role="progressbar"` with `aria-valuenow` / `aria-valuemin`
 * / `aria-valuemax` / `aria-label`.
 */

import { useMemo } from "react";

export interface CompletionRingProps {
  /** Percentage complete (0-100). Out-of-range values clamp. */
  value: number;
  /** Outer diameter in pixels. Default 20 per § 2.1. */
  size?: number;
  /** Stroke thickness. Default scales with size. */
  strokeWidth?: number;
  /** Whether to render the percent label inside the ring. */
  showLabel?: boolean;
  /** Custom centre label override. */
  label?: string;
  /** Additional CSS class. */
  className?: string;
}

function getStrokeColor(value: number): string {
  if (value >= 80) return "var(--mint-up)";
  if (value >= 50) return "var(--amber-warn)";
  if (value > 0) return "var(--coral-down)";
  return "var(--border-strong)";
}

export function CompletionRing({
  value,
  size = 20,
  strokeWidth,
  showLabel = false,
  label,
  className,
}: CompletionRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const stroke = strokeWidth ?? Math.max(2, Math.round(size * 0.12));

  const { radius, circumference, dashOffset, center, color } = useMemo(() => {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    return {
      radius: r,
      circumference: c,
      dashOffset: c * (1 - clamped / 100),
      center: size / 2,
      color: getStrokeColor(clamped),
    };
  }, [size, stroke, clamped]);

  const displayLabel = label ?? `${Math.round(clamped)}`;

  return (
    <div
      className={className}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${clamped}% complete`}
      data-ring-tier={
        clamped >= 80 ? "high" : clamped >= 50 ? "medium" : clamped > 0 ? "low" : "empty"
      }
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)" }}
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={stroke}
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transition:
              "stroke-dashoffset var(--duration-slow) var(--ease-out-quart), stroke var(--duration-default) var(--ease-out-quart)",
          }}
        />
      </svg>

      {showLabel && (
        <span
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-mono)",
            fontFeatureSettings: '"tnum" 1, "lnum" 1',
            fontSize: size < 32 ? "var(--text-2xs)" : size < 56 ? "var(--text-xs)" : "var(--text-sm)",
            fontWeight: 600,
            color,
            letterSpacing: "-0.02em",
          }}
        >
          {displayLabel}
        </span>
      )}
    </div>
  );
}
