'use client';

import { useEffect, useRef, useState } from 'react';
import CountUp from 'react-countup';

// ── Types ────────────────────────────────────────────────────────────

interface AnimatedNumberProps {
  /** The target numeric value to animate to. */
  value: number;
  /** Duration in seconds (capped at 0.4s per design system budget). */
  duration?: number;
  /** Number of decimal places. */
  decimals?: number;
  /** Prefix string (e.g. "£"). */
  prefix?: string;
  /** Suffix string (e.g. "%"). */
  suffix?: string;
  /** Thousands separator. Defaults to comma. */
  separator?: string;
  /** CSS class applied to the outer span. */
  className?: string;
  /** Formatting function override. Receives the raw number. */
  formattingFn?: (value: number) => string;
}

// ── Reduced motion detection ─────────────────────────────────────────

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);

    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}

// ── Component ────────────────────────────────────────────────────────

/**
 * AnimatedNumber — CountUp wrapper with reduced-motion fallback.
 *
 * When the user prefers reduced motion, the final value is shown
 * instantly (no animation). Otherwise, the number counts up from
 * its previous value to the new value within the animation budget.
 *
 * Design system constraint: max 400ms total animation.
 */
export default function AnimatedNumber({
  value,
  duration = 0.4,
  decimals = 0,
  prefix = '',
  suffix = '',
  separator = ',',
  className,
  formattingFn,
}: AnimatedNumberProps) {
  const reducedMotion = usePrefersReducedMotion();
  const prevValue = useRef(0);

  // Clamp duration to the design system budget (400ms = 0.4s)
  const clampedDuration = Math.min(duration, 0.4);

  // On reduced motion, render the final value immediately
  if (reducedMotion) {
    const display = formattingFn
      ? formattingFn(value)
      : `${prefix}${value.toLocaleString('en-GB', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })}${suffix}`;

    return (
      <span className={className} aria-live="polite">
        {display}
      </span>
    );
  }

  const startValue = prevValue.current;

  return (
    <CountUp
      start={startValue}
      end={value}
      duration={clampedDuration}
      decimals={decimals}
      prefix={prefix}
      suffix={suffix}
      separator={separator}
      useEasing
      formattingFn={formattingFn}
      onEnd={() => {
        prevValue.current = value;
      }}
    >
      {({ countUpRef }) => (
        <span ref={countUpRef} className={className} aria-live="polite" />
      )}
    </CountUp>
  );
}
