// src/app/api/olivia/calls/route.ts
// List voice conversations (admin endpoint)

import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";

export const dynamic = "force-dynamic";

/**
 * GET: List all voice conversations with filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const { userId } = await getAuthSession();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const status = searchParams.get("status"); // in_progress, completed, extracted
    const direction = searchParams.get("direction"); // inbound, outbound
    const conversationType = searchParams.get("type"); // intake, dictation, quick_action, etc.
    const phone = searchParams.get("phone");
    const contactId = searchParams.get("contactId");

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }
    if (direction) {
      where.direction = direction;
    }
    if (conversationType) {
      where.conversationType = conversationType;
    }
    if (phone) {
      where.callerPhone = { contains: phone };
    }
    if (contactId) {
      where.voiceContactId = contactId;
    }

    // Get total count
    const total = await prisma.voiceConversation.count({ where });

    // Get conversations
    const conversations = await prisma.voiceConversation.findMany({
      where,
      include: {
        voiceContact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            email: true,
          },
        },
        actionItems: {
          select: {
            id: true,
            action: true,
            status: true,
            priority: true,
          },
        },
        _count: {
          select: {
            actionItems: true,
          },
        },
      },
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Format response
    const formattedConversations = conversations.map((c) => ({
      id: c.id,
      callSid: c.callSid,
      direction: c.direction,
      conversationType: c.conversationType,
      status: c.status,
      callerPhone: c.callerPhone,
      calledPhone: c.calledPhone,
      startedAt: c.startedAt,
      endedAt: c.endedAt,
      durationSeconds: c.durationSeconds,
      hasRecording: !!c.recordingUrl,
      transcriptPreview: c.fullTranscript?.slice(0, 200) || null,
      transcriptLength: c.fullTranscript?.length || 0,
      extractedAt: c.extractedAt,
      contact: c.voiceContact,
      actionItemsCount: c._count.actionItems,
      pendingActionItems: c.actionItems.filter((a) => a.status === "pending").length,
    }));

    return NextResponse.json({
      conversations: formattedConversations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[Olivia Calls] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET stats for voice conversations
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const { userId } = await getAuthSession();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "stats") {
      // Get conversation stats
      const [
        totalConversations,
        inboundCount,
        outboundCount,
        extractedCount,
        totalContacts,
        pendingActionItems,
      ] = await Promise.all([
        prisma.voiceConversation.count(),
        prisma.voiceConversation.count({ where: { direction: "inbound" } }),
        prisma.voiceConversation.count({ where: { direction: "outbound" } }),
        prisma.voiceConversation.count({ where: { status: "extracted" } }),
        prisma.voiceContact.count(),
        prisma.voiceActionItem.count({ where: { status: "pending" } }),
      ]);

      // Get type breakdown
      const typeBreakdown = await prisma.voiceConversation.groupBy({
        by: ["conversationType"],
        _count: true,
      });

      // Get recent conversations (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentConversations = await prisma.voiceConversation.count({
        where: { startedAt: { gte: sevenDaysAgo } },
      });

      // Average duration
      const avgDuration = await prisma.voiceConversation.aggregate({
        _avg: { durationSeconds: true },
        where: { durationSeconds: { not: null } },
      });

      return NextResponse.json({
        stats: {
          totalConversations,
          inboundCount,
          outboundCount,
          extractedCount,
          totalContacts,
          pendingActionItems,
          recentConversations,
          averageDurationSeconds: Math.round(avgDuration._avg.durationSeconds || 0),
          typeBreakdown: typeBreakdown.reduce(
            (acc, t) => ({ ...acc, [t.conversationType]: t._count }),
            {}
          ),
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[Olivia Calls] Stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
