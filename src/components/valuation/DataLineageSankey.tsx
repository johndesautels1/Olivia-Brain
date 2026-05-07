'use client';

// ═══════════════════════════════════════════════════════════════════════
// DataLineageSankey — Session 12
// Horizontal Sankey flow showing data lineage through the valuation
// pipeline: Documents → Fields → Methods → Reconciliation →
// Stochastic (MC/Scenarios/RO) → Final EV.
// Uses d3-sankey for layout computation, custom SVG rendering.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo, useState, useCallback } from 'react';
import { sankey as d3Sankey, sankeyLinkHorizontal } from 'd3-sankey';
import type { ValuationMethodResult } from '@/lib/valuation/types';
import { formatCurrency } from '@/lib/valuation/dashboard-types';

// ── Types ────────────────────────────────────────────────────────────

type Stage = 'documents' | 'fields' | 'methods' | 'reconciliation' | 'stochastic' | 'final';

interface NodeDatum {
  id: string;
  label: string;
  stage: Stage;
}

interface LinkDatum {
  source: string;
  target: string;
  value: number;
}

// Resolved types after d3-sankey layout (source/target become node refs)
interface ResolvedNode extends NodeDatum {
  x0?: number; x1?: number; y0?: number; y1?: number;
}
interface ResolvedLink {
  source: ResolvedNode;
  target: ResolvedNode;
  width: number;
  value: number;
}

// ── Stage tooltip definitions ────────────────────────────────────────

const STAGE_TOOLTIPS: Record<string, { title: string; description: string }> = {
  documents: {
    title: 'Documents',
    description: 'Source documents uploaded or extracted from your DNA, pitch deck, financial model, and cap table. Each document feeds structured data into the valuation pipeline.',
  },
  fields: {
    title: 'Fields',
    description: 'Individual data points extracted from your documents — revenue, margins, growth rate, runway, team strength, and 50+ other financial and operational metrics.',
  },
  methods: {
    title: 'Methods',
    description: 'Up to 9 independent valuation methods (DCF, Revenue Multiple, EBITDA Multiple, VC Method, Scorecard, Liquidation, Real Options, Strategic Synergy, Precedent Txns) each producing their own enterprise value estimate.',
  },
  reconciliation: {
    title: 'Reconciliation',
    description: 'Weighted blending of all enabled method outputs into a single Reconciled Enterprise Value. Weights are determined by data quality, stage fit, and method reliability.',
  },
  stochastic: {
    title: 'Stochastic',
    description: 'Probabilistic stress-testing layer — Monte Carlo simulation (10,000 trials), scenario analysis (bull/base/bear), and real options (binomial tree) to produce confidence intervals around the point estimate.',
  },
  final: {
    title: 'Final EV',
    description: 'The probability-adjusted enterprise value after reconciliation and stochastic modelling. This is the headline number used in negotiation anchoring, the board letter, and package delivery.',
  },
};

// ── Stage colors ─────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  documents: 'var(--color-cyan-interactive)',
  fields: 'var(--color-jade-upside)',
  methods: 'var(--color-sterling-reference)',
  reconciliation: 'var(--color-aurum-primary)',
  stochastic: 'var(--color-coral-downside)',
  final: 'var(--color-aurum-highlight)',
};

const STAGE_FILLS: Record<string, string> = {
  documents: 'rgba(56,189,248,0.8)',
  fields: 'rgba(52,211,153,0.8)',
  methods: 'rgba(143,163,184,0.8)',
  reconciliation: 'rgba(196,169,106,0.9)',
  stochastic: 'rgba(232,72,85,0.7)',
  final: 'rgba(232,212,157,0.9)',
};

// ── Props ────────────────────────────────────────────────────────────

export type DataLineageSankeyProps = {
  evidenceChainCount: number;
  documentTypes: string[];
  fieldCount: number;
  methods: ValuationMethodResult[];
  hasMonteCarlo: boolean;
  hasScenarios: boolean;
  hasRealOptions: boolean;
  finalEV: number;
};

// ── Build Sankey graph ───────────────────────────────────────────────

