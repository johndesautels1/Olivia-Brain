'use client';

import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { formatCurrency } from '@/lib/valuation/dashboard-types';
import ChartCard from './ChartCard';

// ── Props ────────────────────────────────────────────────────────────

export type BinomialTreeNode = {
  step: number;
  state: number;
  assetPrice: number;
  optionValue: number;
  isExercised: boolean;
};

export type BinomialTreeVizProps = {
  nodes: BinomialTreeNode[];
  /** Number of visible tree steps (max 6 for readability) */
  visibleSteps?: number;
  optionType?: 'call' | 'put';
  title?: string;
};

// ── Layout constants ─────��──────────────────────────────────────────

const NODE_RADIUS = 24;
const STEP_X_GAP = 110;
const STATE_Y_GAP = 56;
const PADDING = 48;

// ── Build tree layout ───────────────────────────────────────────────

type LayoutNode = {
  x: number;
  y: number;
  assetPrice: number;
  optionValue: number;
  isExercised: boolean;
  step: number;
  state: number;
  /** Depth-based intensity (0-1) for ITM gradient coloring. */
  itmDepth: number;
};

function buildLayout(
  nodes: BinomialTreeNode[],
  steps: number,
): { layoutNodes: LayoutNode[]; width: number; height: number } {
  const maxStates = steps + 1;
  const width = steps * STEP_X_GAP + PADDING * 2;
  const height = maxStates * STATE_Y_GAP + PADDING * 2;
  const centerY = height / 2;

  // Find max option value for normalizing ITM depth
  let maxOptionValue = 0;
  for (const node of nodes) {
    if (node.step <= steps && node.isExercised && node.optionValue > maxOptionValue) {
      maxOptionValue = node.optionValue;
    }
  }

  const layoutNodes: LayoutNode[] = [];

  for (const node of nodes) {
    if (node.step > steps) continue;

    const statesInStep = node.step + 1;
    const yOffset = (node.state - (statesInStep - 1) / 2) * STATE_Y_GAP;

    // ITM depth: normalized 0-1 based on how deep in-the-money
    const itmDepth = node.isExercised && maxOptionValue > 0
      ? Math.max(0.3, node.optionValue / maxOptionValue)
      : 0;

    layoutNodes.push({
      x: PADDING + node.step * STEP_X_GAP,
      y: centerY + yOffset,
      assetPrice: node.assetPrice,
      optionValue: node.optionValue,
      isExercised: node.isExercised,
      step: node.step,
      state: node.state,
      itmDepth,
    });
  }

  return { layoutNodes, width, height };
}

// ── Build edges ─────────────────────────────────────────────────────

type Edge = {
  x1: number; y1: number; x2: number; y2: number;
  /** True if both parent and child are exercised (optimal path). */
  isOptimalPath: boolean;
};

function buildEdges(layoutNodes: LayoutNode[], steps: number): Edge[] {
  const edges: Edge[] = [];
  const nodeMap = new Map<string, LayoutNode>();

  for (const n of layoutNodes) {
    nodeMap.set(`${n.step}-${n.state}`, n);
  }

  for (let step = 0; step < steps; step++) {
    const statesInStep = step + 1;
    for (let state = 0; state < statesInStep; state++) {
      const parent = nodeMap.get(`${step}-${state}`);
      if (!parent) continue;

      // Up child: same state index at next step
      const upChild = nodeMap.get(`${step + 1}-${state}`);
      if (upChild) {
        edges.push({
          x1: parent.x, y1: parent.y,
          x2: upChild.x, y2: upChild.y,
          isOptimalPath: parent.isExercised && upChild.isExercised,
        });
      }

      // Down child: state + 1 at next step
      const downChild = nodeMap.get(`${step + 1}-${state + 1}`);
      if (downChild) {
        edges.push({
          x1: parent.x, y1: parent.y,
          x2: downChild.x, y2: downChild.y,
          isOptimalPath: parent.isExercised && downChild.isExercised,
        });
      }
    }
  }

  return edges;
}

