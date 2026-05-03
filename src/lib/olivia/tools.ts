// src/lib/olivia/tools.ts
//
// Carved slice of LTM's olivia/tools.ts. Currently exposes 4 tools:
//   - get_user_calendar — read the user's calendar entries (C2)
//   - web_search       — Tavily fallback for live information (C2)
//   - get_user_memory  — retrieve learned facts about the user (C3)
//   - save_user_memory — store a fact learned during conversation (C3)
// The other 20 LTM tools (search_platform, get_organization, get_district,
// get_document, get_user_analysis, get_user_packages, get_events, get_programs,
// dispatch_agent, send_sms, valuation tools, etc.) reference Prisma models or
// surfaces that Olivia Brain doesn't own yet. They re-port in their respective
// tracks (C4 SMS, Track H dispatch_agent, Track L cluesintelligence for
// analysis/packages/valuation, etc.).
//
// `userId` here is the Clerk user ID (passed in by the caller). LTM's original
// also did a `userProfile.findUnique({ clerkUserId })` lookup to map Clerk → an
// internal UserProfile.id; Olivia Brain's models use `userId` directly, so the
// lookup is not needed.

import prisma from "@/lib/db/client";
import type { Prisma } from "@prisma/client";
import type { ChatCompletionTool } from "openai/resources/chat/completions";

// ---------------------------------------------------------------------------
// Tool Definitions (OpenAI function calling schema)
// ---------------------------------------------------------------------------

export const OLIVIA_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_user_calendar",
      description:
        "Access the user's personal calendar entries for a date range. Returns meetings, events, tasks, and their details including attendees and prep tasks. Use this to help with scheduling, meeting prep, and daily planning.",
      parameters: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Start date in ISO format (e.g., '2024-03-15'). Defaults to today.",
          },
          endDate: {
            type: "string",
            description: "End date in ISO format (e.g., '2024-03-22'). Defaults to 7 days from start.",
          },
          category: {
            type: "string",
            enum: ["all", "vc_meeting", "partner_meeting", "board_meeting", "team_sync", "networking", "conference", "deadline", "personal"],
            description: "Filter by meeting category",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_user_memory",
      description:
        "Retrieve facts Olivia has learned about this user from past conversations. Use this to personalize responses with remembered preferences, relationships, company details, and behavioral patterns. Requires user to have granted learning consent.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["all", "personal", "professional", "behavioral", "preferences", "financial", "platform"],
            description:
              "Filter by category: personal (family, relationships), professional (company, role, industry), behavioral (communication style), preferences (meeting length, contact method), financial (funding stage, runway), platform (feature usage)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_user_memory",
      description:
        "Store a fact learned about the user during this conversation. Only call this when the user explicitly shares personal or professional information worth remembering for future conversations. Requires learning consent.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["personal", "professional", "behavioral", "preferences", "financial", "platform"],
            description: "Category for the fact",
          },
          factKey: {
            type: "string",
            description: "Identifier for the fact (e.g., 'spouse_name', 'company_name', 'preferred_meeting_length')",
          },
          factValue: {
            type: "string",
            description: "The value to remember (e.g., 'Sarah', 'Acme Corp', '30 minutes')",
          },
          confidence: {
            type: "number",
            description: "Confidence level 0-1 (default 0.8 for explicit statements, 0.5 for inferred)",
          },
        },
        required: ["category", "factKey", "factValue"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Search the web for real-time information about London tech events, programs, news, companies, funding rounds, etc. Use this when you need current/breaking news that the calendar tool cannot provide.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query. Be specific about London tech context (e.g., 'London AI prompting courses 2026', 'London fintech funding news April 2026')",
          },
        },
        required: ["query"],
      },
    },
  },
];

export interface ToolCallResult {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}

// ---------------------------------------------------------------------------
// Tool Execution Dispatcher
// ---------------------------------------------------------------------------

