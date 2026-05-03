import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";
import {
  parseNaturalLanguage,
  generateProactiveSuggestions,
  extractUserMemory,
} from "@/lib/calendar/olivia-engine";
import { formatUserMemoriesForPrompt } from "@/lib/calendar/olivia-prompts";
import {
  getActiveRecommendations,
  updateRecommendationStatus,
  logCalendarInteraction,
} from "@/lib/queries/calendar";
import {
  oliviaActionSchema,
  oliviaGetActionSchema,
} from "@/lib/calendar/olivia-schemas";
import type { OliviaAction } from "@/lib/calendar/olivia-schemas";

// Replaced for Olivia Brain — userId IS the canonical user ID directly
// (Olivia Brain's calendar/voice/olivia models use `userId String @db.Uuid`,
// not a UserProfile FK). Kept the function name for minimal call-site churn.
async function getUserProfileId(): Promise<string | null> {
  const { userId } = await getAuthSession();
  return userId;
}

// Layer 2: Check if user has granted data_storage consent
async function checkOliviaConsent(userId: string): Promise<{
  hasConsent: boolean;
  needsPrompt: boolean;
}> {
  const consent = await prisma.oliviaConsent.findUnique({
    where: {
      userId_consentType: {
        userId,
        consentType: "data_storage",
      },
    },
    select: { granted: true },
  });

  // If no consent record exists, user needs to be prompted
  if (!consent) {
    return { hasConsent: false, needsPrompt: true };
  }

  // If consent was revoked, don't prompt again (respect their choice)
  return { hasConsent: consent.granted, needsPrompt: false };
}

// Layer 3: Check if user has granted learning consent
async function hasLearningConsent(userId: string): Promise<boolean> {
  const consent = await prisma.oliviaConsent.findUnique({
    where: {
      userId_consentType: {
        userId,
        consentType: "learning",
      },
    },
    select: { granted: true },
  });
  return consent?.granted ?? false;
}

// Layer 3: Fetch active user memories for prompt injection
async function getUserMemories(userId: string): Promise<{
  category: string;
  factKey: string;
  factValue: string;
  confidence: number;
}[]> {
  const memories = await prisma.oliviaUserMemory.findMany({
    where: {
      userId,
      isActive: true,
      confidence: { gte: 0.5 }, // Only include memories with reasonable confidence
    },
    select: {
      category: true,
      factKey: true,
      factValue: true,
      confidence: true,
    },
    orderBy: { confidence: "desc" },
    take: 50, // Limit to avoid token overflow
  });
  return memories;
}

// Layer 3: Save extracted memories to database
async function saveExtractedMemories(
  userId: string,
  extractedFacts: { category: string; factKey: string; factValue: string; confidence: number; sourceQuote: string }[],
  updatedFacts: { category: string; factKey: string; factValue: string; confidence: number; sourceQuote: string }[],
  sourceMessageId?: string
): Promise<void> {
  // Process new facts
  for (const fact of extractedFacts) {
    try {
      await prisma.oliviaUserMemory.upsert({
        where: {
          userId_category_factKey: {
            userId,
            category: fact.category,
            factKey: fact.factKey,
          },
        },
        create: {
          userId,
          category: fact.category,
          factKey: fact.factKey,
          factValue: fact.factValue,
          confidence: fact.confidence,
          source: "conversation",
          sourceMessageId,
          metadata: { sourceQuote: fact.sourceQuote },
        },
        update: {
          // Only update if new confidence is higher
          factValue: fact.factValue,
          confidence: { increment: Math.min(0.1, 1 - fact.confidence) },
          sourceMessageId,
          metadata: { sourceQuote: fact.sourceQuote },
        },
      });
    } catch (err) {
      console.error("[Olivia Memory] Failed to save fact:", fact.factKey, err);
    }
  }

  // Process updated facts (supersede old values)
  for (const fact of updatedFacts) {
    try {
      await prisma.oliviaUserMemory.upsert({
        where: {
          userId_category_factKey: {
            userId,
            category: fact.category,
            factKey: fact.factKey,
          },
        },
        create: {
          userId,
          category: fact.category,
          factKey: fact.factKey,
          factValue: fact.factValue,
          confidence: fact.confidence,
          source: "conversation",
          sourceMessageId,
          metadata: { sourceQuote: fact.sourceQuote, isUpdate: true },
        },
        update: {
          factValue: fact.factValue, // Replace with new value
          confidence: fact.confidence,
          sourceMessageId,
          metadata: { sourceQuote: fact.sourceQuote, isUpdate: true },
        },
      });
    } catch (err) {
      console.error("[Olivia Memory] Failed to update fact:", fact.factKey, err);
    }
  }
}

