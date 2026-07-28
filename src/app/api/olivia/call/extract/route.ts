// src/app/api/olivia/call/extract/route.ts
// Manual extraction endpoint for voice conversations
// Re-runs LLM extraction on existing transcripts

import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { extractFromTranscript } from "@/lib/olivia/voice-conversation";
import { storeVoiceMemories } from "@/lib/olivia/voice-memory";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST: Re-run extraction on a conversation
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const { userId } = await getAuthSession();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    // Get conversation
    const conversation = await prisma.voiceConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (!conversation.fullTranscript || conversation.fullTranscript.length < 20) {
      return NextResponse.json(
        { error: "Conversation has no transcript to extract from" },
        { status: 400 }
      );
    }

    console.log(`[Olivia Extract] Starting extraction for ${conversationId}`);

    // Update status to processing
    await prisma.voiceConversation.update({
      where: { id: conversationId },
      data: { status: "processing" },
    });

    // Run extraction
    const extractionResult = await extractFromTranscript(conversation.fullTranscript);

    if (!extractionResult) {
      await prisma.voiceConversation.update({
        where: { id: conversationId },
        data: { status: "completed" },
      });
      return NextResponse.json(
        { error: "Extraction failed" },
        { status: 500 }
      );
    }

    // Update conversation with extracted data
    await prisma.voiceConversation.update({
      where: { id: conversationId },
      data: {
        status: "extracted",
        extractedAt: new Date(),
        extractedData: JSON.parse(JSON.stringify(extractionResult)),
        conversationType: extractionResult.conversationType || conversation.conversationType,
      },
    });

    // Create or update VoiceContact if we have contact info
    if (extractionResult.contact && hasContactInfo(extractionResult.contact)) {
      await upsertVoiceContact(conversationId, conversation.callerPhone, extractionResult);
    }

    // Create action items from extraction
    if (extractionResult.actionItems && extractionResult.actionItems.length > 0) {
      for (const item of extractionResult.actionItems) {
        const existing = await prisma.voiceActionItem.findFirst({
          where: {
            conversationId,
            action: item.action,
          },
        });

        if (!existing) {
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
        }
      }
    }

    // Create calendar entry if appointment detected
    if (extractionResult.appointment?.requested) {
      await createCalendarEntryFromAppointment(conversationId, extractionResult, userId);
    }

    // Store in Olivia's memory — userId IS the Clerk user ID directly
    if (userId) {
      const memoryIds = await storeVoiceMemories(
        userId,
        conversationId,
        extractionResult
      );

      if (memoryIds.length > 0) {
        await prisma.voiceConversation.update({
          where: { id: conversationId },
          data: { memoryIds },
        });
        console.log(`[Olivia Extract] Stored ${memoryIds.length} memories`);
      }
    }

    console.log(`[Olivia Extract] Extraction complete for ${conversationId}`);

    return NextResponse.json({
      success: true,
      extractedData: extractionResult,
    });
  } catch (error) {
    console.error("[Olivia Extract] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
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

  let existingContact = await prisma.voiceContact.findFirst({
    where: { phone },
  });

  if (!existingContact && contact.email) {
    existingContact = await prisma.voiceContact.findFirst({
      where: { email: contact.email },
    });
  }

  if (existingContact) {
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
        needs: [...new Set([...existingContact.needs, ...psychographics.needs])],
        interests: [...new Set([...existingContact.interests, ...psychographics.interests])],
        goals: [...new Set([...existingContact.goals, ...psychographics.goals])],
        painPoints: [...new Set([...existingContact.painPoints, ...psychographics.painPoints])],
        communicationStyle: psychographics.communicationStyle || existingContact.communicationStyle,
      },
    });

    await prisma.voiceConversation.update({
      where: { id: conversationId },
      data: { voiceContactId: existingContact.id },
    });
  } else {
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

    await prisma.voiceConversation.update({
      where: { id: conversationId },
      data: { voiceContactId: newContact.id },
    });
  }
}

/**
 * Create CalendarEntry from extracted appointment
 */
async function createCalendarEntryFromAppointment(
  conversationId: string,
  extraction: {
    appointment: {
      requested: boolean;
      dateTime?: string | null;
      dateDescription?: string | null;
      location?: string | null;
      isZoom: boolean;
      zoomLink?: string | null;
      purpose?: string | null;
    };
    contact: {
      fullName?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      company?: string | null;
    };
    summary: string;
  },
  clerkUserId: string
): Promise<void> {
  const { appointment, contact, summary } = extraction;

  // Need a datetime to create calendar entry
  if (!appointment.dateTime && !appointment.dateDescription) {
    console.log("[Olivia Extract] No datetime for calendar entry, skipping");
    return;
  }

  // userId IS the Clerk user ID directly — no UserProfile lookup needed.
  // Parse date/time
  let startDatetime: Date;

  if (appointment.dateTime) {
    startDatetime = new Date(appointment.dateTime);
  } else {
    // Try to parse natural language date - default to tomorrow 10am if unclear
    startDatetime = new Date();
    startDatetime.setDate(startDatetime.getDate() + 1);
    startDatetime.setHours(10, 0, 0, 0);
  }

  // Default 1 hour duration
  const endDatetime = new Date(startDatetime.getTime() + 60 * 60 * 1000);

  // Build title
  const contactName = contact.fullName ||
    [contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
    contact.company ||
    "Voice Call Follow-up";

  const title = appointment.purpose
    ? `${contactName}: ${appointment.purpose}`
    : `Meeting with ${contactName}`;

  // Check if calendar entry already exists for this conversation
  const existingEntry = await prisma.calendarEntry.findFirst({
    where: {
      voiceConversations: { some: { id: conversationId } },
    },
  });

  if (existingEntry) {
    console.log("[Olivia Extract] Calendar entry already exists, updating");
    await prisma.calendarEntry.update({
      where: { id: existingEntry.id },
      data: {
        title,
        startDatetime,
        endDatetime,
        location: appointment.location,
        virtualUrl: appointment.isZoom ? appointment.zoomLink : undefined,
        description: `From voice call:\n${summary}\n\nDate mentioned: ${appointment.dateDescription || appointment.dateTime}`,
      },
    });
    return;
  }

  // Create new calendar entry
  const calendarEntry = await prisma.calendarEntry.create({
    data: {
      userId: clerkUserId,
      title,
      startDatetime,
      endDatetime,
      entryType: "meeting",
      category: "founder_meeting",
      priority: "high",
      location: appointment.location,
      virtualUrl: appointment.isZoom ? appointment.zoomLink : undefined,
      description: `From voice call:\n${summary}\n\nDate mentioned: ${appointment.dateDescription || appointment.dateTime}`,
      isAiGenerated: true,
      aiSource: "olivia_voice",
      aiConfidenceScore: 0.7,
    },
  });

  // Link conversation to calendar entry
  await prisma.voiceConversation.update({
    where: { id: conversationId },
    data: { calendarEntryId: calendarEntry.id },
  });

  console.log(`[Olivia Extract] Created calendar entry: ${calendarEntry.id}`);
}
