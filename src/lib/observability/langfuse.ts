import { getServerEnv } from "@/lib/config/env";
import type { FoundationTrace, ProviderAttempt } from "@/lib/foundation/types";

const LANGFUSE_INGESTION_URL = "/api/public/ingestion";

export interface LangfuseConfig {
  publicKey: string;
  secretKey: string;
  baseUrl: string;
}

export interface LangfuseTrace {
  id: string;
  name: string;
  userId?: string;
  sessionId?: string;
  input?: unknown;
  output?: unknown;
  metadata?: Record<string, unknown>;
  tags?: string[];
  timestamp: string;
}

export interface LangfuseSpan {
  id: string;
  traceId: string;
  name: string;
  startTime: string;
  endTime?: string;
  input?: unknown;
  output?: unknown;
  metadata?: Record<string, unknown>;
  level?: "DEBUG" | "DEFAULT" | "WARNING" | "ERROR";
  statusMessage?: string;
}

export interface LangfuseGeneration {
  id: string;
  traceId: string;
  name: string;
  startTime: string;
  endTime?: string;
  model?: string;
  modelParameters?: Record<string, unknown>;
  input?: unknown;
  output?: unknown;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  metadata?: Record<string, unknown>;
  level?: "DEBUG" | "DEFAULT" | "WARNING" | "ERROR";
  statusMessage?: string;
}

export interface LangfuseService {
  isConfigured(): boolean;
  traceConversation(trace: FoundationTrace): Promise<void>;
  traceGeneration(traceId: string, attempt: ProviderAttempt, input: string, output: string): Promise<void>;
  flush(): Promise<void>;
}

function getLangfuseConfig(): LangfuseConfig | null {
  const env = getServerEnv();

  if (!env.LANGFUSE_PUBLIC_KEY || !env.LANGFUSE_SECRET_KEY) {
    return null;
  }

  return {
    publicKey: env.LANGFUSE_PUBLIC_KEY,
    secretKey: env.LANGFUSE_SECRET_KEY,
    baseUrl: env.LANGFUSE_BASE_URL,
  };
}

function getLangfuseAuthHeader(config: LangfuseConfig): string {
  const credentials = Buffer.from(`${config.publicKey}:${config.secretKey}`).toString("base64");
  return `Basic ${credentials}`;
}

async function sendToLangfuse(
  config: LangfuseConfig,
  batch: { type: string; body: unknown }[]
): Promise<void> {
  const url = new URL(LANGFUSE_INGESTION_URL, config.baseUrl);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: getLangfuseAuthHeader(config),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ batch }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[Langfuse] Ingestion failed: ${response.status} ${text}`);
  }
}

class LangfuseServiceImpl implements LangfuseService {
  private config: LangfuseConfig;
  private pendingBatch: { type: string; body: unknown }[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;

  constructor(config: LangfuseConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return true;
  }

  async traceConversation(trace: FoundationTrace): Promise<void> {
    const traceEvent: LangfuseTrace = {
      id: trace.id,
      name: `olivia-${trace.intent}`,
      sessionId: trace.conversationId,
      input: trace.userMessage,
      output: trace.responsePreview,
      metadata: {
        intent: trace.intent,
        runtimeMode: trace.runtimeMode,
        selectedProvider: trace.selectedProvider,
        selectedModel: trace.selectedModel,
        recalledContextCount: trace.recalledContext.length,
        attemptCount: trace.attempts.length,
      },
      tags: [trace.intent, trace.runtimeMode, trace.selectedProvider],
      timestamp: trace.createdAt,
    };

    this.pendingBatch.push({
      type: "trace-create",
      body: traceEvent,
    });

    // Add generation spans for each model attempt
    for (const attempt of trace.attempts) {
      await this.traceGeneration(
        trace.id,
        attempt,
        trace.userMessage,
        attempt.success ? trace.responsePreview : (attempt.error ?? "Error")
      );
    }

    this.scheduleFlush();
  }

  async traceGeneration(
    traceId: string,
    attempt: ProviderAttempt,
    input: string,
    output: string
  ): Promise<void> {
    const generationId = `${traceId}-${attempt.providerId}-${attempt.modelId}`.replace(/[^a-zA-Z0-9-]/g, "-");
    const startTime = new Date(Date.now() - attempt.durationMs).toISOString();
    const endTime = new Date().toISOString();

    const generation: LangfuseGeneration = {
      id: generationId,
      traceId,
      name: `${attempt.providerId}/${attempt.modelId}`,
      startTime,
      endTime,
      model: attempt.modelId,
      modelParameters: {
        provider: attempt.providerId,
      },
      input: { message: input },
      output: { text: output },
      metadata: {
        success: attempt.success,
        durationMs: attempt.durationMs,
      },
      level: attempt.success ? "DEFAULT" : "ERROR",
      statusMessage: attempt.error,
    };

    this.pendingBatch.push({
      type: "generation-create",
      body: generation,
    });
  }

  async flush(): Promise<void> {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    if (this.pendingBatch.length === 0) {
      return;
    }

    const batch = [...this.pendingBatch];
    this.pendingBatch = [];

    try {
      await sendToLangfuse(this.config, batch);
    } catch (error) {
      console.error("[Langfuse] Failed to flush batch:", error);
      // Re-add to pending batch on failure (with limit)
      if (this.pendingBatch.length + batch.length <= 100) {
        this.pendingBatch.push(...batch);
      }
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimeout) {
      return;
    }

    this.flushTimeout = setTimeout(() => {
      this.flush();
    }, 1000);
  }
}

class NoOpLangfuseService implements LangfuseService {
  isConfigured(): boolean {
    return false;
  }

  async traceConversation(): Promise<void> {
    // No-op
  }

  async traceGeneration(): Promise<void> {
    // No-op
  }

  async flush(): Promise<void> {
    // No-op
  }
}

let langfuseService: LangfuseService | undefined;

export function getLangfuseService(): LangfuseService {
  if (!langfuseService) {
    const config = getLangfuseConfig();

    if (config) {
      langfuseService = new LangfuseServiceImpl(config);
      console.log("[Langfuse] Service initialized");
    } else {
      langfuseService = new NoOpLangfuseService();
    }
  }

  return langfuseService;
}

export function isLangfuseConfigured(): boolean {
  return getLangfuseConfig() !== null;
}
