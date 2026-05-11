"use client";

/**
 * DeepResearchPanel — AI-powered deep research experience for Preparation Studio.
 *
 * Triggered by the Research button on the question card. Slides open a
 * glassmorphic panel that:
 * 1. Shows a budget confirmation ("8 agents, ~45s. Proceed?")
 * 2. Runs a simulated agent swarm with live progress tiles
 * 3. Displays results in 3 tabs: Summary / Evidence / Snippets
 * 4. Allows citation insertion into the current answer
 *
 * Design spec:
 * - Panel: glassmorphic slide-up overlay, max-w-4xl, rounded-2xl
 * - Agent tiles: 6-8 tiles that fill with color as agents return
 * - Tab bar: underline-style, gold accent on active tab
 * - Citation chip: "Insert into answer" button with source metadata
 * - ETA counter: countdown timer during agent execution
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

// ── Types ────────────────────────────────────────────────────────────

export interface ResearchAgent {
  id: string;
  name: string;
  category: "market" | "competitor" | "regulatory" | "financial" | "entity" | "general";
  status: "pending" | "running" | "complete" | "error";
  /** Result text from this agent (populated when complete) */
  result?: string;
  /** Time taken in ms */
  durationMs?: number;
}

export interface ResearchCitation {
  /** Unique ID for keying */
  id: string;
  /** Source label (e.g. "Crunchbase", "Companies House", "Market Report") */
  source: string;
  /** The snippet text */
  text: string;
  /** URL if available */
  url?: string;
  /** Confidence 0-100 */
  confidence: number;
}

export interface ResearchResult {
  /** High-level summary paragraph */
  summary: string;
  /** Evidence items with sources */
  evidence: ResearchCitation[];
  /** Actionable snippets ready for insertion */
  snippets: ResearchCitation[];
  /** Total time taken */
  totalDurationMs: number;
  /** Timestamp */
  timestamp: Date;
  /** The question text this research was for */
  questionText: string;
}

type ResearchTab = "summary" | "evidence" | "snippets";
type PanelPhase = "confirm" | "running" | "results";

interface DeepResearchPanelProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Current question text for context */
  questionText: string;
  /** Document type for research scoping */
  documentType: string;
  /** Called when user clicks "Insert into answer" on a citation */
  onInsertCitation: (citation: ResearchCitation) => void;
  /** Called when research completes — parent can store in history */
  onResearchComplete?: (result: ResearchResult) => void;
}

// ── Agent category colors ────────────────────────────────────────────

function categoryColor(cat: ResearchAgent["category"]): string {
  switch (cat) {
    case "market": return "#3b82f6";
    case "competitor": return "#f97316";
    case "regulatory": return "#eab308";
    case "financial": return "#22c55e";
    case "entity": return "#a855f7";
    case "general": return "#6b7280";
  }
}

function categoryIcon(cat: ResearchAgent["category"]): string {
  switch (cat) {
    case "market": return "M";
    case "competitor": return "C";
    case "regulatory": return "R";
    case "financial": return "F";
    case "entity": return "E";
    case "general": return "G";
  }
}

// ── Generate simulated agents for a question ─────────────────────────

function generateAgents(questionText: string, documentType: string): ResearchAgent[] {
  const q = questionText.toLowerCase();
  const agents: ResearchAgent[] = [];

  // Always include general search
  agents.push({ id: "general-1", name: "Web Intelligence", category: "general", status: "pending" });

  // Market agents
  if (q.includes("market") || q.includes("tam") || q.includes("size") || q.includes("revenue") || q.includes("growth")) {
    agents.push({ id: "market-1", name: "Market Size Analysis", category: "market", status: "pending" });
    agents.push({ id: "market-2", name: "Growth Trends", category: "market", status: "pending" });
  } else {
    agents.push({ id: "market-1", name: "Market Context", category: "market", status: "pending" });
  }

  // Competitor agents
  if (q.includes("compet") || q.includes("differentiat") || q.includes("advantage") || q.includes("moat")) {
    agents.push({ id: "comp-1", name: "Competitor Landscape", category: "competitor", status: "pending" });
    agents.push({ id: "comp-2", name: "Competitive Positioning", category: "competitor", status: "pending" });
  } else {
    agents.push({ id: "comp-1", name: "Competitor Scan", category: "competitor", status: "pending" });
  }

  // Regulatory
  if (q.includes("regulat") || q.includes("compliance") || q.includes("legal") || q.includes("licen")) {
    agents.push({ id: "reg-1", name: "Regulatory Landscape", category: "regulatory", status: "pending" });
    agents.push({ id: "reg-2", name: "Compliance Requirements", category: "regulatory", status: "pending" });
  } else {
    agents.push({ id: "reg-1", name: "Regulatory Context", category: "regulatory", status: "pending" });
  }

  // Financial
  if (q.includes("financ") || q.includes("revenue") || q.includes("valuation") || q.includes("fund") || q.includes("invest")) {
    agents.push({ id: "fin-1", name: "Financial Intelligence", category: "financial", status: "pending" });
    agents.push({ id: "fin-2", name: "Funding Landscape", category: "financial", status: "pending" });
  } else {
    agents.push({ id: "fin-1", name: "Financial Context", category: "financial", status: "pending" });
  }

  // Entity
  if (documentType === "investor_memo" || documentType === "pitch_deck" || q.includes("investor") || q.includes("entity")) {
    agents.push({ id: "ent-1", name: "Entity Intelligence", category: "entity", status: "pending" });
  }

  return agents;
}

