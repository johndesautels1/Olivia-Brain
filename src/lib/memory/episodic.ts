/**
 * Episodic Memory Service
 * Sprint 4.3 — Advanced Memory (Item 2: Episodic Memory Layer)
 *
 * Stores coherent conversation episodes with LLM-generated summaries.
 * Episodes are ALWAYS private (client_id required, no public episodes).
 * Created at conversation end, not auto-detected during conversation.
 *
 * An episode = a summarized chunk of a conversation with:
 * - Title, summary, topics, outcome
 * - Temporal anchors (start_at, end_at)
 * - Links to knowledge graph entities
 * - Chain links to parent episodes (follow-up conversations)
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

import { getServerEnv } from "@/lib/config/env";
import { getEmbeddingsService } from "./embeddings";
import type { ConversationTurn } from "./store";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Episode {
  id: string;
  clientId: string;
  conversationId: string;
  title: string;
  summary: string;
  topics: string[];
  participants: string[];
  outcome: string | null;
  turnIds: string[];
  startAt: string;
  endAt: string;
  linkedEntityIds: string[];
  parentEpisodeId: string | null;
  createdAt: string;
  /** Present only in search results */
  similarity?: number;
}

export interface CreateEpisodeOptions {
  /** Conversation turns that make up this episode */
  turns: ConversationTurn[];
  /** Client ID (required — episodes are always private) */
  clientId: string;
  /** Conversation ID these turns belong to */
  conversationId: string;
  /** Optional: link this as a follow-up to a previous episode */
  parentEpisodeId?: string;
  /** Optional: entity IDs from the knowledge graph mentioned in this episode */
  linkedEntityIds?: string[];
  /** Optional: override participants list (default: extracted from turns) */
  participants?: string[];
}

export interface FindEpisodesOptions {
  /** Text query to search for semantically */
  query: string;
  /** Client ID (required — episodes are always private) */
  clientId: string;
  /** Filter by topic tag */
  topic?: string;
  /** Only episodes after this date */
  startAfter?: Date;
  /** Only episodes before this date */
  endBefore?: Date;
  /** Maximum results (default: 10) */
  limit?: number;
  /** Minimum similarity threshold (default: 0.5) */
  threshold?: number;
}

export interface EpisodeTimelineOptions {
  /** Client ID (required) */
  clientId: string;
  /** Filter by topic */
  topic?: string;
  /** Only episodes after this date */
  startAfter?: Date;
  /** Only episodes before this date */
  endBefore?: Date;
  /** Maximum results (default: 50) */
  limit?: number;
  /** Offset for pagination (default: 0) */
  offset?: number;
}

// ─── Service Interface ───────────────────────────────────────────────────────

export interface EpisodicMemoryService {
  createEpisode(options: CreateEpisodeOptions): Promise<Episode>;
  findEpisodes(options: FindEpisodesOptions): Promise<Episode[]>;
  getEpisode(episodeId: string): Promise<Episode | null>;
  linkEpisodes(episodeId: string, parentEpisodeId: string): Promise<void>;
  getEpisodeTimeline(options: EpisodeTimelineOptions): Promise<Episode[]>;
}

// ─── LLM Summarization Prompt ────────────────────────────────────────────────

const EPISODE_EXTRACTION_SYSTEM = `You are a memory extraction system for an AI executive assistant named Olivia.
Given a transcript of conversation turns, extract a structured episode summary.

You MUST respond with valid JSON only — no markdown, no explanation, no wrapping.

JSON schema:
{
  "title": "Short descriptive title (max 10 words)",
  "summary": "2-4 sentence summary of what was discussed, decided, and any key details",
  "topics": ["array", "of", "topic", "tags", "lowercase"],
  "outcome": "What was decided or agreed upon, or null if no clear outcome"
}

Rules:
- Title should be specific and descriptive (e.g., "Tampa Neighborhood Evaluation" not "Discussion")
- Summary should capture WHO discussed WHAT and any KEY DETAILS mentioned
- Topics should be lowercase, specific tags (e.g., "tampa", "flood-zones", "school-districts")
- Outcome should capture action items and decisions. Use null if the conversation was exploratory with no decisions
- NEVER include private financial details (exact dollar amounts, SSN, etc.) in the title or topics
- Summary may include relevant financial context if discussed`;

