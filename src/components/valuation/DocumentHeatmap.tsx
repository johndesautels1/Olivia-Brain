'use client';

import { motion, useReducedMotion } from 'framer-motion';
import ProvenanceChip from './ProvenanceChip';

// ── Field definitions for the heatmap ────────────────────────────────

const HEATMAP_FIELDS = [
  { key: 'annualRevenue', label: 'Annual Revenue' },
  { key: 'arr', label: 'ARR' },
  { key: 'grossMarginPct', label: 'Gross Margin' },
  { key: 'ebitda', label: 'EBITDA' },
  { key: 'ebitdaMarginPct', label: 'EBITDA Margin' },
  { key: 'burnMonthly', label: 'Monthly Burn' },
  { key: 'runwayMonths', label: 'Runway' },
  { key: 'growthYoYPct', label: 'YoY Growth' },
  { key: 'netRevenueRetentionPct', label: 'NRR' },
  { key: 'churnPct', label: 'Churn' },
  { key: 'cashOnHand', label: 'Cash on Hand' },
  { key: 'tam', label: 'TAM' },
  { key: 'sam', label: 'SAM' },
  { key: 'capitalRaisedToDate', label: 'Capital Raised' },
  { key: 'lastRoundPreMoney', label: 'Pre-Money' },
  { key: 'capitalizedBuildCost', label: 'Build Cost' },
  { key: 'replacementCost', label: 'Replacement Cost' },
] as const;

type FieldSource = 'uploaded' | 'manual' | 'inferred' | 'missing';

type FieldStatus = {
  source: FieldSource;
  confidence: number;
};

// ── Determine field status from input snapshot ───────────────────────

function getFieldStatus(
  fieldKey: string,
  inputSnapshot: Record<string, unknown> | null,
): FieldStatus {
  if (!inputSnapshot) {
    return { source: 'missing', confidence: 0 };
  }

  const field = inputSnapshot[fieldKey] as
    | { value: number | null; confidence?: number; refs?: unknown[] }
    | undefined;

  if (!field || field.value === null || field.value === undefined) {
    return { source: 'missing', confidence: 0 };
  }

  const conf = field.confidence ?? 0.5;
  const hasRefs = Array.isArray(field.refs) && field.refs.length > 0;

  if (hasRefs) {
    return { source: 'uploaded', confidence: conf };
  }

  if (conf >= 0.5) {
    return { source: 'manual', confidence: conf };
  }

  return { source: 'inferred', confidence: conf };
}

// ── Cell color ───────────────────────────────────────────────────────

function cellColor(status: FieldStatus): string {
  if (status.source === 'missing') {
    return 'bg-coral-downside/30 border-coral-downside/40 text-coral-downside';
  }
  if (status.source === 'inferred' || status.confidence < 0.5) {
    return 'bg-status-warning/20 border-status-warning/30 text-status-warning';
  }
  return 'bg-jade-upside/20 border-jade-upside/30 text-jade-upside';
}

function sourceLabel(source: FieldSource): string {
  const labels: Record<FieldSource, string> = {
    uploaded: 'Doc',
    manual: 'Verified',
    inferred: 'Inferred',
    missing: 'Missing',
  };
  return labels[source];
}

// ── Upload hint for missing fields ───────────────────────────────────

const UPLOAD_HINTS: Record<string, string> = {
  annualRevenue: 'Upload P&L or financial model',
  arr: 'Upload SaaS metrics dashboard or MRR report',
  grossMarginPct: 'Upload P&L statement',
  ebitda: 'Upload P&L statement',
  ebitdaMarginPct: 'Upload P&L statement',
  burnMonthly: 'Upload bank statements or cash flow report',
  runwayMonths: 'Upload treasury or cash report',
  growthYoYPct: 'Upload year-over-year comparison report',
  netRevenueRetentionPct: 'Upload cohort analysis or retention report',
  churnPct: 'Upload churn/retention metrics',
  cashOnHand: 'Upload balance sheet',
  tam: 'Upload market sizing deck or research',
  sam: 'Upload market sizing deck',
  capitalRaisedToDate: 'Upload cap table',
  lastRoundPreMoney: 'Upload term sheet or cap table',
  capitalizedBuildCost: 'Upload R&D spend report',
  replacementCost: 'Upload asset register or build cost estimate',
};

// ── Props ────────────────────────────────────────────────────────────

export type DocumentHeatmapProps = {
  inputSnapshot: Record<string, unknown> | null;
};

// ── Component ────────────────────────────────────────────────────────

export default function DocumentHeatmap({
  inputSnapshot,
}: DocumentHeatmapProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="glass-card p-6">
      <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">
        Data Completeness
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {HEATMAP_FIELDS.map(({ key, label }, i) => {
          const status = getFieldStatus(key, inputSnapshot);
          return (
            <motion.div
              key={key}
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { duration: 0.3, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }
              }
              className={`px-3 py-2 rounded-lg border text-xs ${cellColor(status)} cursor-default`}
              title={
                status.source === 'missing'
                  ? UPLOAD_HINTS[key] ?? 'Upload relevant document'
                  : `Source: ${sourceLabel(status.source)}, Confidence: ${Math.round(status.confidence * 100)}%`
              }
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium truncate">
                  <ProvenanceChip fieldKey={key} inputSnapshot={inputSnapshot} />
                  {label}
                </span>
                <span className="shrink-0 ml-2">
                  {sourceLabel(status.source)}
                </span>
              </div>
              {status.source === 'missing' && (
                <p className="mt-0.5 text-[11px]">
                  {UPLOAD_HINTS[key] ?? 'Upload relevant document'}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 mt-4 text-[11px] text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded shrink-0" style={{ background: 'rgba(52, 211, 153, 0.4)', border: '1px solid rgba(52, 211, 153, 0.6)' }} />
          High confidence
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded shrink-0" style={{ background: 'rgba(251, 191, 36, 0.35)', border: '1px solid rgba(251, 191, 36, 0.5)' }} />
          Low confidence / inferred
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded shrink-0" style={{ background: 'rgba(248, 113, 113, 0.4)', border: '1px solid rgba(248, 113, 113, 0.6)' }} />
          Missing
        </span>
      </div>
    </section>
  );
}
