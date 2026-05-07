import { END, START, StateGraph, StateSchema } from "@langchain/langgraph";
import { z } from "zod/v4";

import { getFoundationStatus } from "@/lib/foundation/status";
import type {
  FoundationTrace,
  ProviderAttempt,
  StatusLevel,
  ToolCallTrace,
} from "@/lib/foundation/types";
import { getConversationStore } from "@/lib/memory/store";
import { recordTrace } from "@/lib/observability/traces";
import { inferIntent } from "@/lib/orchestration/intent";
import { runModelCascade } from "@/lib/services/model-cascade";
import { buildCascadeTools } from "@/lib/tools/composio";

const AttemptSchema = z.object({
  providerId: z.string(),
  modelId: z.string(),
  success: z.boolean(),
  durationMs: z.number(),
  error: z.string().optional(),
});

const ToolCallSchema = z.object({
  toolName: z.string(),
  actionName: z.string(),
  decision: z.enum([
    "auto_approved",
    "pending_approval",
    "executed",
    "rejected",
    "not_configured",
  ]),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  confidenceScore: z.number(),
  pendingApprovalId: z.string().optional(),
  success: z.boolean().optional(),
  durationMs: z.number(),
  error: z.string().optional(),
});

const Phase1State = new StateSchema({
  conversationId: z.string(),
  userMessage: z.string(),
  userId: z.string().default(""),
  forceMock: z.boolean().default(false),
  intent: z
    .enum(["planning", "research", "operations", "general", "questionnaire", "math", "judge"])
    .default("general"),
  runtimeMode: z.enum(["mock", "live"]).default("mock"),
  recalledContext: z.array(z.string()).default(() => []),
  attempts: z.array(AttemptSchema).default(() => []),
  toolCalls: z.array(ToolCallSchema).default(() => []),
  integrationSnapshot: z
    .record(z.string(), z.enum(["configured", "missing"]))
    .default(() => ({})),
  selectedProvider: z.string().default("mock"),
  selectedModel: z.string().default("phase1-local-fallback"),
  responseText: z.string().default(""),
  traceId: z.string().default(""),
});

type Phase1GraphState = typeof Phase1State.State;

const hydrateRuntime: typeof Phase1State.Node = async (state) => {
  const foundationStatus = getFoundationStatus();

  return {
    runtimeMode: state.forceMock ? "mock" : foundationStatus.runtimeMode,
    integrationSnapshot: Object.fromEntries(
      foundationStatus.integrations.map((integration) => [
        integration.id,
        integration.status,
      ]),
    ) as Record<string, StatusLevel>,
  };
};

const recallContext: typeof Phase1State.Node = async (state) => {
  const store = getConversationStore();
  const recalledContext = await store.recall(state.conversationId, state.userMessage, 4);

  return {
    recalledContext,
  };
};

const chooseIntent: typeof Phase1State.Node = async (state) => {
  return {
    intent: inferIntent(state.userMessage),
  };
};

const generateResponse: typeof Phase1State.Node = async (state) => {
  // Track O Session O1 — build the Composio tool registry when the turn
  // is tool-eligible. The "operations" intent is the natural fit (CRM,
  // email, calendar, lead, pipeline, outreach, inbox keywords). Future
  // sessions can extend the eligibility logic.
  const toolBundle =
    state.intent === "operations" && !state.forceMock
      ? buildCascadeTools({
          userId: state.userId || state.conversationId,
          conversationId: state.conversationId,
        })
      : null;

  const cascadeResult = await runModelCascade({
    conversationId: state.conversationId,
    message: state.userMessage,
    intent: state.intent,
    forceMock: state.forceMock,
    recalledContext: state.recalledContext,
    integrationSnapshot: state.integrationSnapshot,
    tools: toolBundle?.tools,
  });

  return {
    runtimeMode: cascadeResult.runtimeMode,
    attempts: cascadeResult.attempts as ProviderAttempt[],
    selectedProvider: cascadeResult.providerId,
    selectedModel: cascadeResult.modelId,
    responseText: cascadeResult.text,
    toolCalls: toolBundle ? toolBundle.getTraces() : [],
  };
};

const persistTurn: typeof Phase1State.Node = async (state) => {
  const store = getConversationStore();
  const traceId = crypto.randomUUID();

  await store.appendTurn({
    conversationId: state.conversationId,
    role: "user",
    content: state.userMessage,
    metadata: {
      intent: state.intent,
    },
  });

  await store.appendTurn({
    conversationId: state.conversationId,
    role: "assistant",
    content: state.responseText,
    metadata: {
      provider: state.selectedProvider,
      model: state.selectedModel,
      traceId,
    },
  });

  const trace: FoundationTrace = {
    id: traceId,
    createdAt: new Date().toISOString(),
    conversationId: state.conversationId,
    intent: state.intent,
    runtimeMode: state.runtimeMode,
    selectedProvider:
      state.selectedProvider === "mock"
        ? "mock"
        : (state.selectedProvider as FoundationTrace["selectedProvider"]),
    selectedModel: state.selectedModel,
    attempts: state.attempts as ProviderAttempt[],
    recalledContext: state.recalledContext,
    integrationSnapshot: state.integrationSnapshot,
    userMessage: state.userMessage,
    responsePreview: state.responseText.slice(0, 240),
    ...(state.toolCalls.length > 0
      ? { toolCalls: state.toolCalls as ToolCallTrace[] }
      : {}),
  };

  await recordTrace(trace);

  return {
    traceId,
  };
};

const phase1Graph = new StateGraph(Phase1State)
  .addNode("hydrateRuntime", hydrateRuntime)
  .addNode("recallContext", recallContext)
  .addNode("chooseIntent", chooseIntent)
  .addNode("generateResponse", generateResponse)
  .addNode("persistTurn", persistTurn)
  .addEdge(START, "hydrateRuntime")
  .addEdge("hydrateRuntime", "recallContext")
  .addEdge("recallContext", "chooseIntent")
  .addEdge("chooseIntent", "generateResponse")
  .addEdge("generateResponse", "persistTurn")
  .addEdge("persistTurn", END)
  .compile();

export async function invokePhase1Graph(input: {
  conversationId: string;
  userMessage: string;
  forceMock?: boolean;
  /** Composio entity id used by tool dispatch. Defaults to conversationId
   *  when not supplied (Track F Clerk swap will pass the real user id). */
  userId?: string;
}) {
  const result = (await phase1Graph.invoke({
    conversationId: input.conversationId,
    userMessage: input.userMessage,
    forceMock: input.forceMock ?? false,
    userId: input.userId ?? input.conversationId,
  })) as Phase1GraphState;

  return {
    conversationId: result.conversationId,
    response: result.responseText,
    intent: result.intent,
    runtimeMode: result.runtimeMode,
    provider: result.selectedProvider,
    model: result.selectedModel,
    attempts: result.attempts,
    toolCalls: result.toolCalls,
    recalledContext: result.recalledContext,
    traceId: result.traceId,
  };
}
