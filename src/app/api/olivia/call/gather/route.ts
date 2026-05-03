// src/app/api/olivia/call/gather/route.ts
// Twilio webhook that receives speech transcription from <Gather>
// Sends transcript to LLM, generates response, returns TwiML to continue conversation

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/client";
import {
  generateResponse,
  getFallbackResponse,
  detectQuickAction,
  detectDictation,
  processQuickAction,
  buildQuickActionConfirmation,
  getDictationResponse,
  QuickActionDetection,
  PreviousCallContext,
  buildPreviousCallsPromptSection,
} from "@/lib/olivia/voice-conversation";
import { isElevenLabsConfigured } from "@/lib/elevenlabs/client";
import { isLikelyQuickAction } from "@/lib/olivia/voice-prompts";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // LLM calls may take time

/**
 * Fetch previous call context for a contact
 */
async function getPreviousCallsContext(
  voiceContactId: string | null,
  currentConversationId: string,
  limit: number = 5
): Promise<PreviousCallContext[]> {
  if (!voiceContactId) {
    return [];
  }

  try {
    const previousConversations = await prisma.voiceConversation.findMany({
      where: {
        voiceContactId,
        id: { not: currentConversationId },
        status: "completed",
      },
      orderBy: { startedAt: "desc" },
      take: limit,
      select: {
        id: true,
        startedAt: true,
        durationSeconds: true,
        conversationType: true,
        extractedData: true,
      },
    });

    return previousConversations.map((conv) => {
      const extracted = (conv.extractedData as Record<string, unknown>) || {};
      return {
        callId: conv.id,
        date: conv.startedAt,
        duration: conv.durationSeconds || undefined,
        summary: (extracted.summary as string) || undefined,
        keyTopics: (extracted.keyTopics as string[]) || undefined,
        conversationType: conv.conversationType,
        actionItems: (extracted.actionItems as { action: string }[])?.map(
          (a) => a.action
        ),
      };
    });
  } catch (error) {
    console.error("[Olivia Gather] Error fetching previous calls:", error);
    return [];
  }
}

/**
 * Escape special XML characters to prevent injection
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Build TwiML for continuing the conversation
 */
