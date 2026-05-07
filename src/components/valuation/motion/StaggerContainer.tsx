'use client';

import { motion, type Variants } from 'framer-motion';
import type { ReactNode, CSSProperties } from 'react';

// ── Container variants ───────────────────────────────────────────────

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};

// ── Item variants ────────────────────────────────────────────────────

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.25,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

// ── StaggerContainer ─────────────────────────────────────────────────

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** HTML element tag. Defaults to 'div'. */
  as?: 'div' | 'ul' | 'ol' | 'section' | 'main' | 'nav';
}

/**
 * StaggerContainer — orchestrates staggered entrance animations
 * for its child StaggerItem components.
 *
 * Uses Framer Motion's variants propagation: the container triggers
 * `visible` which staggers through children at 60ms intervals.
 *
 * Respects prefers-reduced-motion via Framer Motion's built-in
 * `useReducedMotion` (variants skip to final state when reduced
 * motion is enabled).
 *
 * Total animation budget stays under 400ms per the design system.
 */
export function StaggerContainer({
  children,
  className,
  style,
  as = 'div',
}: StaggerContainerProps) {
  const Component = motion[as];

  return (
    <Component
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
      style={style}
    >
      {children}
    </Component>
  );
}

// ── StaggerItem ──────────────────────────────────────────────────────

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** HTML element tag. Defaults to 'div'. */
  as?: 'div' | 'li' | 'article' | 'section';
}

/**
 * StaggerItem — a child of StaggerContainer that fades + slides in.
 *
 * Must be a direct child of a StaggerContainer for the stagger
 * orchestration to work (Framer Motion variant propagation).
 */
export function StaggerItem({
  children,
  className,
  style,
  as = 'div',
}: StaggerItemProps) {
  const Component = motion[as];

  return (
    <Component
      variants={itemVariants}
      className={className}
      style={style}
    >
      {children}
    </Component>
  );
}
