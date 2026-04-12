/**
 * Inngest Step Functions
 * Sprint 4.4 — Durable Execution (Item 2: Inngest Event-Driven Functions)
 *
 * Durable, event-driven workflows that respond to Olivia events.
 * Each function is a series of steps that Inngest tracks and retries.
 * If a step fails, Inngest replays from the last successful step.
 *
 * Functions:
 * 1. processConversationEnd — episode → facts → snapshot pipeline
 * 2. runMemoryMaintenance — scheduled decay + cleanup
 * 3. handleProcedureCompleted — record outcome + learn from result
 * 4. handleBudgetExhausted — alert logging
 */

import { inngest } from "./inngest-client";

// ─── Function 1: Process Conversation End ────────────────────────────────────

/**
 * When a conversation ends, run the full post-conversation pipeline:
 * Step 1: Create an episodic memory (LLM-summarized episode)
 * Step 2: Extract semantic facts from the episode
 * Step 3: Capture a journey snapshot
 *
 * Each step is independently retryable. If step 2 fails,
 * Inngest retries from step 2 — step 1 is not repeated.
 */
export const processConversationEnd = inngest.createFunction(
  {
    id: "process-conversation-end",
    name: "Process Conversation End",
    retries: 3,
    concurrency: { limit: 5 },
    triggers: [{ event: "olivia/conversation.ended" }],
  },
  async ({ event, step }) => {
    const { conversationId, clientId } = event.data;

    // Step 1: Create episode from conversation
    const episode = await step.run("create-episode", async () => {
      const { getEpisodicMemoryService } = await import("@/lib/memory/episodic");
      const { getConversationStore } = await import("@/lib/memory/store");

      const store = getConversationStore();
      const turns = await store.getRecentTurns(conversationId, 50, clientId);

      if (turns.length === 0) {
        return null;
      }

      const episodicService = getEpisodicMemoryService();
      const ep = await episodicService.createEpisode({
        conversationId,
        clientId,
        turns: turns.map((t) => ({
          id: t.id,
          conversationId: t.conversationId,
          role: t.role,
          content: t.content,
          createdAt: t.createdAt,
        })),
      });

      return {
        id: ep.id,
        topics: ep.topics,
        summary: ep.summary,
      };
    });

    if (!episode) {
      return { status: "skipped", reason: "no turns found" };
    }

    // Step 2: Extract semantic facts from episode summary
    const factCount = await step.run("extract-facts", async () => {
      const { getSemanticMemoryService } = await import("@/lib/memory/semantic");
      const semanticService = getSemanticMemoryService();

      await semanticService.learnFact({
        content: episode.summary,
        category: "insight",
        clientId,
        sourceEpisodeIds: [episode.id],
      });

      return 1;
    });

    // Step 3: Capture journey snapshot
    const snapshotId = await step.run("capture-snapshot", async () => {
      const { getJourneySnapshotService } = await import("@/lib/memory/journey-snapshot");
      const snapshotService = getJourneySnapshotService();

      const snapshot = await snapshotService.captureSnapshot({
        conversationId,
        clientId,
        snapshotType: "auto",
        contextSummary: episode.summary,
      });

      return snapshot.id;
    });

    return {
      status: "completed",
      episodeId: episode.id,
      factsExtracted: factCount,
      snapshotId,
    };
  }
);

// ─── Function 2: Memory Maintenance ──────────────────────────────────────────

/**
 * Scheduled memory maintenance workflow.
 * Step 1: Decay stale semantic facts (confidence erosion)
 * Step 2: Log maintenance results
 *
 * Can be triggered on a cron schedule or manually.
 */
export const runMemoryMaintenance = inngest.createFunction(
  {
    id: "run-memory-maintenance",
    name: "Memory Maintenance",
    retries: 2,
    concurrency: { limit: 1 },
    triggers: [{ event: "olivia/memory.maintenance" }],
  },
  async ({ event, step }) => {
    const { trigger, targetClientId } = event.data;

    // Step 1: Decay stale semantic facts
    const decayedCount = await step.run("decay-stale-facts", async () => {
      const { getSemanticMemoryService } = await import("@/lib/memory/semantic");
      const semanticService = getSemanticMemoryService();

      const count = await semanticService.decayUnreinforcedFacts({
        thresholdDays: 60,
        decayFactor: 0.9,
        minConfidence: 0.1,
      });

      return count;
    });

    // Step 2: Log results
    const summary = await step.run("log-results", async () => {
      const result = {
        trigger,
        targetClientId: targetClientId ?? "all",
        decayedFacts: decayedCount,
        completedAt: new Date().toISOString(),
      };

      console.log("[MemoryMaintenance]", JSON.stringify(result));
      return result;
    });

    return {
      status: "completed",
      ...summary,
    };
  }
);

