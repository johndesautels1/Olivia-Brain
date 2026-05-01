/**
 * OLIVIA BRAIN — Admin Agent Dashboard
 *
 * Server-rendered page that fetches all agent data and passes to client component.
 * Includes registry sync on load to ensure DB matches code definitions.
 */

import prisma from "@/lib/db/client";
import { AGENT_GROUPS, AGENT_DEFINITIONS, hasHandler } from "@/lib/agents";
import { AdminDashboardClient } from "./AdminDashboardClient";

// Sync registry to database on load
async function syncRegistryToDB() {
  // 1. Upsert all groups
  for (const group of AGENT_GROUPS) {
    await prisma.agent_groups.upsert({
      where: { code: group.code },
      update: {
        name: group.name,
        description: group.description,
        category: group.category,
        sort_order: group.sortOrder,
        updated_at: new Date(),
      },
      create: {
        code: group.code,
        name: group.name,
        description: group.description,
        category: group.category,
        sort_order: group.sortOrder,
      },
    });
  }

  // 2. Get group IDs for agents
  const groupMap = new Map<string, string>();
  const groups = await prisma.agent_groups.findMany({ select: { id: true, code: true } });
  for (const g of groups) {
    groupMap.set(g.code, g.id);
  }

  // 3. Upsert all agents
  for (const agent of AGENT_DEFINITIONS) {
    const groupId = groupMap.get(agent.groupCode);
    if (!groupId) continue;

    await prisma.agents.upsert({
      where: { agent_id: agent.agentId },
      update: {
        name: agent.name,
        description: agent.description,
        group_id: groupId,
        persona: agent.persona ?? null,
        updated_at: new Date(),
      },
      create: {
        agent_id: agent.agentId,
        name: agent.name,
        description: agent.description,
        group_id: groupId,
        persona: agent.persona ?? null,
        llm_model: agent.defaultModel,
        temperature: agent.defaultTemperature,
        max_tokens: agent.defaultMaxTokens,
        schedule_type: agent.defaultSchedule,
        status: "initializing",
      },
    });
  }

  // 4. Auto-activate agents with registered handlers
  const agentsWithHandlers = AGENT_DEFINITIONS.filter((a) => hasHandler(a.agentId));
  if (agentsWithHandlers.length > 0) {
    await prisma.agents.updateMany({
      where: {
        agent_id: { in: agentsWithHandlers.map((a) => a.agentId) },
        status: "initializing",
      },
      data: { status: "active" },
    });
  }
}

async function fetchDashboardData() {
  const [
    agents,
    groups,
    recentBriefings,
    systemAlerts,
    featureToggles,
    runsToday,
  ] = await Promise.all([
    // All agents with group info
    prisma.agents.findMany({
      where: { is_archived: false },
      include: {
        agent_group: true,
        _count: {
          select: { agent_runs: true, agent_briefings: true, agent_learnings: true },
        },
      },
      orderBy: [
        { agent_group: { sort_order: "asc" } },
        { agent_id: "asc" },
      ],
    }),

    // All groups with agent count
    prisma.agent_groups.findMany({
      where: { is_archived: false },
      include: { _count: { select: { agents: true } } },
      orderBy: { sort_order: "asc" },
    }),

    // Recent briefings (last 24h)
    prisma.agent_briefings.findMany({
      where: { created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      include: { agent: { select: { agent_id: true, name: true } } },
      orderBy: { created_at: "desc" },
      take: 20,
    }),

    // System alerts (unread + recent)
    prisma.system_alerts.findMany({
      where: {
        OR: [
          { is_read: false },
          { created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        ],
      },
      orderBy: { created_at: "desc" },
      take: 10,
    }),

    // Feature toggles
    prisma.feature_toggles.findMany(),

    // Runs today
    prisma.agent_runs.count({
      where: {
        started_at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);

  // Calculate success rate today
  const successfulToday = await prisma.agent_runs.count({
    where: {
      started_at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      status: "completed",
    },
  });
  const successRateToday = runsToday > 0 ? Math.round((successfulToday / runsToday) * 100) : 100;

  // Calculate totals
  const totalCostToday = await prisma.agent_runs.aggregate({
    where: { started_at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    _sum: { cost_usd: true },
  });

  const unreadBriefingCount = await prisma.agent_briefings.count({
    where: { is_read: false },
  });

  return {
    agents: agents.map((a) => ({
      ...a,
      group: a.agent_group,
      _count: {
        runs: a._count.agent_runs,
        briefings: a._count.agent_briefings,
        learnings: a._count.agent_learnings,
      },
    })),
    groups: groups.map((g) => ({
      ...g,
      _count: { agents: g._count.agents },
    })),
    recentBriefings: recentBriefings.map((b) => ({
      ...b,
      agent: b.agent,
    })),
    systemAlerts,
    featureToggles,
    stats: {
      totalAgents: agents.length,
      activeAgents: agents.filter((a) => a.status === "active").length,
      pausedAgents: agents.filter((a) => a.status === "paused").length,
      errorAgents: agents.filter((a) => a.status === "error").length,
      totalRunsToday: runsToday,
      successRateToday,
      totalCostToday: totalCostToday._sum.cost_usd ?? 0,
      unreadBriefings: unreadBriefingCount,
    },
  };
}

export default async function AdminDashboardPage() {
  // Sync registry on every load (fast upserts)
  await syncRegistryToDB();

  // Fetch all dashboard data
  const data = await fetchDashboardData();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <AdminDashboardClient
        initialAgents={JSON.parse(JSON.stringify(data.agents))}
        initialGroups={JSON.parse(JSON.stringify(data.groups))}
        initialBriefings={JSON.parse(JSON.stringify(data.recentBriefings))}
        initialAlerts={JSON.parse(JSON.stringify(data.systemAlerts))}
        initialToggles={JSON.parse(JSON.stringify(data.featureToggles))}
        initialStats={data.stats}
      />
    </div>
  );
}
