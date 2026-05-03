// src/lib/olivia/voice-memory.ts
// Integration between voice conversations and Olivia's memory system
// Stores extracted facts from calls in OliviaUserMemory

import prisma from "@/lib/db/client";

interface ExtractedContact {
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  email?: string | null;
  company?: string | null;
  role?: string | null;
  location?: string | null;
  industry?: string | null;
}

interface ExtractedPsychographics {
  needs?: string[];
  interests?: string[];
  goals?: string[];
  painPoints?: string[];
  communicationStyle?: string | null;
}

interface ExtractedAppointment {
  requested?: boolean;
  dateTime?: string | null;
  dateDescription?: string | null;
  purpose?: string | null;
}

interface VoiceExtractionData {
  contact?: ExtractedContact;
  psychographics?: ExtractedPsychographics;
  appointment?: ExtractedAppointment;
  actionItems?: Array<{
    action: string;
    assignedTo: string;
    dueDate?: string | null;
  }>;
  summary?: string;
  keyTopics?: string[];
}

/**
 * Store extracted voice call data in Olivia's memory system
 */
export async function storeVoiceMemories(
  userId: string,
  conversationId: string,
  extractedData: VoiceExtractionData
): Promise<string[]> {
  const memoryIds: string[] = [];

  try {
    // Store contact information
    if (extractedData.contact) {
      const contact = extractedData.contact;

      if (contact.fullName || contact.firstName) {
        const memory = await upsertMemory({
          userId,
          category: "professional",
          factKey: "voice_contact_name",
          factValue: contact.fullName || [contact.firstName, contact.lastName].filter(Boolean).join(" "),
          source: "voice_call",
          sourceMessageId: conversationId,
          metadata: { contactEmail: contact.email, contactCompany: contact.company },
        });
        if (memory) memoryIds.push(memory.id);
      }

      if (contact.company) {
        const memory = await upsertMemory({
          userId,
          category: "professional",
          factKey: "voice_contact_company",
          factValue: contact.company,
          source: "voice_call",
          sourceMessageId: conversationId,
        });
        if (memory) memoryIds.push(memory.id);
      }

      if (contact.industry) {
        const memory = await upsertMemory({
          userId,
          category: "professional",
          factKey: "voice_contact_industry",
          factValue: contact.industry,
          source: "voice_call",
          sourceMessageId: conversationId,
        });
        if (memory) memoryIds.push(memory.id);
      }
    }

    // Store psychographics
    if (extractedData.psychographics) {
      const psych = extractedData.psychographics;

      if (psych.needs && psych.needs.length > 0) {
        const memory = await upsertMemory({
          userId,
          category: "professional",
          factKey: "voice_expressed_needs",
          factValue: psych.needs.join("; "),
          source: "voice_call",
          sourceMessageId: conversationId,
        });
        if (memory) memoryIds.push(memory.id);
      }

      if (psych.goals && psych.goals.length > 0) {
        const memory = await upsertMemory({
          userId,
          category: "professional",
          factKey: "voice_expressed_goals",
          factValue: psych.goals.join("; "),
          source: "voice_call",
          sourceMessageId: conversationId,
        });
        if (memory) memoryIds.push(memory.id);
      }

      if (psych.painPoints && psych.painPoints.length > 0) {
        const memory = await upsertMemory({
          userId,
          category: "professional",
          factKey: "voice_pain_points",
          factValue: psych.painPoints.join("; "),
          source: "voice_call",
          sourceMessageId: conversationId,
        });
        if (memory) memoryIds.push(memory.id);
      }

      if (psych.communicationStyle) {
        const memory = await upsertMemory({
          userId,
          category: "preferences",
          factKey: "voice_communication_style",
          factValue: psych.communicationStyle,
          source: "voice_call",
          sourceMessageId: conversationId,
        });
        if (memory) memoryIds.push(memory.id);
      }
    }

    // Store appointment info
    if (extractedData.appointment?.requested) {
      const appt = extractedData.appointment;
      const memory = await upsertMemory({
        userId,
        category: "platform",
        factKey: "voice_scheduled_appointment",
        factValue: `${appt.purpose || "Meeting"} - ${appt.dateDescription || appt.dateTime || "TBD"}`,
        source: "voice_call",
        sourceMessageId: conversationId,
      });
      if (memory) memoryIds.push(memory.id);
    }

    // Store call summary
    if (extractedData.summary) {
      const memory = await upsertMemory({
        userId,
        category: "platform",
        factKey: `voice_call_summary_${conversationId.slice(-8)}`,
        factValue: extractedData.summary,
        source: "voice_call",
        sourceMessageId: conversationId,
      });
      if (memory) memoryIds.push(memory.id);
    }

    // Store key topics
    if (extractedData.keyTopics && extractedData.keyTopics.length > 0) {
      const memory = await upsertMemory({
        userId,
        category: "professional",
        factKey: "voice_discussed_topics",
        factValue: extractedData.keyTopics.join("; "),
        source: "voice_call",
        sourceMessageId: conversationId,
      });
      if (memory) memoryIds.push(memory.id);
    }

    // Store action items
    if (extractedData.actionItems && extractedData.actionItems.length > 0) {
      for (const item of extractedData.actionItems) {
        const memory = await upsertMemory({
          userId,
          category: "platform",
          factKey: `voice_action_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          factValue: `${item.action} (assigned to: ${item.assignedTo})`,
          source: "voice_call",
          sourceMessageId: conversationId,
          metadata: { dueDate: item.dueDate },
        });
        if (memory) memoryIds.push(memory.id);
      }
    }

    console.log(`[VoiceMemory] Stored ${memoryIds.length} memories for conversation ${conversationId}`);
    return memoryIds;
  } catch (error) {
    console.error("[VoiceMemory] Error storing memories:", error);
    return memoryIds;
  }
}

/**
 * Upsert a memory fact
 */
async function upsertMemory(data: {
  userId: string;
  category: string;
  factKey: string;
  factValue: string;
  source: string;
  sourceMessageId?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ id: string } | null> {
  try {
    // Check if fact already exists
    const existing = await prisma.oliviaUserMemory.findUnique({
      where: {
        userId_category_factKey: {
          userId: data.userId,
          category: data.category,
          factKey: data.factKey,
        },
      },
    });

    if (existing) {
      // Update existing fact with increased confidence
      const updated = await prisma.oliviaUserMemory.update({
        where: { id: existing.id },
        data: {
          factValue: data.factValue,
          confidence: Math.min(existing.confidence + 0.1, 1.0),
          sourceMessageId: data.sourceMessageId,
          metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
        },
      });
      return { id: updated.id };
    }

    // Create new fact
    const memory = await prisma.oliviaUserMemory.create({
      data: {
        userId: data.userId,
        category: data.category,
        factKey: data.factKey,
        factValue: data.factValue,
        confidence: 0.7,
        source: data.source,
        sourceMessageId: data.sourceMessageId,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
      },
    });

    return { id: memory.id };
  } catch (error) {
    console.error("[VoiceMemory] Upsert error:", error);
    return null;
  }
}

/**
 * Get voice-related memories for context
 */
export async function getVoiceMemories(
  userId: string,
  phone?: string
): Promise<Array<{ factKey: string; factValue: string; category: string }>> {
  try {
    const memories = await prisma.oliviaUserMemory.findMany({
      where: {
        userId,
        source: "voice_call",
        isActive: true,
      },
      select: {
        factKey: true,
        factValue: true,
        category: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    return memories;
  } catch (error) {
    console.error("[VoiceMemory] Get error:", error);
    return [];
  }
}
