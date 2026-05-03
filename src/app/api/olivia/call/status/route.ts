// src/app/api/olivia/call/status/route.ts
// Twilio call status webhook
// Triggered when call status changes (completed, failed, no-answer, etc.)
// Finalizes conversation record and triggers post-call extraction

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/client";
import { extractFromTranscript } from "@/lib/olivia/voice-conversation";
import { storeVoiceMemories } from "@/lib/olivia/voice-memory";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Extraction may take time

/**
 * POST handler for Twilio call status webhook
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("cid");

    // Parse Twilio webhook data
    const formData = await request.formData();
    const callSid = formData.get("CallSid") as string;
    const callStatus = formData.get("CallStatus") as string;
    const callDuration = formData.get("CallDuration") as string;
    const recordingUrl = formData.get("RecordingUrl") as string | null;
    const recordingSid = formData.get("RecordingSid") as string | null;

    console.log(`[Olivia Status] callSid=${callSid} status=${callStatus} duration=${callDuration}s cid=${conversationId}`);

    // Find conversation by ID or callSid
    let conversation;
    if (conversationId) {
      conversation = await prisma.voiceConversation.findUnique({
        where: { id: conversationId },
      });
    }
    if (!conversation && callSid) {
      conversation = await prisma.voiceConversation.findUnique({
        where: { callSid },
      });
    }

    if (!conversation) {
      console.warn(`[Olivia Status] Conversation not found for ${callSid}`);
      return NextResponse.json({ success: true, message: "Conversation not found" });
    }

    // Determine final status based on Twilio status
    let finalStatus: string;
    switch (callStatus) {
      case "completed":
        finalStatus = "completed";
        break;
      case "busy":
      case "no-answer":
      case "canceled":
        finalStatus = "failed";
        break;
      case "failed":
        finalStatus = "failed";
        break;
      default:
        // Still in progress
        finalStatus = conversation.status;
    }

    // Update conversation with call completion data
    await prisma.voiceConversation.update({
      where: { id: conversation.id },
      data: {
        status: finalStatus,
        endedAt: new Date(),
        durationSeconds: callDuration ? parseInt(callDuration, 10) : null,
        recordingUrl: recordingUrl || undefined,
        recordingSid: recordingSid || undefined,
      },
    });

    console.log(`[Olivia Status] Updated conversation ${conversation.id} to status=${finalStatus}`);

    // If call completed successfully and we have a transcript, run extraction
    if (
      finalStatus === "completed" &&
      conversation.fullTranscript &&
      conversation.fullTranscript.length > 50 // Minimum meaningful transcript
    ) {
      console.log(`[Olivia Status] Starting post-call extraction for ${conversation.id}`);

      // Update status to processing
      await prisma.voiceConversation.update({
        where: { id: conversation.id },
        data: { status: "processing" },
      });

      // Run extraction (async, but we wait for it since Twilio expects 200 OK)
      const extractionResult = await extractFromTranscript(conversation.fullTranscript);

      if (extractionResult) {
        console.log(`[Olivia Status] Extraction complete for ${conversation.id}`);

        // Update conversation with extracted data
        await prisma.voiceConversation.update({
          where: { id: conversation.id },
          data: {
            status: "extracted",
            extractedAt: new Date(),
            extractedData: JSON.parse(JSON.stringify(extractionResult)),
            conversationType: extractionResult.conversationType || conversation.conversationType,
          },
        });

        // Create or update VoiceContact if we have contact info
        if (extractionResult.contact && hasContactInfo(extractionResult.contact)) {
          await upsertVoiceContact(conversation.id, conversation.callerPhone, extractionResult);
        }

        // Create action items from extraction
        if (extractionResult.actionItems && extractionResult.actionItems.length > 0) {
          for (const item of extractionResult.actionItems) {
            // Check if similar action item already exists
            const existing = await prisma.voiceActionItem.findFirst({
              where: {
                conversationId: conversation.id,
                action: item.action,
              },
            });

            if (!existing) {
              await prisma.voiceActionItem.create({
                data: {
                  conversationId: conversation.id,
                  action: item.action,
                  assignedTo: item.assignedTo,
                  dueDate: item.dueDate ? new Date(item.dueDate) : null,
                  priority: item.priority || "medium",
                  status: "pending",
                },
              });
              console.log(`[Olivia Status] Created action item: ${item.action}`);
            }
          }
        }

        // Store in Olivia's memory if user profile exists
        if (conversation.userId) {
          const memoryIds = await storeVoiceMemories(
            conversation.userId,
            conversation.id,
            extractionResult
          );

          if (memoryIds.length > 0) {
            await prisma.voiceConversation.update({
              where: { id: conversation.id },
              data: { memoryIds },
            });
            console.log(`[Olivia Status] Stored ${memoryIds.length} memories`);
          }
        }

      } else {
        console.error(`[Olivia Status] Extraction failed for ${conversation.id}`);
        await prisma.voiceConversation.update({
          where: { id: conversation.id },
          data: { status: "completed" }, // Revert to completed without extraction
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Olivia Status] Error:", error);
    // Still return 200 to Twilio to prevent retries
    return NextResponse.json({ success: false, error: "Internal error" });
  }
}

// Also handle GET for testing
export async function GET(request: NextRequest) {
  return POST(request);
}

/**
 * Check if extraction result has meaningful contact info
 */