// ── Component ────────────────────────────��──────────────────────────

export default function BinomialTreeViz({
  nodes,
  visibleSteps = 6,
  optionType = 'call',
  title,
}: BinomialTreeVizProps) {
  const steps = Math.min(visibleSteps, 6);
  const [hoveredNode, setHoveredNode] = useState<LayoutNode | null>(null);

  // ── Draggable hover panel state ──
  const [panelPos, setPanelPos] = useState({ x: 8, y: 4 });
  const dragRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    dragOffset.current = { x: e.clientX - panelPos.x, y: e.clientY - panelPos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [panelPos]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    setPanelPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
  }, []);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const { layoutNodes, width, height } = useMemo(
    () => buildLayout(nodes, steps),
    [nodes, steps],
  );

  const edges = useMemo(
    () => buildEdges(layoutNodes, steps),
    [layoutNodes, steps],
  );

  if (nodes.length === 0) {
    return (
      <ChartCard title={title ?? 'Real Options'} glossaryKey="crr_binomial_tree">
        <p className="text-[11px] text-text-primary">No real options data available.</p>
      </ChartCard>
    );
  }

  // Data-driven takeaway
  const exercisedCount = layoutNodes.filter((n) => n.isExercised).length;
  const totalCount = layoutNodes.length;
  const exercisePct = totalCount > 0 ? Math.round((exercisedCount / totalCount) * 100) : 0;
  const takeawayText = `${steps}-step CRR lattice shows ${exercisedCount} of ${totalCount} nodes in-the-money (${exercisePct}%), indicating where real option value is created.`;

  return (
    <ChartCard
      title={title ?? `Real Options — ${optionType === 'call' ? 'Expansion' : 'Abandonment'}`}
      glossaryKey="crr_binomial_tree"
      takeaway={takeawayText}
      caption={`${steps}-step CRR lattice. Top value = asset price, bottom = option value. Brighter green = deeper in-the-money.`}
    >
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-text-secondary mb-3">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ background: 'rgba(52,211,153,0.7)', border: '1px solid rgba(52,211,153,0.9)' }}
          />
          In-the-money (deeper = higher value)
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ background: 'rgba(100,116,139,0.2)', border: '1px solid rgba(100,116,139,0.3)' }}
          />
          Out-of-money
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-6 h-[2px]" style={{ background: 'rgba(196,169,106,0.6)' }} />
          Optimal exercise path
        </span>
      </div>

      <div className="overflow-x-auto relative">
        {/* Draggable hover panel — top-left, outside the node area */}
        <div
          ref={dragRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="absolute z-10 rounded-lg border px-3 py-2 text-xs select-none"
          style={{
            left: panelPos.x,
            top: panelPos.y,
            cursor: isDragging.current ? 'grabbing' : 'grab',
            borderColor: hoveredNode ? 'rgba(196,169,106,0.4)' : 'rgba(255,255,255,0.08)',
            background: hoveredNode ? 'rgba(15,23,42,0.97)' : 'rgba(15,23,42,0.85)',
            backdropFilter: 'blur(8px)',
            boxShadow: hoveredNode ? '0 4px 16px rgba(0,0,0,0.4)' : 'none',
            touchAction: 'none',
            minWidth: 220,
            maxWidth: 320,
          }}
        >
          {hoveredNode ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-text-primary whitespace-nowrap">
                  t={hoveredNode.step}, State {hoveredNode.state}
                </span>
                <button
                  onClick={() => { setHoveredNode(null); setPanelPos({ x: 8, y: 4 }); }}
                  className="sm:hidden p-1 rounded hover:bg-white/10 text-text-secondary"
                  aria-label="Dismiss panel"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
                <span className={`font-semibold text-[11px] px-1.5 py-0.5 rounded whitespace-nowrap ${hoveredNode.isExercised ? 'text-jade-upside bg-jade-upside/10' : 'text-text-secondary bg-white/5'}`}>
                  {hoveredNode.isExercised ? 'In-the-Money' : 'Out-of-Money'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-text-secondary">Asset</span>
                <span className="font-mono tabular-nums text-text-primary font-semibold">
                  {formatCurrency(hoveredNode.assetPrice)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-text-secondary">Option</span>
                <span className={`font-mono tabular-nums font-semibold ${hoveredNode.isExercised ? 'text-jade-upside' : 'text-text-primary'}`}>
                  {formatCurrency(hoveredNode.optionValue)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-text-secondary">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-50">
                <path d="M5 9l4 4L19 3" />
              </svg>
              <span>Hover a node &middot; drag to reposition</span>
            </div>
          )}
        </div>
        <svg
          width="100%"
          viewBox={`0 0 ${width} ${height}`}
          style={{ minWidth: width, aspectRatio: `${width} / ${height}` }}
          className="mx-auto"
          aria-label={`CRR binomial tree visualization showing ${optionType} option price evolution across ${steps} steps`}
          role="img"
        >
          <title>Real Options — {optionType === 'call' ? 'Expansion' : 'Abandonment'} Option</title>
          <desc>
            A {steps}-step binomial lattice showing {exercisedCount} in-the-money nodes
            out of {totalCount} total ({exercisePct}% exercise rate).
          </desc>

          {/* Edges */}
          {edges.map((e, i) => (
            <line
              key={`e-${i}`}
              x1={e.x1}
              y1={e.y1}
              x2={e.x2}
              y2={e.y2}
              stroke={e.isOptimalPath ? 'rgba(196,169,106,0.6)' : 'rgba(255,255,255,0.08)'}
              strokeWidth={e.isOptimalPath ? 2 : 1}
            />
          ))}

          {/* Nodes */}
          {layoutNodes.map((n, i) => {
            // ITM depth gradient: deeper green for higher option value
            const fill = n.isExercised
              ? `rgba(52,211,153,${0.15 + n.itmDepth * 0.35})`
              : 'rgba(100,116,139,0.15)';
            const stroke = n.isExercised
              ? `rgba(52,211,153,${0.4 + n.itmDepth * 0.5})`
              : 'rgba(100,116,139,0.3)';
            const isHovered = hoveredNode?.step === n.step && hoveredNode?.state === n.state;

            return (
              <g
                key={`n-${i}`}
                onMouseEnter={() => setHoveredNode(n)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => setHoveredNode(prev => prev?.step === n.step && prev?.state === n.state ? null : n)}
                style={{ cursor: 'pointer' }}
              >
                {/* Hover ring */}
                {isHovered && (
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={NODE_RADIUS + 4}
                    fill="none"
                    stroke="rgba(196,169,106,0.4)"
                    strokeWidth={2}
                  />
                )}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={NODE_RADIUS}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isHovered ? 2 : 1.5}
                />
                {/* Asset price (top) */}
                <text
                  x={n.x}
                  y={n.y - 4}
                  textAnchor="middle"
                  fill="var(--text-primary, #e2e8f0)"
                  fontSize={11}
                  fontWeight={600}
                  fontFamily="var(--font-numeric, JetBrains Mono), monospace"
                >
                  {formatCurrency(n.assetPrice)}
                </text>
                {/* Option value (bottom) */}
                <text
                  x={n.x}
                  y={n.y + 11}
                  textAnchor="middle"
                  fill={n.isExercised ? '#34d399' : 'var(--text-secondary, #94a3b8)'}
                  fontSize={11}
                  fontFamily="var(--font-numeric, JetBrains Mono), monospace"
                >
                  {formatCurrency(n.optionValue)}
                </text>
              </g>
            );
          })}

          {/* Step labels */}
          {Array.from({ length: steps + 1 }, (_, step) => (
            <text
              key={`step-${step}`}
              x={PADDING + step * STEP_X_GAP}
              y={height - 12}
              textAnchor="middle"
              fill="var(--text-secondary, #94a3b8)"
              fontSize={11}
            >
              t={step}
            </text>
          ))}
        </svg>
      </div>

    </ChartCard>
  );
}
