"use client";

/**
 * `Badge` — color-tiered percent pill.
 *
 * Reference: `docs/01_UI_DESIGN_SYSTEM.md` § 8.2 + `STUDIO_OLIVIA_DESIGN.md` § 2.1.
 *
 * # Tier rules
 *
 * | Value     | Foreground       | Tier             |
 * |-----------|------------------|------------------|
 * | ≥ 80      | `--mint-up`      | favorable        |
 * | 50-79     | `--amber-warn`   | medium           |
 * | 1-49      | `--coral-down`   | weak / warning   |
 * | 0         | `--fg-disabled`  | empty / disabled |
 *
 * # Sizes
 *
 * Per § 2.1 the Studio prototype ships `sm` + `lg`. We add `md`
 * because OB's existing call sites use it; size scale lands cleanly
 * (sm 32 / md 40 / lg 48 px implied by primitive button scale § 8.1).
 *
 * # Accessibility
 *
 * Renders as `role="status"` with `aria-label` describing the value.
 * Tabular numerics are enforced via `font-feature-settings` so percent
 * rows align (§ 2.3 — non-negotiable for affluent users).
 */

import { useMemo } from "react";

export interface BadgeProps {
  /** Percentage value (0-100). Out-of-range values clamp. */
  value: number;
  /** Size variant. */
  size?: "sm" | "md" | "lg";
  /** Optional label override. Defaults to `${value}%`. */
  label?: string;
  /** Decimal places when rendering the percent. Default 0. */
  precision?: number;
  /** Additional CSS class for the outer element. */
  className?: string;
}

interface SizeStyle {
  padding: string;
  fontSize: string;
  borderRadius: string;
  minWidth: string;
}

const SIZE_STYLES: Record<NonNullable<BadgeProps["size"]>, SizeStyle> = {
  sm: { padding: "4px 8px", fontSize: "var(--text-2xs)", borderRadius: "var(--radius-sm)", minWidth: "42px" },
  md: { padding: "6px 12px", fontSize: "var(--text-xs)", borderRadius: "var(--radius-md)", minWidth: "52px" },
  lg: { padding: "8px 16px", fontSize: "var(--text-sm)", borderRadius: "var(--radius-md)", minWidth: "64px" },
};

interface ColorScheme {
  background: string;
  color: string;
  border: string;
}

function getColorScheme(value: number): ColorScheme {
  if (value >= 80) {
    return {
      background: "var(--mint-up-mute)",
      color: "var(--mint-up)",
      border: "rgba(94, 224, 190, 0.24)",
    };
  }
  if (value >= 50) {
    return {
      background: "var(--amber-warn-mute)",
      color: "var(--amber-warn)",
      border: "rgba(251, 191, 36, 0.24)",
    };
  }
  if (value > 0) {
    return {
      background: "var(--coral-down-mute)",
      color: "var(--coral-down)",
      border: "rgba(242, 141, 127, 0.20)",
    };
  }
  return {
    background: "rgba(180, 190, 210, 0.06)",
    color: "var(--fg-disabled)",
    border: "var(--border-subtle)",
  };
}

export function Badge({
  value,
  size = "md",
  label,
  precision = 0,
  className,
}: BadgeProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const colors = useMemo(() => getColorScheme(clamped), [clamped]);
  const sizeStyle = SIZE_STYLES[size];
  const displayText = label ?? `${clamped.toFixed(precision)}%`;

  return (
    <span
      className={className}
      role="status"
      aria-label={`${clamped}%`}
      data-badge-tier={
        clamped >= 80 ? "high" : clamped >= 50 ? "medium" : clamped > 0 ? "low" : "empty"
      }
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-mono)",
        fontFeatureSettings: '"tnum" 1, "lnum" 1',
        fontWeight: 600,
        letterSpacing: "0.02em",
        textAlign: "center",
        whiteSpace: "nowrap",
        background: colors.background,
        color: colors.color,
        border: `1px solid ${colors.border}`,
        ...sizeStyle,
      }}
    >
      {displayText}
    </span>
  );
}