function buildContinueTwiml(params: {
  audioUrl?: string;
  fallbackText: string;
  conversationId: string;
  baseUrl: string;
  shouldEndCall?: boolean;
}): string {
  const { audioUrl, fallbackText, conversationId, baseUrl, shouldEndCall } = params;
  const gatherUrl = `${baseUrl}/api/olivia/call/gather?cid=${conversationId}`;

  // If conversation should end, say goodbye and hang up
  if (shouldEndCall) {
    const speechContent = audioUrl
      ? `<Play>${escapeXml(audioUrl)}</Play>`
      : `<Say voice="Polly.Amy" language="en-GB">${escapeXml(fallbackText)}</Say>`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${speechContent}
  <Pause length="1"/>
  <Hangup/>
</Response>`;
  }

  // Continue conversation with another Gather
  const speechContent = audioUrl
    ? `<Play>${escapeXml(audioUrl)}</Play>`
    : `<Say voice="Polly.Amy" language="en-GB">${escapeXml(fallbackText)}</Say>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${speechContent}
  <Gather input="speech"
          action="${escapeXml(gatherUrl)}"
          method="POST"
          speechTimeout="auto"
          speechModel="phone_call"
          enhanced="true"
          language="en-GB">
  </Gather>
  <Say voice="Polly.Amy" language="en-GB">I'm still here if you need anything else.</Say>
  <Pause length="2"/>
  <Say voice="Polly.Amy" language="en-GB">If you're done, feel free to hang up. Otherwise, go ahead and speak.</Say>
  <Gather input="speech"
          action="${escapeXml(gatherUrl)}"
          method="POST"
          speechTimeout="auto"
          speechModel="phone_call"
          enhanced="true"
          language="en-GB">
  </Gather>
  <Say voice="Polly.Amy" language="en-GB">Thank you for calling London Tech Map. Goodbye!</Say>
  <Hangup/>
</Response>`;
}

/**
 * POST handler for Twilio speech gather webhook
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("cid");
    const isSilence = searchParams.get("silence") === "true";

    if (!conversationId) {
      console.error("[Olivia Gather] Missing conversation ID");
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy" language="en-GB">Sorry, there was a technical error.</Say>
  <Hangup/>
</Response>`,
        { status: 200, headers: { "Content-Type": "text/xml" } }
      );
    }

    // Parse Twilio webhook data
    const formData = await request.formData();
    const speechResult = formData.get("SpeechResult") as string | null;
    const confidence = formData.get("Confidence") as string | null;
    const callSid = formData.get("CallSid") as string;

    console.log(`[Olivia Gather] cid=${conversationId} speech="${speechResult?.slice(0, 50)}..." confidence=${confidence}`);

    // Get conversation from database
    const conversation = await prisma.voiceConversation.findUnique({
      where: { id: conversationId },
      include: { voiceContact: true },
    });

    if (!conversation) {
      console.error(`[Olivia Gather] Conversation not found: ${conversationId}`);
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy" language="en-GB">I'm sorry, I seem to have lost our conversation. Please try calling back.</Say>
  <Hangup/>
</Response>`,
        { status: 200, headers: { "Content-Type": "text/xml" } }
      );
    }

    // Get base URL
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      `https://${request.headers.get("host")}`;

    // Handle silence/no speech
    if (!speechResult || isSilence) {
      const response = getFallbackResponse("didNotHear");

      return new NextResponse(
        buildContinueTwiml({
          fallbackText: response,
          conversationId,
          baseUrl,
          shouldEndCall: false,
        }),
        { status: 200, headers: { "Content-Type": "text/xml" } }
      );
    }

    // Append caller speech to transcript
    const updatedTranscript = conversation.fullTranscript
      ? `${conversation.fullTranscript}\nCaller: ${speechResult}`
      : `Caller: ${speechResult}`;

    // Get existing extracted data
    const extractedSoFar = (conversation.extractedData as Record<string, unknown>) || {};

    // ═══════════════════════════════════════════════════════════════════════════
    // QUICK ACTION FAST PATH
    // Check if this is a quick action call (30-second bullets)
    // ═══════════════════════════════════════════════════════════════════════════

    const isFirstUtterance = !conversation.fullTranscript?.includes("Olivia:");
    const isQuickActionMode = conversation.conversationType === "quick_action";
    const pendingQuickAction = (extractedSoFar.pendingQuickAction as QuickActionDetection | undefined);

    // Handle quick action confirmation (user said yes/no)
    if (isQuickActionMode && pendingQuickAction) {
      const lowerSpeech = speechResult.toLowerCase().trim();
      const isConfirmation = /^(yes|yeah|yep|correct|that's right|right|perfect|sounds good|do it|go ahead)/.test(lowerSpeech);
      const isDenial = /^(no|nope|wrong|not quite|actually|wait)/.test(lowerSpeech);

      if (isConfirmation) {
        // User confirmed - create the action item and end
        const actionItem = {
          action: pendingQuickAction.extracted.task || "Action requested",
          assignedTo: pendingQuickAction.extracted.targetPerson || "olivia",
          dueDate: pendingQuickAction.extracted.dueDate,
          priority: "medium" as const,
        };

        await prisma.voiceActionItem.create({
          data: {
            conversationId,
            action: actionItem.action,
            assignedTo: actionItem.assignedTo,
            dueDate: actionItem.dueDate ? new Date(actionItem.dueDate) : null,
            priority: actionItem.priority,
            status: "pending",
          },
        });

        // Determine confirmation response based on action type
        let confirmResponse = "Perfect, that's done. Anything else I can help with?";
        if (pendingQuickAction.actionType === "reminder") {
          confirmResponse = "Perfect, that reminder is set. Anything else?";
        } else if (pendingQuickAction.actionType === "schedule") {
          confirmResponse = "Done, it's in the calendar. Anything else?";
        }

        const finalTranscript = `${updatedTranscript}\nOlivia: ${confirmResponse}`;

        // Clear pending action, keep as quick_action mode
        await prisma.voiceConversation.update({
          where: { id: conversationId },
          data: {
            fullTranscript: finalTranscript,
            extractedData: { ...extractedSoFar, pendingQuickAction: null, lastActionConfirmed: true },
          },
        });

        console.log(`[Olivia Gather] Quick action confirmed: ${actionItem.action}`);

        let audioUrl: string | undefined;
        if (isElevenLabsConfigured()) {
          const encodedResponse = Buffer.from(confirmResponse).toString("base64url");
          audioUrl = `${baseUrl}/api/olivia/call/audio?m=${encodedResponse}`;
        }

        return new NextResponse(
          buildContinueTwiml({
            audioUrl,
            fallbackText: confirmResponse,
            conversationId,
            baseUrl,
            shouldEndCall: false, // Let them request more actions
          }),
          { status: 200, headers: { "Content-Type": "text/xml" } }
        );
      } else if (isDenial) {
        // User denied - ask for clarification
        const clarifyResponse = "I apologise, let me try again. What would you like me to do?";
        const finalTranscript = `${updatedTranscript}\nOlivia: ${clarifyResponse}`;

        await prisma.voiceConversation.update({
          where: { id: conversationId },
          data: {
            fullTranscript: finalTranscript,
            extractedData: { ...extractedSoFar, pendingQuickAction: null },
          },
        });

        let audioUrl: string | undefined;
        if (isElevenLabsConfigured()) {
          const encodedResponse = Buffer.from(clarifyResponse).toString("base64url");
          audioUrl = `${baseUrl}/api/olivia/call/audio?m=${encodedResponse}`;
        }

        return new NextResponse(
          buildContinueTwiml({
            audioUrl,
            fallbackText: clarifyResponse,
            conversationId,
            baseUrl,
            shouldEndCall: false,
          }),
          { status: 200, headers: { "Content-Type": "text/xml" } }
        );
      }
      // If neither yes nor no, treat as new request and continue below
    }

    // Check if this is a new quick action request
    if (isFirstUtterance || (isQuickActionMode && !pendingQuickAction)) {
      // Fast regex check first
      if (isLikelyQuickAction(speechResult)) {
        console.log(`[Olivia Gather] Quick action pattern detected, using fast path`);

        const quickActionResult = await detectQuickAction(speechResult);

        if (quickActionResult?.isQuickAction && quickActionResult.confidence > 0.6) {
          // Build confirmation message
          const confirmationMsg = buildQuickActionConfirmation(
            quickActionResult.actionType,
            quickActionResult.extracted
          );

          const finalTranscript = `${updatedTranscript}\nOlivia: ${confirmationMsg}`;

          // Store pending action for confirmation (cast to JSON-compatible type)
          await prisma.voiceConversation.update({
            where: { id: conversationId },
            data: {
              fullTranscript: finalTranscript,
              conversationType: "quick_action",
              extractedData: {
                ...extractedSoFar,
                pendingQuickAction: JSON.parse(JSON.stringify(quickActionResult)),
              },
            },
          });

          console.log(`[Olivia Gather] Quick action detected: ${quickActionResult.actionType}, awaiting confirmation`);

          let audioUrl: string | undefined;
          if (isElevenLabsConfigured()) {
            const encodedResponse = Buffer.from(confirmationMsg).toString("base64url");
            audioUrl = `${baseUrl}/api/olivia/call/audio?m=${encodedResponse}`;
          }

          return new NextResponse(
            buildContinueTwiml({
              audioUrl,
              fallbackText: confirmationMsg,
              conversationId,
              baseUrl,
              shouldEndCall: false,
            }),
            { status: 200, headers: { "Content-Type": "text/xml" } }
          );
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DICTATION MODE DETECTION
    // ═══════════════════════════════════════════════════════════════════════════

    if (isFirstUtterance && !isQuickActionMode) {
      const dictationResult = await detectDictation(speechResult);

      if (dictationResult?.wantsDictation && dictationResult.confidence > 0.6) {
        const dictationResponse = getDictationResponse("ready");
        const finalTranscript = `${updatedTranscript}\nOlivia: ${dictationResponse}`;

        await prisma.voiceConversation.update({
          where: { id: conversationId },
          data: {
            fullTranscript: finalTranscript,
            conversationType: "dictation",
            extractedData: {
              ...extractedSoFar,
              dictationContentType: dictationResult.contentType,
              dictationStarted: true,
            },
          },
        });

        console.log(`[Olivia Gather] Dictation mode activated: ${dictationResult.contentType}`);

        let audioUrl: string | undefined;
        if (isElevenLabsConfigured()) {
          const encodedResponse = Buffer.from(dictationResponse).toString("base64url");
          audioUrl = `${baseUrl}/api/olivia/call/audio?m=${encodedResponse}`;
        }

        return new NextResponse(
          buildContinueTwiml({
            audioUrl,
            fallbackText: dictationResponse,
            conversationId,
            baseUrl,
            shouldEndCall: false,
          }),
          { status: 200, headers: { "Content-Type": "text/xml" } }
        );
      }
    }

    // Handle ongoing dictation mode - minimal responses, just acknowledge
    if (conversation.conversationType === "dictation") {
      // Check for dictation end signals
      const endSignals = /^(that's all|i'm done|end dictation|stop recording|that's it|finished)/i;
      if (endSignals.test(speechResult.trim())) {
        const doneResponse = getDictationResponse("done");
        const finalTranscript = `${updatedTranscript}\nOlivia: ${doneResponse}`;

        await prisma.voiceConversation.update({
          where: { id: conversationId },
          data: {
            fullTranscript: finalTranscript,
            extractedData: { ...extractedSoFar, dictationComplete: true },
            status: "completed",
            endedAt: new Date(),
          },
        });

        let audioUrl: string | undefined;
        if (isElevenLabsConfigured()) {
          const encodedResponse = Buffer.from(doneResponse).toString("base64url");
          audioUrl = `${baseUrl}/api/olivia/call/audio?m=${encodedResponse}`;
        }

        return new NextResponse(
          buildContinueTwiml({
            audioUrl,
            fallbackText: doneResponse,
            conversationId,
            baseUrl,
            shouldEndCall: true,
          }),
          { status: 200, headers: { "Content-Type": "text/xml" } }
        );
      }

      // Continue collecting dictation with minimal response
      const continueResponse = getDictationResponse("continue");
      const finalTranscript = `${updatedTranscript}\nOlivia: ${continueResponse}`;

      await prisma.voiceConversation.update({
        where: { id: conversationId },
        data: {
          fullTranscript: finalTranscript,
        },
      });

      let audioUrl: string | undefined;
      if (isElevenLabsConfigured()) {
        const encodedResponse = Buffer.from(continueResponse).toString("base64url");
        audioUrl = `${baseUrl}/api/olivia/call/audio?m=${encodedResponse}`;
      }

      return new NextResponse(
        buildContinueTwiml({
          audioUrl,
          fallbackText: continueResponse,
          conversationId,
          baseUrl,
          shouldEndCall: false,
        }),
        { status: 200, headers: { "Content-Type": "text/xml" } }
      );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STANDARD CONVERSATION PATH
    // ═══════════════════════════════════════════════════════════════════════════

    // Prepare caller info from existing contact
    const callerInfo = conversation.voiceContact
      ? {
          phone: conversation.callerPhone,
          name: [conversation.voiceContact.firstName, conversation.voiceContact.lastName]
            .filter(Boolean)
            .join(" ") || undefined,
          company: conversation.voiceContact.company || undefined,
        }
      : { phone: conversation.callerPhone };

    // Get previous call context for continuity
    const previousCalls = await getPreviousCallsContext(
      conversation.voiceContactId,
      conversationId
    );
    const previousCallsContext = previousCalls.length > 0
      ? buildPreviousCallsPromptSection(previousCalls)
      : undefined;

    // Generate Olivia's response using LLM
    const llmResponse = await generateResponse({
      transcript: updatedTranscript,
      extractedSoFar,
      callerInfo,
      conversationType: conversation.conversationType,
      previousCallsContext,
    });

    console.log(`[Olivia Gather] LLM response: intent=${llmResponse.intent} shouldEnd=${llmResponse.shouldEndCall}`);

    // Update transcript with Olivia's response
    const finalTranscript = `${updatedTranscript}\nOlivia: ${llmResponse.response}`;

    // Merge extracted entities
    const mergedExtracted = {
      ...extractedSoFar,
      ...llmResponse.entities,
      // Merge arrays instead of replacing
      needs: [
        ...((extractedSoFar.needs as string[]) || []),
        ...((llmResponse.entities.needs as string[]) || []),
      ].filter((v, i, a) => a.indexOf(v) === i),
      goals: [
        ...((extractedSoFar.goals as string[]) || []),
        ...((llmResponse.entities.goals as string[]) || []),
      ].filter((v, i, a) => a.indexOf(v) === i),
      painPoints: [
        ...((extractedSoFar.painPoints as string[]) || []),
        ...((llmResponse.entities.painPoints as string[]) || []),
      ].filter((v, i, a) => a.indexOf(v) === i),
    };

    // Determine conversation type based on intent
    let conversationType = conversation.conversationType;
    if (llmResponse.intent === "scheduling" && conversationType === "general") {
      conversationType = "scheduling";
    } else if (llmResponse.intent === "dictation" && conversationType === "general") {
      conversationType = "dictation";
    } else if (llmResponse.intent === "quick_action" && conversationType === "general") {
      conversationType = "quick_action";
    } else if (llmResponse.intent === "intake" && conversationType === "general") {
      conversationType = "intake";
    }

    // Update conversation in database
    await prisma.voiceConversation.update({
      where: { id: conversationId },
      data: {
        fullTranscript: finalTranscript,
        extractedData: mergedExtracted,
        conversationType,
        status: llmResponse.shouldEndCall ? "completed" : "in_progress",
        ...(llmResponse.shouldEndCall ? { endedAt: new Date() } : {}),
      },
    });

    // Create action items if any
    if (llmResponse.actionItems && llmResponse.actionItems.length > 0) {
      for (const item of llmResponse.actionItems) {
        await prisma.voiceActionItem.create({
          data: {
            conversationId,
            action: item.action,
            assignedTo: item.assignedTo,
            dueDate: item.dueDate ? new Date(item.dueDate) : null,
            priority: item.priority || "medium",
            status: "pending",
          },
        });
        console.log(`[Olivia Gather] Created action item: ${item.action}`);
      }
    }

    // Generate audio URL if ElevenLabs is configured
    let audioUrl: string | undefined;
    if (isElevenLabsConfigured()) {
      const encodedResponse = Buffer.from(llmResponse.response).toString("base64url");
      audioUrl = `${baseUrl}/api/olivia/call/audio?m=${encodedResponse}`;
    }

    // Build and return TwiML
    const twiml = buildContinueTwiml({
      audioUrl,
      fallbackText: llmResponse.response,
      conversationId,
      baseUrl,
      shouldEndCall: llmResponse.shouldEndCall || llmResponse.intent === "goodbye",
    });

    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("[Olivia Gather] Error:", error);

    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy" language="en-GB">I apologise, something went wrong. Let me transfer you to leave a message.</Say>
  <Hangup/>
</Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  }
}

// Also handle GET for testing
export async function GET(request: NextRequest) {
  return POST(request);
}
