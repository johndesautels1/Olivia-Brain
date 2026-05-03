// src/app/api/olivia/voice/process/route.ts
// Process voice dictation into document-ready content
// Phase 5: Document Cascade Integration

import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import {
  processDictation,
  generatePresentationContent,
  isDocumentSuitable,
  type DictationContent,
} from "@/lib/olivia/voice-document";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60s for LLM processing

/**
 * POST /api/olivia/voice/process
 * Process a voice conversation into document-ready content
 *
 * Body: { conversationId: string, generatePresentation?: boolean }
 * Returns: { success, content, presentationMarkdown?, error? }
 */
export async function POST(request: NextRequest) {
  // Auth required
  const { userId } = await getAuthSession();
  const adminUserId = process.env.ADMIN_USER_ID;

  if (!userId || !adminUserId || userId !== adminUserId) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { conversationId, generatePresentation = false } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    // Fetch the conversation
    const conversation = await prisma.voiceConversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        fullTranscript: true,
        conversationType: true,
        durationSeconds: true,
        status: true,
        extractedData: true,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (!conversation.fullTranscript) {
      return NextResponse.json(
        { error: "No transcript available for this conversation" },
        { status: 400 }
      );
    }

    // Check if suitable for document generation
    const suitability = isDocumentSuitable(
      conversation.conversationType,
      conversation.durationSeconds,
      conversation.fullTranscript.length
    );

    if (!suitability.suitable) {
      return NextResponse.json(
        { error: `Not suitable for document generation: ${suitability.reason}` },
        { status: 400 }
      );
    }

    // Process the dictation
    const result = await processDictation(
      conversation.fullTranscript,
      conversation.conversationType
    );

    if (!result.success || !result.content) {
      return NextResponse.json(
        { error: result.error || "Failed to process dictation" },
        { status: 500 }
      );
    }

    // Store the processed content in extractedData
    const existingData = (conversation.extractedData as Record<string, unknown>) || {};
    await prisma.voiceConversation.update({
      where: { id: conversationId },
      data: {
        extractedData: {
          ...existingData,
          documentContent: JSON.parse(JSON.stringify(result.content)),
          processedAt: new Date().toISOString(),
        },
      },
    });

    // Generate presentation markdown if requested
    let presentationMarkdown: string | undefined;
    if (generatePresentation) {
      presentationMarkdown = await generatePresentationContent(result.content);
    }

    return NextResponse.json({
      success: true,
      content: result.content,
      presentationMarkdown,
      suitability,
    });
  } catch (error) {
    console.error("[Voice Process Error]", error);
    return NextResponse.json(
      { error: "Failed to process voice content" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/olivia/voice/process?conversationId=xxx
 * Check if a conversation has been processed and retrieve content
 */
export async function GET(request: NextRequest) {
  // Auth required
  const { userId } = await getAuthSession();
  const adminUserId = process.env.ADMIN_USER_ID;

  if (!userId || !adminUserId || userId !== adminUserId) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    const conversation = await prisma.voiceConversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        conversationType: true,
        durationSeconds: true,
        fullTranscript: true,
        extractedData: true,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const extractedData = conversation.extractedData as Record<string, unknown> | null;
    const documentContent = extractedData?.documentContent as DictationContent | undefined;

    // Check suitability
    const suitability = isDocumentSuitable(
      conversation.conversationType,
      conversation.durationSeconds,
      conversation.fullTranscript?.length || 0
    );

    return NextResponse.json({
      conversationId,
      hasProcessedContent: !!documentContent,
      content: documentContent || null,
      processedAt: extractedData?.processedAt || null,
      suitability,
    });
  } catch (error) {
    console.error("[Voice Process GET Error]", error);
    return NextResponse.json(
      { error: "Failed to retrieve processed content" },
      { status: 500 }
    );
  }
}
