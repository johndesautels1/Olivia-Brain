/* ═══════════════════════════════════════════════════════════════════════════
   Cascade Orchestrator
   Coordinates the multi-phase LLM websearch cascade:
   Phase 1: 6 LLM websearches in parallel
   Phase 2: Tavily gap-fill + Companies House verification
   Phase 3: Opus judge/consensus (batched)
   Phase 4 (DEFERRED in OB): Data injection — LTM-shaped, not ported. See HANDOFF.

   The orchestrator returns ValidatedDataset to the caller. The caller decides
   what to do with the validated data (LangGraph wrap, agent narrative, etc.).
   ═══════════════════════════════════════════════════════════════════════════ */

import type {
  CascadeProgress,
  CascadeResult,
  CascadeStatus,
  CascadeTaskId,
  ConflictResolution,
  ProviderId,
  TaskResultMap,
  ValidatedDataset,
} from "./types";
import {
  createAllProviders,
  getWebSearchProviders,
} from "./providers";
import { getTaskPrompt, getPreMergedData, getJudgePromptForBatch } from "./prompts";
import { recordCascadeEvent } from "./events";

/** Per-provider timeout in ms — 5 min for Vercel Pro */
const PROVIDER_TIMEOUT_MS = 300_000;

export interface CascadeRunResult<K extends CascadeTaskId> {
  status: "complete" | "partial" | "error";
  validated: ValidatedDataset<TaskResultMap[K]> | null;
  providerResults: Map<ProviderId, CascadeResult<TaskResultMap[K]>>;
  progress: CascadeProgress[];
  errors: string[];
}

/** Wraps a promise with a timeout */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)),
      ms,
    );
    promise
      .then((val) => { clearTimeout(timer); resolve(val); })
      .catch((err) => { clearTimeout(timer); reject(err); });
  });
}

/**
 * Run the full cascade for a given task.
 */