function buildGraph(props: DataLineageSankeyProps) {
  const {
    evidenceChainCount,
    documentTypes,
    fieldCount,
    methods,
    hasMonteCarlo,
    hasScenarios,
    hasRealOptions,
    finalEV,
  } = props;

  const nodes: NodeDatum[] = [];
  const links: LinkDatum[] = [];

  // Stage 1: Documents — group by type
  const docGroups = documentTypes.length > 0
    ? [...new Set(documentTypes)]
    : ['Uploaded Documents'];

  for (const dt of docGroups) {
    nodes.push({ id: `doc-${dt}`, label: dt, stage: 'documents' });
  }

  // Stage 2: Fields
  nodes.push({ id: 'fields', label: `${fieldCount} Fields Extracted`, stage: 'fields' });

  // Link docs → fields
  const perDoc = Math.max(1, Math.round(fieldCount / Math.max(1, docGroups.length)));
  for (const dt of docGroups) {
    links.push({ source: `doc-${dt}`, target: 'fields', value: perDoc });
  }

  // Stage 3: Methods
  const enabledMethods = methods.filter((m) => m.enabled && (m.weight > 0 || m.isOverlay));
  for (const m of enabledMethods) {
    nodes.push({ id: `method-${m.method}`, label: m.method.replace(/_/g, ' '), stage: 'methods' });
    links.push({ source: 'fields', target: `method-${m.method}`, value: Math.max(1, m.isOverlay ? 10 : Math.round(m.weight * 100)) });
  }

  // Stage 4: Reconciliation
  nodes.push({ id: 'reconciliation', label: 'Reconciled EV', stage: 'reconciliation' });
  for (const m of enabledMethods) {
    links.push({
      source: `method-${m.method}`,
      target: 'reconciliation',
      value: Math.max(1, m.isOverlay ? 10 : Math.round(m.weight * 100)),
    });
  }

  // Stage 5: Stochastic outputs
  const stochNodes: { id: string; label: string }[] = [];
  if (hasMonteCarlo) stochNodes.push({ id: 'stoch-mc', label: 'Monte Carlo' });
  if (hasScenarios) stochNodes.push({ id: 'stoch-scenarios', label: 'Scenarios' });
  if (hasRealOptions) stochNodes.push({ id: 'stoch-ro', label: 'Real Options' });

  if (stochNodes.length > 0) {
    const perStoch = Math.round(100 / stochNodes.length);
    for (const sn of stochNodes) {
      nodes.push({ ...sn, stage: 'stochastic' });
      links.push({ source: 'reconciliation', target: sn.id, value: perStoch });
    }

    // Stage 6: Final EV
    nodes.push({ id: 'final-ev', label: formatCurrency(finalEV), stage: 'final' });
    for (const sn of stochNodes) {
      links.push({ source: sn.id, target: 'final-ev', value: Math.round(100 / stochNodes.length) });
    }
  } else {
    // No stochastic — go straight to final
    nodes.push({ id: 'final-ev', label: formatCurrency(finalEV), stage: 'final' });
    links.push({ source: 'reconciliation', target: 'final-ev', value: 100 });
  }

  return { nodes, links };
}

// ── Method labels ────────────────────────────────────────────────────

const METHOD_DISPLAY: Record<string, string> = {
  'revenue multiple': 'Revenue Multiple',
  'ebitda multiple': 'EBITDA Multiple',
  dcf: 'DCF',
  'vc method': 'VC Method',
  'cost to duplicate': 'Cost to Duplicate',
  scorecard: 'Scorecard',
  'strategic synergy': 'Strategic Synergy',
  'precedent transactions': 'Precedent Txns',
  liquidation: 'Liquidation',
  'real options': 'Real Options',
  'strategic adjustment': 'Strategic Adj.',
};

function displayLabel(label: string): string {
  return METHOD_DISPLAY[label.toLowerCase()] ?? label.charAt(0).toUpperCase() + label.slice(1);
}

// ── Component ────────────────────────────────────────────────────────

const WIDTH = 900;
const HEIGHT = 400;
const MARGIN = { top: 16, right: 100, bottom: 16, left: 16 };

