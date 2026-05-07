'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { formatCurrency } from '@/lib/valuation/dashboard-types';

// ── Types ────────────────────────────────────────────────────────────

export interface DiffSnapshot {
  ev: number;
  confidence: number;
  methodsUsed: number;
  risks: string[];
  methodWeights: { name: string; weight: number }[];
}

export interface WhatChangedDiffProps {
  previous: DiffSnapshot;
  current: DiffSnapshot;
  onDismiss: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────

function pctChange(prev: number, curr: number): string {
  if (prev === 0) return curr > 0 ? '+∞' : '0';
  const pct = ((curr - prev) / Math.abs(prev)) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

function deltaColor(prev: number, curr: number): string {
  if (curr > prev) return 'text-jade-upside';
  if (curr < prev) return 'text-coral-downside';
  return 'text-text-secondary';
}

// ── Component ────────────────────────────────────────────────────────
// Session 27: Auto-appear collapsible diff panel after re-run.

export default function WhatChangedDiff({
  previous,
  current,
  onDismiss,
}: WhatChangedDiffProps) {
  const [expanded, setExpanded] = useState(true);
  const shouldReduceMotion = useReducedMotion();

  // Compute new risks (in current but not in previous)
  const newRisks = current.risks.filter((r) => !previous.risks.includes(r));
  const removedRisks = previous.risks.filter((r) => !current.risks.includes(r));

  // Compute weight changes
  const weightChanges = current.methodWeights
    .map((cw) => {
      const pw = previous.methodWeights.find((p) => p.name === cw.name);
      const prevWeight = pw?.weight ?? 0;
      const delta = cw.weight - prevWeight;
      if (Math.abs(delta) < 0.5) return null;
      return { name: cw.name, prev: prevWeight, curr: cw.weight, delta };
    })
    .filter(Boolean) as { name: string; prev: number; curr: number; delta: number }[];

  const hasChanges =
    previous.ev !== current.ev ||
    previous.confidence !== current.confidence ||
    previous.methodsUsed !== current.methodsUsed ||
    newRisks.length > 0 ||
    removedRisks.length > 0 ||
    weightChanges.length > 0;

  if (!hasChanges) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: -12, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={shouldReduceMotion ? undefined : { opacity: 0, y: -12, height: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card border-[var(--color-aurum-primary)]/25 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-xs font-semibold text-[var(--color-aurum-primary)]"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 150ms' }}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
            What Changed
          </button>
          <button
            onClick={onDismiss}
            className="text-text-secondary hover:text-text-primary text-xs px-2 py-1 rounded hover:bg-white/[0.06] transition-colors"
          >
            Dismiss
          </button>
        </div>

        {/* Content */}
        {expanded && (
          <div className="px-4 py-3 space-y-2.5">
            {/* EV change */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">Enterprise Value</span>
              <span className={`font-mono tabular-nums font-medium ${deltaColor(previous.ev, current.ev)}`}>
                {formatCurrency(previous.ev)} → {formatCurrency(current.ev)}{' '}
                <span className="opacity-70">({pctChange(previous.ev, current.ev)})</span>
              </span>
            </div>

            {/* Confidence change */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">Confidence</span>
              <span className={`font-mono tabular-nums font-medium ${deltaColor(previous.confidence, current.confidence)}`}>
                {previous.confidence}% → {current.confidence}%
              </span>
            </div>

            {/* Methods count */}
            {previous.methodsUsed !== current.methodsUsed && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">Methods Used</span>
                <span className="font-mono tabular-nums text-text-primary">
                  {previous.methodsUsed} → {current.methodsUsed}
                </span>
              </div>
            )}

            {/* Weight changes */}
            {weightChanges.length > 0 && (
              <div className="pt-1 border-t border-white/[0.04]">
                <p className="text-[11px] text-text-secondary uppercase tracking-wider font-semibold mb-1.5">Method Weights</p>
                <div className="space-y-1">
                  {weightChanges.map((wc) => (
                    <div key={wc.name} className="flex items-center justify-between text-[11px]">
                      <span className="text-text-secondary truncate">{wc.name}</span>
                      <span className={`font-mono tabular-nums ${wc.delta > 0 ? 'text-jade-upside' : 'text-coral-downside'}`}>
                        {wc.delta > 0 ? '+' : ''}{wc.delta.toFixed(0)}pp
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New risks */}
            {newRisks.length > 0 && (
              <div className="pt-1 border-t border-white/[0.04]">
                <p className="text-[11px] text-coral-downside uppercase tracking-wider font-semibold mb-1">New Risks</p>
                {newRisks.map((r, i) => (
                  <p key={i} className="text-[11px] text-text-secondary">• {r}</p>
                ))}
              </div>
            )}

            {/* Removed risks */}
            {removedRisks.length > 0 && (
              <div className="pt-1 border-t border-white/[0.04]">
                <p className="text-[11px] text-jade-upside uppercase tracking-wider font-semibold mb-1">Resolved Risks</p>
                {removedRisks.map((r, i) => (
                  <p key={i} className="text-[11px] text-text-secondary line-through opacity-60">• {r}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
