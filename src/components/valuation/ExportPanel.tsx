'use client';

import React, { useState, useCallback } from 'react';

// ── Props ────────────────────────────────────────────────────────────

export type ExportPanelProps = {
  valuationRunId: string | null;
  companyName: string;
};

// ── Audience groups + formats ───────────────────────────────────────

type AudienceGroup = {
  id: string;
  label: string;
  description: string;
  formats: ExportFormat[];
};

type ExportFormat = {
  id: string;
  label: string;
  description: string;
  format: string;
  iconType: 'json' | 'csv' | 'svg' | 'pdf';
};

const FORMAT_ICONS: Record<string, React.ReactElement> = {
  json: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7c0-1.1.9-2 2-2h8l4 4v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" />
      <path d="M9 13h6" />
      <path d="M9 17h3" />
    </svg>
  ),
  csv: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7c0-1.1.9-2 2-2h8l4 4v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
      <line x1="12" y1="9" x2="12" y2="21" />
    </svg>
  ),
  svg: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  pdf: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7c0-1.1.9-2 2-2h8l4 4v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
};

const AUDIENCE_GROUPS: AudienceGroup[] = [
  {
    id: 'board',
    label: 'Board / Exec',
    description: 'High-level summaries for board meetings',
    formats: [
      {
        id: 'json',
        label: 'Full Data (JSON)',
        description: 'Complete valuation data for internal models',
        format: 'json',
        iconType: 'json',
      },
    ],
  },
  {
    id: 'fpa',
    label: 'FP&A / Internal',
    description: 'Detailed breakdowns for financial planning',
    formats: [
      {
        id: 'csv-methods',
        label: 'Methods (CSV)',
        description: 'Method breakdown with weights, stage fit, EV bands',
        format: 'csv-methods',
        iconType: 'csv',
      },
      {
        id: 'csv-sensitivity',
        label: 'Sensitivity (CSV)',
        description: 'Tornado chart data — variable impacts on EV',
        format: 'csv-sensitivity',
        iconType: 'csv',
      },
    ],
  },
  {
    id: 'investors',
    label: 'Investors / LPs',
    description: 'Polished materials for investor presentations',
    formats: [
      {
        id: 'csv-scenarios',
        label: 'Scenarios (CSV)',
        description: 'Bull/Base/Bear with probability-weighted EV',
        format: 'csv-scenarios',
        iconType: 'csv',
      },
      {
        id: 'timeline-svg',
        label: 'Timeline (SVG)',
        description: 'Valuation history chart for investor packs',
        format: 'timeline-svg',
        iconType: 'svg',
      },
    ],
  },
];

// ── Helpers ─────────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateTimelineSvg(companyName: string): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="200" viewBox="0 0 800 200">
  <rect width="800" height="200" fill="#0a0c14" rx="8"/>
  <text x="24" y="32" font-family="Inter, sans-serif" font-size="14" font-weight="600" fill="#e2e8f0">${companyName} — Valuation Timeline</text>
  <text x="24" y="52" font-family="Inter, sans-serif" font-size="11" fill="#94a3b8">Generated ${dateStr} · CLUES Intelligence LTD</text>
  <line x1="60" y1="100" x2="740" y2="100" stroke="#334155" stroke-width="1.5" stroke-dasharray="4 3"/>
  <circle cx="400" cy="100" r="6" fill="#C4A96A" stroke="#C4A96A" stroke-width="2"/>
  <text x="400" y="130" font-family="Inter, sans-serif" font-size="11" fill="#C4A96A" text-anchor="middle">${dateStr}</text>
  <text x="24" y="185" font-family="Inter, sans-serif" font-size="9" fill="#64748b">Indicative only. Not financial advice. CLUES Intelligence LTD.</text>
</svg>`;
}

// ── Component ───────────────────────────────────────────────────────

export default function ExportPanel({
  valuationRunId,
  companyName,
}: ExportPanelProps) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = useCallback(
    async (format: ExportFormat) => {
      if (!valuationRunId) return;
      setDownloading(format.id);

      try {
        // Timeline SVG is generated client-side (no API call needed)
        if (format.format === 'timeline-svg') {
          const svg = generateTimelineSvg(companyName);
          const blob = new Blob([svg], { type: 'image/svg+xml' });
          downloadBlob(blob, `${companyName.replace(/\s+/g, '-').toLowerCase()}-timeline.svg`);
          return;
        }

        const res = await fetch('/api/valuation/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ runId: valuationRunId, format: format.format }),
        });

        if (!res.ok) {
          throw new Error(`Export failed: HTTP ${res.status}`);
        }

        const blob = await res.blob();
        const ext = format.format.startsWith('csv') ? 'csv' : 'json';
        downloadBlob(blob, `${companyName.replace(/\s+/g, '-').toLowerCase()}-${format.id}.${ext}`);
      } catch (err) {
        console.error('Export failed:', err);
      } finally {
        setDownloading(null);
      }
    },
    [valuationRunId, companyName],
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
              Export Studio
            </h2>
            <p className="text-[11px] text-text-secondary mt-0.5">
              Download valuation data grouped by audience. All exports include disclaimer.
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors print:hidden"
            style={{
              background: 'rgba(196,169,106,0.12)',
              border: '1px solid rgba(196,169,106,0.25)',
              color: 'var(--color-aurum-primary)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print Report
          </button>
        </div>
      </div>

      {/* Audience groups */}
      {AUDIENCE_GROUPS.map((group) => (
        <div key={group.id} className="glass-card p-5">
          <div className="mb-3">
            <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
              {group.label}
            </h3>
            <p className="text-[11px] text-text-secondary">{group.description}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {group.formats.map((format) => {
              const isDownloading = downloading === format.id;
              const isDisabled = !valuationRunId || isDownloading;

              return (
                <button
                  key={format.id}
                  onClick={() => void handleDownload(format)}
                  disabled={isDisabled}
                  className="group flex items-start gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-cyan-interactive/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-cyan-interactive/10 border border-cyan-interactive/20 flex items-center justify-center text-cyan-interactive group-hover:bg-cyan-interactive/20 transition-colors">
                    {isDownloading ? (
                      <span className="inline-block w-3.5 h-3.5 border-2 border-cyan-interactive border-t-transparent rounded-full animate-spin" />
                    ) : (
                      FORMAT_ICONS[format.iconType]
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary group-hover:text-cyan-interactive transition-colors">
                      {format.label}
                    </p>
                    <p className="text-[11px] text-text-secondary leading-relaxed">
                      {format.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {!valuationRunId && (
        <div className="glass-card p-4 text-center">
          <p className="text-[11px] text-text-secondary">
            Run a valuation first to enable exports.
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="p-2 rounded bg-white/[0.02] border border-white/5">
        <p className="text-[11px] text-text-tertiary text-center">
          All exports include disclaimer: Indicative only. Not financial advice. CLUES Intelligence LTD.
        </p>
      </div>
    </div>
  );
}
