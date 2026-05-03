// src/app/api/olivia/calls/[id]/route.ts
// Get, update, or delete a specific voice conversation

import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET: Get full conversation details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await getAuthSession();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const conversation = await prisma.voiceConversation.findUnique({
      where: { id },
      include: {
        voiceContact: true,
        actionItems: {
          orderBy: { createdAt: "desc" },
        },
        calendarEntry: {
          select: {
            id: true,
            title: true,
            startDatetime: true,
            endDatetime: true,
            location: true,
            virtualUrl: true,
          },
        },
        userProfile: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Parse transcript into turns
    const turns = parseTranscript(conversation.fullTranscript);

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        callSid: conversation.callSid,
        direction: conversation.direction,
        conversationType: conversation.conversationType,
        status: conversation.status,
        callerPhone: conversation.callerPhone,
        calledPhone: conversation.calledPhone,
        startedAt: conversation.startedAt,
        endedAt: conversation.endedAt,
        durationSeconds: conversation.durationSeconds,
        recordingUrl: conversation.recordingUrl,
        recordingSid: conversation.recordingSid,
        fullTranscript: conversation.fullTranscript,
        transcriptTurns: turns,
        extractedData: conversation.extractedData,
        extractedAt: conversation.extractedAt,
        memoryIds: conversation.memoryIds,
        contact: conversation.voiceContact,
        actionItems: conversation.actionItems,
        calendarEntry: conversation.calendarEntry,
        user: conversation.userProfile,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
    });
  } catch (error) {
    console.error("[Olivia Calls Detail] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Update conversation (e.g., change type, add notes)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await getAuthSession();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const { conversationType, voiceContactId } = body;

    const updateData: Record<string, unknown> = {};

    if (conversationType) {
      updateData.conversationType = conversationType;
    }
    if (voiceContactId !== undefined) {
      updateData.voiceContactId = voiceContactId;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No update fields provided" },
        { status: 400 }
      );
    }

    const conversation = await prisma.voiceConversation.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, conversation });
  } catch (error) {
    console.error("[Olivia Calls Detail] Update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Delete a conversation (soft delete by marking status)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await getAuthSession();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Note: We don't actually delete - just mark as archived
    // Full transcripts are NEVER deleted per project requirements
    await prisma.voiceConversation.update({
      where: { id },
      data: { status: "archived" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Olivia Calls Detail] Delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Parse transcript string into structured turns
 */
function parseTranscript(transcript: string | null): Array<{
  speaker: "olivia" | "caller";
  text: string;
}> {
  if (!transcript) return [];

  const lines = transcript.split("\n").filter((l) => l.trim());
  const turns: Array<{ speaker: "olivia" | "caller"; text: string }> = [];

  for (const line of lines) {
    if (line.startsWith("Olivia:")) {
      turns.push({
        speaker: "olivia",
        text: line.replace(/^Olivia:\s*/, "").trim(),
      });
    } else if (line.startsWith("Caller:")) {
      turns.push({
        speaker: "caller",
        text: line.replace(/^Caller:\s*/, "").trim(),
      });
    } else if (turns.length > 0) {
      // Continuation of previous turn
      turns[turns.length - 1].text += " " + line.trim();
    }
  }

  return turns;
}
