/**
 * Badge — Fortune 50-style percentage indicator
 *
 * A refined, corporate-grade badge for displaying confidence scores,
 * completion percentages, and match ratings. Designed to match
 * Olivia Brain's premium design language.
 *
 * Uses CSS variables from globals.css:
 * - --mint (#80d8c3) for high values (80+)
 * - --gold (#d8aa60) for medium values (50-79)
 * - --coral (#f28d7f) for low values (<50)
 */

"use client";

import { useMemo } from "react";

interface BadgeProps {
  /** The percentage value to display (0-100) */
  value: number;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Optional label to show instead of percentage */
  label?: string;
  /** Show decimal places */
  precision?: number;
  /** Additional CSS classes */
  className?: string;
}

const SIZE_STYLES = {
  sm: {
    padding: "4px 8px",
    fontSize: "0.7rem",
    borderRadius: "6px",
    minWidth: "42px",
  },
  md: {
    padding: "6px 12px",
    fontSize: "0.78rem",
    borderRadius: "8px",
    minWidth: "52px",
  },
  lg: {
    padding: "8px 16px",
    fontSize: "0.88rem",
    borderRadius: "10px",
    minWidth: "64px",
  },
} as const;

function getColorScheme(value: number): { bg: string; text: string; border: string } {
  if (value >= 80) {
    return {
      bg: "rgba(128, 216, 195, 0.12)",
      text: "#80d8c3",
      border: "rgba(128, 216, 195, 0.24)",
    };
  }
  if (value >= 50) {
    return {
      bg: "rgba(216, 170, 96, 0.12)",
      text: "#d8aa60",
      border: "rgba(216, 170, 96, 0.24)",
    };
  }
  if (value > 0) {
    return {
      bg: "rgba(242, 141, 127, 0.10)",
      text: "#f28d7f",
      border: "rgba(242, 141, 127, 0.20)",
    };
  }
  return {
    bg: "rgba(181, 177, 164, 0.08)",
    text: "#b5b1a4",
    border: "rgba(181, 177, 164, 0.16)",
  };
}

export function Badge({
  value,
  size = "md",
  label,
  precision = 0,
  className = "",
}: BadgeProps) {
  const normalizedValue = Math.max(0, Math.min(100, value));
  const colors = useMemo(() => getColorScheme(normalizedValue), [normalizedValue]);
  const sizeStyle = SIZE_STYLES[size];

  const displayText = label ?? `${normalizedValue.toFixed(precision)}%`;

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'IBM Plex Mono', 'Consolas', monospace",
        fontWeight: 600,
        letterSpacing: "0.02em",
        textAlign: "center",
        whiteSpace: "nowrap",
        background: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        ...sizeStyle,
      }}
      role="status"
      aria-label={`${normalizedValue}%`}
    >
      {displayText}
    </span>
  );
}

export default Badge;
