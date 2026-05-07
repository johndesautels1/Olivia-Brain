'use client';

import { useState, useMemo } from 'react';
import type { ValuationRunResponse } from '@/lib/valuation/dashboard-types';
import ChartCard from './ChartCard';

// ── Props ────────────────────────────────────────────────────────────

export type EvidenceRoomProps = {
  evidenceChain: ValuationRunResponse['evidenceChain'];
  valuationRunId: string | null;
};

// ── Sort helpers ─────────────────────────────────────────────────────

type SortKey = 'type' | 'title' | 'page';
type SortDir = 'asc' | 'desc';

type EvidenceItem = ValuationRunResponse['evidenceChain'][number];

function sortEvidence(items: EvidenceItem[], key: SortKey, dir: SortDir): EvidenceItem[] {
  const sorted = [...items].sort((a, b) => {
    let cmp = 0;
    if (key === 'type') cmp = a.documentType.localeCompare(b.documentType);
    else if (key === 'title') cmp = (a.documentTitle || '').localeCompare(b.documentTitle || '');
    else if (key === 'page') cmp = (a.pageOrSlide ?? 999) - (b.pageOrSlide ?? 999);
    return dir === 'asc' ? cmp : -cmp;
  });
  return sorted;
}

// ── Extract domain name from URL for display ────────────────────────

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '');
  } catch {
    return url.slice(0, 40);
  }
}

// ── Column header ────────────────────────────────────────────────────

function ColHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = currentKey === sortKey;
  return (
    <th
      className="text-left text-[11px] font-semibold text-text-tertiary uppercase tracking-wider px-3 py-2 cursor-pointer select-none hover:text-text-primary transition-colors"
      onClick={() => onSort(sortKey)}
    >
      {label}
      {active && (
        <span className="ml-1 text-text-secondary">{currentDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
      )}
    </th>
  );
}

// ── External link icon ───────────────────────────────────────────────

function ExternalLinkIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline-block ml-1 -mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

// ── Component ────────────────────────────────────────────────────────

export default function EvidenceRoom({
  evidenceChain,
  valuationRunId,
}: EvidenceRoomProps) {
  const [sortKey, setSortKey] = useState<SortKey>('type');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(
    () => sortEvidence(evidenceChain, sortKey, sortDir),
    [evidenceChain, sortKey, sortDir],
  );

  const linkedCount = useMemo(
    () => evidenceChain.filter(e => e.sourceUrl).length,
    [evidenceChain],
  );

  if (!valuationRunId) {
    return null;
  }

  return (
    <ChartCard
      title="Evidence & Audit Ledger"
      subtitle={`${evidenceChain.length} source${evidenceChain.length !== 1 ? 's' : ''} linked${linkedCount > 0 ? ` \u00B7 ${linkedCount} cited` : ''}`}
      defaultCollapsed={evidenceChain.length > 5}
      newDataBadge={evidenceChain.length > 5}
    >
      {evidenceChain.length === 0 ? (
        <p className="text-xs text-text-secondary italic">
          No evidence documents linked to this valuation.
        </p>
      ) : (
        <>
        {/* Mobile card layout */}
        <div className="sm:hidden max-h-96 overflow-y-auto space-y-2">
          {sorted.map((ev) => (
            <div
              key={ev.chunkId}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-bold uppercase bg-cyan-interactive/10 text-cyan-interactive">
                  {ev.documentType.slice(0, 4)}
                </span>
                {ev.sourceUrl ? (
                  <a
                    href={ev.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group text-xs text-brand-400 font-medium truncate hover:underline"
                  >
                    {ev.documentTitle || ev.originalFilename || 'Untitled'}
                    <ExternalLinkIcon />
                  </a>
                ) : (
                  <span className="text-xs text-text-primary font-medium truncate">
                    {ev.documentTitle || ev.originalFilename || 'Untitled'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-text-secondary">
                <span className="tabular-nums">
                  {ev.pageOrSlide !== null ? `p.${ev.pageOrSlide}` : '\u2014'}
                  <span className="text-text-tertiary ml-1">#{ev.chunkIndex + 1}</span>
                </span>
                {ev.sourceUrl && (
                  <span className="text-text-tertiary text-[10px] truncate max-w-[140px]">
                    {extractDomain(ev.sourceUrl)}
                  </span>
                )}
              </div>
              {ev.contentPreview && (
                <p className="text-[11px] text-text-secondary mt-1 line-clamp-2">{ev.contentPreview}</p>
              )}
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-onyx/95 backdrop-blur-sm">
              <tr className="border-b border-white/[0.06]">
                <ColHeader label="Type" sortKey="type" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                <ColHeader label="Source" sortKey="title" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                <ColHeader label="Page" sortKey="page" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                <th className="text-left text-[11px] font-semibold text-text-tertiary uppercase tracking-wider px-3 py-2">
                  Preview
                </th>
                <th className="text-left text-[11px] font-semibold text-text-tertiary uppercase tracking-wider px-3 py-2">
                  Citation
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((ev) => (
                <tr
                  key={ev.chunkId}
                  className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors"
                >
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span
                      className="group relative inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-bold uppercase bg-cyan-interactive/10 text-cyan-interactive cursor-help"
                      title={ev.documentType}
                    >
                      {ev.documentType.slice(0, 4)}
                      <span
                        className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-50 pointer-events-none whitespace-nowrap rounded-md px-2.5 py-1.5 text-[10px] font-semibold normal-case tracking-normal"
                        style={{
                          background: 'rgba(15, 15, 20, 0.95)',
                          border: '1px solid rgba(196, 169, 106, 0.3)',
                          color: 'var(--text-primary, #e2e8f0)',
                          backdropFilter: 'blur(12px)',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                        }}
                      >
                        {ev.documentType}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-text-primary font-medium max-w-[200px] truncate">
                    {ev.documentTitle || ev.originalFilename || 'Untitled'}
                  </td>
                  <td className="px-3 py-2.5 text-text-secondary tabular-nums whitespace-nowrap">
                    {ev.pageOrSlide !== null ? `p.${ev.pageOrSlide}` : '\u2014'}
                    <span className="text-text-tertiary ml-1">#{ev.chunkIndex + 1}</span>
                  </td>
                  <td className="px-3 py-2.5 text-text-secondary max-w-[280px]">
                    <span className="line-clamp-1">{ev.contentPreview || '\u2014'}</span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {ev.sourceUrl ? (
                      <a
                        href={ev.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-brand-400 bg-brand-600/10 hover:bg-brand-600/20 transition-colors"
                      >
                        <span className="max-w-[120px] truncate">{extractDomain(ev.sourceUrl)}</span>
                        <ExternalLinkIcon />
                      </a>
                    ) : (
                      <span className="text-text-tertiary text-[11px] italic">Local file</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Citation summary footer */}
        {linkedCount > 0 && (
          <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-text-tertiary">
              {linkedCount} external citation{linkedCount !== 1 ? 's' : ''} linked
            </span>
            <span className="text-[10px] text-text-tertiary">
              — Click any citation to view the source article
            </span>
          </div>
        )}
        </>
      )}
    </ChartCard>
  );
}