// GET — Fetch active recommendations or parse NLP
export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 10, windowMs: 60_000, prefix: "cal-olivia" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const rawAction = searchParams.get("action");
  const actionParsed = oliviaGetActionSchema.safeParse(rawAction);
  if (!actionParsed.success) {
    return NextResponse.json(
      { error: "Invalid action. Valid GET actions: recommendations, parse" },
      { status: 400 }
    );
  }
  const action = actionParsed.data;

  if (action === "recommendations") {
    const recommendations = await getActiveRecommendations(userId);
    return NextResponse.json({
      recommendations: recommendations.map((r) => ({
        ...r,
        confidenceScore: r.confidenceScore ? Number(r.confidenceScore) : null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        actedAt: r.actedAt?.toISOString() || null,
        dismissedAt: r.dismissedAt?.toISOString() || null,
        snoozedUntil: r.snoozedUntil?.toISOString() || null,
      })),
    });
  }

  // NLP parse via query param
  const text = searchParams.get("text");
  if (action === "parse" && text) {
    try {
      // Get user preferences for context
      const prefs = await prisma.calendarPreferences.findUnique({
        where: { userId },
      });

      // Get recent categories
      const recentEntries = await prisma.calendarEntry.findMany({
        where: { userId, isArchived: false },
        select: { category: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      const recentCategories = [
        ...new Set(recentEntries.map((e) => e.category)),
      ];

      const result = await parseNaturalLanguage(text, {
        userTimezone: prefs?.timezone || "Europe/London",
        currentDatetime: new Date().toISOString(),
        recentEventCategories: recentCategories,
        userPrefs: prefs
          ? `Stage: ${prefs.startupStage || "unknown"}, Working hours: ${prefs.workingHoursStart}-${prefs.workingHoursEnd}`
          : "No preferences set",
      });

      return NextResponse.json(result);
    } catch (err) {
      console.error("NLP parse error:", err);
      return NextResponse.json(
        { error: "Failed to parse text" },
        { status: 500 }
      );
    }
  }

  // action is "parse" but text param is missing
  return NextResponse.json(
    { error: "Missing 'text' query parameter for parse action" },
    { status: 400 }
  );
}

// POST — Generate suggestions, dismiss/accept recommendations, NLP parse
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 10, windowMs: 60_000, prefix: "cal-olivia" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Validate action payload against strict contract
    const validated = oliviaActionSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        {
          error: "Invalid action payload",
          details: validated.error.issues.map((i) => i.message),
        },
        { status: 400 }
      );
    }

    const actionPayload: OliviaAction = validated.data;

    // ── NLP Parse ──
    if (actionPayload.action === "parse") {
      // Pre-check: Anthropic API key must be configured
      if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json(
          { error: "Olivia's AI service is not configured. Contact administrator." },
          { status: 503 },
        );
      }

      // ── Layer 2: GDPR Consent Check ──
      const consentStatus = await checkOliviaConsent(userId);

      if (!consentStatus.hasConsent) {
        // Return a special response that tells the client to show consent modal
        return NextResponse.json({
          success: false,
          extracted_event: null,
          missing_fields: [],
          clarification_needed: false,
          clarification_questions: [],
          olivia_message: consentStatus.needsPrompt
            ? "Before I can help you, I need your consent to store our conversation. This helps me provide better assistance over time."
            : "I respect your privacy settings. You've previously declined data storage, so I can't save our conversation. You can update your preferences anytime.",
          confidence: "high",
          requiresConsent: true,
          consentStatus: consentStatus.needsPrompt ? "not_set" : "revoked",
        });
      }

      // ── Conversation Persistence (Layer 1) ──
      // Get or create conversation for context continuity
      let conversationId = actionPayload.conversationId;

      if (!conversationId) {
        // Create new conversation
        const newConversation = await prisma.oliviaConversation.create({
          data: {
            userId,
            pageContext: "calendar",
            mode: "chat",
          },
        });
        conversationId = newConversation.id;
      } else {
        // Verify conversation exists and belongs to user
        const existingConv = await prisma.oliviaConversation.findFirst({
          where: {
            id: conversationId,
            userId,
            isArchived: false,
          },
        });
        if (!existingConv) {
          // Create new conversation if provided one is invalid
          const newConversation = await prisma.oliviaConversation.create({
            data: {
              userId,
              pageContext: "calendar",
              mode: "chat",
            },
          });
          conversationId = newConversation.id;
        }
      }

      // Store user message
      await prisma.oliviaMessage.create({
        data: {
          conversationId,
          role: "user",
          content: actionPayload.text,
          metadata: actionPayload.fromVoice ? { fromVoice: true, durationMs: actionPayload.durationMs } : undefined,
        },
      });

      // Fetch recent messages for conversation context
      const recentMessages = await prisma.oliviaMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
        take: 20,
        select: { role: true, content: true },
      });

      const prefs = await prisma.calendarPreferences.findUnique({
        where: { userId },
      });

      const recentEntries = await prisma.calendarEntry.findMany({
        where: { userId, isArchived: false },
        select: { category: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      // Layer 3: Fetch user memories if learning consent is granted
      const canUseMemory = await hasLearningConsent(userId);
      const userMemories = canUseMemory ? await getUserMemories(userId) : [];
      const memorySection = formatUserMemoriesForPrompt(userMemories);

      try {
        // Build user prefs string with memory section appended
        const basePrefs = prefs
          ? `Stage: ${prefs.startupStage || "unknown"}, Working hours: ${prefs.workingHoursStart}-${prefs.workingHoursEnd}`
          : "No preferences set";

        const result = await parseNaturalLanguage(actionPayload.text, {
          userTimezone: prefs?.timezone || "Europe/London",
          currentDatetime: new Date().toISOString(),
          recentEventCategories: [
            ...new Set(recentEntries.map((e) => e.category)),
          ],
          // Append memory section to user prefs for prompt injection
          userPrefs: basePrefs + memorySection,
          // Pass conversation history for context continuity
          // Cast role to expected union type and exclude the message we just added
          conversationHistory: recentMessages.slice(0, -1).map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          // Pass userId for agentic tool access (search_platform, get_programs, etc.)
          userId,
        });

        // Store Olivia's response
        await prisma.oliviaMessage.create({
          data: {
            conversationId,
            role: "assistant",
            content: result.olivia_message,
            metadata: {
              success: result.success,
              confidence: result.confidence,
              hasExtractedEvent: !!result.extracted_event,
            },
          },
        });

        // Log voice transcription if it came from voice
        if (actionPayload.fromVoice) {
          await prisma.voiceTranscriptionLog.create({
            data: {
              userId,
              rawTranscript: actionPayload.text,
              parsedResultJson: result as unknown as import("@prisma/client").Prisma.InputJsonValue,
              confidenceScore: result.confidence === "very_high" ? 0.95 : result.confidence === "high" ? 0.8 : result.confidence === "medium" ? 0.6 : 0.3,
              durationMs: actionPayload.durationMs || null,
              wasAccepted: result.success,
            },
          });
        }

        // Layer 3: Extract and save user memories in the background
        // Only run if user has learning consent and conversation has enough context
        if (canUseMemory && recentMessages.length >= 2) {
          // Run memory extraction asynchronously (don't block response)
          (async () => {
            try {
              const memoryResult = await extractUserMemory({
                messages: recentMessages.map((m) => ({
                  role: m.role,
                  content: m.content,
                })),
                existingMemories: userMemories.map((m) => ({
                  category: m.category,
                  factKey: m.factKey,
                  factValue: m.factValue,
                })),
              });

              // Save extracted facts if any
              if (memoryResult.extracted_facts.length > 0 || memoryResult.updated_facts.length > 0) {
                await saveExtractedMemories(
                  userId,
                  memoryResult.extracted_facts,
                  memoryResult.updated_facts,
                  conversationId
                );
                console.log(
                  `[Olivia Memory] Extracted ${memoryResult.extracted_facts.length} new facts, ` +
                  `updated ${memoryResult.updated_facts.length} existing facts for user ${userId}`
                );
              }
            } catch (memErr) {
              console.error("[Olivia Memory] Background extraction failed:", memErr);
            }
          })();
        }

        // Return result with conversationId for client to persist
        return NextResponse.json({
          ...result,
          conversationId,
        });
      } catch (nlpErr) {
        const raw = nlpErr instanceof Error ? nlpErr.message : String(nlpErr);
        console.error("[calendar/olivia] NLP parse error:", raw);

        let userMessage = "Olivia couldn't understand that right now. Please try again.";
        if (/api.?key|not configured/i.test(raw)) {
          userMessage = "Olivia's AI service is not configured. Contact administrator.";
        } else if (/401|unauthorized|authentication/i.test(raw)) {
          userMessage = "Olivia's AI service authentication failed. The API key may be invalid.";
        } else if (/429|rate.?limit/i.test(raw)) {
          userMessage = "Olivia is receiving too many requests. Please wait a moment and try again.";
        } else if (/timeout|abort/i.test(raw)) {
          userMessage = "Olivia's response timed out. Please try again.";
        } else if (/500|502|503|504/i.test(raw)) {
          userMessage = "Olivia's AI service is temporarily unavailable. Please try again shortly.";
        }

        return NextResponse.json(
          { error: userMessage },
          { status: 500 },
        );
      }
    }

    // ── Generate Suggestions ──
    if (actionPayload.action === "generate_suggestions") {
      if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json(
          { error: "Olivia's AI service is not configured. Contact administrator." },
          { status: 503 },
        );
      }

      const [prefs, upcomingEntries, recentInteractions] = await Promise.all([
        prisma.calendarPreferences.findUnique({
          where: { userId },
        }),
        prisma.calendarEntry.findMany({
          where: {
            userId,
            isArchived: false,
            startDatetime: {
              gte: new Date(),
              lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            },
          },
          select: {
            title: true,
            category: true,
            startDatetime: true,
            endDatetime: true,
            priority: true,
          },
          orderBy: { startDatetime: "asc" },
        }),
        prisma.calendarInteraction.findMany({
          where: { userId },
          select: { interactionType: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
      ]);

      const suggestions = await generateProactiveSuggestions({
        userProfile: prefs
          ? `Stage: ${prefs.startupStage || "unknown"}, Focus: ${JSON.stringify(prefs.focusAreasJson || [])}, Working hours: ${prefs.workingHoursStart}-${prefs.workingHoursEnd}`
          : "New user — no preferences set yet",
        upcomingEvents: upcomingEntries.length > 0
          ? upcomingEntries
              .map(
                (e) =>
                  `${e.title} (${e.category}) — ${e.startDatetime.toISOString()}`
              )
              .join("\n")
          : "No upcoming events",
        behaviorPatterns: recentInteractions.length > 0
          ? `${recentInteractions.length} interactions in last 60 days. Types: ${[...new Set(recentInteractions.map((i) => i.interactionType))].join(", ")}`
          : "New user — no behavior data",
        currentDate: new Date().toISOString(),
      });

      // Save suggestions as recommendations
      const saved = await Promise.all(
        suggestions.map((s) =>
          prisma.oliviaCalendarRecommendation.create({
            data: {
              userId,
              type: (s.type as "proactive" | "reactive" | "scheduled") || "proactive",
              urgency: (s.urgency as "immediate" | "today" | "this_week" | "when_relevant") || "when_relevant",
              message: s.message,
              reasoningJson: { reasoning: s.reasoning } as unknown as import("@prisma/client").Prisma.InputJsonValue,
              triggerType: s.trigger?.type || null,
              triggerDescription: s.trigger?.description || null,
              eventDraftJson: s.event_draft
                ? (s.event_draft as unknown as import("@prisma/client").Prisma.InputJsonValue)
                : undefined,
              confidenceScore:
                s.confidence === "very_high"
                  ? 0.95
                  : s.confidence === "high"
                    ? 0.8
                    : s.confidence === "medium"
                      ? 0.6
                      : 0.3,
            },
          })
        )
      );

      return NextResponse.json({
        generated: saved.length,
        suggestions: saved.map((s) => ({
          ...s,
          confidenceScore: s.confidenceScore ? Number(s.confidenceScore) : null,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
        })),
      });
    }

    // ── Dismiss Recommendation ──
    if (actionPayload.action === "dismiss") {
      await updateRecommendationStatus(
        actionPayload.recommendationId,
        userId,
        "dismissed"
      );
      await logCalendarInteraction({
        userId,
        interactionType: "dismissed_suggestion",
        metadataJson: { recommendationId: actionPayload.recommendationId },
      });
      return NextResponse.json({ success: true });
    }

    // ── Accept Recommendation ──
    if (actionPayload.action === "accept") {
      await updateRecommendationStatus(
        actionPayload.recommendationId,
        userId,
        "accepted"
      );
      await logCalendarInteraction({
        userId,
        interactionType: "accepted_suggestion",
        metadataJson: { recommendationId: actionPayload.recommendationId },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Olivia API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