export async function runCascade<K extends CascadeTaskId>(
  taskId: K,
  onProgress?: (progress: CascadeProgress) => void,
  onProviderData?: (providerId: ProviderId, data: unknown[]) => void,
  lastCollectionDate?: string,
): Promise<CascadeRunResult<K>> {
  const startTime = Date.now();
  const providers = createAllProviders();
  const progressLog: CascadeProgress[] = [];
  const providerResults = new Map<ProviderId, CascadeResult<TaskResultMap[K]>>();
  const errors: string[] = [];

  function emitProgress(
    status: CascadeStatus,
    phase: 1 | 2 | 3 | 4,
    message: string,
    completedProviders: ProviderId[] = [],
  ) {
    const progress: CascadeProgress = {
      status,
      taskId,
      completedProviders,
      totalProviders: 9,
      currentPhase: phase,
      message,
      timestamp: new Date().toISOString(),
    };
    progressLog.push(progress);
    onProgress?.(progress);
  }

  const prompt = getTaskPrompt(taskId, lastCollectionDate);

  // ── PHASE 1: Parallel LLM websearch ──
  emitProgress("searching", 1, "Starting Phase 1: parallel LLM websearch");

  const webSearchProviders = getWebSearchProviders(providers);

  if (webSearchProviders.length === 0) {
    errors.push("No websearch providers are configured. Set API keys in .env");
    emitProgress("error", 1, "No providers configured");
    const finalResult: CascadeRunResult<K> = {
      status: "error",
      validated: null,
      providerResults,
      progress: progressLog,
      errors,
    };
    await emitBreadcrumb(taskId, finalResult, startTime);
    return finalResult;
  }

  for (const provider of webSearchProviders) {
    emitProgress("searching", 1, `provider_start:${provider.id}`, []);
  }

  emitProgress(
    "searching",
    1,
    `Running ${webSearchProviders.length} websearch providers in parallel: ${webSearchProviders.map((p) => p.id).join(", ")}`,
  );

  const phase1Results = await Promise.allSettled(
    webSearchProviders.map(async (provider) => {
      try {
        const result = await withTimeout(
          provider.execute(taskId, prompt),
          PROVIDER_TIMEOUT_MS,
          provider.id,
        );
        const typedResult = result as CascadeResult<TaskResultMap[K]>;
        providerResults.set(provider.id, typedResult);
        const dataCount = typedResult.data?.length ?? 0;
        emitProgress("searching", 1, `provider_done:${provider.id}:${dataCount}`, [provider.id]);
        onProviderData?.(provider.id, typedResult.data as unknown[]);
        return { id: provider.id, result };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        emitProgress("searching", 1, `provider_error:${provider.id}:${errMsg}`, []);
        throw err;
      }
    }),
  );

  const completedPhase1: ProviderId[] = [];
  for (const settled of phase1Results) {
    if (settled.status === "fulfilled") {
      completedPhase1.push(settled.value.id);
      if (settled.value.result.errors.length > 0) {
        errors.push(
          `${settled.value.id}: ${settled.value.result.errors.join("; ")}`,
        );
      }
    } else {
      errors.push(`Provider failed: ${settled.reason}`);
    }
  }

  emitProgress(
    "searching",
    1,
    `Phase 1 complete: ${completedPhase1.length}/${webSearchProviders.length} providers returned`,
    completedPhase1,
  );

  // ── PHASE 2: Tavily gap-fill + Companies House verification ──
  emitProgress("gap_filling", 2, "Starting Phase 2: Tavily gap-fill + Companies House verification");

  const tavilyProvider = providers.get("tavily");
  const chProvider = providers.get("companies_house");
  const phase2Promises: Promise<void>[] = [];

  if (tavilyProvider?.isConfigured()) {
    emitProgress("gap_filling", 2, "provider_start:tavily", completedPhase1);
    phase2Promises.push(
      (async () => {
        try {
          const tavilyResult = await withTimeout(
            tavilyProvider.execute(taskId, prompt),
            PROVIDER_TIMEOUT_MS,
            "tavily",
          );
          const typedTavily = tavilyResult as CascadeResult<TaskResultMap[K]>;
          providerResults.set("tavily", typedTavily);
          completedPhase1.push("tavily");
          const tavilyCount = typedTavily.data?.length ?? 0;
          emitProgress("gap_filling", 2, `provider_done:tavily:${tavilyCount}`, completedPhase1);
          onProviderData?.("tavily", typedTavily.data as unknown[]);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          errors.push(`Tavily failed: ${errMsg}`);
          emitProgress("gap_filling", 2, `provider_error:tavily:${errMsg}`, completedPhase1);
        }
      })(),
    );
  } else {
    emitProgress("gap_filling", 2, "Tavily not configured — skipping", completedPhase1);
  }

  if (chProvider?.isConfigured()) {
    emitProgress("gap_filling", 2, "provider_start:companies_house", completedPhase1);
    phase2Promises.push(
      (async () => {
        try {
          const chResult = await withTimeout(
            chProvider.execute(taskId, prompt),
            PROVIDER_TIMEOUT_MS,
            "companies_house",
          );
          const typedCH = chResult as CascadeResult<TaskResultMap[K]>;
          providerResults.set("companies_house", typedCH);
          completedPhase1.push("companies_house");
          const chCount = typedCH.data?.length ?? 0;
          emitProgress("gap_filling", 2, `provider_done:companies_house:${chCount}`, completedPhase1);
          onProviderData?.("companies_house", typedCH.data as unknown[]);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          errors.push(`Companies House failed: ${errMsg}`);
          emitProgress("gap_filling", 2, `provider_error:companies_house:${errMsg}`, completedPhase1);
        }
      })(),
    );
  } else {
    emitProgress("gap_filling", 2, "Companies House not configured — skipping", completedPhase1);
  }

  await Promise.allSettled(phase2Promises);

  // ── PHASE 3: Opus judge/consensus (batched) ──
  emitProgress("judging", 3, "Starting Phase 3: Opus judge/consensus");

  const opusProvider = providers.get("opus");
  if (!opusProvider?.isConfigured()) {
    errors.push("Opus not configured — returning unvalidated results");
    emitProgress("complete", 3, "Opus not configured — skipping judge phase", completedPhase1);

    const finalResult: CascadeRunResult<K> = {
      status: "partial",
      validated: buildUnvalidatedDataset(taskId, providerResults),
      providerResults,
      progress: progressLog,
      errors,
    };
    await emitBreadcrumb(taskId, finalResult, startTime);
    return finalResult;
  }

  const allResultsForJudge: Record<string, unknown> = {};
  for (const [id, result] of providerResults) {
    allResultsForJudge[id] = {
      data: result.data,
      errors: result.errors,
      sourcesCited: result.metadata.sourcesCited,
    };
  }

  const totalAttempted = webSearchProviders.length + (tavilyProvider?.isConfigured() ? 1 : 0);
  const successfulProviders = Array.from(providerResults.keys()).filter((id) => id !== "opus");
  const failedProviders = webSearchProviders
    .filter((p) => !providerResults.has(p.id))
    .map((p) => p.id);

  const providerContext = { totalAttempted, successfulProviders, failedProviders };

  const { items: preMergedItems } = getPreMergedData(taskId, allResultsForJudge);
  const BATCH_SIZE = 25;
  const batches: Record<string, unknown>[][] = [];
  for (let i = 0; i < preMergedItems.length; i += BATCH_SIZE) {
    batches.push(preMergedItems.slice(i, i + BATCH_SIZE));
  }
  if (batches.length === 0) batches.push([]);
  const totalBatches = batches.length;

  emitProgress("judging", 3, "provider_start:opus", completedPhase1);
  emitProgress(
    "judging",
    3,
    `Opus judging ${preMergedItems.length} items in ${totalBatches} batch${totalBatches > 1 ? "es" : ""} (max ${BATCH_SIZE}/batch)`,
    completedPhase1,
  );

  const batchTimeoutMs = Math.min(120_000 + (BATCH_SIZE * 2_000), 240_000);

  const batchResults = await Promise.allSettled(
    batches.map(async (batchItems, batchIdx) => {
      const batchPrompt = getJudgePromptForBatch(
        taskId,
        batchItems,
        batchIdx,
        totalBatches,
        providerContext,
      );
      const batchResult = await withTimeout(
        opusProvider.execute(taskId, batchPrompt),
        batchTimeoutMs,
        `opus-batch-${batchIdx + 1}`,
      );
      emitProgress(
        "judging",
        3,
        `Opus batch ${batchIdx + 1}/${totalBatches} complete`,
        completedPhase1,
      );
      return parseJudgeOutput<TaskResultMap[K]>(taskId, batchResult.data);
    }),
  );

  const allValidatedData: TaskResultMap[K][] = [];
  const mergedConfidence = { totalPoints: 0, highConfidence: 0, mediumConfidence: 0, lowConfidence: 0, manualReview: 0 };
  const allConflicts: ConflictResolution[] = [];
  let batchesSucceeded = 0;
  let batchesFailed = 0;

  for (let i = 0; i < batchResults.length; i++) {
    const settled = batchResults[i];
    if (settled.status === "fulfilled") {
      batchesSucceeded++;
      const v = settled.value;
      allValidatedData.push(...v.data);
      mergedConfidence.totalPoints += v.confidenceReport.totalPoints;
      mergedConfidence.highConfidence += v.confidenceReport.highConfidence;
      mergedConfidence.mediumConfidence += v.confidenceReport.mediumConfidence;
      mergedConfidence.lowConfidence += v.confidenceReport.lowConfidence;
      mergedConfidence.manualReview += v.confidenceReport.manualReview;
      allConflicts.push(...v.conflicts);
    } else {
      batchesFailed++;
      const errMsg = settled.reason instanceof Error ? settled.reason.message : String(settled.reason);
      errors.push(`Opus batch ${i + 1} failed: ${errMsg}`);
      allValidatedData.push(...(batches[i] as unknown as TaskResultMap[K][]));
      mergedConfidence.totalPoints += batches[i].length;
      mergedConfidence.lowConfidence += batches[i].length;
    }
  }

  if (batchesSucceeded === 0) {
    errors.push("All Opus judge batches failed — returning unvalidated results");
    emitProgress("judging", 3, "provider_error:opus", completedPhase1);

    const finalResult: CascadeRunResult<K> = {
      status: "partial",
      validated: buildUnvalidatedDataset(taskId, providerResults),
      providerResults,
      progress: progressLog,
      errors,
    };
    await emitBreadcrumb(taskId, finalResult, startTime);
    return finalResult;
  }

  completedPhase1.push("opus");
  const statusMsg = batchesFailed > 0
    ? `Opus judging done — ${batchesSucceeded}/${totalBatches} batches succeeded (${batchesFailed} failed, items included as low-confidence)`
    : `Opus judging complete — ${totalBatches} batch${totalBatches > 1 ? "es" : ""} validated ${allValidatedData.length} items`;
  emitProgress("judging", 3, "provider_done:opus", completedPhase1);
  emitProgress("complete", 3, statusMsg, completedPhase1);

  const mergedValidated: ValidatedDataset<TaskResultMap[K]> = {
    taskId,
    judge: "opus",
    timestamp: new Date().toISOString(),
    data: allValidatedData,
    confidenceReport: mergedConfidence,
    conflicts: allConflicts,
    readyForInjection: mergedConfidence.manualReview === 0,
  };

  const finalResult: CascadeRunResult<K> = {
    status: batchesFailed > 0 ? "partial" : "complete",
    validated: mergedValidated,
    providerResults,
    progress: progressLog,
    errors,
  };
  await emitBreadcrumb(taskId, finalResult, startTime);
  return finalResult;
}