// ─── Supabase Implementation ─────────────────────────────────────────────────

class SupabaseEpisodicMemoryService implements EpisodicMemoryService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Create an episode from a batch of conversation turns.
   * Calls the LLM to generate title, summary, topics, and outcome.
   * Embeds the summary for semantic search.
   */
  async createEpisode(options: CreateEpisodeOptions): Promise<Episode> {
    const {
      turns,
      clientId,
      conversationId,
      parentEpisodeId,
      linkedEntityIds = [],
      participants: explicitParticipants,
    } = options;

    if (turns.length === 0) {
      throw new Error("[EpisodicMemory] Cannot create episode from zero turns");
    }

    // Sort turns by creation time
    const sorted = [...turns].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Build transcript for the LLM
    const transcript = sorted
      .map((t) => `[${t.role}]: ${t.content}`)
      .join("\n\n");

    // Extract episode metadata via LLM
    const extracted = await this.extractEpisodeMetadata(transcript);

    // Determine participants
    const participants =
      explicitParticipants ??
      this.extractParticipants(sorted);

    // Generate embedding for the summary
    const embeddingsService = getEmbeddingsService();
    const { embedding } = await embeddingsService.embed(
      `${extracted.title} | ${extracted.summary}`
    );

    // Determine time boundaries
    const startAt = sorted[0].createdAt;
    const endAt = sorted[sorted.length - 1].createdAt;

    const row = {
      client_id: clientId,
      conversation_id: conversationId,
      title: extracted.title,
      summary: extracted.summary,
      topics: extracted.topics,
      participants,
      outcome: extracted.outcome,
      turn_ids: sorted.map((t) => t.id),
      start_at: startAt,
      end_at: endAt,
      embedding: JSON.stringify(embedding),
      linked_entity_ids: linkedEntityIds,
      parent_episode_id: parentEpisodeId ?? null,
    };

    const { data, error } = await this.supabase
      .from("episodes")
      .insert(row)
      .select("id, created_at")
      .single();

    if (error) {
      throw new Error(
        `[EpisodicMemory] Failed to create episode: ${error.message}`
      );
    }

    return {
      id: data.id,
      clientId,
      conversationId,
      title: extracted.title,
      summary: extracted.summary,
      topics: extracted.topics,
      participants,
      outcome: extracted.outcome,
      turnIds: sorted.map((t) => t.id),
      startAt,
      endAt,
      linkedEntityIds,
      parentEpisodeId: parentEpisodeId ?? null,
      createdAt: data.created_at,
    };
  }

  /**
   * Find episodes via semantic search over summaries.
   * Scoped to a specific client (episodes are always private).
   */
  async findEpisodes(options: FindEpisodesOptions): Promise<Episode[]> {
    const {
      query,
      clientId,
      topic,
      startAfter,
      endBefore,
      limit = 10,
      threshold = 0.5,
    } = options;

    const embeddingsService = getEmbeddingsService();
    const { embedding } = await embeddingsService.embed(query);

    const { data, error } = await this.supabase.rpc("match_episodes", {
      query_embedding: JSON.stringify(embedding),
      p_client_id: clientId,
      p_topic: topic ?? null,
      p_start_after: startAfter?.toISOString() ?? null,
      p_end_before: endBefore?.toISOString() ?? null,
      match_threshold: threshold,
      match_count: limit,
    });

    if (error) {
      throw new Error(
        `[EpisodicMemory] Episode search failed: ${error.message}`
      );
    }

    return (data ?? []).map(this.rowToEpisode);
  }

  /**
   * Fetch a single episode by ID.
   */
  async getEpisode(episodeId: string): Promise<Episode | null> {
    const { data, error } = await this.supabase
      .from("episodes")
      .select("*")
      .eq("id", episodeId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw new Error(
        `[EpisodicMemory] Failed to get episode: ${error.message}`
      );
    }

    return data ? this.rowToEpisode(data) : null;
  }

  /**
   * Link an episode as a follow-up to a parent episode.
   * Creates a chain: parent → child (this conversation continued from that one).
   */
  async linkEpisodes(
    episodeId: string,
    parentEpisodeId: string
  ): Promise<void> {
    // Validate parent exists
    const { data: parent } = await this.supabase
      .from("episodes")
      .select("id")
      .eq("id", parentEpisodeId)
      .single();

    if (!parent) {
      throw new Error(
        `[EpisodicMemory] Parent episode "${parentEpisodeId}" not found`
      );
    }

    const { error } = await this.supabase
      .from("episodes")
      .update({ parent_episode_id: parentEpisodeId })
      .eq("id", episodeId);

    if (error) {
      throw new Error(
        `[EpisodicMemory] Failed to link episodes: ${error.message}`
      );
    }
  }

  /**
   * Get a chronological timeline of all episodes for a client.
   * Newest first. Optionally filtered by topic or date range.
   */
  async getEpisodeTimeline(
    options: EpisodeTimelineOptions
  ): Promise<Episode[]> {
    const {
      clientId,
      topic,
      startAfter,
      endBefore,
      limit = 50,
      offset = 0,
    } = options;

    let query = this.supabase
      .from("episodes")
      .select("*")
      .eq("client_id", clientId)
      .order("end_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (startAfter) {
      query = query.gte("start_at", startAfter.toISOString());
    }

    if (endBefore) {
      query = query.lte("end_at", endBefore.toISOString());
    }

    if (topic) {
      query = query.contains("topics", [topic]);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(
        `[EpisodicMemory] Timeline query failed: ${error.message}`
      );
    }

    return (data ?? []).map(this.rowToEpisode);
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Call the LLM to extract episode metadata from a conversation transcript.
   * Uses Sonnet (fast, good at summarization) — no need for Opus here.
   */
  private async extractEpisodeMetadata(
    transcript: string
  ): Promise<{
    title: string;
    summary: string;
    topics: string[];
    outcome: string | null;
  }> {
    const env = getServerEnv();

    // Truncate very long transcripts to avoid token limits
    const maxChars = 12000;
    const truncated =
      transcript.length > maxChars
        ? transcript.slice(0, maxChars) + "\n\n[...conversation truncated...]"
        : transcript;

    try {
      if (!env.ANTHROPIC_API_KEY) {
        // Fallback: generate basic metadata without LLM
        return this.fallbackExtraction(transcript);
      }

      const result = await generateText({
        model: anthropic(env.ANTHROPIC_MODEL_PRIMARY),
        system: EPISODE_EXTRACTION_SYSTEM,
        prompt: `Extract an episode summary from this conversation:\n\n${truncated}`,
        temperature: 0.2,
        maxOutputTokens: 500,
      });

      const parsed = JSON.parse(result.text);

      return {
        title: typeof parsed.title === "string" ? parsed.title : "Untitled Episode",
        summary: typeof parsed.summary === "string" ? parsed.summary : "No summary available.",
        topics: Array.isArray(parsed.topics)
          ? parsed.topics.filter((t: unknown) => typeof t === "string")
          : [],
        outcome: typeof parsed.outcome === "string" ? parsed.outcome : null,
      };
    } catch (err) {
      console.error("[EpisodicMemory] LLM extraction failed, using fallback:", err);
      return this.fallbackExtraction(transcript);
    }
  }

  /**
   * Fallback extraction when LLM is unavailable.
   * Generates basic metadata from the transcript text.
   */
  private fallbackExtraction(transcript: string): {
    title: string;
    summary: string;
    topics: string[];
    outcome: string | null;
  } {
    // Use the first user message as a rough title
    const firstUserLine = transcript
      .split("\n")
      .find((line) => line.startsWith("[user]:"));

    const titleText = firstUserLine
      ? firstUserLine.replace("[user]: ", "").slice(0, 60)
      : "Conversation Episode";

    // Count turns for summary
    const userTurns = (transcript.match(/\[user\]:/g) ?? []).length;
    const assistantTurns = (transcript.match(/\[assistant\]:/g) ?? []).length;

    return {
      title: titleText,
      summary: `Conversation with ${userTurns} user messages and ${assistantTurns} assistant responses.`,
      topics: [],
      outcome: null,
    };
  }

  /**
   * Extract participant roles from conversation turns.
   */
  private extractParticipants(turns: ConversationTurn[]): string[] {
    const roles = new Set<string>();
    for (const turn of turns) {
      if (turn.role === "user") {
        roles.add("client");
      } else if (turn.role === "assistant") {
        roles.add("olivia");
      } else if (turn.role === "system") {
        roles.add("system");
      }
    }
    return Array.from(roles);
  }

  /**
   * Convert a Supabase row to an Episode object.
   */
  private rowToEpisode(row: Record<string, unknown>): Episode {
    return {
      id: row.id as string,
      clientId: row.client_id as string,
      conversationId: row.conversation_id as string,
      title: row.title as string,
      summary: row.summary as string,
      topics: (row.topics as string[]) ?? [],
      participants: (row.participants as string[]) ?? [],
      outcome: (row.outcome as string) ?? null,
      turnIds: (row.turn_ids as string[]) ?? [],
      startAt: row.start_at as string,
      endAt: row.end_at as string,
      linkedEntityIds: (row.linked_entity_ids as string[]) ?? [],
      parentEpisodeId: (row.parent_episode_id as string) ?? null,
      createdAt: row.created_at as string,
      ...(row.similarity !== undefined
        ? { similarity: row.similarity as number }
        : {}),
    };
  }
}

