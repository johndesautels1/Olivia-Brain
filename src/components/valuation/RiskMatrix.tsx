'use client';

import { useMemo } from 'react';

// ── Types ────────────────────────────────────────────────────────────

type RiskPin = {
  id: string;
  label: string;
  probability: number; // 0-1
  impact: number;      // 0-1
  type: 'risk' | 'opportunity';
  quadrant: 'monitor' | 'mitigate' | 'accept' | 'critical';
};

// ── Heuristic scoring ────────────────────────────────────────────────

const HIGH_IMPACT_KEYWORDS = [
  'revenue', 'cash', 'funding', 'valuation', 'acquisition', 'regulatory',
  'compliance', 'legal', 'patent', 'ip', 'key person', 'cto', 'ceo',
  'founder', 'customer concentration', 'churn', 'runway', 'debt',
  'market share', 'competitive', 'existential', 'critical', 'severe',
];

const HIGH_PROB_KEYWORDS = [
  'likely', 'probable', 'expected', 'trend', 'growing', 'increasing',
  'already', 'current', 'ongoing', 'persistent', 'recurring', 'imminent',
  'inevitable', 'certain', 'confirmed', 'known', 'established',
];

const LOW_PROB_KEYWORDS = [
  'unlikely', 'rare', 'remote', 'possible', 'potential', 'hypothetical',
  'if', 'could', 'might', 'may', 'theoretical', 'edge case',
];

function scoreText(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const kw of keywords) {
    if (lower.includes(kw)) hits++;
  }
  return Math.min(hits / 3, 1);
}

function deriveScores(text: string): { probability: number; impact: number } {
  const impactScore = scoreText(text, HIGH_IMPACT_KEYWORDS);
  const highProbScore = scoreText(text, HIGH_PROB_KEYWORDS);
  const lowProbScore = scoreText(text, LOW_PROB_KEYWORDS);

  const probability = Math.max(0.1, Math.min(0.95,
    0.45 + highProbScore * 0.4 - lowProbScore * 0.3 + Math.random() * 0.1
  ));

  const lengthBonus = Math.min(text.length / 300, 0.2);
  const impact = Math.max(0.1, Math.min(0.95,
    0.35 + impactScore * 0.45 + lengthBonus + Math.random() * 0.1
  ));

  return { probability, impact };
}

function getQuadrant(p: number, i: number): RiskPin['quadrant'] {
  if (p >= 0.5 && i >= 0.5) return 'critical';
  if (p >= 0.5 && i < 0.5) return 'mitigate';
  if (p < 0.5 && i >= 0.5) return 'monitor';
  return 'accept';
}

function buildPins(risks: string[], opportunities: string[]): RiskPin[] {
  const pins: RiskPin[] = [];
  risks.forEach((r, i) => {
    const { probability, impact } = deriveScores(r);
    pins.push({
      id: `risk-${i}`,
      label: r.length > 120 ? r.slice(0, 117) + '...' : r,
      probability,
      impact,
      type: 'risk',
      quadrant: getQuadrant(probability, impact),
    });
  });
  opportunities.forEach((o, i) => {
    const { probability, impact } = deriveScores(o);
    pins.push({
      id: `opp-${i}`,
      label: o.length > 120 ? o.slice(0, 117) + '...' : o,
      probability,
      impact,
      type: 'opportunity',
      quadrant: getQuadrant(probability, impact),
    });
  });
  return pins;
}

// ── Props ────────────────────────────────────────────────────────────

export type RiskMatrixProps = {
  risks: string[];
  opportunities: string[];
};

// ── Quadrant metadata ────────────────────────────────────────────────

const QUADRANT_META = {
  critical: { label: 'CRITICAL', action: 'Immediate Action Required', color: '#FB7185', bg: 'rgba(251,113,133,0.06)' },
  mitigate: { label: 'MITIGATE', action: 'Reduce Probability', color: '#FCD34D', bg: 'rgba(252,211,77,0.04)' },
  monitor:  { label: 'MONITOR', action: 'Track & Prepare', color: '#67E8F9', bg: 'rgba(103,232,249,0.04)' },
  accept:   { label: 'ACCEPT', action: 'Acknowledge & Proceed', color: '#6EE7B7', bg: 'rgba(110,231,183,0.04)' },
} as const;

// ── Component ────────────────────────────────────────────────────────

