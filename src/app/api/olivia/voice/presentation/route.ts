// src/app/api/olivia/voice/presentation/route.ts
// Generate Gamma presentation from voice dictation
// Phase 5: Document Cascade Integration

import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import {
  processDictation,
  generatePresentationContent,
  isDocumentSuitable,
} from "@/lib/olivia/voice-document";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const GAMMA_API_BASE = "https://public-api.gamma.app/v1.0";

/**
 * POST /api/olivia/voice/presentation
 * Generate a Gamma presentation from a voice conversation
 *
 * Body: { conversationId: string, title?: string, numCards?: number }
 * Returns: { success, presentationId, generationId, status }
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
    const { conversationId, title, numCards = 15 } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    // Check Gamma API key
    const gammaApiKey = process.env.GAMMA_API_KEY;
    if (!gammaApiKey) {
      return NextResponse.json(
        { error: "Presentation generation not configured. Missing GAMMA_API_KEY." },
        { status: 503 }
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
        extractedData: true,
        voiceContact: {
          select: { firstName: true, lastName: true, company: true },
        },
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
        { error: "No transcript available" },
        { status: 400 }
      );
    }

    // Check suitability
    const suitability = isDocumentSuitable(
      conversation.conversationType,
      conversation.durationSeconds,
      conversation.fullTranscript.length
    );

    if (!suitability.suitable) {
      return NextResponse.json(
        { error: `Not suitable: ${suitability.reason}` },
        { status: 400 }
      );
    }

    // Check if we already have processed content
    const extractedData = (conversation.extractedData as Record<string, unknown>) || {};
    let presentationContent: string;

    if (extractedData.documentContent) {
      // Use existing processed content
      presentationContent = await generatePresentationContent(
        extractedData.documentContent as Parameters<typeof generatePresentationContent>[0]
      );
    } else {
      // Process the dictation first
      const processResult = await processDictation(
        conversation.fullTranscript,
        conversation.conversationType
      );

      if (!processResult.success || !processResult.content) {
        return NextResponse.json(
          { error: processResult.error || "Failed to process dictation" },
          { status: 500 }
        );
      }

      // Store the processed content
      await prisma.voiceConversation.update({
        where: { id: conversationId },
        data: {
          extractedData: {
            ...extractedData,
            documentContent: JSON.parse(JSON.stringify(processResult.content)),
            processedAt: new Date().toISOString(),
          },
        },
      });

      presentationContent = await generatePresentationContent(processResult.content);
    }

    // Generate title if not provided
    const presentationTitle = title ||
      (conversation.voiceContact
        ? `${conversation.voiceContact.firstName || ""} ${conversation.voiceContact.lastName || ""} - Voice Notes`.trim()
        : "Voice Dictation Presentation");

    // Submit to Gamma API
    const gammaResponse = await fetch(`${GAMMA_API_BASE}/generations`, {
      method: "POST",
      headers: {
        "X-API-KEY": gammaApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputText: presentationContent.trim(),
        textMode: "generate",
        format: "presentation",
        numCards: Math.min(Math.max(numCards, 1), 60),
        additionalInstructions:
          "Create a professional, corporate-grade presentation suitable for Fortune 500 audiences. Use clean layouts, data visualisations where appropriate, and a polished executive tone. This content was captured via voice dictation for the London tech ecosystem.",
        textOptions: {
          amount: "detailed",
          tone: "Professional, authoritative, data-driven",
          audience: "Senior technology executives, venture capitalists, corporate innovation teams",
        },
      }),
    });

    if (!gammaResponse.ok) {
      const errorText = await gammaResponse.text().catch(() => "Unknown error");
      console.error("[Gamma Error]", gammaResponse.status, errorText);
      return NextResponse.json(
        { error: "Failed to start presentation generation" },
        { status: 502 }
      );
    }

    const gammaData = await gammaResponse.json();
    const generationId = gammaData?.id || gammaData?.generationId;

    if (!generationId) {
      console.error("[Gamma Error] No generation ID:", gammaData);
      return NextResponse.json(
        { error: "Unexpected response from presentation service" },
        { status: 502 }
      );
    }

    // Save to OliviaPresentation
    const presentation = await prisma.oliviaPresentation.create({
      data: {
        conversationId,
        userId,
        generationId,
        status: "generating",
        title: presentationTitle,
        inputSummary: presentationContent.slice(0, 500),
        metadata: {
          numCards,
          source: "voice_dictation",
          voiceConversationId: conversationId,
          submittedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      presentationId: presentation.id,
      generationId,
      status: "generating",
      title: presentationTitle,
    });
  } catch (error) {
    console.error("[Voice Presentation Error]", error);
    return NextResponse.json(
      { error: "Failed to generate presentation" },
      { status: 500 }
    );
  }
}
