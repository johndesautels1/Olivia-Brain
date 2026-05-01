/**
 * CompletionRing — Fortune 50-style circular progress indicator
 *
 * A refined, minimalist SVG ring for displaying progress or completion.
 * Designed to match Olivia Brain's premium corporate aesthetic.
 *
 * Features:
 * - Smooth animated transitions
 * - Color-coded by threshold (mint/gold/coral)
 * - Optional center label
 * - Accessible with ARIA attributes
 */

"use client";

import { useMemo } from "react";

interface CompletionRingProps {
  /** Percentage complete (0-100) */
  value: number;
  /** Ring diameter in pixels */
  size?: number;
  /** Stroke thickness */
  strokeWidth?: number;
  /** Show percentage label in center */
  showLabel?: boolean;
  /** Custom label (overrides percentage) */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

function getStrokeColor(value: number): string {
  if (value >= 80) return "#80d8c3"; // mint
  if (value >= 50) return "#d8aa60"; // gold
  if (value > 0) return "#f28d7f"; // coral
  return "#3a4553"; // muted track
}

export function CompletionRing({
  value,
  size = 48,
  strokeWidth = 3,
  showLabel = false,
  label,
  className = "",
}: CompletionRingProps) {
  const normalizedValue = Math.max(0, Math.min(100, value));

  const { radius, circumference, strokeDashoffset, center, strokeColor } = useMemo(() => {
    const r = (size - strokeWidth) / 2;
    const c = 2 * Math.PI * r;
    const offset = c * (1 - normalizedValue / 100);
    const color = getStrokeColor(normalizedValue);

    return {
      radius: r,
      circumference: c,
      strokeDashoffset: offset,
      center: size / 2,
      strokeColor: color,
    };
  }, [size, strokeWidth, normalizedValue]);

  const trackColor = "rgba(245, 227, 191, 0.08)";
  const displayLabel = label ?? `${Math.round(normalizedValue)}`;

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
      }}
      role="progressbar"
      aria-valuenow={normalizedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${normalizedValue}% complete`}
    >
      <svg
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease",
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
            fontFamily: "'IBM Plex Mono', 'Consolas', monospace",
            fontSize: size < 40 ? "0.65rem" : size < 64 ? "0.75rem" : "0.9rem",
            fontWeight: 600,
            color: strokeColor,
            letterSpacing: "-0.02em",
          }}
        >
          {displayLabel}
        </span>
      )}
    </div>
  );
}

export default CompletionRing;
