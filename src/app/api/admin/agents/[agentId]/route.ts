/**
 * GET/PATCH /api/admin/agents/[agentId]
 *
 * Get or update a single agent
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/db/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;

    const agent = await prisma.agents.findFirst({
      where: {
        OR: [{ agent_id: agentId }, { id: agentId }],
        is_archived: false,
      },
      include: {
        agent_group: true,
        agent_configs: { where: { is_secret: false } },
        agent_runs: {
          orderBy: { started_at: "desc" },
          take: 20,
        },
        agent_briefings: {
          orderBy: { created_at: "desc" },
          take: 10,
        },
        agent_learnings: {
          where: { is_active: true },
          orderBy: { created_at: "desc" },
          take: 10,
        },
        agent_metrics: {
          orderBy: { date: "desc" },
          take: 30,
        },
        _count: {
          select: {
            agent_runs: true,
            agent_briefings: true,
            agent_learnings: true,
          },
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...agent,
      group: agent.agent_group,
      configs: agent.agent_configs,
      runs: agent.agent_runs,
      briefings: agent.agent_briefings,
      learnings: agent.agent_learnings,
      metrics: agent.agent_metrics,
      _count: {
        runs: agent._count.agent_runs,
        briefings: agent._count.agent_briefings,
        learnings: agent._count.agent_learnings,
      },
    });
  } catch (error) {
    console.error("Agent fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const body = await request.json();

    const agent = await prisma.agents.findFirst({
      where: {
        OR: [{ agent_id: agentId }, { id: agentId }],
        is_archived: false,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Allowed fields to update
    const allowedFields = [
      "name",
      "description",
      "status",
      "persona",
      "llm_model",
      "temperature",
      "max_tokens",
      "schedule_type",
      "schedule_cron",
      "rate_limit_per_min",
      "rate_limit_per_day",
      "system_prompt",
    ];

    const updateData: Record<string, unknown> = { updated_at: new Date() };
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    const updated = await prisma.agents.update({
      where: { id: agent.id },
      data: updateData,
      include: { agent_group: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Agent update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;

    const agent = await prisma.agents.findFirst({
      where: {
        OR: [{ agent_id: agentId }, { id: agentId }],
        is_archived: false,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Soft delete
    await prisma.agents.update({
      where: { id: agent.id },
      data: { is_archived: true, updated_at: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Agent delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
