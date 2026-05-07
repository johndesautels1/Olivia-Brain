'use client';

// ═══════════════════════════════════════════════════════════════════════
// ProvenanceChip — Session 9
// 12x12 inline chip showing data provenance: [D] doc / [M] manual /
// [I] inferred / [?] missing. Hover reveals source doc, page, quote,
// confidence. Zero-fabrication differentiator.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo } from 'react';

// ── Types ────────────────────────────────────────────────────────────

export type ProvenanceSource = 'document' | 'manual' | 'inferred' | 'missing';

export type ProvenanceDetail = {
  source: ProvenanceSource;
  confidence: number;
  documentName?: string;
  pageOrSlide?: number | null;
  quote?: string | null;
};

// ── Derive provenance from inputSnapshot field ───────────────────────

export function getFieldProvenance(
  fieldKey: string,
  inputSnapshot: Record<string, unknown> | null,
): ProvenanceDetail {
  if (!inputSnapshot) {
    return { source: 'missing', confidence: 0 };
  }

  const field = inputSnapshot[fieldKey] as
    | { value: number | null; confidence?: number; refs?: { documentName?: string; pageOrSlide?: number | null; quote?: string }[] }
    | undefined;

  if (!field || field.value === null || field.value === undefined) {
    return { source: 'missing', confidence: 0 };
  }

  const conf = field.confidence ?? 0.5;
  const refs = Array.isArray(field.refs) ? field.refs : [];
  const firstRef = refs[0];

  if (refs.length > 0 && firstRef) {
    return {
      source: 'document',
      confidence: conf,
      documentName: firstRef.documentName,
      pageOrSlide: firstRef.pageOrSlide ?? null,
      quote: firstRef.quote ?? null,
    };
  }

  if (conf >= 0.7) {
    return { source: 'manual', confidence: conf };
  }

  return { source: 'inferred', confidence: conf };
}

// ── Visual config ────────────────────────────────────────────────────

const CHIP_CONFIG: Record<ProvenanceSource, { letter: string; bg: string; text: string; label: string }> = {
  document: {
    letter: 'D',
    bg: 'bg-jade-upside/25',
    text: 'text-jade-upside',
    label: 'Document-sourced',
  },
  manual: {
    letter: 'M',
    bg: 'bg-[var(--color-cyan-interactive)]/20',
    text: 'text-[var(--color-cyan-interactive)]',
    label: 'Manually entered',
  },
  inferred: {
    letter: 'I',
    bg: 'bg-status-warning/20',
    text: 'text-status-warning',
    label: 'Inferred / estimated',
  },
  missing: {
    letter: '?',
    bg: 'bg-coral-downside/20',
    text: 'text-coral-downside',
    label: 'Missing',
  },
};

// ── Props ────────────────────────────────────────────────────────────

export type ProvenanceChipProps = {
  /** Field key to look up in inputSnapshot */
  fieldKey?: string;
  /** Raw inputSnapshot from the valuation run */
  inputSnapshot?: Record<string, unknown> | null;
  /** Or pass provenance directly */
  provenance?: ProvenanceDetail;
};

// ── Component ────────────────────────────────────────────────────────

export default function ProvenanceChip({
  fieldKey,
  inputSnapshot,
  provenance: directProvenance,
}: ProvenanceChipProps) {
  const prov = useMemo(() => {
    if (directProvenance) return directProvenance;
    if (fieldKey && inputSnapshot !== undefined) {
      return getFieldProvenance(fieldKey, inputSnapshot ?? null);
    }
    return { source: 'missing' as const, confidence: 0 };
  }, [fieldKey, inputSnapshot, directProvenance]);

  const cfg = CHIP_CONFIG[prov.source];

  // Build tooltip text
  const tooltipParts = [cfg.label];
  if (prov.confidence > 0) {
    tooltipParts.push(`Confidence: ${Math.round(prov.confidence * 100)}%`);
  }
  if (prov.documentName) {
    tooltipParts.push(`Source: ${prov.documentName}`);
  }
  if (prov.pageOrSlide != null) {
    tooltipParts.push(`Page ${prov.pageOrSlide}`);
  }
  if (prov.quote) {
    const truncated = prov.quote.length > 80 ? prov.quote.slice(0, 77) + '...' : prov.quote;
    tooltipParts.push(`"${truncated}"`);
  }

  return (
    <span
      className={`inline-flex items-center justify-center w-3 h-3 rounded-[2px] text-[7px] font-bold leading-none cursor-default shrink-0 ${cfg.bg} ${cfg.text}`}
      title={tooltipParts.join(' \u2022 ')}
      aria-label={tooltipParts[0]}
    >
      {cfg.letter}
    </span>
  );
}
