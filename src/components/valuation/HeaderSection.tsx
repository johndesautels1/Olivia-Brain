'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { BuyerType, CompanyStage } from '@/lib/valuation/types';
import {
  BUYER_TYPE_LABELS,
  BUYER_TYPES,
  formatCurrency,
  stageBadgeColor,
  stageLabel,
} from '@/lib/valuation/dashboard-types';
import { computeValuationClock } from '@/lib/valuation/valuation-clock';
import GlossaryTooltip from './GlossaryTooltip';

// ── Props ────────────────────────────────────────────────────────

export type FounderMeta = {
  arr: number | null;
  runwayMonths: number | null;
  growthYoYPct: number | null;
  companiesHouseNumber: string | null;
  targetRaiseAmount: number | null;
  targetRoundType: string | null;
};

export type HeaderSectionProps = {
  companyName: string;
  sector: string;
  stage: CompanyStage;
  confidence: number | null;
  completedAt: string | null;
  enterpriseValue: number;
  /** EV low bound (null if not available) */
  evLow: number | null;
  /** EV high bound (null if not available) */
  evHigh: number | null;
  methodsUsed: number;
  totalMethods: number;
  selectedBuyerType: BuyerType;
  onBuyerTypeChange: (bt: BuyerType) => void;
  onRunValuation: () => void;
  isRunning: boolean;
  /** Whether all panels are expanded (master toggle) */
  allPanelsExpanded: boolean;
  /** Toggle all panels open/closed */
  onAllPanelsToggle: (expanded: boolean) => void;
  /** Whether field-explanation glossary tooltips are enabled */
  glossaryEnabled: boolean;
  /** Toggle glossary tooltips on/off */
  onGlossaryToggle: (enabled: boolean) => void;
  /** Current valuation run ID (null when no run loaded) */
  valuationRunId: string | null;
  /** Save status: 'idle' | 'saving' | 'saved' | 'error' */
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  /** Manual save handler */
  onSave: () => void;
  /** Clear all data and return to idle state */
  onReset: () => void;
  /** Founder-level metrics for the FounderMeta strip */
  founderMeta: FounderMeta | null;
};

// ── Confidence helpers ───────────────────────────────────────────

function tierFor(pct: number) {
  if (pct <= 20) return { label: 'Speculative', color: '#f87171' };
  if (pct <= 40) return { label: 'Indicative', color: '#fb923c' };
  if (pct <= 60) return { label: 'Preliminary', color: '#facc15' };
  if (pct <= 80) return { label: 'Substantiated', color: '#60a5fa' };
  return { label: 'Investment Grade', color: '#4ade80' };
}

// ── MetricChip — small inline stat for the FounderMeta strip ─────────

function MetricChip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap">
      <span
        style={{
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 700,
          fontSize: 10,
          color: '#94a3b8',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "JetBrains Mono, var(--font-mono), monospace",
          fontSize: 12,
          fontWeight: 600,
          color: accent ? '#D9BD7E' : '#cbd5e1',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
    </span>
  );
}

// ── Component ────────────────────────────────────────────────────
// Visual reskin: CommandRibbon design (aurum gold, onyx surfaces, Inter,
// JetBrains Mono numerics, 12-pip confidence bar, enhanced buyer segmented control).
// Props and wiring are IDENTICAL to the previous version.