// ─── Function 3: Handle Procedure Completed ──────────────────────────────────

/**
 * When a procedure finishes (success or failure):
 * Step 1: Record the outcome in procedural memory
 * Step 2: Log event to conversation ledger
 * Step 3: Check procedure health — deactivate if failure rate > 50%
 */
export const handleProcedureCompleted = inngest.createFunction(
  {
    id: "handle-procedure-completed",
    name: "Handle Procedure Completed",
    retries: 3,
    triggers: [{ event: "olivia/procedure.completed" }],
  },
  async ({ event, step }) => {
    const { procedureId, conversationId, clientId, success } = event.data;

    // Step 1: Record outcome
    await step.run("record-outcome", async () => {
      const { getProceduralMemoryService } = await import("@/lib/memory/procedural");
      const proceduralService = getProceduralMemoryService();
      await proceduralService.recordOutcome(procedureId, success);
    });

    // Step 2: Log event to conversation ledger
    await step.run("log-event", async () => {
      const { getConversationLedgerService } = await import("@/lib/memory/conversation-ledger");
      const ledger = getConversationLedgerService();

      await ledger.appendEvent({
        conversationId,
        eventType: success ? "memory_stored" : "error_occurred",
        payload: {
          source: "procedure_completion",
          procedureId,
          success,
        },
        actor: "system",
        clientId,
      });
    });

    // Step 3: Check if procedure has earned high confidence
    const status = await step.run("check-procedure-health", async () => {
      const { getProceduralMemoryService } = await import("@/lib/memory/procedural");
      const proceduralService = getProceduralMemoryService();

      const procedures = await proceduralService.getProceduresByCategory({
        category: "workflow",
        clientId,
        includeInactive: true,
      });

      const procedure = procedures.find((p) => p.id === procedureId);
      if (!procedure) return { action: "not_found" };

      const total = procedure.successCount + procedure.failureCount;
      const failureRate = total > 0 ? procedure.failureCount / total : 0;

      // If failure rate > 50% after 5+ attempts, deactivate
      if (total >= 5 && failureRate > 0.5) {
        await proceduralService.deactivateProcedure(procedureId);
        return { action: "deactivated", reason: "high_failure_rate", failureRate };
      }

      return { action: "healthy", successRate: 1 - failureRate, totalAttempts: total };
    });

    return {
      status: "completed",
      procedureId,
      success,
      procedureHealth: status,
    };
  }
);

// ─── Function 4: Handle Budget Exhausted ─────────────────────────────────────

/**
 * When a budget is exhausted, log the event and optionally notify.
 * Lightweight alerting function.
 */
export const handleBudgetExhausted = inngest.createFunction(
  {
    id: "handle-budget-exhausted",
    name: "Handle Budget Exhausted",
    retries: 1,
    triggers: [{ event: "olivia/budget.exhausted" }],
  },
  async ({ event, step }) => {
    const { conversationId, clientId, budgetType, consumed, maxAllowed } =
      event.data;

    // Step 1: Log to conversation ledger
    await step.run("log-budget-exhaustion", async () => {
      const { getConversationLedgerService } = await import("@/lib/memory/conversation-ledger");
      const ledger = getConversationLedgerService();

      await ledger.appendEvent({
        conversationId,
        eventType: "error_occurred",
        payload: {
          error_type: "budget_exhausted",
          budgetType,
          consumed,
          maxAllowed,
          message: `Action budget "${budgetType}" exhausted: ${consumed}/${maxAllowed}`,
        },
        actor: "system",
        clientId: clientId ?? undefined,
      });
    });

    return {
      status: "logged",
      budgetType,
      consumed,
      maxAllowed,
    };
  }
);

// ─── Export All Functions ─────────────────────────────────────────────────────

/**
 * All Inngest functions to register with the serve handler.
 * Add new functions to this array as they are created.
 */
export const allFunctions = [
  processConversationEnd,
  runMemoryMaintenance,
  handleProcedureCompleted,
  handleBudgetExhausted,
];