/** Best-effort breadcrumb write — never throws into the orchestrator. */
async function emitBreadcrumb<K extends CascadeTaskId>(
  taskId: K,
  result: CascadeRunResult<K>,
  startTime: number,
): Promise<void> {
  try {
    await recordCascadeEvent({
      taskId,
      status: result.status === "complete" ? "success" : result.status === "partial" ? "partial" : "error",
      itemCount: result.validated?.data.length ?? 0,
      skippedCount: 0,
      durationMs: Date.now() - startTime,
      errorMessage: result.errors.length > 0 ? result.errors.join(" | ").slice(0, 2000) : null,
      metadata: {
        providersAttempted: Array.from(result.providerResults.keys()),
        validatedPoints: result.validated?.confidenceReport.totalPoints ?? 0,
        highConfidence: result.validated?.confidenceReport.highConfidence ?? 0,
        manualReview: result.validated?.confidenceReport.manualReview ?? 0,
      },
    });
  } catch (err) {
    console.warn(`[cascade] breadcrumb write failed (non-fatal): ${err instanceof Error ? err.message : String(err)}`);
  }
}

function buildUnvalidatedDataset<K extends CascadeTaskId>(
  taskId: K,
  providerResults: Map<ProviderId, CascadeResult<TaskResultMap[K]>>,
): ValidatedDataset<TaskResultMap[K]> {
  const allData: TaskResultMap[K][] = [];
  for (const result of providerResults.values()) {
    allData.push(...result.data);
  }

  return {
    taskId,
    judge: "opus",
    timestamp: new Date().toISOString(),
    data: allData,
    confidenceReport: {
      totalPoints: allData.length,
      highConfidence: 0,
      mediumConfidence: 0,
      lowConfidence: allData.length,
      manualReview: 0,
    },
    conflicts: [],
    readyForInjection: false,
  };
}

function parseJudgeOutput<T>(
  taskId: CascadeTaskId,
  opusData: unknown[],
): ValidatedDataset<T> {
  const raw = opusData[0] as Record<string, unknown> | undefined;

  if (raw && "data" in raw && "confidenceReport" in raw) {
    return {
      taskId,
      judge: "opus",
      timestamp: new Date().toISOString(),
      data: (raw.data ?? []) as T[],
      confidenceReport: (raw.confidenceReport ?? {
        totalPoints: 0,
        highConfidence: 0,
        mediumConfidence: 0,
        lowConfidence: 0,
        manualReview: 0,
      }) as ValidatedDataset<T>["confidenceReport"],
      conflicts: (raw.conflicts ?? []) as ValidatedDataset<T>["conflicts"],
      readyForInjection:
        ((raw.confidenceReport as Record<string, number>)?.manualReview ?? 1) === 0,
    };
  }

  return {
    taskId,
    judge: "opus",
    timestamp: new Date().toISOString(),
    data: opusData as T[],
    confidenceReport: {
      totalPoints: opusData.length,
      highConfidence: 0,
      mediumConfidence: opusData.length,
      lowConfidence: 0,
      manualReview: 0,
    },
    conflicts: [],
    readyForInjection: false,
  };
}