// ── Simulated research results ───────────────────────────────────────

function generateSimulatedResults(questionText: string, agents: ResearchAgent[]): ResearchResult {
  const q = questionText.toLowerCase();

  // Generate contextual summary
  let summary = `Based on analysis from ${agents.length} research agents, `;
  if (q.includes("market") || q.includes("size")) {
    summary += "the addressable market shows strong growth potential with a compound annual growth rate indicating expansion opportunities. Key data points from multiple sources confirm the market thesis outlined in your document.";
  } else if (q.includes("compet")) {
    summary += "the competitive landscape reveals a fragmented market with several key players but significant room for differentiation. Your positioning aligns well with identified gaps in current offerings.";
  } else if (q.includes("revenue") || q.includes("financ")) {
    summary += "financial benchmarks from comparable companies support the projections outlined. Industry-standard metrics confirm the growth trajectory is within expected ranges for this stage and sector.";
  } else if (q.includes("team")) {
    summary += "team composition analysis shows strong alignment with successful ventures in this space. Key hires and advisory board composition match patterns seen in comparable successful exits.";
  } else {
    summary += "multiple data sources confirm the strategic direction described. Cross-referencing agent findings reveals consistent supporting evidence from market, competitive, and financial perspectives.";
  }

  // Generate evidence citations
  const evidence: ResearchCitation[] = [
    {
      id: "ev-1",
      source: "Market Intelligence",
      text: "Industry analysis confirms market dynamics consistent with the thesis presented. Growth indicators align with sector benchmarks.",
      confidence: 85,
    },
    {
      id: "ev-2",
      source: "Competitive Analysis",
      text: "Competitive positioning review identifies clear differentiation opportunities in the target segment.",
      confidence: 78,
    },
    {
      id: "ev-3",
      source: "Financial Benchmarks",
      text: "Comparable company analysis supports revenue projections within standard deviation for this sector and stage.",
      confidence: 82,
    },
    {
      id: "ev-4",
      source: "Regulatory Review",
      text: "No significant regulatory barriers identified. Compliance requirements are standard for the operating jurisdiction.",
      confidence: 90,
    },
  ];

  // Generate actionable snippets
  const snippets: ResearchCitation[] = [
    {
      id: "sn-1",
      source: "Market Data",
      text: q.includes("market")
        ? "The global addressable market is projected to reach significant scale, with the target segment showing above-average growth rates."
        : "Market analysis supports the strategic positioning described in the document.",
      confidence: 83,
    },
    {
      id: "sn-2",
      source: "Competitive Intel",
      text: "Key differentiators include unique technology advantages and strategic market positioning that current competitors have not addressed.",
      confidence: 76,
    },
    {
      id: "sn-3",
      source: "Investor Insights",
      text: "Recent funding rounds in adjacent sectors validate investor appetite for this category, with comparable companies achieving strong valuations.",
      confidence: 80,
    },
  ];

  return {
    summary,
    evidence,
    snippets,
    totalDurationMs: 8000 + Math.random() * 4000,
    timestamp: new Date(),
    questionText,
  };
}

// ── Agent Tile sub-component ─────────────────────────────────────────