function hasContactInfo(contact: {
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  email?: string | null;
  company?: string | null;
}): boolean {
  return !!(
    contact.firstName ||
    contact.lastName ||
    contact.fullName ||
    contact.email ||
    contact.company
  );
}

/**
 * Create or update VoiceContact from extraction result
 */
async function upsertVoiceContact(
  conversationId: string,
  phone: string,
  extraction: {
    contact: {
      firstName?: string | null;
      lastName?: string | null;
      fullName?: string | null;
      email?: string | null;
      phone?: string | null;
      company?: string | null;
      role?: string | null;
      location?: string | null;
      industry?: string | null;
      companySize?: string | null;
    };
    psychographics: {
      needs: string[];
      interests: string[];
      goals: string[];
      painPoints: string[];
      communicationStyle?: string | null;
    };
  }
): Promise<void> {
  const { contact, psychographics } = extraction;

  // Try to find existing contact by phone or email
  let existingContact = await prisma.voiceContact.findFirst({
    where: { phone },
  });

  if (!existingContact && contact.email) {
    existingContact = await prisma.voiceContact.findFirst({
      where: { email: contact.email },
    });
  }

  if (existingContact) {
    // Update existing contact with new info
    await prisma.voiceContact.update({
      where: { id: existingContact.id },
      data: {
        firstName: contact.firstName || existingContact.firstName,
        lastName: contact.lastName || existingContact.lastName,
        email: contact.email || existingContact.email,
        company: contact.company || existingContact.company,
        role: contact.role || existingContact.role,
        location: contact.location || existingContact.location,
        industry: contact.industry || existingContact.industry,
        companySize: contact.companySize || existingContact.companySize,
        // Merge arrays
        needs: [...new Set([...existingContact.needs, ...psychographics.needs])],
        interests: [...new Set([...existingContact.interests, ...psychographics.interests])],
        goals: [...new Set([...existingContact.goals, ...psychographics.goals])],
        painPoints: [...new Set([...existingContact.painPoints, ...psychographics.painPoints])],
        communicationStyle: psychographics.communicationStyle || existingContact.communicationStyle,
      },
    });

    // Link conversation to contact
    await prisma.voiceConversation.update({
      where: { id: conversationId },
      data: { voiceContactId: existingContact.id },
    });

    console.log(`[Olivia Status] Updated existing contact: ${existingContact.id}`);
  } else {
    // Create new contact
    const newContact = await prisma.voiceContact.create({
      data: {
        phone,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        company: contact.company,
        role: contact.role,
        location: contact.location,
        industry: contact.industry,
        companySize: contact.companySize,
        needs: psychographics.needs,
        interests: psychographics.interests,
        goals: psychographics.goals,
        painPoints: psychographics.painPoints,
        communicationStyle: psychographics.communicationStyle,
        status: "lead",
        source: "voice_call",
      },
    });

    // Link conversation to new contact
    await prisma.voiceConversation.update({
      where: { id: conversationId },
      data: { voiceContactId: newContact.id },
    });

    console.log(`[Olivia Status] Created new contact: ${newContact.id}`);
  }
}