export default function RiskMatrix({ risks, opportunities }: RiskMatrixProps) {
  const pins = useMemo(
    () => buildPins(risks, opportunities),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(risks), JSON.stringify(opportunities)],
  );

  if (risks.length === 0 && opportunities.length === 0) {
    return (
      <p className="text-[11px] text-text-secondary text-center py-6">
        No risks or opportunities identified in this valuation run.
      </p>
    );
  }

  // Group by quadrant
  const grouped = {
    critical: pins.filter((p) => p.quadrant === 'critical'),
    mitigate: pins.filter((p) => p.quadrant === 'mitigate'),
    monitor: pins.filter((p) => p.quadrant === 'monitor'),
    accept: pins.filter((p) => p.quadrant === 'accept'),
  };

  const criticalRisks = grouped.critical.filter((p) => p.type === 'risk');
  const totalRisks = pins.filter((p) => p.type === 'risk').length;
  const totalOpps = pins.filter((p) => p.type === 'opportunity').length;

  // SVG dimensions
  const size = 380;
  const pad = 40;
  const plotSize = size - pad * 2;

  return (
    <div className="space-y-5">
      {/* Summary strip */}
      <div
        className="flex items-center gap-4 px-4 py-3 rounded-lg"
        style={{
          background: criticalRisks.length > 0
            ? 'linear-gradient(135deg, rgba(232,72,85,0.08) 0%, rgba(232,72,85,0.02) 100%)'
            : 'linear-gradient(135deg, rgba(52,211,153,0.08) 0%, rgba(52,211,153,0.02) 100%)',
          border: `1px solid ${criticalRisks.length > 0 ? 'rgba(232,72,85,0.15)' : 'rgba(52,211,153,0.15)'}`,
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold"
            style={{
              background: criticalRisks.length > 0 ? 'rgba(232,72,85,0.15)' : 'rgba(52,211,153,0.15)',
              color: criticalRisks.length > 0 ? '#E84855' : '#34D399',
            }}
          >
            {criticalRisks.length}
          </span>
          <span className="text-xs text-text-primary font-medium">
            {criticalRisks.length > 0
              ? `Critical risk${criticalRisks.length > 1 ? 's' : ''} requiring attention`
              : 'No critical risks identified'
            }
          </span>
        </div>
        <span className="mx-auto" />
        <span className="text-[11px] text-text-secondary tabular-nums">
          {totalRisks} risk{totalRisks !== 1 ? 's' : ''} · {totalOpps} opportunit{totalOpps !== 1 ? 'ies' : 'y'}
        </span>
      </div>

      {/* Matrix SVG — dimensional quadrants, WCAG AA contrast */}
      <div className="flex justify-center" role="figure" aria-label="Probability vs Impact risk matrix">
        <svg
          width="100%"
          viewBox={`0 0 ${size} ${size}`}
          style={{ aspectRatio: '1 / 1', maxWidth: size }}
          role="img"
          aria-label={`Risk probability-impact matrix with ${pins.length} items plotted across 4 quadrants`}
        >
          <defs>
            {/* Rich 4D quadrant gradients — 5-stop radial for depth and volume */}
            <radialGradient id="grad-critical" cx="0.3" cy="0.3" r="0.85">
              <stop offset="0%" stopColor="rgba(251,113,133,0.28)" />
              <stop offset="25%" stopColor="rgba(251,113,133,0.18)" />
              <stop offset="50%" stopColor="rgba(232,72,85,0.10)" />
              <stop offset="80%" stopColor="rgba(185,28,28,0.14)" />
              <stop offset="100%" stopColor="rgba(127,29,29,0.18)" />
            </radialGradient>
            <radialGradient id="grad-monitor" cx="0.3" cy="0.3" r="0.85">
              <stop offset="0%" stopColor="rgba(103,232,249,0.26)" />
              <stop offset="25%" stopColor="rgba(103,232,249,0.16)" />
              <stop offset="50%" stopColor="rgba(56,189,248,0.08)" />
              <stop offset="80%" stopColor="rgba(14,116,144,0.12)" />
              <stop offset="100%" stopColor="rgba(8,51,68,0.16)" />
            </radialGradient>
            <radialGradient id="grad-mitigate" cx="0.3" cy="0.3" r="0.85">
              <stop offset="0%" stopColor="rgba(252,211,77,0.24)" />
              <stop offset="25%" stopColor="rgba(252,211,77,0.14)" />
              <stop offset="50%" stopColor="rgba(251,191,36,0.07)" />
              <stop offset="80%" stopColor="rgba(180,83,9,0.10)" />
              <stop offset="100%" stopColor="rgba(120,53,15,0.14)" />
            </radialGradient>
            <radialGradient id="grad-accept" cx="0.3" cy="0.3" r="0.85">
              <stop offset="0%" stopColor="rgba(110,231,183,0.24)" />
              <stop offset="25%" stopColor="rgba(110,231,183,0.14)" />
              <stop offset="50%" stopColor="rgba(52,211,153,0.07)" />
              <stop offset="80%" stopColor="rgba(6,78,59,0.12)" />
              <stop offset="100%" stopColor="rgba(2,44,34,0.16)" />
            </radialGradient>
            {/* Deep inset shadow — gives thick recessed panel effect */}
            <filter id="inset-deep" x="-20%" y="-20%" width="140%" height="140%">
              <feComponentTransfer in="SourceAlpha">
                <feFuncA type="table" tableValues="1 0" />
              </feComponentTransfer>
              <feGaussianBlur stdDeviation="5" />
              <feOffset dx="2" dy="3" result="shadow1" />
              <feFlood floodColor="rgba(0,0,0,0.7)" result="color1" />
              <feComposite in="color1" in2="shadow1" operator="in" result="inset1" />
              <feComposite in="inset1" in2="SourceAlpha" operator="in" result="clipped1" />
              <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur2" />
              <feOffset in="blur2" dx="-1" dy="-1" result="shadow2" />
              <feFlood floodColor="rgba(255,255,255,0.04)" result="color2" />
              <feComposite in="color2" in2="shadow2" operator="in" result="inset2" />
              <feComposite in="inset2" in2="SourceAlpha" operator="in" result="clipped2" />
              <feMerge>
                <feMergeNode in="SourceGraphic" />
                <feMergeNode in="clipped1" />
                <feMergeNode in="clipped2" />
              </feMerge>
            </filter>
            {/* Raised outer bevel filter for the frame */}
            <filter id="outer-bevel" x="-5%" y="-5%" width="110%" height="110%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur" />
              <feOffset in="blur" dx="-1" dy="-1" result="light" />
              <feFlood floodColor="rgba(255,255,255,0.08)" />
              <feComposite in2="light" operator="in" result="lightEdge" />
              <feOffset in="blur" dx="1" dy="2" result="dark" />
              <feFlood floodColor="rgba(0,0,0,0.5)" />
              <feComposite in2="dark" operator="in" result="darkEdge" />
              <feMerge>
                <feMergeNode in="darkEdge" />
                <feMergeNode in="SourceGraphic" />
                <feMergeNode in="lightEdge" />
              </feMerge>
            </filter>
            {/* Pin glow */}
            <filter id="glow-risk" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-opp" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Outer frame — thick multi-layer bezel like a luxury instrument panel */}
          <rect
            x={pad - 6} y={pad - 6}
            width={plotSize + 12} height={plotSize + 12}
            rx={10}
            fill="rgba(10,15,30,0.8)"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={1}
            filter="url(#outer-bevel)"
          />
          <rect
            x={pad - 4} y={pad - 4}
            width={plotSize + 8} height={plotSize + 8}
            rx={8}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={0.5}
          />
          <rect
            x={pad - 3} y={pad - 3}
            width={plotSize + 6} height={plotSize + 6}
            rx={7}
            fill="rgba(15,23,42,0.9)"
            stroke="rgba(0,0,0,0.6)"
            strokeWidth={1.5}
          />
          {/* Inner bevel highlight on top-left of frame */}
          <line x1={pad + 4} y1={pad - 2.5} x2={pad + plotSize - 4} y2={pad - 2.5} stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
          <line x1={pad - 2.5} y1={pad + 4} x2={pad - 2.5} y2={pad + plotSize - 4} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />

          {/* Quadrant panels — thick beveled recessed tiles with radial depth */}
          {[
            { x: pad, y: pad, grad: 'url(#grad-monitor)', glow: 'rgba(103,232,249,0.35)', edge: 'rgba(103,232,249,0.12)' },
            { x: pad + plotSize / 2, y: pad, grad: 'url(#grad-critical)', glow: 'rgba(251,113,133,0.40)', edge: 'rgba(251,113,133,0.14)' },
            { x: pad, y: pad + plotSize / 2, grad: 'url(#grad-accept)', glow: 'rgba(110,231,183,0.30)', edge: 'rgba(110,231,183,0.10)' },
            { x: pad + plotSize / 2, y: pad + plotSize / 2, grad: 'url(#grad-mitigate)', glow: 'rgba(252,211,77,0.30)', edge: 'rgba(252,211,77,0.10)' },
          ].map((q, i) => {
            const qw = plotSize / 2 - 4;
            const qh = plotSize / 2 - 4;
            const qx = q.x + 2;
            const qy = q.y + 2;
            return (
              <g key={i}>
                {/* Layer 1: Deep pit shadow (gives depth illusion) */}
                <rect x={qx + 1} y={qy + 1} width={qw} height={qh} rx={5} fill="rgba(0,0,0,0.4)" />
                {/* Layer 2: Main quadrant fill with radial gradient */}
                <rect x={qx} y={qy} width={qw} height={qh} rx={5} fill={q.grad} filter="url(#inset-deep)" />
                {/* Layer 3: Top-left highlight bevel (thick — 2px) */}
                <path
                  d={`M${qx + 6},${qy + 1} L${qx + qw - 6},${qy + 1} Q${qx + qw},${qy + 1} ${qx + qw},${qy + 6}`}
                  fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={1.5}
                />
                <path
                  d={`M${qx + 1},${qy + 6} L${qx + 1},${qy + qh - 6}`}
                  fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1.5}
                />
                {/* Layer 4: Bottom-right shadow bevel (thick — 2px) */}
                <path
                  d={`M${qx + 6},${qy + qh - 1} L${qx + qw - 6},${qy + qh - 1} Q${qx + qw},${qy + qh - 1} ${qx + qw},${qy + qh - 6}`}
                  fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth={2}
                />
                <path
                  d={`M${qx + qw - 1},${qy + 6} L${qx + qw - 1},${qy + qh - 6}`}
                  fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={2}
                />
                {/* Layer 5: Color glow border — gives the "lit from within" effect */}
                <rect x={qx} y={qy} width={qw} height={qh} rx={5} fill="none" stroke={q.glow} strokeWidth={1} />
                {/* Layer 6: Soft inner edge highlight for glass-like depth */}
                <rect x={qx + 3} y={qy + 3} width={qw - 6} height={qh - 6} rx={3} fill="none" stroke={q.edge} strokeWidth={0.5} />
              </g>
            );
          })}

          {/* Grid lines — etched grooves */}
          {[0.25, 0.5, 0.75].map((t) => (
            <g key={`grid-${t}`}>
              <line x1={pad + t * plotSize} y1={pad + 2} x2={pad + t * plotSize} y2={pad + plotSize - 2} stroke="rgba(0,0,0,0.25)" strokeWidth={t === 0.5 ? 1.5 : 0.5} />
              <line x1={pad + t * plotSize + 1} y1={pad + 2} x2={pad + t * plotSize + 1} y2={pad + plotSize - 2} stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} />
              <line x1={pad + 2} y1={pad + t * plotSize} x2={pad + plotSize - 2} y2={pad + t * plotSize} stroke="rgba(0,0,0,0.25)" strokeWidth={t === 0.5 ? 1.5 : 0.5} />
              <line x1={pad + 2} y1={pad + t * plotSize + 1} x2={pad + plotSize - 2} y2={pad + t * plotSize + 1} stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} />
            </g>
          ))}

          {/* Quadrant labels — WCAG AA: min 4.5:1 contrast on dark bg */}
          <text x={pad + plotSize * 0.75} y={pad + 22} textAnchor="middle" fill="#FB7185" fontSize={13} fontWeight={800} letterSpacing="0.14em">CRITICAL</text>
          <text x={pad + plotSize * 0.25} y={pad + 22} textAnchor="middle" fill="#67E8F9" fontSize={13} fontWeight={800} letterSpacing="0.14em">MONITOR</text>
          <text x={pad + plotSize * 0.75} y={pad + plotSize - 10} textAnchor="middle" fill="#FCD34D" fontSize={13} fontWeight={800} letterSpacing="0.14em">MITIGATE</text>
          <text x={pad + plotSize * 0.25} y={pad + plotSize - 10} textAnchor="middle" fill="#6EE7B7" fontSize={13} fontWeight={800} letterSpacing="0.14em">ACCEPT</text>

          {/* Axis labels — WCAG AA compliant (#94A3B8 on #0f172a = 4.6:1) */}
          <text x={pad + plotSize / 2} y={size - 2} textAnchor="middle" fill="#94A3B8" fontSize={12} fontWeight={700} letterSpacing="0.08em">
            PROBABILITY
          </text>
          <text x={12} y={pad + plotSize / 2} textAnchor="middle" fill="#94A3B8" fontSize={12} fontWeight={700} letterSpacing="0.08em" transform={`rotate(-90, 12, ${pad + plotSize / 2})`}>
            IMPACT
          </text>

          {/* Axis ticks — WCAG AA: #CBD5E1 on #0f172a = 10.2:1 — clearly visible */}
          <text x={pad} y={size - 2} textAnchor="middle" fill="#CBD5E1" fontSize={11} fontWeight={600}>0%</text>
          <text x={pad + plotSize} y={size - 2} textAnchor="middle" fill="#CBD5E1" fontSize={11} fontWeight={600}>100%</text>
          <text x={pad - 6} y={pad + plotSize} textAnchor="end" fill="#CBD5E1" fontSize={11} fontWeight={600}>0%</text>
          <text x={pad - 6} y={pad + 5} textAnchor="end" fill="#CBD5E1" fontSize={11} fontWeight={600}>100%</text>

          {/* Pin markers */}
          {pins.map((pin) => {
            const cx = pad + pin.probability * plotSize;
            const cy = pad + plotSize - pin.impact * plotSize;
            const isRisk = pin.type === 'risk';
            const color = isRisk ? '#FB7185' : '#6EE7B7';
            const glowColor = isRisk ? '#E84855' : '#34D399';

            return (
              <g key={pin.id} style={{ cursor: 'default' }}>
                <title>{`${isRisk ? 'Risk' : 'Opportunity'}: ${pin.label} (P: ${Math.round(pin.probability * 100)}%, I: ${Math.round(pin.impact * 100)}%)`}</title>
                {/* Deep glow halo */}
                <circle cx={cx} cy={cy} r={12} fill={glowColor} opacity={0.08} />
                {/* Outer ring */}
                <circle cx={cx} cy={cy} r={9} fill="none" stroke={glowColor} strokeWidth={0.6} opacity={0.3} />
                {/* Mid glow */}
                <circle cx={cx} cy={cy} r={7} fill={glowColor} opacity={0.15} filter={isRisk ? 'url(#glow-risk)' : 'url(#glow-opp)'} />
                {/* Core — solid with bevel */}
                <circle cx={cx} cy={cy} r={5.5} fill={`${glowColor}dd`} stroke={color} strokeWidth={1.5} />
                {/* Top highlight for 3D sphere effect */}
                <ellipse cx={cx - 1} cy={cy - 2} rx={2.5} ry={1.5} fill="rgba(255,255,255,0.3)" />
                {/* Icon — white for WCAG contrast on colored bg */}
                {isRisk ? (
                  <path d={`M${cx} ${cy - 2}l2 4h-4z`} fill="white" />
                ) : (
                  <path d={`M${cx} ${cy - 2.5}v5M${cx - 2} ${cy + 0.5}l2-3 2 3`} fill="none" stroke="white" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Quadrant breakdown — 3D raised cards with depth */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(['critical', 'monitor', 'mitigate', 'accept'] as const).map((qId) => {
          const meta = QUADRANT_META[qId];
          const items = grouped[qId];
          if (items.length === 0) return null;
          return (
            <div
              key={qId}
              className="rounded-lg overflow-hidden"
              style={{
                background: `linear-gradient(145deg, ${meta.bg} 0%, rgba(15,23,42,0.4) 100%)`,
                border: `1px solid ${meta.color}30`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -2px 4px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.15)`,
              }}
            >
              {/* Card header with thick color bar */}
              <div
                className="flex items-center justify-between px-4 py-2.5"
                style={{
                  borderBottom: `1px solid ${meta.color}20`,
                  background: `linear-gradient(90deg, ${meta.color}18 0%, transparent 100%)`,
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-sm"
                    style={{
                      background: `linear-gradient(135deg, ${meta.color} 0%, ${meta.color}88 100%)`,
                      boxShadow: `0 0 6px ${meta.color}40, inset 0 1px 0 rgba(255,255,255,0.3)`,
                    }}
                    aria-hidden="true"
                  />
                  {/* WCAG AA: using brighter variants for text on dark */}
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.12em]" style={{ color: meta.color }}>
                    {meta.label}
                  </span>
                </div>
                <span className="text-[10px] font-medium" style={{ color: '#CBD5E1' }}>
                  {meta.action}
                </span>
              </div>
              {/* Card body */}
              <div className="px-4 py-3 space-y-2">
                {items.map((pin) => (
                  <div key={pin.id} className="flex items-start gap-2.5">
                    <span
                      className="mt-[5px] flex-shrink-0 w-2 h-2 rounded-full"
                      style={{
                        background: pin.type === 'risk' ? '#FB7185' : '#6EE7B7',
                        boxShadow: `0 0 4px ${pin.type === 'risk' ? 'rgba(251,113,133,0.4)' : 'rgba(110,231,183,0.4)'}`,
                      }}
                      aria-hidden="true"
                    />
                    {/* WCAG AA: #E2E8F0 on dark bg = 12.6:1 contrast */}
                    <p className="text-[11px] leading-relaxed" style={{ color: '#E2E8F0' }}>{pin.label}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
