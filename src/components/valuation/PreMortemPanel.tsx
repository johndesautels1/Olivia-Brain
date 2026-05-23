'use client';

import { useState } from 'react';
import type { PreMortemResult } from '@/lib/valuation/types';
import GlossaryTooltip from './GlossaryTooltip';

// ── Props ────────────────────────────────────────────────────────────

export type PreMortemPanelProps = {
  preMortem: PreMortemResult | null;
};

// ── Score bar ───────────────────────────────────────────────────────

function ScoreBar({ score, label }: { score: number; label: string }) {
  const pct = Math.max(0, Math.min(100, score * 10));

  const barColor =
    score >= 7
      ? 'bg-jade-upside'
      : score >= 4
        ? 'bg-status-warning'
        : 'bg-coral-downside';

  const textColor =
    score >= 7
      ? 'text-jade-upside'
      : score >= 4
        ? 'text-status-warning'
        : 'text-coral-downside';

  return (
    <div className="mb-1">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[11px] text-text-secondary">{label}</span>
        <span className={`text-[11px] font-bold tabular-nums ${textColor}`}>
          {score}/10
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────

export default function PreMortemPanel({ preMortem }: PreMortemPanelProps) {
  const hasData = !!preMortem && preMortem.rejectionReasons.length > 0;
  const [collapsed, setCollapsed] = useState(hasData);

  if (!hasData) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-2">
          <GlossaryTooltip fieldKey="confidence">
            <span>Pre-Mortem Analysis</span>
          </GlossaryTooltip>
        </h3>
        <p className="text-xs text-text-secondary">
          Run a valuation with intelligence agents enabled to see rejection risk analysis.
        </p>
      </div>
    );
  }

  return (
    <div className={`glass-card ${collapsed ? 'p-0' : 'p-6'}`}>
      <button
        type="button"
        className={`flex items-center justify-between gap-2 w-full text-left appearance-none bg-transparent border-0 ${collapsed ? 'p-4 cursor-pointer hover:bg-white/[0.03] transition-colors rounded-xl' : 'mb-4 p-0 cursor-pointer'}`}
        style={{ font: 'inherit', color: 'inherit' }}
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Expand pre-mortem panel" : "Collapse pre-mortem panel"}
      >
        <div className="flex items-center gap-2">
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="rgba(196, 169, 106, 0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="shrink-0 transition-transform duration-200"
            style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              <GlossaryTooltip fieldKey="confidence">
                <span>Pre-Mortem Analysis</span>
              </GlossaryTooltip>
            </h3>
            {!collapsed && (
              <p className="text-[11px] text-text-secondary">
                If every investor passed, these are the most likely reasons — ranked by probability.
              </p>
            )}
          </div>
        </div>
        {collapsed && (
          <span
            className="text-[11px] font-semibold tracking-[0.08em] uppercase px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(196, 169, 106, 0.12)',
              color: 'rgba(196, 169, 106, 0.85)',
              border: '1px solid rgba(196, 169, 106, 0.2)',
            }}
          >
            New Data Available
          </span>
        )}
      </button>

      {!collapsed && (
        <div className="space-y-4">
          {preMortem!.rejectionReasons.map((reason, i) => (
            <div
              key={i}
              className="rounded-lg border border-white/5 bg-white/[0.02] p-4"
            >
              {/* Header: rank + probability */}
              <div className="flex items-start gap-3 mb-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-coral-downside/20 text-coral-downside text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-text-primary">
                      {reason.reason}
                    </p>
                    <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-white/5 text-text-secondary tabular-nums">
                      {(reason.probability * 100).toFixed(0)}% likely
                    </span>
                  </div>
                </div>
              </div>

              {/* Score bar */}
              <div className="ml-9 mb-2">
                <ScoreBar
                  score={reason.currentScore}
                  label="Current package score"
                />
              </div>

              {/* Improvement action */}
              <div className="ml-9 p-2 rounded bg-cyan-interactive/5 border border-cyan-interactive/10">
                <p className="text-[11px] text-cyan-interactive font-semibold mb-0.5 uppercase tracking-wider">
                  Action to Improve
                </p>
                <p className="text-[11px] text-text-primary leading-relaxed">
                  {reason.improvementAction}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