function AgentTile({ agent }: { agent: ResearchAgent }) {
  const color = categoryColor(agent.category);
  const icon = categoryIcon(agent.category);

  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3 py-2 transition-all"
      style={{
        background:
          agent.status === "complete"
            ? `${color}15`
            : agent.status === "running"
            ? "rgba(196, 169, 106, 0.06)"
            : "rgba(255,255,255,0.02)",
        border: `1px solid ${
          agent.status === "complete"
            ? `${color}30`
            : agent.status === "running"
            ? "rgba(196, 169, 106, 0.15)"
            : "rgba(255,255,255,0.04)"
        }`,
        opacity: agent.status === "pending" ? 0.5 : 1,
      }}
    >
      {/* Category icon */}
      <div
        className="flex items-center justify-center rounded-full shrink-0"
        style={{
          width: "24px",
          height: "24px",
          fontSize: "10px",
          fontWeight: 700,
          color: agent.status === "complete" ? color : "rgba(255,255,255,0.3)",
          background:
            agent.status === "complete"
              ? `${color}20`
              : "rgba(255,255,255,0.04)",
          border: `1px solid ${
            agent.status === "complete" ? `${color}30` : "rgba(255,255,255,0.06)"
          }`,
        }}
      >
        {agent.status === "running" ? (
          <span className="inline-block animate-spin" style={{ fontSize: "10px" }}>
            &#x25E0;
          </span>
        ) : agent.status === "complete" ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          icon
        )}
      </div>

      {/* Agent name */}
      <span
        style={{
          fontSize: "11px",
          color:
            agent.status === "complete"
              ? "#e2e8f0"
              : agent.status === "running"
              ? "#C4A96A"
              : "rgba(255,255,255,0.3)",
          fontWeight: agent.status === "running" ? 600 : 400,
          whiteSpace: "nowrap",
        }}
      >
        {agent.name}
      </span>

      {/* Duration badge */}
      {agent.status === "complete" && agent.durationMs && (
        <span
          style={{
            fontSize: "9px",
            color: "rgba(255,255,255,0.2)",
            marginLeft: "auto",
          }}
        >
          {(agent.durationMs / 1000).toFixed(1)}s
        </span>
      )}
    </div>
  );
}

// ── Citation Card sub-component ──────────────────────────────────────

