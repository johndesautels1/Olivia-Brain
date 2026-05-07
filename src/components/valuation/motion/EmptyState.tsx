'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

// ── Types ────────────────────────────────────────────────────────────

interface EmptyStateProps {
  /** The icon to display. Pass an SVG or React node. */
  icon: ReactNode;
  /** Headline text. */
  title: string;
  /** Descriptive body text. */
  description: string;
  /** Optional CTA button. */
  action?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
}

// ── Component ────────────────────────────────────────────────────────

/**
 * EmptyState — illustrated empty state with clear CTA.
 *
 * Replaces bare "No data available" text with a structured,
 * accessible empty state following the design system.
 *
 * Entrance animation: fade + slight scale (300ms, under budget).
 * Reduced motion: renders instantly with no animation.
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
      }
      className="glass-surface p-10 text-center flex flex-col items-center gap-4"
    >
      {/* Icon container */}
      <div
        className="inline-flex h-16 w-16 items-center justify-center rounded-xl"
        style={{
          background:
            'linear-gradient(135deg, var(--aurum-a15) 0%, var(--aurum-a5) 100%)',
          border: '1px solid var(--aurum-a20)',
        }}
      >
        {icon}
      </div>

      {/* Text */}
      <div className="flex flex-col gap-1.5">
        <h3
          className="text-base font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h3>
        <p
          className="text-sm max-w-sm mx-auto leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          {description}
        </p>
      </div>

      {/* CTA */}
      {action && (
        <button
          onClick={action.onClick}
          disabled={action.disabled}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 mt-2"
          style={{
            background: 'var(--aurum-a15)',
            border: '1px solid var(--aurum-a20)',
            color: 'var(--color-aurum-primary)',
          }}
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
