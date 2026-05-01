"use client";

/**
 * OLIVIA BRAIN — Admin Dashboard Client
 *
 * Comprehensive agent management dashboard featuring:
 * - System health overview
 * - Agent grid with filtering and search
 * - Agent detail panel
 * - Briefings panel
 * - Run all agents capability
 */

import { useState, useMemo, useCallback, useRef } from "react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface AgentGroup {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  sort_order: number;
  _count: { agents: number };
}

interface Agent {
  id: string;
  agent_id: string;
  name: string;
  description: string | null;
  status: string;
  persona: string | null;
  llm_model: string;
  temperature: number;
  max_tokens: number;
  schedule_type: string;
  rate_limit_per_min: number;
  rate_limit_per_day: number;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  total_cost_usd: number;
  avg_latency_ms: number;
  performance_score: number;
  last_run_at: string | null;
  last_error_at: string | null;
  last_error: string | null;
  is_archived: boolean;
  group: AgentGroup;
  _count: { runs: number; briefings: number; learnings: number };
}

interface Briefing {
  id: string;
  briefing_type: string;
  title: string;
  summary: string;
  severity: string;
  is_read: boolean;
  created_at: string;
  agent: { agent_id: string; name: string };
}

interface SystemAlert {
  id: string;
  source: string;
  severity: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface FeatureToggle {
  id: string;
  key: string;
  enabled: boolean;
  description: string | null;
}

interface DashboardStats {
  totalAgents: number;
  activeAgents: number;
  pausedAgents: number;
  errorAgents: number;
  totalRunsToday: number;
  successRateToday: number;
  totalCostToday: number;
  unreadBriefings: number;
}

interface AdminDashboardClientProps {
  initialAgents: Agent[];
  initialGroups: AgentGroup[];
  initialBriefings: Briefing[];
  initialAlerts: SystemAlert[];
  initialToggles: FeatureToggle[];
  initialStats: DashboardStats;
}

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  active: { color: "#4ade80", bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", label: "Active" },
  paused: { color: "#facc15", bg: "rgba(250,204,21,0.08)", border: "rgba(250,204,21,0.25)", label: "Paused" },
  disabled: { color: "#64748b", bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.25)", label: "Disabled" },
  error: { color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.25)", label: "Error" },
  initializing: { color: "#60a5fa", bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.25)", label: "Init" },
};

const SEVERITY_CONFIG: Record<string, { color: string; bg: string }> = {
  info: { color: "#60a5fa", bg: "rgba(96,165,250,0.1)" },
  warning: { color: "#facc15", bg: "rgba(250,204,21,0.1)" },
  critical: { color: "#f87171", bg: "rgba(248,113,113,0.1)" },
};

const PERSONA_CONFIG: Record<string, { color: string; label: string }> = {
  olivia: { color: "#818cf8", label: "Olivia" },
  cristiano: { color: "#f59e0b", label: "Cristiano" },
  emelia: { color: "#ec4899", label: "Emelia" },
  system: { color: "#64748b", label: "System" },
};

// Glass morphism styles
const glassPanel: React.CSSProperties = {
  background: "rgba(15, 23, 42, 0.6)",
  backdropFilter: "blur(16px) saturate(1.5)",
  WebkitBackdropFilter: "blur(16px) saturate(1.5)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  borderRadius: "16px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03) inset",
};