// ─── NoOp Fallback ───────────────────────────────────────────────────────────

class NoOpEpisodicMemoryService implements EpisodicMemoryService {
  async createEpisode(options: CreateEpisodeOptions): Promise<Episode> {
    console.warn("[EpisodicMemory] No Supabase configured — episode not persisted");
    return {
      id: "noop",
      clientId: options.clientId,
      conversationId: options.conversationId,
      title: "Unpersisted Episode",
      summary: "Episode was not saved — Supabase not configured.",
      topics: [],
      participants: [],
      outcome: null,
      turnIds: options.turns.map((t) => t.id),
      startAt: options.turns[0]?.createdAt ?? new Date().toISOString(),
      endAt: options.turns[options.turns.length - 1]?.createdAt ?? new Date().toISOString(),
      linkedEntityIds: [],
      parentEpisodeId: null,
      createdAt: new Date().toISOString(),
    };
  }

  async findEpisodes(): Promise<Episode[]> {
    console.warn("[EpisodicMemory] No Supabase configured — returning empty");
    return [];
  }

  async getEpisode(): Promise<Episode | null> {
    console.warn("[EpisodicMemory] No Supabase configured — returning null");
    return null;
  }

  async linkEpisodes(): Promise<void> {
    console.warn("[EpisodicMemory] No Supabase configured — link skipped");
  }

  async getEpisodeTimeline(): Promise<Episode[]> {
    console.warn("[EpisodicMemory] No Supabase configured — returning empty");
    return [];
  }
}

// ─── Singleton Factory ───────────────────────────────────────────────────────

let episodicMemoryService: EpisodicMemoryService | undefined;

/**
 * Get the episodic memory service singleton.
 * Returns Supabase-backed service if configured, otherwise NoOp fallback.
 */
export function getEpisodicMemoryService(): EpisodicMemoryService {
  if (!episodicMemoryService) {
    const env = getServerEnv();

    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      episodicMemoryService = new SupabaseEpisodicMemoryService(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
      );
    } else {
      episodicMemoryService = new NoOpEpisodicMemoryService();
    }
  }

  return episodicMemoryService;
}
