'use client';

import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';
import GlossaryTooltip from './GlossaryTooltip';

// ── ChartCard — standard wrapper for all valuation charts ────────────
//
// Provides consistent chrome: small-caps title, optional subtitle,
// monospace timestamp, glossary tooltip trigger, and caption slot.
// Replaces per-component glass-card boilerplate.
// Session 28: Added copy-chart-as-image with watermark.

export interface ChartCardProps {
  /** Chart title displayed in small-caps */
  title: string;
  /** Optional subtitle / "why it matters" line */
  subtitle?: string;
  /** Plain-English takeaway sentence displayed as a banner strip above chart content */
  takeaway?: string;
  /** Glossary key for the tooltip trigger on the title */
  glossaryKey?: string;
  /** ISO timestamp string — displayed as monospace relative or absolute time */
  timestamp?: string | null;
  /** Caption / takeaway text shown below the chart */
  caption?: ReactNode;
  /** Analyst note shown in muted text below caption */
  analystNote?: string;
  children: ReactNode;
  /** Additional className on the outer wrapper */
  className?: string;
  /** Start collapsed — content hidden behind a click-to-expand bar */
  defaultCollapsed?: boolean;
  /** Controlled collapsed state from parent (master toggle). Overrides internal state when defined. */
  forceCollapsed?: boolean;
  /** Show a discrete "New Data Available" badge when collapsed */
  newDataBadge?: boolean;
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 30) return `${diffD}d ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function ChartCard({
  title,
  subtitle,
  takeaway,
  glossaryKey,
  timestamp,
  caption,
  analystNote,
  children,
  className,
  defaultCollapsed = false,
  forceCollapsed,
  newDataBadge = false,
}: ChartCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copying, setCopying] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  // When master toggle (forceCollapsed) changes, sync internal state
  useEffect(() => {
    if (forceCollapsed !== undefined) {
      setCollapsed(forceCollapsed);
    }
  }, [forceCollapsed]);

  const handleCopyAsImage = useCallback(async () => {
    if (!cardRef.current || copying) return;
    setCopying(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0A1628',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      // Draw watermark
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.font = '14px "Inter Variable", Inter, sans-serif';
        ctx.fillStyle = '#C4A96A';
        ctx.textAlign = 'right';
        ctx.fillText('London Tech Map — Confidential', canvas.width - 20, canvas.height - 16);
        ctx.restore();
      }

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
        } catch {
          // Fallback: download
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${title.replace(/\s+/g, '-').toLowerCase()}-chart.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch {
      // html2canvas failed — silently fail
    } finally {
      setTimeout(() => setCopying(false), 1500);
    }
  }, [copying, title]);

  const titleEl = (
    <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-text-primary">
      {title}
    </span>
  );

  const isCollapsible = true;

  return (
    <div ref={cardRef} className={`glass-card ${collapsed ? 'p-0' : 'p-6'} ${className ?? ''}`}>
      {/* Header row */}
      <div
        className={`flex flex-wrap items-start justify-between gap-x-4 gap-y-1 ${collapsed ? 'p-4 cursor-pointer hover:bg-white/[0.03] transition-colors rounded-xl' : 'mb-4'}`}
        onClick={isCollapsible ? () => setCollapsed(!collapsed) : undefined}
        role={isCollapsible ? 'button' : undefined}
        tabIndex={isCollapsible ? 0 : undefined}
        onKeyDown={isCollapsible ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCollapsed(!collapsed); } } : undefined}
        aria-expanded={isCollapsible ? !collapsed : undefined}
      >
        <div className="min-w-0 flex items-center gap-3">
          {/* Chevron for collapsible cards */}
          {isCollapsible && (
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="rgba(196, 169, 106, 0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="shrink-0 transition-transform duration-200"
              style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
          <div className="min-w-0">
            <h3 className="leading-tight">
              {glossaryKey ? (
                <GlossaryTooltip fieldKey={glossaryKey}>{titleEl}</GlossaryTooltip>
              ) : (
                titleEl
              )}
            </h3>
            {subtitle && !collapsed && (
              <p className="text-[11px] text-text-primary mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* "New Data Available" badge when collapsed */}
          {collapsed && newDataBadge && (
            <span
              className="text-[11px] font-semibold tracking-[0.08em] uppercase px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(196, 169, 106, 0.12)',
                color: 'rgba(196, 169, 106, 0.85)',
                border: '1px solid rgba(196, 169, 106, 0.2)',
              }}
            >
              Updated Data Available
            </span>
          )}
          {/* Copy as image button (hidden when collapsed) */}
          {!collapsed && (
            <button
              onClick={(e) => { e.stopPropagation(); handleCopyAsImage(); }}
              disabled={copying}
              className="p-2.5 rounded hover:bg-white/[0.08] text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
              title={copying ? 'Copied!' : 'Copy chart as image'}
              aria-label={copying ? 'Copied to clipboard' : 'Copy chart as image'}
            >
              {copying ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-jade-upside)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
            </button>
          )}
          {timestamp && !collapsed && (
            <span className="text-[11px] font-mono text-text-secondary tabular-nums">
              {formatTimestamp(timestamp)}
            </span>
          )}
        </div>
      </div>

      {/* Collapsible body */}
      {!collapsed && (
        <>
          {/* Takeaway banner — plain-English summary sentence */}
          {takeaway && (
            <div className="mb-4 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
              <p className="text-[12px] leading-relaxed text-text-primary">
                <span className="font-semibold text-[#C4A96A] mr-1.5" aria-hidden="true">&#9656;</span>
                {takeaway}
              </p>
            </div>
          )}

          {/* Chart content */}
          {children}

          {/* Caption / takeaway */}
          {caption && (
            <div className="mt-3 text-[11px] text-text-primary leading-relaxed">
              {caption}
            </div>
          )}

          {/* Analyst note */}
          {analystNote && (
            <p className="mt-2 text-[11px] text-text-secondary italic leading-relaxed">
              {analystNote}
            </p>
          )}
        </>
      )}
    </div>
  );
}