const glassCard: React.CSSProperties = {
  background: "rgba(17, 24, 39, 0.5)",
  border: "1px solid rgba(255, 255, 255, 0.05)",
  borderRadius: "12px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
};

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function AdminDashboardClient({
  initialAgents,
  initialGroups,
  initialBriefings,
  initialAlerts,
  initialToggles,
  initialStats,
}: AdminDashboardClientProps) {
  // State
  const [agents] = useState<Agent[]>(initialAgents);
  const [groups] = useState<AgentGroup[]>(initialGroups);
  const [recentBriefings] = useState<Briefing[]>(initialBriefings);
  const [systemAlerts] = useState<SystemAlert[]>(initialAlerts);
  const [featureToggles, setFeatureToggles] = useState<FeatureToggle[]>(initialToggles);
  const [stats] = useState<DashboardStats>(initialStats);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [personaFilter, setPersonaFilter] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [categoryTab, setCategoryTab] = useState<"all" | "persona" | "domain" | "infrastructure" | "integration">("all");

  // UI state
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [showBriefingPanel, setShowBriefingPanel] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [runAllOpen, setRunAllOpen] = useState(false);
  const [runAllRunning, setRunAllRunning] = useState(false);
  const [runAllProgress, setRunAllProgress] = useState({ completed: 0, total: 0 });
  const [runAllResults, setRunAllResults] = useState<Map<string, { status: string; message?: string }>>(new Map());
  const runAllAbortRef = useRef(false);

  // Computed values
  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !agent.agent_id.toLowerCase().includes(q) &&
          !agent.name.toLowerCase().includes(q) &&
          !(agent.description?.toLowerCase().includes(q) ?? false)
        ) {
          return false;
        }
      }

      // Status filter
      if (statusFilter && agent.status !== statusFilter) {
        return false;
      }

      // Persona filter
      if (personaFilter && agent.persona !== personaFilter) {
        return false;
      }

      // Category tab
      if (categoryTab !== "all" && agent.group.category !== categoryTab) {
        return false;
      }

      // Group filter
      if (groupFilter && agent.group.code !== groupFilter) {
        return false;
      }

      return true;
    });
  }, [agents, searchQuery, statusFilter, personaFilter, groupFilter, categoryTab]);

  const filteredGroups = useMemo(() => {
    if (categoryTab === "all") return groups;
    return groups.filter((g) => g.category === categoryTab);
  }, [groups, categoryTab]);

  const agentsByGroup = useMemo(() => {
    const map = new Map<string, Agent[]>();
    for (const agent of filteredAgents) {
      const code = agent.group.code;
      if (!map.has(code)) map.set(code, []);
      map.get(code)!.push(agent);
    }
    return map;
  }, [filteredAgents]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { active: 0, paused: 0, disabled: 0, error: 0, initializing: 0 };
    for (const agent of agents) {
      counts[agent.status] = (counts[agent.status] ?? 0) + 1;
    }
    return counts;
  }, [agents]);

  const categoryCounts = useMemo(() => {
    const counts = { all: agents.length, persona: 0, domain: 0, infrastructure: 0, integration: 0 };
    for (const agent of agents) {
      const cat = agent.group.category as keyof typeof counts;
      if (cat in counts) counts[cat]++;
    }
    return counts;
  }, [agents]);

  const totalCostAllTime = useMemo(() => {
    return agents.reduce((sum, a) => sum + a.total_cost_usd, 0);
  }, [agents]);

  const unreadBriefingCount = useMemo(() => {
    return recentBriefings.filter((b) => !b.is_read).length;
  }, [recentBriefings]);

  const selectedAgent = useMemo(() => {
    return agents.find((a) => a.agent_id === selectedAgentId) ?? null;
  }, [agents, selectedAgentId]);

  // Handlers
  const toggleGroup = useCallback((code: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  const selectAgent = useCallback((agentId: string) => {
    setSelectedAgentId((prev) => (prev === agentId ? null : agentId));
  }, []);

  const toggleFeature = useCallback(async (key: string) => {
    const toggle = featureToggles.find((t) => t.key === key);
    if (!toggle) return;

    const newEnabled = !toggle.enabled;
    setFeatureToggles((prev) =>
      prev.map((t) => (t.key === key ? { ...t, enabled: newEnabled } : t))
    );

    // API call would go here
    try {
      await fetch("/api/admin/toggles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled: newEnabled }),
      });
    } catch {
      // Revert on error
      setFeatureToggles((prev) =>
        prev.map((t) => (t.key === key ? { ...t, enabled: !newEnabled } : t))
      );
    }
  }, [featureToggles]);

  const runAllAgents = useCallback(async () => {
    const activeAgents = agents.filter((a) => a.status === "active" && !a.is_archived);
    if (activeAgents.length === 0) return;

    setRunAllRunning(true);
    setRunAllProgress({ completed: 0, total: activeAgents.length });
    setRunAllResults(new Map());
    runAllAbortRef.current = false;

    for (let i = 0; i < activeAgents.length; i++) {
      if (runAllAbortRef.current) break;

      const agent = activeAgents[i];
      try {
        const res = await fetch("/api/admin/agents/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: agent.agent_id }),
        });
        const data = await res.json();
        setRunAllResults((prev) => {
          const next = new Map(prev);
          next.set(agent.agent_id, {
            status: data.success ? "success" : "failed",
            message: data.outputSummary ?? data.errorMessage,
          });
          return next;
        });
      } catch {
        setRunAllResults((prev) => {
          const next = new Map(prev);
          next.set(agent.agent_id, { status: "failed", message: "Network error" });
          return next;
        });
      }

      setRunAllProgress((prev) => ({ ...prev, completed: i + 1 }));
    }

    setRunAllRunning(false);
  }, [agents]);

  return (
    <div className="mx-auto max-w-[1800px] px-6 py-8">
      {/* ═══════════════════════════════════════
          HEADER
      ═══════════════════════════════════════ */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">
              Olivia Brain — Agent Command Center
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {stats.totalAgents} agents • {stats.activeAgents} active • {stats.totalRunsToday} runs today
            </p>
          </div>
          <button
            onClick={() => setRunAllOpen(true)}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg, rgba(99,102,241,0.8) 0%, rgba(34,197,94,0.8) 100%)",
              border: "1px solid rgba(99,102,241,0.4)",
              boxShadow: "0 4px 16px rgba(99,102,241,0.2)",
            }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Run All Agents
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════
          STATS BAR
      ═══════════════════════════════════════ */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8" style={glassPanel}>
        {[
          { label: "Total Agents", value: stats.totalAgents, color: "#818cf8" },
          { label: "Active", value: stats.activeAgents, color: "#4ade80" },
          { label: "Paused", value: stats.pausedAgents, color: "#facc15" },
          { label: "Errors", value: stats.errorAgents, color: "#f87171" },
          { label: "Runs Today", value: stats.totalRunsToday, color: "#60a5fa" },
          { label: "Success Rate", value: `${stats.successRateToday}%`, color: stats.successRateToday >= 90 ? "#4ade80" : stats.successRateToday >= 70 ? "#facc15" : "#f87171" },
          { label: "Cost Today", value: `$${stats.totalCostToday.toFixed(2)}`, color: "#c084fc" },
          { label: "Briefings", value: stats.unreadBriefings, color: "#f472b6" },
        ].map((stat) => (
          <div key={stat.label} className="p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </p>
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════
          FILTER BAR
      ═══════════════════════════════════════ */}
      <div className="mb-6 flex flex-wrap items-center gap-3" style={glassPanel}>
        {/* Search */}
        <div className="flex-1 min-w-[200px] p-3">
          <input
            type="text"
            placeholder="Search agents by name, ID, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
          />
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap gap-1.5 px-3 pb-3 sm:pb-0">
          <button
            onClick={() => setStatusFilter(null)}
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
              !statusFilter
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : "text-[var(--muted)] border border-transparent hover:text-[var(--foreground)]"
            }`}
          >
            All
          </button>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(statusFilter === key ? null : key)}
              className="rounded-full px-3 py-1 text-[11px] font-medium transition-all"
              style={{
                color: statusFilter === key ? cfg.color : "var(--muted)",
                background: statusFilter === key ? cfg.bg : "transparent",
                border: `1px solid ${statusFilter === key ? cfg.border : "transparent"}`,
              }}
            >
              {cfg.label} ({statusCounts[key] ?? 0})
            </button>
          ))}
        </div>

        {/* Persona filter */}
        <div className="px-3 pb-3 sm:pb-0">
          <select
            value={personaFilter ?? ""}
            onChange={(e) => setPersonaFilter(e.target.value || null)}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-indigo-500/50 focus:outline-none"
          >
            <option value="">All Personas</option>
            {Object.entries(PERSONA_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>

        {/* Group filter */}
        <div className="px-3 pb-3 sm:pb-0">
          <select
            value={groupFilter ?? ""}
            onChange={(e) => setGroupFilter(e.target.value || null)}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-indigo-500/50 focus:outline-none"
          >
            <option value="">All Groups</option>
            {filteredGroups.map((g) => (
              <option key={g.code} value={g.code}>
                {g.code} — {g.name} ({g._count.agents})
              </option>
            ))}
          </select>
        </div>

        {/* Briefing toggle */}
        <div className="px-3 pb-3 sm:pb-0">
          <button
            onClick={() => setShowBriefingPanel(!showBriefingPanel)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
            style={{
              color: showBriefingPanel ? "#c084fc" : "var(--muted)",
              background: showBriefingPanel ? "rgba(192,132,252,0.1)" : "transparent",
              border: `1px solid ${showBriefingPanel ? "rgba(192,132,252,0.3)" : "var(--card-border)"}`,
            }}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Briefings
            {unreadBriefingCount > 0 && (
              <span className="ml-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-purple-500/30 px-1 text-[10px] font-bold text-purple-300">
                {unreadBriefingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          CATEGORY TABS
      ═══════════════════════════════════════ */}
      <div className="mb-6 flex items-center gap-1 rounded-xl p-1" style={{ background: "rgba(15, 23, 42, 0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
        {([
          { id: "all" as const, label: "All Agents", count: categoryCounts.all },
          { id: "persona" as const, label: "Persona (1x)", count: categoryCounts.persona },
          { id: "domain" as const, label: "Domain (2x)", count: categoryCounts.domain },
          { id: "infrastructure" as const, label: "Infra (3x)", count: categoryCounts.infrastructure },
          { id: "integration" as const, label: "Integration (4x)", count: categoryCounts.integration },
        ]).map((tab) => {
          const isActive = categoryTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setCategoryTab(tab.id);
                setGroupFilter(null);
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all"
              style={{
                background: isActive ? "rgba(99,102,241,0.15)" : "transparent",
                color: isActive ? "#a5b4fc" : "var(--muted)",
                border: isActive ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
              }}
            >
              <span>{tab.label}</span>
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                style={{
                  background: isActive ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)",
                  color: isActive ? "#c7d2fe" : "var(--muted)",
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════
          MAIN LAYOUT
      ═══════════════════════════════════════ */}
      <div className="flex gap-6">
        {/* Briefing Panel */}
        {showBriefingPanel && (
          <aside className="w-80 shrink-0 hidden lg:block space-y-4">
            {/* System Alerts */}
            {systemAlerts.length > 0 && (
              <div style={glassPanel} className="p-4">
                <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                  <svg className="h-4 w-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  System Alerts
                </h2>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {systemAlerts.map((alert) => {
                    const sev = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info;
                    return (
                      <div
                        key={alert.id}
                        className="rounded-lg p-3"
                        style={{ background: sev.bg, border: `1px solid ${sev.color}22` }}
                      >
                        <p className="text-xs font-semibold" style={{ color: sev.color }}>
                          {alert.title}
                        </p>
                        <p className="mt-1 text-[11px] text-[var(--muted)] line-clamp-2">
                          {alert.message}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Briefings */}
            <div style={glassPanel} className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                <svg className="h-4 w-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Daily Intelligence
              </h2>
              {recentBriefings.length === 0 ? (
                <p className="text-xs text-[var(--muted)] italic">No recent briefings</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {recentBriefings.map((b) => {
                    const sev = SEVERITY_CONFIG[b.severity] ?? SEVERITY_CONFIG.info;
                    return (
                      <div
                        key={b.id}
                        className="rounded-lg p-3"
                        style={{ background: sev.bg, border: `1px solid ${sev.color}22` }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold" style={{ color: sev.color }}>
                            {b.title}
                          </p>
                          {!b.is_read && <span className="h-2 w-2 rounded-full bg-purple-400" />}
                        </div>
                        <p className="mt-1 text-[11px] text-[var(--muted)] line-clamp-2">{b.summary}</p>
                        <p className="mt-1 text-[10px] text-[var(--muted)]">
                          {b.agent.agent_id} • {new Date(b.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Agent Grid */}
        <main className="flex-1 min-w-0">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-[var(--muted)]">
              Showing {filteredAgents.length} of {agents.length} agents
            </p>
            <p className="text-xs text-[var(--muted)]">Total cost: ${totalCostAllTime.toFixed(2)}</p>
          </div>

          <div className="space-y-4">
            {filteredGroups
              .filter((g) => !groupFilter || g.code === groupFilter)
              .filter((g) => agentsByGroup.has(g.code))
              .map((group) => {
                const groupAgents = agentsByGroup.get(group.code) || [];
                const isCollapsed = collapsedGroups.has(group.code);
                const activeCount = groupAgents.filter((a) => a.status === "active").length;
                const errorCount = groupAgents.filter((a) => a.status === "error").length;

                return (
                  <section key={group.code} style={glassPanel} className="overflow-hidden">
                    <button
                      onClick={() => toggleGroup(group.code)}
                      className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-white/[0.02]"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold"
                          style={{
                            background: group.category === "persona" ? "rgba(99,102,241,0.15)" : group.category === "domain" ? "rgba(34,197,94,0.15)" : group.category === "infrastructure" ? "rgba(168,85,247,0.15)" : "rgba(59,130,246,0.15)",
                            color: group.category === "persona" ? "#818cf8" : group.category === "domain" ? "#4ade80" : group.category === "infrastructure" ? "#c084fc" : "#60a5fa",
                          }}
                        >
                          {group.code}
                        </span>
                        <div>
                          <h3 className="text-sm font-semibold text-[var(--foreground)]">{group.name}</h3>
                          <p className="text-[11px] text-[var(--muted)]">
                            {groupAgents.length} agents
                            {activeCount > 0 && <span className="text-green-400"> • {activeCount} active</span>}
                            {errorCount > 0 && <span className="text-red-400"> • {errorCount} errors</span>}
                          </p>
                        </div>
                      </div>
                      <svg
                        className={`h-4 w-4 text-[var(--muted)] transition-transform ${isCollapsed ? "" : "rotate-180"}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {!isCollapsed && (
                      <div className="grid grid-cols-1 gap-2 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {groupAgents.map((agent) => {
                          const stCfg = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.paused;
                          const isSelected = selectedAgentId === agent.agent_id;
                          const successRate = agent.total_runs > 0 ? Math.round((agent.successful_runs / agent.total_runs) * 100) : 0;

                          return (
                            <button
                              key={agent.agent_id}
                              onClick={() => selectAgent(agent.agent_id)}
                              className="group relative text-left transition-all duration-200"
                              style={{
                                ...glassCard,
                                transform: isSelected ? "scale(1.02)" : "scale(1)",
                                borderColor: isSelected ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.05)",
                                boxShadow: isSelected ? "0 8px 24px rgba(99,102,241,0.15)" : glassCard.boxShadow,
                              }}
                            >
                              <div className="p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-[10px] font-mono font-bold text-indigo-400/70">
                                    {agent.agent_id}
                                  </span>
                                  <span
                                    className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase"
                                    style={{ color: stCfg.color, background: stCfg.bg, border: `1px solid ${stCfg.border}` }}
                                  >
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: stCfg.color }} />
                                    {stCfg.label}
                                  </span>
                                </div>

                                <h4 className="mt-1.5 text-xs font-semibold text-[var(--foreground)] line-clamp-1 group-hover:text-indigo-300 transition-colors">
                                  {agent.name}
                                </h4>

                                {agent.persona && (
                                  <span
                                    className="mt-1 inline-block text-[9px] font-medium px-1.5 py-0.5 rounded"
                                    style={{ color: PERSONA_CONFIG[agent.persona]?.color ?? "#64748b", background: "rgba(255,255,255,0.05)" }}
                                  >
                                    {PERSONA_CONFIG[agent.persona]?.label ?? agent.persona}
                                  </span>
                                )}

                                <div className="mt-2 flex items-center gap-3 text-[10px] text-[var(--muted)]">
                                  <span>{agent.total_runs} runs</span>
                                  {agent.total_runs > 0 && (
                                    <span style={{ color: successRate >= 80 ? "#4ade80" : successRate >= 50 ? "#facc15" : "#f87171" }}>
                                      {successRate}%
                                    </span>
                                  )}
                                  <span className="ml-auto font-mono" style={{ color: agent.performance_score >= 80 ? "#4ade80" : agent.performance_score >= 50 ? "#facc15" : agent.performance_score > 0 ? "#f87171" : "var(--muted)" }}>
                                    {agent.performance_score > 0 ? agent.performance_score.toFixed(0) : "—"}
                                  </span>
                                </div>

                                {agent.last_run_at && (
                                  <p className="mt-1 text-[9px] text-[var(--muted)]">
                                    Last: {new Date(agent.last_run_at).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}

            {filteredAgents.length === 0 && (
              <div style={glassPanel} className="p-12 text-center">
                <p className="text-sm text-[var(--muted)]">No agents match your filters.</p>
              </div>
            )}
          </div>
        </main>

        {/* Agent Detail Panel */}
        {selectedAgent && (
          <aside className="w-96 shrink-0 hidden xl:block">
            <div style={glassPanel} className="sticky top-6 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-indigo-400">{selectedAgent.agent_id}</span>
                <button
                  onClick={() => setSelectedAgentId(null)}
                  className="rounded-md p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <h3 className="text-base font-bold text-[var(--foreground)]">{selectedAgent.name}</h3>
              <p className="mt-1 text-xs text-[var(--muted)] line-clamp-3">{selectedAgent.description}</p>

              {selectedAgent.persona && (
                <span
                  className="mt-2 inline-block text-[10px] font-medium px-2 py-1 rounded"
                  style={{ color: PERSONA_CONFIG[selectedAgent.persona]?.color, background: "rgba(255,255,255,0.05)" }}
                >
                  {PERSONA_CONFIG[selectedAgent.persona]?.label} Persona
                </span>
              )}

              <span
                className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{
                  color: STATUS_CONFIG[selectedAgent.status]?.color,
                  background: STATUS_CONFIG[selectedAgent.status]?.bg,
                  border: `1px solid ${STATUS_CONFIG[selectedAgent.status]?.border}`,
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: STATUS_CONFIG[selectedAgent.status]?.color }} />
                {STATUS_CONFIG[selectedAgent.status]?.label}
              </span>

              <div className="mt-4 space-y-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Configuration</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Model", value: selectedAgent.llm_model },
                    { label: "Temp", value: selectedAgent.temperature.toFixed(1) },
                    { label: "Max Tokens", value: selectedAgent.max_tokens.toLocaleString() },
                    { label: "Schedule", value: selectedAgent.schedule_type.replace("_", " ") },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                      <p className="text-[9px] text-[var(--muted)]">{item.label}</p>
                      <p className="text-xs font-medium text-[var(--foreground)]">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Performance</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-center">
                    <p className="text-[9px] text-[var(--muted)]">Total</p>
                    <p className="text-sm font-bold text-indigo-400">{selectedAgent.total_runs}</p>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-center">
                    <p className="text-[9px] text-[var(--muted)]">Success</p>
                    <p className="text-sm font-bold text-green-400">{selectedAgent.successful_runs}</p>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-center">
                    <p className="text-[9px] text-[var(--muted)]">Failed</p>
                    <p className="text-sm font-bold text-red-400">{selectedAgent.failed_runs}</p>
                  </div>
                </div>

                <div className="mt-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[var(--muted)]">Performance Score</span>
                    <span className="font-mono font-bold" style={{
                      color: selectedAgent.performance_score >= 80 ? "#4ade80" : selectedAgent.performance_score >= 50 ? "#facc15" : "#f87171",
                    }}>
                      {selectedAgent.performance_score > 0 ? selectedAgent.performance_score.toFixed(0) : "—"}/100
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(selectedAgent.performance_score, 0)}%`,
                        background: selectedAgent.performance_score >= 80 ? "#4ade80" : selectedAgent.performance_score >= 50 ? "#facc15" : "#f87171",
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                  <p className="text-[9px] text-[var(--muted)]">Total Cost</p>
                  <p className="text-xs font-medium text-[var(--foreground)]">${selectedAgent.total_cost_usd.toFixed(4)}</p>
                </div>
                <div className="rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                  <p className="text-[9px] text-[var(--muted)]">Avg Latency</p>
                  <p className="text-xs font-medium text-[var(--foreground)]">
                    {selectedAgent.avg_latency_ms > 0 ? `${selectedAgent.avg_latency_ms.toFixed(0)}ms` : "—"}
                  </p>
                </div>
              </div>

              {selectedAgent.last_error && (
                <div className="mt-4">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-red-400">Last Error</h4>
                  <div className="mt-1 rounded-lg bg-red-500/[0.06] border border-red-500/[0.15] p-2.5">
                    <p className="text-[11px] text-red-300 line-clamp-4 font-mono">{selectedAgent.last_error}</p>
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center gap-3 text-[10px] text-[var(--muted)]">
                <span>{selectedAgent._count.runs} runs</span>
                <span>•</span>
                <span>{selectedAgent._count.briefings} briefings</span>
                <span>•</span>
                <span>{selectedAgent._count.learnings} learnings</span>
              </div>

              <div className="mt-3 rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                <p className="text-[9px] text-[var(--muted)]">Group</p>
                <p className="text-xs font-medium text-[var(--foreground)]">
                  <span className="text-indigo-400">{selectedAgent.group.code}</span> — {selectedAgent.group.name}
                </p>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* ═══════════════════════════════════════
          RUN ALL MODAL
      ═══════════════════════════════════════ */}
      {runAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
          <div
            className="relative w-full max-w-[700px] mx-4 max-h-[90vh] flex flex-col"
            style={{ ...glassPanel, background: "rgba(10, 15, 30, 0.92)" }}
          >
            <div className="flex items-center justify-between p-5 pb-0">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.3) 0%, rgba(34,197,94,0.3) 100%)" }}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth={2}>
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--foreground)]">Run All Agents</h2>
                  <p className="text-xs text-[var(--muted)]">
                    {runAllRunning
                      ? `Executing ${runAllProgress.completed + 1} of ${runAllProgress.total}...`
                      : runAllProgress.completed > 0
                        ? `Complete — ${Array.from(runAllResults.values()).filter((r) => r.status === "success").length} succeeded`
                        : `${agents.filter((a) => a.status === "active").length} agents ready`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { runAllAbortRef.current = true; setRunAllOpen(false); }}
                className="rounded-lg p-2 text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="px-5 pt-4 pb-2">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-[var(--muted)]">{runAllProgress.completed} / {runAllProgress.total} agents</span>
                <span className="font-mono font-bold" style={{ color: runAllProgress.total > 0 && runAllProgress.completed === runAllProgress.total ? "#4ade80" : "#818cf8" }}>
                  {runAllProgress.total > 0 ? Math.round((runAllProgress.completed / runAllProgress.total) * 100) : 0}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${runAllProgress.total > 0 ? (runAllProgress.completed / runAllProgress.total) * 100 : 0}%`,
                    background: "linear-gradient(90deg, #818cf8, #6366f1)",
                  }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-5 pt-2 space-y-1" style={{ maxHeight: "60vh" }}>
              {agents.filter((a) => a.status === "active" && !a.is_archived).map((agent) => {
                const result = runAllResults.get(agent.agent_id);
                const st = result?.status ?? "pending";
                return (
                  <div
                    key={agent.agent_id}
                    className="flex items-center justify-between p-2 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-indigo-400">{agent.agent_id}</span>
                      <span className="text-xs text-[var(--foreground)]">{agent.name}</span>
                    </div>
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded"
                      style={{
                        color: st === "success" ? "#4ade80" : st === "failed" ? "#f87171" : "#64748b",
                        background: st === "success" ? "rgba(74,222,128,0.1)" : st === "failed" ? "rgba(248,113,113,0.1)" : "rgba(100,116,139,0.1)",
                      }}
                    >
                      {st === "pending" ? "Pending" : st === "success" ? "Success" : "Failed"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="p-5 pt-0">
              {!runAllRunning && runAllProgress.completed === 0 && (
                <button
                  onClick={runAllAgents}
                  className="w-full rounded-lg py-3 text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #6366f1, #22c55e)" }}
                >
                  Start Execution
                </button>
              )}
              {runAllRunning && (
                <button
                  onClick={() => { runAllAbortRef.current = true; }}
                  className="w-full rounded-lg py-3 text-sm font-semibold text-white bg-red-500/80"
                >
                  Abort
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