export async function executeOliviaTool(
  name: string,
  args: Record<string, unknown>,
  userId?: string | null
): Promise<unknown> {
  switch (name) {
    case "get_user_calendar":
      return handleGetUserCalendar(
        userId,
        args.startDate as string | undefined,
        args.endDate as string | undefined,
        args.category as string | undefined
      );
    case "get_user_memory":
      return handleGetUserMemory(userId, args.category as string | undefined);
    case "save_user_memory":
      return handleSaveUserMemory(
        userId,
        args.category as string,
        args.factKey as string,
        args.factValue as string,
        args.confidence as number | undefined
      );
    case "web_search":
      return handleWebSearch(args.query as string);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

/** Check if user has granted learning consent. */
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

// ---------------------------------------------------------------------------
// get_user_memory handler
// ---------------------------------------------------------------------------

async function handleGetUserMemory(userId: string | null | undefined, category?: string) {
  if (!userId) {
    return { error: "User not authenticated. Sign in to access memories." };
  }

  const hasConsent = await hasLearningConsent(userId);
  if (!hasConsent) {
    return {
      error: "Learning consent not granted. User must enable 'Let Olivia learn about me' in settings.",
      requiresConsent: true,
    };
  }

  const whereClause: Prisma.OliviaUserMemoryWhereInput = {
    userId,
    isActive: true,
  };

  if (category && category !== "all") {
    whereClause.category = category;
  }

  const memories = await prisma.oliviaUserMemory.findMany({
    where: whereClause,
    orderBy: [{ category: "asc" }, { confidence: "desc" }, { updatedAt: "desc" }],
    select: {
      category: true,
      factKey: true,
      factValue: true,
      confidence: true,
      source: true,
      updatedAt: true,
    },
  });

  if (memories.length === 0) {
    return {
      memories: [],
      message: "No memories stored yet. I'll remember important facts as we chat.",
    };
  }

  // Group by category for easier consumption
  const grouped: Record<string, Array<{ key: string; value: string; confidence: number }>> = {};
  for (const m of memories) {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push({
      key: m.factKey,
      value: m.factValue,
      confidence: Number(m.confidence),
    });
  }

  return {
    memories: grouped,
    totalFacts: memories.length,
    categories: Object.keys(grouped),
  };
}

// ---------------------------------------------------------------------------
// save_user_memory handler
// ---------------------------------------------------------------------------

async function handleSaveUserMemory(
  userId: string | null | undefined,
  category: string,
  factKey: string,
  factValue: string,
  confidence?: number
) {
  if (!userId) {
    return { error: "User not authenticated. Cannot save memory." };
  }

  const hasConsent = await hasLearningConsent(userId);
  if (!hasConsent) {
    return {
      error: "Learning consent not granted. Cannot save memory.",
      requiresConsent: true,
    };
  }

  try {
    const result = await prisma.oliviaUserMemory.upsert({
      where: {
        userId_category_factKey: {
          userId,
          category,
          factKey,
        },
      },
      create: {
        userId,
        category,
        factKey,
        factValue,
        confidence: confidence ?? 0.8,
        source: "conversation",
      },
      update: {
        factValue,
        confidence: {
          increment: Math.min(0.1, 1 - (confidence ?? 0.8)),
        },
        source: "conversation",
        isActive: true,
      },
    });

    return {
      success: true,
      saved: {
        category: result.category,
        key: result.factKey,
        value: result.factValue,
        confidence: Number(result.confidence),
      },
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Failed to save memory";
    return { error: errorMsg };
  }
}

// ---------------------------------------------------------------------------
// get_user_calendar handler
// ---------------------------------------------------------------------------

async function handleGetUserCalendar(
  userId: string | null | undefined,
  startDate?: string,
  endDate?: string,
  category?: string
) {
  if (!userId) {
    return { error: "User not authenticated. Sign in to access calendar." };
  }

  // Default to today + 7 days
  const now = new Date();
  const rangeStart = startDate ? new Date(startDate) : now;
  const rangeEnd = endDate
    ? new Date(endDate)
    : new Date(rangeStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const whereClause: Prisma.CalendarEntryWhereInput = {
    userId,
    isArchived: false,
    startDatetime: { lte: rangeEnd },
    endDatetime: { gte: rangeStart },
  };

  if (category && category !== "all") {
    whereClause.category = category as Prisma.CalendarEntryWhereInput["category"];
  }

  const entries = await prisma.calendarEntry.findMany({
    where: whereClause,
    include: {
      attendees: {
        where: { isArchived: false },
        select: {
          name: true,
          email: true,
          role: true,
          rsvpStatus: true,
          isOrganizer: true,
        },
      },
      prepTasks: {
        where: { isArchived: false },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueAt: true,
        },
        orderBy: { dueAt: "asc" },
      },
    },
    orderBy: { startDatetime: "asc" },
    take: 50,
  });

  if (entries.length === 0) {
    return {
      entries: [],
      message: `No calendar entries found between ${rangeStart.toISOString().split("T")[0]} and ${rangeEnd.toISOString().split("T")[0]}.`,
    };
  }

  // Format for Olivia consumption
  const formatted = entries.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    start: e.startDatetime.toISOString(),
    end: e.endDatetime.toISOString(),
    allDay: e.allDay,
    category: e.category,
    priority: e.priority,
    entryType: e.entryType,
    location: e.location,
    virtualUrl: e.virtualUrl,
    attendees: e.attendees.map((a) => ({
      name: a.name,
      email: a.email,
      role: a.role,
      rsvp: a.rsvpStatus,
      isOrganizer: a.isOrganizer,
    })),
    prepTasks: e.prepTasks.map((t) => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueAt: t.dueAt?.toISOString(),
    })),
    isVip: e.isVip,
    tags: Array.isArray(e.tagsJson) ? e.tagsJson : [],
  }));

  return {
    entries: formatted,
    count: entries.length,
    dateRange: {
      start: rangeStart.toISOString().split("T")[0],
      end: rangeEnd.toISOString().split("T")[0],
    },
  };
}

