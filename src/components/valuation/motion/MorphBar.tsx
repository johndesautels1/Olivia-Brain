'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { CSSProperties } from 'react';

// ── Types ────────────────────────────────────────────────────────────

interface MorphBarProps {
  /** Width as a percentage (0-100). Animates to this value. */
  widthPercent: number;
  /** Bar height in px. Defaults to 8. */
  height?: number;
  /** Background color of the filled portion. */
  color?: string;
  /** Background color of the track. */
  trackColor?: string;
  /** Border radius in px. Defaults to 4. */
  borderRadius?: number;
  /** CSS class on the outer track element. */
  className?: string;
  /** Optional accessible label for the bar. */
  ariaLabel?: string;
  /** Optional inline style on the outer track. */
  style?: CSSProperties;
}

// ── Component ────────────────────────────────────────────────────────

/**
 * MorphBar — an animated horizontal bar that smoothly transitions
 * its width when the `widthPercent` prop changes.
 *
 * Used for confidence meters, method weights, progress indicators,
 * and any horizontal gauge in the valuation UI.
 *
 * Animation budget: 320ms with ease-out easing (under 400ms cap).
 * Reduced motion: bar snaps to final width instantly.
 */
export default function MorphBar({
  widthPercent,
  height = 8,
  color = 'var(--color-aurum-primary)',
  trackColor = 'var(--white-a5)',
  borderRadius = 4,
  className,
  ariaLabel,
  style,
}: MorphBarProps) {
  const shouldReduceMotion = useReducedMotion();
  const clampedWidth = Math.max(0, Math.min(100, widthPercent));

  return (
    <div
      className={className}
      role="progressbar"
      aria-valuenow={Math.round(clampedWidth)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      style={{
        height,
        borderRadius,
        background: trackColor,
        overflow: 'hidden',
        ...style,
      }}
    >
      <motion.div
        initial={shouldReduceMotion ? false : { width: '0%' }}
        animate={{ width: `${clampedWidth}%` }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : {
                duration: 0.32,
                ease: [0.16, 1, 0.3, 1], // --ease-out
              }
        }
        style={{
          height: '100%',
          borderRadius,
          background: color,
        }}
      />
    </div>
  );
}