export default function HeaderSection({
  companyName,
  sector,
  stage,
  confidence,
  completedAt,
  enterpriseValue,
  evLow,
  evHigh,
  methodsUsed,
  totalMethods,
  selectedBuyerType,
  onBuyerTypeChange,
  onRunValuation,
  isRunning,
  allPanelsExpanded,
  onAllPanelsToggle,
  glossaryEnabled,
  onGlossaryToggle,
  valuationRunId,
  saveStatus,
  onSave,
  onReset,
  founderMeta,
}: HeaderSectionProps) {
  // Mobile utility overflow menu state
  const [utilMenuOpen, setUtilMenuOpen] = useState(false);

  // Track run success flash: when isRunning goes false → show green for 4s
  const [runSuccess, setRunSuccess] = useState(false);
  const wasRunning = useRef(false);
  useEffect(() => {
    if (isRunning) {
      wasRunning.current = true;
    } else if (wasRunning.current) {
      // Run just finished
      wasRunning.current = false;
      setRunSuccess(true);
      const t = setTimeout(() => setRunSuccess(false), 4000);
      return () => clearTimeout(t);
    }
  }, [isRunning]);

  const clock = useMemo(
    () =>
      computeValuationClock({
        baseConfidence: confidence ?? 0,
        completedAt,
      }),
    [confidence, completedAt],
  );

  const clampedPct = Math.min(100, Math.max(0, clock.displayPct));
  const tier = tierFor(clampedPct);

  const lastRunLabel = completedAt
    ? new Date(completedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
    : '--:--';

  const initials = companyName
    .split(/\s+/)
    .filter((w) => w.length > 0 && w[0] === w[0].toUpperCase())
    .slice(0, 2)
    .map((w) => w[0])
    .join('');

  const segments = 12;
  const filled = Math.round((clampedPct / 100) * segments);

  return (
    <header
      className="relative sm:sticky sm:top-0 z-40 overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #0c1a30 0%, #0a1628 100%)',
        color: '#f1f5f9',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 4,
        boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 40px -24px rgba(0,0,0,0.5)',
      }}
    >
      {/* Band 1: Utility ribbon — collapses secondary controls into overflow menu on mobile */}
      <div
        className="flex items-center justify-between gap-2 px-4 sm:px-[22px] py-2 sm:py-0 relative"
        style={{
          minHeight: 42,
          borderBottom: '1px solid rgba(255,255,255,0.10)',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        {/* Left: sector + methods (always visible) */}
        <div className="flex items-center gap-3 shrink-0">
          <span
            className="text-xs sm:text-[12px]"
            style={{
              fontFamily: "JetBrains Mono, var(--font-mono), monospace",
              fontWeight: 500,
              color: '#cbd5e1',
              letterSpacing: 0.04,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {sector} &middot; {methodsUsed}/{totalMethods}
          </span>
        </div>

        {/* Right: Run button always visible + overflow menu toggle on mobile */}
        <div className="flex items-center gap-2">
          {/* ── Desktop-only: full controls inline ── */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Master panels toggle */}
            <div className="inline-flex items-center gap-2">
              <button
                role="switch"
                aria-checked={allPanelsExpanded}
                aria-label="Toggle all panels expanded or collapsed"
                onClick={() => onAllPanelsToggle(!allPanelsExpanded)}
                className="relative inline-block shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A96A] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]"
                style={{
                  height: 20,
                  width: 36,
                  padding: 0,
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: allPanelsExpanded ? 'rgba(96,165,250,0.35)' : 'rgba(255,255,255,0.08)',
                  transition: 'background 0.18s',
                }}
              >
                <span
                  className="absolute rounded-full"
                  style={{
                    top: 1,
                    left: allPanelsExpanded ? 17 : 1,
                    width: 16,
                    height: 16,
                    background: allPanelsExpanded ? '#60a5fa' : 'rgba(148,163,184,0.6)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
                    transition: 'left 0.18s, background 0.18s',
                  }}
                />
              </button>
              <span style={{ fontSize: 11, color: '#cbd5e1', letterSpacing: 0.02, whiteSpace: 'nowrap', fontWeight: 500 }}>
                {allPanelsExpanded ? 'Panels open' : 'Panels closed'}
              </span>
            </div>

            <span aria-hidden="true" style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.16)' }} />

            {/* Glossary toggle */}
            <div className="inline-flex items-center gap-2">
              <button
                role="switch"
                aria-checked={glossaryEnabled}
                aria-label="Toggle field explanations"
                onClick={() => onGlossaryToggle(!glossaryEnabled)}
                className="relative inline-block shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A96A] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]"
                style={{
                  height: 20,
                  width: 36,
                  padding: 0,
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: glossaryEnabled ? 'rgba(196,169,106,0.35)' : 'rgba(255,255,255,0.08)',
                  transition: 'background 0.18s',
                }}
              >
                <span
                  className="absolute rounded-full"
                  style={{
                    top: 1,
                    left: glossaryEnabled ? 17 : 1,
                    width: 16,
                    height: 16,
                    background: glossaryEnabled ? '#C4A96A' : 'rgba(148,163,184,0.6)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
                    transition: 'left 0.18s, background 0.18s',
                  }}
                />
              </button>
              <span style={{ fontSize: 11, color: '#cbd5e1', letterSpacing: 0.02, whiteSpace: 'nowrap', fontWeight: 500 }}>
                Field explanations
              </span>
            </div>

            <span aria-hidden="true" style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.16)' }} />

            {/* Save Report */}
            {valuationRunId && (
              <div className="flex items-center gap-2" role="status" aria-live="polite">
                <button
                  onClick={onSave}
                  disabled={saveStatus === 'saving'}
                  className="inline-flex items-center gap-[7px] cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#C4A96A] focus-visible:outline-none"
                  style={{
                    height: 30,
                    padding: '0 12px',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#f1f5f9',
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: 4,
                    fontSize: 12.5,
                    fontWeight: 600,
                  }}
                >
                  {saveStatus === 'saving' ? (
                    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" strokeLinejoin="miter">
                      <path d="M11 12H3a1 1 0 01-1-1V3a1 1 0 011-1h6.5l2.5 2.5V11a1 1 0 01-1 1z" />
                      <path d="M4 2v3h5V2M4 12V8h6v4" />
                    </svg>
                  )}
                  {saveStatus === 'saving' ? 'Saving\u2026' : 'Save Report'}
                </button>
                {saveStatus === 'saved' && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#34d399', whiteSpace: 'nowrap' }}>Saved</span>
                )}
                {saveStatus === 'error' && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#f87171', whiteSpace: 'nowrap' }}>Save failed</span>
                )}
              </div>
            )}

            {/* Clear Data */}
            <button
              onClick={onReset}
              aria-label="Clear all valuation data and start fresh"
              className="inline-flex items-center gap-1.5 cursor-pointer opacity-60 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A96A] focus-visible:rounded-sm"
              style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, whiteSpace: 'nowrap' }}
              title="Clear all data and start fresh"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              Clear
            </button>
          </div>

          {/* ── Mobile-only: overflow menu toggle ── */}
          <button
            onClick={() => setUtilMenuOpen((o) => !o)}
            className="sm:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md border border-white/[0.12] bg-white/[0.06] hover:bg-white/[0.10] transition-colors text-text-primary focus-visible:ring-2 focus-visible:ring-[#C4A96A] focus-visible:outline-none"
            aria-label={utilMenuOpen ? 'Close settings menu' : 'Open settings menu'}
            aria-expanded={utilMenuOpen}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {utilMenuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <>
                  <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                </>
              )}
            </svg>
          </button>

          {/* Run Valuation — always visible on all screen sizes */}
          <button
            onClick={onRunValuation}
            disabled={isRunning}
            aria-busy={isRunning}
            className="relative inline-flex items-center gap-2 cursor-pointer disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A96A] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
            style={{
              height: 32,
              padding: '0 14px 0 10px',
              background: runSuccess
                ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                : 'linear-gradient(135deg, #C4A96A 0%, #a8893a 100%)',
              color: runSuccess ? '#ffffff' : '#0f172a',
              border: 'none',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.4,
              boxShadow: runSuccess
                ? '0 0 16px rgba(16,185,129,0.5), 0 0 4px rgba(16,185,129,0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
                : '0 2px 8px rgba(196,169,106,0.25), inset 0 1px 0 rgba(255,255,255,0.2)',
              transition: 'background 0.4s, box-shadow 0.4s, color 0.4s',
            }}
          >
            <span className="relative flex items-center justify-center" style={{ width: 16, height: 16 }}>
              {isRunning ? (
                <svg width="16" height="16" viewBox="0 0 16 16" className="animate-spin" aria-hidden="true">
                  <circle cx="8" cy="8" r="6" fill="none" stroke="rgba(15,23,42,0.2)" strokeWidth="2" />
                  <path d="M8 2a6 6 0 0 1 6 6" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : runSuccess ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
                  <path d="M2.5 1.5v7l5.5-3.5z" />
                </svg>
              )}
            </span>
            <span className="hidden sm:inline">{isRunning ? 'Running' : runSuccess ? 'Complete' : 'Run Valuation'}</span>
            <span className="sm:hidden">{isRunning ? 'Run...' : runSuccess ? 'Done' : 'Run'}</span>
          </button>
        </div>
      </div>

      {/* ── Mobile overflow menu — slides down when toggled ── */}
      {utilMenuOpen && (
        <div
          className="sm:hidden flex flex-col gap-3 px-4 py-3"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.10)',
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          {/* Panels toggle */}
          <div className="flex items-center justify-between min-h-[44px]">
            <span style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 500 }}>Panels</span>
            <button
              role="switch"
              aria-checked={allPanelsExpanded}
              aria-label="Toggle all panels"
              onClick={() => onAllPanelsToggle(!allPanelsExpanded)}
              className="relative inline-block shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A96A]"
              style={{
                height: 24, width: 44, padding: 0, borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.12)',
                background: allPanelsExpanded ? 'rgba(96,165,250,0.35)' : 'rgba(255,255,255,0.08)',
              }}
            >
              <span className="absolute rounded-full" style={{ top: 2, left: allPanelsExpanded ? 21 : 2, width: 18, height: 18, background: allPanelsExpanded ? '#60a5fa' : 'rgba(148,163,184,0.6)', boxShadow: '0 1px 2px rgba(0,0,0,0.4)', transition: 'left 0.18s, background 0.18s' }} />
            </button>
          </div>
          {/* Glossary toggle */}
          <div className="flex items-center justify-between min-h-[44px]">
            <span style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 500 }}>Field explanations</span>
            <button
              role="switch"
              aria-checked={glossaryEnabled}
              aria-label="Toggle field explanations"
              onClick={() => onGlossaryToggle(!glossaryEnabled)}
              className="relative inline-block shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A96A]"
              style={{
                height: 24, width: 44, padding: 0, borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.12)',
                background: glossaryEnabled ? 'rgba(196,169,106,0.35)' : 'rgba(255,255,255,0.08)',
              }}
            >
              <span className="absolute rounded-full" style={{ top: 2, left: glossaryEnabled ? 21 : 2, width: 18, height: 18, background: glossaryEnabled ? '#C4A96A' : 'rgba(148,163,184,0.6)', boxShadow: '0 1px 2px rgba(0,0,0,0.4)', transition: 'left 0.18s, background 0.18s' }} />
            </button>
          </div>
          {/* Save + Clear row */}
          <div className="flex items-center gap-3">
            {valuationRunId && (
              <button
                onClick={() => { onSave(); setUtilMenuOpen(false); }}
                disabled={saveStatus === 'saving'}
                className="flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#C4A96A] focus-visible:outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 6, fontSize: 13, fontWeight: 600 }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" strokeLinejoin="miter">
                  <path d="M11 12H3a1 1 0 01-1-1V3a1 1 0 011-1h6.5l2.5 2.5V11a1 1 0 01-1 1z" />
                  <path d="M4 2v3h5V2M4 12V8h6v4" />
                </svg>
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save'}
              </button>
            )}
            <button
              onClick={() => { onReset(); setUtilMenuOpen(false); }}
              className="flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A96A]"
              style={{ background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 6, fontSize: 13, fontWeight: 600 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Band 2: Masthead -- identity, EV, confidence */}
      <div
        className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-7"
        style={{
          padding: '14px 22px',
        }}
      >
        {/* Identity: CompanyMark + name + badges */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div
            className="shrink-0 grid place-items-center"
            style={{
              width: 42,
              height: 42,
              border: '1px solid rgba(196,169,106,0.30)',
              background: 'linear-gradient(135deg, rgba(196,169,106,0.10) 0%, rgba(196,169,106,0.02) 100%)',
              borderRadius: 4,
              fontFamily: 'Inter, var(--font-sans), sans-serif',
              fontSize: 22,
              fontWeight: 500,
              color: '#D9BD7E',
              letterSpacing: -0.5,
            }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex items-center gap-2.5 flex-wrap">
            <h1
              className="m-0 truncate"
              style={{
                fontFamily: 'Inter, var(--font-sans), sans-serif',
                fontSize: 26,
                fontWeight: 500,
                letterSpacing: -0.6,
                lineHeight: 1.05,
                color: '#f1f5f9',
              }}
            >
              {companyName}
            </h1>
            <span className={`px-2 py-0.5 rounded text-[11px] font-medium shrink-0 ${stageBadgeColor(stage)}`}>
              {stageLabel(stage)}
            </span>
          </div>
        </div>

        <span aria-hidden="true" className="hidden sm:inline-block" style={{ width: 1, height: 56, background: 'rgba(255,255,255,0.16)' }} />

        {/* Hero EV + Confidence — stacked on mobile, side by side on sm+ */}
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-7 w-full sm:w-auto">
          {/* Hero EV */}
          <div>
            <div
              style={{
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 700,
                fontSize: 11.5,
                color: '#cbd5e1',
                marginBottom: 4,
              }}
            >
              Enterprise Value
            </div>
            <div className="flex items-baseline gap-2">
              <GlossaryTooltip fieldKey="enterprise_value">
                <span
                  role="status"
                  aria-live="polite"
                  className="text-[26px] sm:text-[38px]"
                  style={{
                    fontFamily: "JetBrains Mono, var(--font-mono), monospace",
                    fontWeight: 700,
                    letterSpacing: -1.4,
                    lineHeight: 1,
                    color: '#D9BD7E',
                    textShadow: '0 0 30px rgba(196,169,106,0.18)',
                    fontVariantNumeric: 'tabular-nums',
                    fontFeatureSettings: '"tnum" 1, "ss01" 1',
                  }}
                >
                  {formatCurrency(enterpriseValue)}
                </span>
              </GlossaryTooltip>
              <span
                style={{
                  fontSize: 12,
                  color: '#cbd5e1',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                EV
              </span>
            </div>
            {evLow != null && evHigh != null && evLow !== evHigh && (
              <div
                style={{
                  fontFamily: "JetBrains Mono, var(--font-mono), monospace",
                  fontSize: 12,
                  color: '#94a3b8',
                  fontVariantNumeric: 'tabular-nums',
                  marginTop: 2,
                }}
              >
                {formatCurrency(evLow)} &ndash; {formatCurrency(evHigh)}
              </div>
            )}
          </div>

          {/* Confidence */}
          <div className="sm:min-w-[200px]">
            <div className="flex justify-between items-baseline gap-3" style={{ marginBottom: 4 }}>
              <span
                style={{
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 700,
                  fontSize: 11.5,
                  color: '#cbd5e1',
                }}
              >
                Confidence
              </span>
              <GlossaryTooltip fieldKey="confidence">
                <span
                  style={{
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontWeight: 700,
                    fontSize: 11.5,
                    color: tier.color,
                  }}
                >
                  {tier.label}
                </span>
              </GlossaryTooltip>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={clock.pulsing ? 'animate-pulse' : ''}
                style={{
                  fontFamily: "JetBrains Mono, var(--font-mono), monospace",
                  fontSize: 26,
                  fontWeight: 700,
                  color: tier.color,
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {clampedPct}
                <span style={{ fontSize: 14, color: '#cbd5e1' }}>%</span>
              </span>
            </div>
            {/* 12-segment pip bar — WCAG-5: aria-label for screen readers */}
            <div className="flex gap-0.5" role="img" aria-label={`Confidence ${clampedPct}%, ${tier.label} tier, ${filled} of ${segments} segments filled`} style={{ marginTop: 6, width: '100%', maxWidth: 180 }}>
              {Array.from({ length: segments }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    flex: 1,
                    height: 6,
                    background: i < filled ? tier.color : 'rgba(255,255,255,0.08)',
                    opacity: i < filled ? 0.55 + 0.04 * i : 1,
                    borderRadius: 1,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FounderMeta strip — only render if any data exists */}
      {founderMeta && (founderMeta.arr != null || founderMeta.runwayMonths != null || founderMeta.growthYoYPct != null || founderMeta.targetRaiseAmount != null || founderMeta.companiesHouseNumber != null) && (
        <div className="relative">
        <div
          className="flex items-center gap-5 overflow-x-auto scrollbar-hide"
          style={{
            padding: '7px 22px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.015)',
            overscrollBehaviorX: 'contain',
          }}
        >
          {founderMeta.targetRaiseAmount != null && (
            <MetricChip label="Raising" value={formatCurrency(founderMeta.targetRaiseAmount)} accent />
          )}
          {founderMeta.targetRoundType && (
            <MetricChip label="Target" value={founderMeta.targetRoundType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} />
          )}
          {founderMeta.arr != null && (
            <MetricChip label="ARR" value={formatCurrency(founderMeta.arr)} />
          )}
          {founderMeta.growthYoYPct != null && (
            <MetricChip label="Growth" value={`${founderMeta.growthYoYPct > 0 ? '+' : ''}${founderMeta.growthYoYPct.toFixed(0)}%`} />
          )}
          {founderMeta.runwayMonths != null && (
            <MetricChip label="Runway" value={`${founderMeta.runwayMonths.toFixed(0)} mo`} />
          )}
          {founderMeta.companiesHouseNumber && (
            <MetricChip label="CH" value={founderMeta.companiesHouseNumber} />
          )}
        </div>
        {/* Scroll fade indicators — BUG-M12 */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:hidden" style={{ background: 'linear-gradient(to left, var(--background), transparent)' }} aria-hidden="true" />
        </div>
      )}

      {/* Band 3: Buyer type rail + status ticker */}
      <div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0"
        style={{
          padding: '10px 12px',
          borderTop: '1px solid rgba(255,255,255,0.10)',
          background: 'rgba(0,0,0,0.22)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3.5 flex-1 min-w-0">
          <span
            className="shrink-0"
            style={{
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 700,
              fontSize: 11.5,
              color: '#cbd5e1',
            }}
          >
            Buyer lens
          </span>
          <div
            role="tablist"
            className="flex flex-wrap gap-1.5 sm:inline-flex sm:flex-nowrap sm:overflow-x-auto sm:scrollbar-hide"
            style={{
              border: '1px solid rgba(255,255,255,0.16)',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 6,
              padding: 3,
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
              overscrollBehaviorX: 'contain',
            }}
          >
            {BUYER_TYPES.map((bt) => {
              const isActive = selectedBuyerType === bt;
              return (
                <button
                  key={bt}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onBuyerTypeChange(bt)}
                  className="whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A96A]"
                  style={{
                    padding: '5px 10px',
                    background: isActive ? 'rgba(196,169,106,0.18)' : 'transparent',
                    color: isActive ? '#D9BD7E' : '#cbd5e1',
                    border: isActive ? '1px solid rgba(196,169,106,0.35)' : '1px solid transparent',
                    borderRadius: 4,
                    fontSize: 11.5,
                    fontWeight: 600,
                    letterSpacing: 0.02,
                    transition: 'background 0.12s, color 0.12s',
                  }}
                >
                  {BUYER_TYPE_LABELS[bt]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <span
            className="hidden sm:inline-flex items-center gap-2"
            style={{
              fontFamily: "JetBrains Mono, var(--font-mono), monospace",
              fontSize: 12,
              color: '#cbd5e1',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: '#34d399',
                boxShadow: '0 0 0 3px rgba(52,211,153,0.18)',
                animation: 'ticker-pulse 2.4s ease-in-out infinite',
              }}
            />
            <span>{clock.label.toUpperCase()} &middot; LAST RUN {lastRunLabel}</span>
          </span>

          <span aria-hidden="true" className="hidden sm:inline" style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.16)' }} />

          <Link
            href="/documents?action=studio"
            aria-label="Open Goto Studio"
            className="hidden sm:inline-flex items-center gap-[9px] shrink-0 cursor-pointer focus-visible:outline-none"
            style={{
              height: 30,
              padding: '0 14px',
              background: 'linear-gradient(135deg, rgba(196,169,106,0.16) 0%, rgba(196,169,106,0.06) 100%)',
              color: '#D9BD7E',
              border: '1px solid rgba(196,169,106,0.55)',
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 0.2,
              boxShadow: '0 0 0 1px rgba(196,169,106,0.10) inset, 0 0 18px -8px rgba(196,169,106,0.55)',
              textDecoration: 'none',
            }}
          >
            <span
              className="inline-flex items-center justify-center"
              style={{
                width: 18,
                height: 18,
                borderRadius: 3,
                background: 'rgba(196,169,106,0.22)',
                color: '#D9BD7E',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square">
                <path d="M9.5 2.5l2 2L5 11l-3 1 1-3 6.5-6.5z" />
              </svg>
            </span>
            <span>Goto&nbsp;Studio</span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: 0.12,
                textTransform: 'uppercase',
                padding: '2px 5px',
                borderRadius: 2,
                background: 'rgba(196,169,106,0.22)',
                color: '#D9BD7E',
                border: '1px solid rgba(196,169,106,0.35)',
              }}
            >
              Agent
            </span>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
              <path d="M2 5.5h7m-2.5-2.5L9 5.5 6.5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" strokeLinejoin="miter" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