// ---------------------------------------------------------------------------
// web_search handler (Tavily)
// ---------------------------------------------------------------------------

/** Trusted domains for London tech data */
const TRUSTED_DOMAINS = [
  "techcrunch.com",
  "sifted.eu",
  "uktech.news",
  "gov.uk",
  "companieshouse.gov.uk",
  "ft.com",
  "bloomberg.com",
  "reuters.com",
];

interface TavilySearchResult {
  title: string;
  content: string;
  url: string;
  score?: number;
}

async function handleWebSearch(query: string) {
  if (!query || query.length < 3) {
    return { error: "Search query must be at least 3 characters" };
  }

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return {
      error: "Web search is not configured.",
    };
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        query: `${query} London tech`,
        search_depth: "advanced",
        include_answer: true,
        include_raw_content: false,
        max_results: 8,
        include_domains: TRUSTED_DOMAINS,
        topic: "general",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[Tavily] API error:", response.status, errText);
      return {
        error: "Web search temporarily unavailable.",
      };
    }

    const data = await response.json();
    const results: TavilySearchResult[] = data.results ?? [];
    const answer = data.answer ?? null;

    // Format results for Olivia
    const formattedResults = results.map((r) => ({
      title: r.title,
      snippet: r.content?.slice(0, 300) + (r.content?.length > 300 ? "..." : ""),
      url: r.url,
      relevanceScore: r.score ?? 0,
    }));

    return {
      query,
      answer,
      results: formattedResults,
      resultCount: formattedResults.length,
      note: "This is live web data.",
    };
  } catch (err) {
    console.error("[Tavily] Search failed:", err);
    return {
      error: "Web search failed.",
    };
  }
}