function CitationCard({
  citation,
  onInsert,
}: {
  citation: ResearchCitation;
  onInsert: (citation: ResearchCitation) => void;
}) {
  const confColor =
    citation.confidence >= 80
      ? "#22c55e"
      : citation.confidence >= 50
      ? "#eab308"
      : "#ef4444";

  return (
    <div
      className="rounded-lg px-4 py-3"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Source + confidence */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="rounded-full"
            style={{
              width: "6px",
              height: "6px",
              background: confColor,
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontSize: "10px",
              color: "#9AA7B2",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {citation.source}
          </span>
        </div>
        <span style={{ fontSize: "10px", color: confColor }}>
          {citation.confidence}%
        </span>
      </div>

      {/* Citation text */}
      <p
        style={{
          fontSize: "13px",
          color: "#e2e8f0",
          lineHeight: 1.6,
          marginBottom: "8px",
        }}
      >
        {citation.text}
      </p>

      {/* Insert button */}
      <button
        onClick={() => onInsert(citation)}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer"
        style={{
          background: "rgba(196, 169, 106, 0.08)",
          border: "1px solid rgba(196, 169, 106, 0.15)",
          color: "#C4A96A",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Insert into answer
      </button>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export function DeepResearchPanel({
  isOpen,
  onClose,
  questionText,
  documentType,
  onInsertCitation,
  onResearchComplete,
}: DeepResearchPanelProps) {
  const [phase, setPhase] = useState<PanelPhase>("confirm");
  const [agents, setAgents] = useState<ResearchAgent[]>([]);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [activeTab, setActiveTab] = useState<ResearchTab>("summary");
  const [etaSeconds, setEtaSeconds] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const agentTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Reset when panel opens/closes or question changes
  useEffect(() => {
    if (isOpen) {
      setPhase("confirm");
      setResult(null);
      setActiveTab("summary");
      setAgents(generateAgents(questionText, documentType));
    } else {
      // Cleanup timers
      if (intervalRef.current) clearInterval(intervalRef.current);
      agentTimersRef.current.forEach(clearTimeout);
      agentTimersRef.current = [];
    }
  }, [isOpen, questionText, documentType]);

  // ── Start research ──────────────────────────────────────────────────

  const startResearch = useCallback(() => {
    setPhase("running");

    // Set all agents to pending first
    const runningAgents = agents.map((a) => ({ ...a, status: "pending" as const }));
    setAgents(runningAgents);

    // ETA countdown
    const totalEta = 8 + Math.floor(agents.length * 1.5);
    setEtaSeconds(totalEta);

    intervalRef.current = setInterval(() => {
      setEtaSeconds((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Simulate agents completing one by one with staggered delays
    const timers: ReturnType<typeof setTimeout>[] = [];
    const shuffled = [...runningAgents].sort(() => Math.random() - 0.5);

    shuffled.forEach((agent, index) => {
      // Start running after a small delay
      const runDelay = 200 + index * 400;
      const runTimer = setTimeout(() => {
        setAgents((prev) =>
          prev.map((a) =>
            a.id === agent.id ? { ...a, status: "running" } : a
          )
        );
      }, runDelay);
      timers.push(runTimer);

      // Complete after a longer delay
      const completeDelay = 1500 + index * 1200 + Math.random() * 800;
      const completeTimer = setTimeout(() => {
        setAgents((prev) =>
          prev.map((a) =>
            a.id === agent.id
              ? { ...a, status: "complete", durationMs: completeDelay }
              : a
          )
        );

        // When last agent completes, show results
        if (index === shuffled.length - 1) {
          setTimeout(() => {
            const researchResult = generateSimulatedResults(questionText, shuffled);
            setResult(researchResult);
            setPhase("results");
            setEtaSeconds(0);
            if (intervalRef.current) clearInterval(intervalRef.current);
            onResearchComplete?.(researchResult);
          }, 600);
        }
      }, completeDelay);
      timers.push(completeTimer);
    });

    agentTimersRef.current = timers;
  }, [agents, questionText, onResearchComplete]);

  // ── Cleanup on unmount ──────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      agentTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  // WC-04: Esc-to-close + focus trap inside the panel
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(isOpen, panelRef);

  // ── Derived data ────────────────────────────────────────────────────

  const completedCount = useMemo(
    () => agents.filter((a) => a.status === "complete").length,
    [agents]
  );

  const runningCount = useMemo(
    () => agents.filter((a) => a.status === "running").length,
    [agents]
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4"
        style={{
          animation: "studioResearchSlideUp 300ms ease-out",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Deep Research"
      >
        <div
          ref={panelRef}
          className="w-full max-w-4xl rounded-2xl overflow-hidden"
          style={{
            background: "rgba(15, 18, 25, 0.95)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 -8px 48px rgba(0,0,0,0.4)",
            maxHeight: "80vh",
          }}
        >
          {/* ── Header ────────────────────────────────────────────────── */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center gap-3">
              {/* Gold research icon */}
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: "32px",
                  height: "32px",
                  background: "rgba(196, 169, 106, 0.12)",
                  border: "1px solid rgba(196, 169, 106, 0.2)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C4A96A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>

              <div>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#e2e8f0" }}>
                  Deep Research
                </h3>
                <p style={{ fontSize: "11px", color: "#9AA7B2", marginTop: "2px" }}>
                  {phase === "confirm" && `${agents.length} agents ready`}
                  {phase === "running" && `${completedCount}/${agents.length} complete${runningCount > 0 ? ` \u00b7 ${runningCount} running` : ""}`}
                  {phase === "results" && `Research complete \u00b7 ${result?.evidence.length || 0} sources`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* ETA counter */}
              {phase === "running" && etaSeconds > 0 && (
                <span
                  className="rounded-md px-2 py-1"
                  style={{
                    fontSize: "11px",
                    color: "#C4A96A",
                    background: "rgba(196, 169, 106, 0.06)",
                    border: "1px solid rgba(196, 169, 106, 0.1)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  ~{etaSeconds}s
                </span>
              )}

              {/* Close button */}
              <button
                onClick={onClose}
                className="flex items-center justify-center rounded-full transition-all cursor-pointer"
                style={{
                  width: "28px",
                  height: "28px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
                aria-label="Close research panel"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9AA7B2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── Body ──────────────────────────────────────────────────── */}
          <div className="px-6 py-5 overflow-y-auto" style={{ maxHeight: "calc(80vh - 72px)" }}>

            {/* Phase: Confirm */}
            {phase === "confirm" && (
              <div className="flex flex-col items-center gap-5 py-6">
                <p style={{ fontSize: "13px", color: "#9AA7B2", textAlign: "center", maxWidth: "400px", lineHeight: 1.6 }}>
                  {agents.length} research agents will analyze your question across market, competitive, regulatory, and financial data sources.
                </p>

                {/* Agent preview grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-md">
                  {agents.map((agent) => (
                    <AgentTile key={agent.id} agent={agent} />
                  ))}
                </div>

                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>
                  Estimated time: ~{8 + Math.floor(agents.length * 1.5)}s
                </p>

                {/* Proceed button */}
                <button
                  onClick={startResearch}
                  className="flex items-center gap-2 rounded-xl px-6 py-3 font-medium transition-all cursor-pointer"
                  style={{
                    background: "linear-gradient(135deg, rgba(196, 169, 106, 0.15) 0%, rgba(196, 169, 106, 0.08) 100%)",
                    border: "1px solid rgba(196, 169, 106, 0.25)",
                    color: "#C4A96A",
                    fontSize: "14px",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  Proceed with Research
                </button>
              </div>
            )}

            {/* Phase: Running */}
            {phase === "running" && (
              <div className="space-y-4">
                {/* Progress bar */}
                <div
                  className="rounded-full overflow-hidden"
                  style={{
                    height: "4px",
                    background: "rgba(255,255,255,0.04)",
                  }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${agents.length > 0 ? (completedCount / agents.length) * 100 : 0}%`,
                      background: "linear-gradient(90deg, #C4A96A, #e8d5a3)",
                      transition: "width 400ms ease",
                    }}
                  />
                </div>

                {/* Agent grid — live tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {agents.map((agent) => (
                    <AgentTile key={agent.id} agent={agent} />
                  ))}
                </div>

                {/* Status message */}
                <p
                  className="text-center"
                  style={{ fontSize: "12px", color: "#C4A96A", opacity: 0.7 }}
                >
                  Agents are analyzing your question...
                </p>
              </div>
            )}

            {/* Phase: Results */}
            {phase === "results" && result && (
              <div className="space-y-4">
                {/* Completed agents summary */}
                <div className="flex flex-wrap gap-1.5">
                  {agents.map((agent) => (
                    <span
                      key={agent.id}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5"
                      style={{
                        fontSize: "10px",
                        color: categoryColor(agent.category),
                        background: `${categoryColor(agent.category)}10`,
                        border: `1px solid ${categoryColor(agent.category)}20`,
                      }}
                    >
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {agent.name}
                    </span>
                  ))}
                </div>

                {/* Tab bar */}
                <div
                  className="flex gap-4"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  {(["summary", "evidence", "snippets"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className="pb-2 text-xs font-medium uppercase tracking-wide transition-all cursor-pointer"
                      style={{
                        color: activeTab === tab ? "#C4A96A" : "#9AA7B2",
                        borderBottom: activeTab === tab ? "2px solid #C4A96A" : "2px solid transparent",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {tab}
                      {tab === "evidence" && ` (${result.evidence.length})`}
                      {tab === "snippets" && ` (${result.snippets.length})`}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="min-h-[120px]">
                  {/* Summary tab */}
                  {activeTab === "summary" && (
                    <div
                      className="rounded-lg px-4 py-3"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      <p style={{ fontSize: "14px", color: "#e2e8f0", lineHeight: 1.7 }}>
                        {result.summary}
                      </p>

                      <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)" }}>
                          {agents.length} agents &middot; {(result.totalDurationMs / 1000).toFixed(1)}s
                        </span>
                        <button
                          onClick={() =>
                            onInsertCitation({
                              id: "summary",
                              source: "Deep Research Summary",
                              text: result.summary,
                              confidence: 85,
                            })
                          }
                          className="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs transition-all cursor-pointer"
                          style={{
                            color: "#C4A96A",
                            background: "rgba(196, 169, 106, 0.06)",
                            border: "1px solid rgba(196, 169, 106, 0.12)",
                          }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          Insert summary
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Evidence tab */}
                  {activeTab === "evidence" && (
                    <div className="space-y-3">
                      {result.evidence.map((citation) => (
                        <CitationCard
                          key={citation.id}
                          citation={citation}
                          onInsert={onInsertCitation}
                        />
                      ))}
                    </div>
                  )}

                  {/* Snippets tab */}
                  {activeTab === "snippets" && (
                    <div className="space-y-3">
                      {result.snippets.map((citation) => (
                        <CitationCard
                          key={citation.id}
                          citation={citation}
                          onInsert={onInsertCitation}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slide-up animation */}
      <style jsx>{`
        @keyframes studioResearchSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
