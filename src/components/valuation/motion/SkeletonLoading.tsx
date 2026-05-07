'use client';

import { motion, useReducedMotion } from 'framer-motion';

// ── Pulse animation ──────────────────────────────────────────────────

/**
 * SkeletonPulse — a single pulsing rectangular block.
 * Used as the base for all skeleton shapes.
 */
function SkeletonPulse({
  width,
  height,
  borderRadius = 6,
  className,
}: {
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      animate={
        shouldReduceMotion
          ? {}
          : {
              opacity: [0.3, 0.6, 0.3],
            }
      }
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : {
              duration: 1.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }
      }
      style={{
        width: width ?? '100%',
        height: height ?? 16,
        borderRadius,
        background:
          'linear-gradient(90deg, var(--white-a3) 0%, var(--white-a8) 50%, var(--white-a3) 100%)',
        backgroundSize: '200% 100%',
      }}
    />
  );
}

// ── Ghost KPI Card ───────────────────────────────────────────────────

/**
 * SkeletonKpiCard — ghost placeholder that matches KpiCards layout.
 * Renders a label bar, large value bar, and subtitle bar.
 */
function SkeletonKpiCard({ isHero = false }: { isHero?: boolean }) {
  return (
    <div
      className={`glass-surface p-5 flex flex-col gap-3 ${isHero ? 'col-span-2' : ''}`}
      style={
        isHero
          ? { borderColor: 'rgba(196, 169, 106, 0.12)' }
          : undefined
      }
    >
      {/* Label */}
      <SkeletonPulse width={isHero ? 140 : 100} height={12} borderRadius={4} />
      {/* Value */}
      <SkeletonPulse
        width={isHero ? 220 : 120}
        height={isHero ? 44 : 28}
        borderRadius={6}
      />
      {/* Subtitle */}
      <SkeletonPulse width={isHero ? 180 : 100} height={11} borderRadius={4} />
    </div>
  );
}

// ── Ghost Chart Card ─────────────────────────────────────────────────

/**
 * SkeletonChartCard — ghost placeholder matching ChartCard wrapper.
 * Renders a title bar and a large rectangular chart area.
 */
function SkeletonChartCard({ height = 200 }: { height?: number }) {
  return (
    <div className="glass-surface p-5 flex flex-col gap-4">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <SkeletonPulse width={160} height={14} borderRadius={4} />
        <SkeletonPulse width={80} height={11} borderRadius={4} />
      </div>
      {/* Chart area */}
      <SkeletonPulse width="100%" height={height} borderRadius={8} />
      {/* Caption */}
      <SkeletonPulse width="60%" height={11} borderRadius={4} />
    </div>
  );
}

// ── Ghost Tab Nav ────────────────────────────────────────────────────

function SkeletonTabNav() {
  return (
    <div className="flex gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] p-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonPulse key={i} width={80 + Math.random() * 30} height={28} borderRadius={6} />
      ))}
    </div>
  );
}

// ── Ghost Method Stack Row ───────────────────────────────────────────

function SkeletonMethodRow() {
  return (
    <div className="flex items-center gap-3 py-2">
      <SkeletonPulse width={14} height={14} borderRadius={3} />
      <SkeletonPulse width={120} height={13} borderRadius={4} />
      <div className="flex-1">
        <SkeletonPulse width="100%" height={8} borderRadius={4} />
      </div>
      <SkeletonPulse width={80} height={13} borderRadius={4} />
    </div>
  );
}

// ── Full Page Skeleton ───────────────────────────────────────────────

/**
 * ValuationSkeleton — the full loading skeleton that replaces
 * the current spinner + "Loading valuation..." text.
 *
 * Matches the loaded layout: Header → KPI cards → Tab nav →
 * Method stack → Chart cards.
 */
export function ValuationSkeleton() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Ghost Header */}
      <div className="glass-surface p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <SkeletonPulse width={240} height={22} borderRadius={6} />
            <div className="flex gap-2">
              <SkeletonPulse width={70} height={20} borderRadius={10} />
              <SkeletonPulse width={90} height={20} borderRadius={10} />
            </div>
          </div>
          <SkeletonPulse width={120} height={36} borderRadius={8} />
        </div>
      </div>

      {/* Ghost KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonKpiCard isHero />
        <SkeletonKpiCard />
        <SkeletonKpiCard />
      </div>

      {/* Ghost Tab Nav */}
      <SkeletonTabNav />

      {/* Ghost Method Stack */}
      <div className="glass-surface p-5 flex flex-col gap-1">
        <SkeletonPulse width={140} height={14} borderRadius={4} />
        <div className="mt-3 flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonMethodRow key={i} />
          ))}
        </div>
      </div>

      {/* Ghost Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkeletonChartCard height={180} />
        <SkeletonChartCard height={180} />
      </div>
    </div>
  );
}

// ── Exported sub-components for reuse ────────────────────────────────

export { SkeletonPulse, SkeletonKpiCard, SkeletonChartCard, SkeletonTabNav };