export default function DataLineageSankey(props: DataLineageSankeyProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredLegend, setHoveredLegend] = useState<string | null>(null);
  const handleLegendEnter = useCallback((stage: string) => setHoveredLegend(stage), []);
  const handleLegendLeave = useCallback(() => setHoveredLegend(null), []);

  const { sankeyNodes, sankeyLinks } = useMemo(() => {
    const { nodes, links } = buildGraph(props);

    // Build index map for d3-sankey (needs numeric source/target)
    const nodeIndex = new Map(nodes.map((n, i) => [n.id, i]));

    const numericLinks = links
      .filter((l) => nodeIndex.has(l.source) && nodeIndex.has(l.target))
      .map((l) => ({
        source: nodeIndex.get(l.source)!,
        target: nodeIndex.get(l.target)!,
        value: l.value,
      }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const generator = (d3Sankey as any)()
      .nodeWidth(14)
      .nodePadding(12)
      .extent([
        [MARGIN.left, MARGIN.top],
        [WIDTH - MARGIN.right, HEIGHT - MARGIN.bottom],
      ]);

    const result = generator({
      nodes: nodes.map((n) => ({ ...n })),
      links: numericLinks,
    });

    return {
      sankeyNodes: result.nodes as ResolvedNode[],
      sankeyLinks: result.links as ResolvedLink[],
    };
  }, [props]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linkPath = sankeyLinkHorizontal() as any;

  return (
    <section className="glass-card p-6">
      <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">
        Data Lineage
      </h2>
      <div className="overflow-x-auto">
        <svg
          width={WIDTH}
          height={HEIGHT}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full h-auto"
          role="img"
          aria-label="Data lineage Sankey diagram showing how documents flow through fields, methods, reconciliation, and stochastic models to produce the final enterprise value."
        >
          <title>Data Lineage Flow</title>
          <desc>Sankey diagram: Documents to Fields to Methods to Reconciliation to Stochastic outputs to Final EV.</desc>

          {/* Links */}
          {sankeyLinks.map((link, i) => {
            const isHighlighted =
              hoveredNode === link.source.id || hoveredNode === link.target.id;

            return (
              <path
                key={i}
                d={linkPath(link) ?? ''}
                fill="none"
                stroke={STAGE_FILLS[link.source.stage] ?? 'rgba(255,255,255,0.15)'}
                strokeWidth={Math.max(1, link.width)}
                strokeOpacity={isHighlighted ? 0.7 : 0.35}
                style={{ transition: 'stroke-opacity 0.2s' }}
              />
            );
          })}

          {/* Nodes */}
          {sankeyNodes.map((node) => {
            const x0 = node.x0 ?? 0;
            const x1 = node.x1 ?? 0;
            const y0 = node.y0 ?? 0;
            const y1 = node.y1 ?? 0;
            const h = y1 - y0;
            const w = x1 - x0;
            const isHighlighted = hoveredNode === node.id;
            const fill = STAGE_FILLS[node.stage] ?? 'rgba(255,255,255,0.3)';

            return (
              <g
                key={node.id}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                className="cursor-default"
              >
                <rect
                  x={x0}
                  y={y0}
                  width={w}
                  height={Math.max(4, h)}
                  fill={fill}
                  rx={3}
                  strokeWidth={isHighlighted ? 1.5 : 0.5}
                  stroke={isHighlighted ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)'}
                  style={{ transition: 'stroke-width 0.15s', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
                />
                {/* Label */}
                <text
                  x={x1 + 6}
                  y={y0 + Math.max(4, h) / 2}
                  dy="0.35em"
                  fill="var(--text-primary, #e2e8f0)"
                  fontSize={12}
                  fontWeight={600}
                  fontFamily="var(--font-ui, Inter)"
                  className={isHighlighted ? 'font-bold' : 'font-semibold'}
                >
                  {displayLabel(node.label)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend with hover tooltip cards */}
      <div className="flex flex-wrap gap-4 mt-3 text-[11px] text-text-secondary">
        {[
          { stage: 'documents', label: 'Documents' },
          { stage: 'fields', label: 'Fields' },
          { stage: 'methods', label: 'Methods' },
          { stage: 'reconciliation', label: 'Reconciliation' },
          { stage: 'stochastic', label: 'Stochastic' },
          { stage: 'final', label: 'Final EV' },
        ].map(({ stage, label }) => {
          const tip = STAGE_TOOLTIPS[stage];
          const isActive = hoveredLegend === stage;
          // Right-align tooltip for items that would spill off the right edge on mobile
          const spillsRight = stage === 'fields' || stage === 'methods' || stage === 'stochastic' || stage === 'final';
          const tooltipStyle: React.CSSProperties = spillsRight
            ? { right: 0, width: 240, maxWidth: 'calc(100vw - 2rem)' }
            : { left: 0, width: 240, maxWidth: 'calc(100vw - 2rem)' };
          return (
            <span
              key={stage}
              className="relative flex items-center gap-1 cursor-help"
              style={{ textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '2px' }}
              onMouseEnter={() => handleLegendEnter(stage)}
              onMouseLeave={handleLegendLeave}
              onClick={() => handleLegendEnter(isActive ? '' : stage)}
            >
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: STAGE_FILLS[stage] }}
              />
              {label}
              {isActive && tip && (
                <span
                  className="absolute bottom-full mb-2 z-50 pointer-events-none"
                  style={tooltipStyle}
                >
                  <span
                    className="block rounded-lg"
                    style={{
                      background: 'rgba(15, 15, 20, 0.95)',
                      border: '1px solid rgba(196, 169, 106, 0.3)',
                      padding: '8px 10px',
                      backdropFilter: 'blur(12px)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                    }}
                  >
                    <span className="block text-[11px] font-bold" style={{ color: '#C4A96A', marginBottom: 3 }}>
                      {tip.title}
                    </span>
                    <span className="block text-[10px] leading-[1.45]" style={{ color: 'var(--text-secondary)' }}>
                      {tip.description}
                    </span>
                  </span>
                </span>
              )}
            </span>
          );
        })}
      </div>
    </section>
  );
}
