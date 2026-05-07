'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { SensitivityVariable } from '@/lib/valuation/sensitivity';
import { formatCurrency } from '@/lib/valuation/dashboard-types';
import GlossaryTooltip from './GlossaryTooltip';

// ── Types ─────────────────────────────────────────────────────────────

type SliderState = Record<string, number>;
const MAX_HISTORY = 50;

// ── Props ─────────────────────────────────────────────────────────────

export type SensitivitySlidersProps = {
  variables: SensitivityVariable[];
  baseEV: number;
  /**
   * Called when any slider changes. Parent should recompute EV
   * using the updated scenario shocks and call back with new value.
   */
  onRecalculate: (overrides: Record<string, number>) => number;
};

// ── Single slider row ─────────────────────────────────────────────────

function SliderRow({
  variable,
  value,
  originalValue,
  onChange,
  impactEV,
  baseEV,
  showGhost,
}: {
  variable: SensitivityVariable;
  value: number;
  originalValue?: number;
  onChange: (key: string, val: number) => void;
  impactEV: number;
  baseEV: number;
  showGhost: boolean;
}) {
  const impactPct = baseEV > 0 ? ((impactEV - baseEV) / baseEV) * 100 : 0;
  const isPositive = impactPct >= 0;
  const range = variable.max - variable.min;
  const fillPct = range > 0 ? ((value - variable.min) / range) * 100 : 0;
  const isChanged = value !== variable.currentValue;

  // Ghost marker position (original value in isolation mode)
  const ghostPct =
    showGhost && originalValue !== undefined && range > 0
      ? ((originalValue - variable.min) / range) * 100
      : null;

  return (
    <div className="py-3 border-b border-white/5 last:border-b-0">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium text-text-primary">
          <GlossaryTooltip fieldKey={variable.key}>
            <span>{variable.name}</span>
          </GlossaryTooltip>
        </label>
        <div className="flex items-center gap-3">
          <span className="text-xs tabular-nums text-text-secondary">
            {variable.unit === '%'
              ? `${value > 0 ? '+' : ''}${value.toFixed(0)}%`
              : value.toFixed(2)}
          </span>
          <span
            className={`text-xs tabular-nums font-medium ${
              isPositive ? 'text-jade-upside' : 'text-coral-downside'
            }`}
          >
            {isPositive ? '▲ +' : '▼ '}
            {impactPct.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[11px] text-text-secondary w-10 text-right tabular-nums">
          {variable.min}
        </span>
        <div className="relative flex-1">
          {/* Floating EV readout (visible when value differs from default) */}
          {isChanged && (
            <div
              className="absolute -top-6 -translate-x-1/2 pointer-events-none"
              style={{ left: `${fillPct}%` }}
            >
              <span className="text-[11px] font-mono px-1 py-0.5 rounded bg-black/70 text-[var(--color-aurum-primary)] whitespace-nowrap">
                {formatCurrency(impactEV)}
              </span>
            </div>
          )}

          {/* Ghost marker (isolation mode — shows original position) */}
          {ghostPct !== null && Math.abs(ghostPct - fillPct) > 0.5 && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-white/25 pointer-events-none z-10"
              style={{ left: `${ghostPct}%` }}
              title={`Original: ${originalValue}`}
            />
          )}

          <input
            type="range"
            min={variable.min}
            max={variable.max}
            step={variable.step}
            value={value}
            onChange={(e) => onChange(variable.key, parseFloat(e.target.value))}
            aria-label={variable.name}
            aria-valuenow={value}
            aria-valuemin={variable.min}
            aria-valuemax={variable.max}
            aria-valuetext={
              variable.unit === '%'
                ? `${value > 0 ? '+' : ''}${value.toFixed(0)} percent`
                : `${value.toFixed(2)}`
            }
            className="aurum-slider w-full h-2 rounded-full appearance-none cursor-pointer touch-action-none
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-8
              [&::-webkit-slider-thumb]:h-8
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-[var(--color-aurum-primary,#C4A96A)]
              [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:border-[var(--color-aurum-highlight,#E8D49D)]
              [&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(196,169,106,0.4)]
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-moz-range-thumb]:w-8
              [&::-moz-range-thumb]:h-8
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-[var(--color-aurum-primary,#C4A96A)]
              [&::-moz-range-thumb]:border-2
              [&::-moz-range-thumb]:border-[var(--color-aurum-highlight,#E8D49D)]
              [&::-moz-range-thumb]:shadow-[0_2px_8px_rgba(196,169,106,0.4)]
              [&::-moz-range-thumb]:cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--color-aurum-primary, #C4A96A) 0%, var(--color-aurum-primary, #C4A96A) ${fillPct}%, rgba(255,255,255,0.1) ${fillPct}%)`,
            }}
          />
        </div>
        <span className="text-[11px] text-text-secondary w-10 tabular-nums">
          {variable.max}
        </span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────

export default function SensitivitySliders({
  variables,
  baseEV,
  onRecalculate,
}: SensitivitySlidersProps) {
  const initialValues = useMemo(() => {
    const vals: SliderState = {};
    for (const v of variables) {
      vals[v.key] = v.currentValue;
    }
    return vals;
  }, [variables]);

  // ── Slider state ──
  const [values, setValues] = useState<SliderState>(initialValues);
  const [currentEV, setCurrentEV] = useState(baseEV);

  // ── Undo / Redo (refs avoid stale closures) ──
  const historyRef = useRef<SliderState[]>([initialValues]);
  const historyIdxRef = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Keep onRecalculate ref fresh for use in undo/redo
  const recalcRef = useRef(onRecalculate);
  recalcRef.current = onRecalculate;

  // ── Isolation mode ──
  const [isolationMode, setIsolationMode] = useState(false);
  const [isolatedValues, setIsolatedValues] = useState<SliderState | null>(null);
  const [isolatedEV, setIsolatedEV] = useState(baseEV);

  // ── Toast ──
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMsg(msg);
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 2000);
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // ── Derived state ──
  const activeValues = isolationMode && isolatedValues ? isolatedValues : values;
  const activeEV = isolationMode ? isolatedEV : currentEV;

  // ── History helpers ──
  function pushHistory(newValues: SliderState) {
    const h = historyRef.current;
    historyRef.current = [...h.slice(0, historyIdxRef.current + 1), newValues].slice(-MAX_HISTORY);
    historyIdxRef.current = historyRef.current.length - 1;
    setCanUndo(historyIdxRef.current > 0);
    setCanRedo(false);
  }

  function undo() {
    if (isolationMode || historyIdxRef.current <= 0) return;
    historyIdxRef.current -= 1;
    const prev = historyRef.current[historyIdxRef.current];
    setValues(prev);
    setCurrentEV(recalcRef.current(prev));
    setCanUndo(historyIdxRef.current > 0);
    setCanRedo(true);
    showToast('Undo');
  }

  function redo() {
    if (isolationMode || historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current += 1;
    const next = historyRef.current[historyIdxRef.current];
    setValues(next);
    setCurrentEV(recalcRef.current(next));
    setCanUndo(true);
    setCanRedo(historyIdxRef.current < historyRef.current.length - 1);
    showToast('Redo');
  }

  // ── Keyboard shortcuts (Ctrl+Z / Ctrl+Shift+Z) ──
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;

      // Don't hijack undo/redo from text inputs
      const el = document.activeElement;
      if (el) {
        const tag = el.tagName.toLowerCase();
        if (tag === 'input' && (el as HTMLInputElement).type !== 'range') return;
        if (tag === 'textarea') return;
        if ((el as HTMLElement).isContentEditable) return;
      }

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        redo();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // ── Handlers ──

  const handleChange = useCallback(
    (key: string, val: number) => {
      if (isolationMode && isolatedValues) {
        const next = { ...isolatedValues, [key]: val };
        setIsolatedValues(next);
        setIsolatedEV(recalcRef.current(next));
      } else {
        const next = { ...values, [key]: val };
        setValues(next);
        setCurrentEV(recalcRef.current(next));
        pushHistory(next);
      }
    },
    [values, isolatedValues, isolationMode],
  );

  const handleReset = useCallback(() => {
    if (isolationMode) {
      setIsolatedValues({ ...values });
      setIsolatedEV(recalcRef.current(values));
      showToast('Isolation sliders reset');
    } else {
      setValues(initialValues);
      setCurrentEV(baseEV);
      pushHistory(initialValues);
      showToast('All sliders reset');
    }
  }, [isolationMode, values, initialValues, baseEV]);

  const enterIsolation = useCallback(() => {
    setIsolationMode(true);
    setIsolatedValues({ ...values });
    setIsolatedEV(currentEV);
    showToast('Isolation mode — changes are sandboxed');
  }, [values, currentEV]);

  const applyIsolation = useCallback(() => {
    if (isolatedValues) {
      setValues(isolatedValues);
      const newEV = recalcRef.current(isolatedValues);
      setCurrentEV(newEV);
      pushHistory(isolatedValues);
    }
    setIsolationMode(false);
    setIsolatedValues(null);
    showToast('Changes applied to main model');
  }, [isolatedValues]);

  const discardIsolation = useCallback(() => {
    setIsolationMode(false);
    setIsolatedValues(null);
    showToast('Changes discarded');
  }, []);

  // ── Computed ──

  const totalImpactPct = baseEV > 0 ? ((activeEV - baseEV) / baseEV) * 100 : 0;
  const isPositive = totalImpactPct >= 0;

  // ── Empty state ──

  if (variables.length === 0) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-2">
          Sensitivity Analysis
        </h3>
        <p className="text-xs text-text-secondary">No sensitivity variables available.</p>
      </div>
    );
  }

  // ── Render ──

  return (
    <>
      {/* Firefox range track styles */}
      <style>{`
        .aurum-slider::-moz-range-track {
          background: rgba(255,255,255,0.1);
          height: 6px;
          border-radius: 3px;
          border: none;
        }
        .aurum-slider::-moz-range-progress {
          background: var(--color-aurum-primary, #C4A96A);
          height: 6px;
          border-radius: 3px;
          border: none;
        }
      `}</style>

      <div
        className="glass-card p-6"
        style={isolationMode ? { border: '1px solid rgba(196, 169, 106, 0.3)' } : undefined}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-text-primary">
              Sensitivity Analysis
            </h3>
            {/* Isolation toggle */}
            {!isolationMode ? (
              <button
                onClick={enterIsolation}
                className="text-[11px] font-medium px-2 py-1 rounded-md transition-colors text-text-secondary hover:bg-white/[0.08]"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                Isolate
              </button>
            ) : (
              <span
                className="text-[11px] font-semibold px-2 py-1 rounded-md select-none"
                style={{
                  background: 'rgba(196, 169, 106, 0.15)',
                  border: '1px solid rgba(196, 169, 106, 0.25)',
                  color: 'var(--color-aurum-primary)',
                }}
              >
                ISOLATION ON
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Undo / Redo (main mode only) */}
            {!isolationMode && (
              <div className="flex items-center gap-1 mr-2">
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  className="p-1 rounded text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors"
                  aria-label="Undo"
                  title="Undo (Ctrl+Z)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 7v6h6" />
                    <path d="M3 13a9 9 0 0 1 15.36-6.36L21 9" />
                  </svg>
                </button>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  className="p-1 rounded text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors"
                  aria-label="Redo"
                  title="Redo (Ctrl+Shift+Z)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 7v6h-6" />
                    <path d="M21 13a9 9 0 0 0-15.36-6.36L3 9" />
                  </svg>
                </button>
              </div>
            )}
            <button
              onClick={handleReset}
              className="text-[11px] text-[var(--color-aurum-primary)] hover:text-[var(--color-aurum-highlight)] transition-colors"
            >
              Reset All
            </button>
          </div>
        </div>

        {/* Isolation mode banner */}
        {isolationMode && (
          <div
            className="mb-4 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            style={{
              background: 'rgba(196, 169, 106, 0.08)',
              border: '1px solid rgba(196, 169, 106, 0.15)',
            }}
          >
            <div>
              <span className="text-[11px] font-semibold text-[var(--color-aurum-primary)] uppercase tracking-wider">
                Isolation Mode
              </span>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Changes are sandboxed. Apply when ready.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={discardIsolation}
                className="flex-1 sm:flex-none text-[11px] px-3 py-1.5 min-h-[44px] sm:min-h-0 rounded-md text-text-secondary hover:text-text-primary transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                Discard
              </button>
              <button
                onClick={applyIsolation}
                className="flex-1 sm:flex-none text-[11px] px-3 py-1.5 min-h-[44px] sm:min-h-0 rounded-md font-medium transition-colors"
                style={{
                  background: 'rgba(196, 169, 106, 0.2)',
                  border: '1px solid rgba(196, 169, 106, 0.3)',
                  color: 'var(--color-aurum-primary)',
                }}
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {/* Live EV display */}
        <div
          className="mb-4 p-3 glass-inner flex items-center justify-between"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div>
            <span className="text-[11px] text-text-secondary uppercase tracking-wider block">
              {isolationMode ? 'Sandboxed EV' : 'Adjusted Enterprise Value'}
            </span>
            <span className="text-lg font-bold tabular-nums text-text-primary">
              {formatCurrency(activeEV)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-text-secondary block">vs Base</span>
            <span
              className={`text-sm font-bold tabular-nums ${
                isPositive ? 'text-jade-upside' : 'text-coral-downside'
              }`}
            >
              {isPositive ? '+' : ''}
              {totalImpactPct.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Slider rows */}
        {variables.map((v) => {
          const soloOverrides = { ...initialValues, [v.key]: activeValues[v.key] };
          const soloEV = onRecalculate(soloOverrides);

          return (
            <SliderRow
              key={v.key}
              variable={v}
              value={activeValues[v.key]}
              originalValue={isolationMode ? values[v.key] : undefined}
              onChange={handleChange}
              impactEV={soloEV}
              baseEV={baseEV}
              showGhost={isolationMode}
            />
          );
        })}

        <p className="text-[11px] text-text-secondary mt-3 text-center">
          {isolationMode
            ? 'Isolation mode: adjust freely, then Apply or Discard.'
            : 'Drag sliders to see real-time impact. Ctrl+Z to undo.'}
        </p>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-xs font-medium shadow-xl"
          style={{
            background: 'var(--color-graphite, #1B2333)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--foreground)',
          }}
          role="status"
          aria-live="polite"
        >
          {toastMsg}
        </div>
      )}
    </>
  );
}
