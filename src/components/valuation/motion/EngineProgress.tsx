'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';

// ── Engine phases ────────────────────────────────────────────────────

interface EnginePhase {
  id: string;
  label: string;
  description: string;
  /** Simulated progress weight (how much of the total bar this phase occupies). */
  weight: number;
}

const ENGINE_PHASES: EnginePhase[] = [
  {
    id: 'methods',
    label: 'Valuation Methods',
    description: 'Running 9 valuation methods with weighted reconciliation',
    weight: 30,
  },
  {
    id: 'montecarlo',
    label: 'Monte Carlo Simulation',
    description: 'Simulating 5,000 probabilistic paths',
    weight: 25,
  },
  {
    id: 'sensitivity',
    label: 'Sensitivity Analysis',
    description: 'Testing variable impact on enterprise value',
    weight: 15,
  },
  {
    id: 'scenarios',
    label: 'Scenario Analysis',
    description: 'Evaluating base, upside, and downside cases',
    weight: 10,
  },
  {
    id: 'reconciliation',
    label: 'Judicial Reconciliation',
    description: 'AI judge reconciling method outputs',
    weight: 15,
  },
  {
    id: 'finalising',
    label: 'Finalising Report',
    description: 'Generating narrative and evidence chain',
    weight: 5,
  },
];

// ── Component ────────────────────────────────────────────────────────

/**
 * EngineProgress — animated multi-phase progress display
 * shown while the valuation engine is running.
 *
 * Cycles through engine phases with a progress bar and
 * descriptive text. This is a cosmetic indicator that
 * auto-advances — not tied to actual server progress.
 * The real completion is signaled when the API returns.
 *
 * Design system: <=400ms transitions, reduced-motion fallback.
 */
export default function EngineProgress() {
  const shouldReduceMotion = useReducedMotion();
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Auto-advance through phases on a timer
    // Each phase gets proportional time based on weight
    const totalDuration = 12000; // 12 seconds total expected run
    let elapsed = 0;

    intervalRef.current = setInterval(() => {
      elapsed += 150;
      const totalWeight = ENGINE_PHASES.reduce((s, p) => s + p.weight, 0);
      const progressFraction = Math.min(elapsed / totalDuration, 0.95); // Cap at 95% until real completion
      setOverallProgress(progressFraction * 100);

      // Determine which phase we're in based on weight distribution
      let accumulated = 0;
      for (let i = 0; i < ENGINE_PHASES.length; i++) {
        accumulated += ENGINE_PHASES[i].weight / totalWeight;
        if (progressFraction < accumulated) {
          setCurrentPhaseIndex(i);
          break;
        }
      }
    }, 150);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const currentPhase = ENGINE_PHASES[currentPhaseIndex];

  return (
    <div className="glass-focal p-8 max-w-lg mx-auto">
      {/* Phase indicator */}
      <div className="flex items-center gap-3 mb-6">
        {/* Animated spinner */}
        <motion.div
          animate={shouldReduceMotion ? {} : { rotate: 360 }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 1.5, repeat: Infinity, ease: 'linear' }
          }
          className="shrink-0"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-aurum-primary)"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </motion.div>
        <div>
          <AnimatePresence mode="wait">
            <motion.p
              key={currentPhase.id}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="text-sm font-semibold text-text-primary"
            >
              {currentPhase.label}
            </motion.p>
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <motion.p
              key={`${currentPhase.id}-desc`}
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-xs text-text-secondary mt-0.5"
            >
              {currentPhase.description}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="w-full overflow-hidden"
        style={{
          height: 6,
          borderRadius: 3,
          background: 'var(--white-a5)',
        }}
        role="progressbar"
        aria-valuenow={Math.round(overallProgress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Valuation engine progress"
      >
        <motion.div
          animate={{ width: `${overallProgress}%` }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
          }
          style={{
            height: '100%',
            borderRadius: 3,
            background:
              'linear-gradient(90deg, var(--color-aurum-primary), var(--color-aurum-highlight))',
          }}
        />
      </div>

      {/* Phase steps */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        {ENGINE_PHASES.map((phase, i) => {
          const isComplete = i < currentPhaseIndex;
          const isCurrent = i === currentPhaseIndex;

          return (
            <div key={phase.id} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full shrink-0 transition-colors"
                style={{
                  background: isComplete
                    ? 'var(--color-jade-upside)'
                    : isCurrent
                      ? 'var(--color-aurum-primary)'
                      : 'var(--white-a10)',
                }}
              />
              <span
                className="text-[11px] truncate transition-colors"
                style={{
                  color: isComplete
                    ? 'var(--text-secondary)'
                    : isCurrent
                      ? 'var(--color-aurum-primary)'
                      : 'var(--text-tertiary)',
                  fontWeight: isCurrent ? 600 : 400,
                }}
              >
                {phase.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
