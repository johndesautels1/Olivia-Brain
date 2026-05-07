import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";
import { isUserAdmin } from "@/lib/agents/admin-auth";
import { isTestPersonaCompany } from "@/lib/queries/valuations";
import type { ValuationRunResponse, NegotiationSummary } from "@/lib/valuation/dashboard-types";
import type {
  BuyerType,
  CompanyStage,
  ValuationBand,
  ValuationMethodResult,
  MethodDisagreement,
  ReconciledValuationResult,
  JustificationResult,
  ChallengeResult,
  CounterNarrativeResult,
} from "@/lib/valuation/types";

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GET /api/valuation/[runId]
// Retrieves a completed valuation run with full context:
//   - Company metadata, valuation bands, method results
//   - Sensitivity data, scenarios, evidence chain
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// DELETE /api/valuation/[runId]
// Soft-deletes a valuation run by setting isArchived = true.
// If the parent ValuationSubject has no remaining active runs,
// it is also archived.
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function DELETE(
  request: NextRequest,
  { params }: { params: { runId: string } },
) {
  const limited = rateLimit(request, {
    limit: 10,
    windowMs: 60_000,
    prefix: "valuation-delete",
  });
  if (limited) return limited;

  try {
    const { userId } = await getAuthSession();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = { id: userId };

    const { runId } = params;
    if (!runId) {
      return NextResponse.json(
        { error: "Missing runId parameter" },
        { status: 400 },
      );
    }

    const run = await prisma.valuationRun.findUnique({
      where: { id: runId },
      include: {
        valuationSubject: {
          select: { id: true, userId: true, companyName: true },
        },
      },
    });

    if (!run) {
      return NextResponse.json(
        { error: "Valuation run not found" },
        { status: 404 },
      );
    }

    // Authorisation. Two paths to allow:
    //   1. Owner of the run (the common path).
    //   2. Admin AND the subject is a test-persona company. This is
    //      the carve-out for the project owner to mutate the seeded
    //      test-persona fixtures regardless of which user signed in
    //      to run them. NEVER widen this to "admin can delete any
    //      run" â€” admin must not be able to corrupt real user data.
    const isOwner = run.valuationSubject.userId === profile.id;
    const isAdminTestPersonaOverride =
      !isOwner &&
      isTestPersonaCompany(run.valuationSubject.companyName) &&
      (await isUserAdmin(userId));

    if (!isOwner && !isAdminTestPersonaOverride) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Soft-delete the run
    await prisma.valuationRun.update({
      where: { id: runId },
      data: { isArchived: true },
    });

    // Check if parent subject has any remaining active runs
    const activeRunCount = await prisma.valuationRun.count({
      where: {
        valuationSubjectId: run.valuationSubject.id,
        isArchived: false,
      },
    });

    // If no active runs remain, archive the subject too
    if (activeRunCount === 0) {
      await prisma.valuationSubject.update({
        where: { id: run.valuationSubject.id },
        data: { isArchived: true },
      });
    }

    return NextResponse.json({ ok: true, archived: true });
  } catch (err) {
    console.error("[api/valuation/[runId]] DELETE Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PATCH /api/valuation/[runId]
// Manual save â€” touches updatedAt to confirm persistence, optionally
// updates buyerType. Returns { ok: true, savedAt: ISO string }.
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function PATCH(
  request: NextRequest,
  { params }: { params: { runId: string } },
) {
  const limited = rateLimit(request, {
    limit: 20,
    windowMs: 60_000,
    prefix: "valuation-save",
  });
  if (limited) return limited;

  try {
    const { userId } = await getAuthSession();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = { id: userId };

    const { runId } = params;
    if (!runId) {
      return NextResponse.json(
        { error: "Missing runId parameter" },
        { status: 400 },
      );
    }

    const run = await prisma.valuationRun.findUnique({
      where: { id: runId },
      include: {
        valuationSubject: {
          select: { id: true, userId: true },
        },
      },
    });

    if (!run) {
      return NextResponse.json(
        { error: "Valuation run not found" },
        { status: 404 },
      );
    }

    if (run.valuationSubject.userId !== profile.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 },
      );
    }

    // Parse optional body fields
    let buyerType: string | undefined;
    try {
      const body = await request.json();
      if (body && typeof body.buyerType === "string") {
        buyerType = body.buyerType;
      }
    } catch {
      // No body or invalid JSON â€” that's fine, just touch updatedAt
    }

    const updated = await prisma.valuationRun.update({
      where: { id: runId },
      data: {
        ...(buyerType ? { buyerType } : {}),
      },
      select: { id: true, createdAt: true },
    });

    return NextResponse.json({
      ok: true,
      savedAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("[api/valuation/[runId]] PATCH Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { runId: string } },
) {
  const limited = rateLimit(request, {
    limit: 30,
    windowMs: 60_000,
    prefix: "valuation-get",
  });
  if (limited) return limited;

  try {
    const { userId } = await getAuthSession();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = { id: userId };

    const { runId } = params;
    if (!runId) {
      return NextResponse.json(
        { error: "Missing runId parameter" },
        { status: 400 },
      );
    }

    // Load the run with its subject, sensitivities, and War Room sessions
    const run = await prisma.valuationRun.findUnique({
      where: { id: runId },
      include: {
        valuationSubject: {
          select: {
            id: true,
            companyName: true,
            sector: true,
            stage: true,
            userId: true,
            companiesHouseNumber: true,
            targetRaiseAmount: true,
            targetRoundType: true,
          },
        },
        sensitivities: true,
        dealRoomSessions: {
          where: { isArchived: false },
          orderBy: { createdAt: "desc" },
          take: 5, // Latest sessions â€” most recent first
          select: {
            id: true,
            status: true,
            buyerType: true,
            overallScore: true,
            rubricScoresJson: true,
            durationSeconds: true,
            completedAt: true,
            _count: { select: { messages: true } },
          },
        },
      },
    });

    if (!run) {
      return NextResponse.json(
        { error: "Valuation run not found" },
        { status: 404 },
      );
    }

    // Read access: owner OR admin (read-only). Admin viewing a
    // user-owned report is intentional â€” the /admin/valuations fleet
    // view links here. Mutation endpoints (PATCH, DELETE, deal-room)
    // continue to enforce strict ownership, so admin cannot corrupt
    // user data via the workbench UI even when they can see it.
    if (run.valuationSubject.userId !== profile.id) {
      const isAdmin = await isUserAdmin(userId);
      if (!isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    // Parse stored JSON result
    const resultJson = run.resultJson as Record<string, unknown> | null;
    const inputSnapshot = run.inputSnapshotJson as Record<string, unknown> | null;
    const reconciledResult = resultJson as unknown as ReconciledValuationResult | null;

    const enterpriseValue: ValuationBand = reconciledResult?.enterpriseValue ?? {
      low: 0,
      base: 0,
      high: 0,
    };
    const equityValue: ValuationBand = reconciledResult?.equityValue ?? {
      low: 0,
      base: 0,
      high: 0,
    };

    const methods: ValuationMethodResult[] | null =
      reconciledResult?.methods ?? null;
    const disagreements: MethodDisagreement[] =
      reconciledResult?.methodDisagreements ?? [];

    // Map sensitivity rows to API shape
    const sensitivities = run.sensitivities.map((s) => ({
      id: s.id,
      variableName: s.variableName,
      baseValue: Number(s.baseValue),
      minValue: Number(s.lowValue),
      maxValue: Number(s.highValue),
      impactLow: Number(s.lowValuation),
      impactHigh: Number(s.highValuation),
    }));

    // Build scenarios from inputSnapshot (stored by the run route)
    const storedScenarios = (inputSnapshot?.["scenarios"] as Array<{
      id?: string;
      name?: string;
      assumptions?: Record<string, unknown>;
      enterpriseValue?: number;
      probability?: number;
      keyDrivers?: unknown;
    }>) ?? [];

    const scenarios = storedScenarios.map((s, i) => ({
      id: s.id ?? `scenario-${i}`,
      name: s.name ?? `Scenario ${i + 1}`,
      assumptions: s.assumptions ?? {},
      enterpriseValue: s.enterpriseValue ?? enterpriseValue.base,
      probability: s.probability ?? 1,
      keyDrivers: s.keyDrivers ?? null,
    }));

    // Build evidence chain from inputSnapshot
    const evidenceChain = ((inputSnapshot?.["evidenceChain"] as Array<{
      chunkId?: string;
      documentId?: string;
      documentTitle?: string;
      documentType?: string;
      originalFilename?: string | null;
      pageOrSlide?: number | null;
      chunkIndex?: number;
      contentPreview?: string;
      sourceUrl?: string | null;
    }>) ?? []).map((e, i) => ({
      chunkId: e.chunkId ?? `chunk-${i}`,
      documentId: e.documentId ?? "",
      documentTitle: e.documentTitle ?? "Unknown",
      documentType: e.documentType ?? "other",
      originalFilename: e.originalFilename ?? null,
      pageOrSlide: e.pageOrSlide ?? null,
      chunkIndex: e.chunkIndex ?? i,
      contentPreview: e.contentPreview ?? "",
      sourceUrl: e.sourceUrl ?? null,
    }));

    // Normalize justification: older runs may store the full JustificationResult object
    // instead of just the narrative string. Extract .narrative if it's an object.
    const rawJustification = inputSnapshot?.["justification"];
    let justificationString: string | null = null;
    if (typeof rawJustification === 'string') {
      // Guard: if the string is a stringified JSON object, extract .narrative
      const trimmed = rawJustification.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const obj = JSON.parse(trimmed);
          justificationString = typeof obj.narrative === 'string' ? obj.narrative : rawJustification;
        } catch {
          justificationString = rawJustification;
        }
      } else {
        justificationString = rawJustification;
      }
    } else if (rawJustification && typeof rawJustification === 'object' && 'narrative' in (rawJustification as Record<string, unknown>)) {
      justificationString = (rawJustification as { narrative: string }).narrative;
    } else {
      justificationString = reconciledResult?.narrative ?? null;
    }

    // Extract full JustificationResult (new runs store the whole object; old runs stored just narrative)
    let justificationFull: JustificationResult | null = null;
    if (rawJustification && typeof rawJustification === 'object' && 'narrative' in (rawJustification as Record<string, unknown>)) {
      justificationFull = rawJustification as JustificationResult;
    }

    // Extract ChallengeResult â€” new runs store full object; old runs stored {bearish, neutral, bullish} only
    const rawChallenge = inputSnapshot?.["challenge"] as Record<string, unknown> | null;
    let challengeResult: ChallengeResult | null = null;
    if (rawChallenge) {
      if ('bearishCritique' in rawChallenge) {
        // New format: full ChallengeResult
        challengeResult = rawChallenge as unknown as ChallengeResult;
      } else if ('bearish' in rawChallenge) {
        // Old format: {bearish, neutral, bullish} â€” reconstruct with empty arrays for missing fields
        challengeResult = {
          bearishCritique: (rawChallenge.bearish as string) ?? '',
          neutralCritique: (rawChallenge.neutral as string) ?? '',
          bullishCritique: (rawChallenge.bullish as string) ?? '',
          buyerSpecificChallenges: {},
          vulnerabilities: [],
        };
      }
    }

    // Extract CounterNarrativeResult (stored as full object in both old and new runs)
    const rawCounterNarrative = inputSnapshot?.["counterNarrative"] as Record<string, unknown> | null;
    const counterNarrativeResult: CounterNarrativeResult | null =
      rawCounterNarrative && 'buyerMemo' in rawCounterNarrative
        ? (rawCounterNarrative as unknown as CounterNarrativeResult)
        : null;

    // â”€â”€ Peer cohort: real percentiles from runs in same stage + sector â”€â”€
    const thisSector = run.valuationSubject.sector;
    const thisStage = run.valuationSubject.stage;
    const thisEV = enterpriseValue.base;

    let peerCohort: ValuationRunResponse['peerCohort'] = null;

    if (thisSector && thisStage && thisEV > 0) {
      // Find all completed, non-archived runs in the same stage+sector (excluding this run)
      const peerRuns = await prisma.valuationRun.findMany({
        where: {
          id: { not: run.id },
          isArchived: false,
          status: 'completed',
          valuationSubject: {
            sector: thisSector,
            stage: thisStage,
            isArchived: false,
          },
        },
        select: {
          resultJson: true,
        },
        take: 500,
      });

      // Extract enterprise values from peer runs
      const peerEVs: number[] = [];
      for (const peer of peerRuns) {
        const peerResult = peer.resultJson as Record<string, unknown> | null;
        const peerEVObj = peerResult?.['enterpriseValue'] as { base?: number } | undefined;
        const peerEVBase = peerEVObj?.base ?? 0;
        if (peerEVBase > 0) peerEVs.push(peerEVBase);
      }

      if (peerEVs.length >= 2) {
        // Compute real percentiles from peer EVs
        const sorted = [...peerEVs].sort((a, b) => a - b);
        const p25Idx = Math.floor(sorted.length * 0.25);
        const p50Idx = Math.floor(sorted.length * 0.50);
        const p75Idx = Math.floor(sorted.length * 0.75);

        const cohortP25 = sorted[p25Idx];
        const cohortMedian = sorted[p50Idx];
        const cohortP75 = sorted[Math.min(p75Idx, sorted.length - 1)];

        // Percentile rank: what % of peers does this company's EV exceed?
        const belowCount = sorted.filter(v => v < thisEV).length;
        const percentileRank = Math.round((belowCount / sorted.length) * 100);

        peerCohort = {
          cohortP25,
          cohortMedian,
          cohortP75,
          peerCount: sorted.length,
          cohortLabel: `vs ${thisStage.replace(/_/g, ' ')} ${thisSector} cohort (${sorted.length} peers)`,
        };

        // Store the real percentile in the inputSnapshot so the UI can read it
        if (inputSnapshot) {
          (inputSnapshot as Record<string, unknown>)['cohortP25'] = cohortP25;
          (inputSnapshot as Record<string, unknown>)['cohortMedian'] = cohortMedian;
          (inputSnapshot as Record<string, unknown>)['cohortP75'] = cohortP75;
          (inputSnapshot as Record<string, unknown>)['cohortPercentileRank'] = percentileRank;
          (inputSnapshot as Record<string, unknown>)['cohortPeerCount'] = sorted.length;
        }
      }
    }

    // â”€â”€ Negotiation summary: best completed War Room session for this run â”€â”€
    // Picks the most recent completed session. If none completed, picks the most recent active.
    // This makes War Room data available to every consumer: Opus Judge, Gamma, Dashboard, Olivia.
    let negotiationSummary: NegotiationSummary | null = null;
    if (run.dealRoomSessions.length > 0) {
      const bestSession =
        run.dealRoomSessions.find((s) => s.status === "completed") ??
        run.dealRoomSessions[0]; // Already sorted desc by createdAt

      // OB schema deltas (vs LTM): `rubricScores`/`duration` map to
      // `rubricScoresJson`/`durationSeconds`. `exhibitsTabled` and
      // `negotiationAnchors` are LTM-only columns; OB returns `null` until
      // those columns land in a schema-enrichment session.
      negotiationSummary = {
        sessionId: bestSession.id,
        overallScore: bestSession.overallScore == null
          ? 0
          : Number(bestSession.overallScore),
        rubricScores: (bestSession.rubricScoresJson as Record<string, number>) ?? {},
        status: bestSession.status as "active" | "completed" | "archived",
        buyerType: bestSession.buyerType,
        durationSeconds: bestSession.durationSeconds,
        messageCount: bestSession._count.messages,
        completedAt: bestSession.completedAt?.toISOString() ?? null,
        exhibitsTabled: null,
        negotiationAnchors: null,
      };
    }

    const response: ValuationRunResponse = {
      ok: true,
      valuationRun: {
        id: run.id,
        companyId: run.valuationSubject.id,
        companyName: run.valuationSubject.companyName,
        companySector: run.valuationSubject.sector ?? "Other",
        companyStage: (run.valuationSubject.stage ?? "early_revenue") as CompanyStage,
        scenarioName: (inputSnapshot?.["scenarioName"] as string) ?? "base",
        buyerType: (run.buyerType ?? "vc") as BuyerType,
        status: run.status as "queued" | "processing" | "completed" | "failed",
        confidence: run.confidenceScore !== null && run.confidenceScore !== undefined ? Number(run.confidenceScore) : null,
        enterpriseValue,
        equityValue,
        methodResults: methods,
        reconciledResult: reconciledResult
          ? {
              companyId: run.valuationSubject.id,
              companyName: run.valuationSubject.companyName,
              scenario: (inputSnapshot?.["scenarioName"] as string) ?? "base",
              buyerType: (run.buyerType ?? "vc") as BuyerType,
              confidence: reconciledResult.confidence ?? 0,
              enterpriseValue,
              equityValue,
              dilutedEquityValue: reconciledResult.dilutedEquityValue ?? null,
              optionPoolPct: reconciledResult.optionPoolPct ?? 0,
              perShareValue: reconciledResult.perShareValue ?? null,
              ruleOf40: reconciledResult.ruleOf40 ?? null,
              methods: reconciledResult.methods ?? [],
              risks: reconciledResult.risks ?? [],
              opportunities: reconciledResult.opportunities ?? [],
              narrative: reconciledResult.narrative ?? "",
              methodDisagreements: disagreements,
            }
          : null,
        justification: justificationString,
        justificationFull: justificationFull,
        challenge: challengeResult,
        counterNarrative: counterNarrativeResult,
        risks: reconciledResult?.risks ?? [],
        opportunities: reconciledResult?.opportunities ?? [],
        truthScore: (inputSnapshot?.["truthScore"] as number) ?? null,
        inputSnapshot,
        modelStackVersion:
          (inputSnapshot?.["modelStackVersion"] as string) ?? null,
        createdAt: run.createdAt.toISOString(),
        completedAt: run.createdAt.toISOString(),
        founderMeta: (() => {
          const snap = run.inputSnapshotJson as Record<string, unknown> | null;
          const snapNum = (key: string): number | null => {
            const field = snap?.[key] as { value?: number | null } | number | null | undefined;
            if (field === null || field === undefined) return null;
            if (typeof field === 'number') return field;
            return field.value ?? null;
          };
          return {
            arr: snapNum('arr'),
            runwayMonths: snapNum('runwayMonths'),
            growthYoYPct: snapNum('growthYoYPct'),
            companiesHouseNumber: run.valuationSubject.companiesHouseNumber ?? null,
            targetRaiseAmount: run.valuationSubject.targetRaiseAmount ? Number(run.valuationSubject.targetRaiseAmount) : null,
            targetRoundType: run.valuationSubject.targetRoundType ?? null,
          };
        })(),
      },
      scenarios,
      sensitivities,
      evidenceChain,
      peerCohort,
      negotiationSummary,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[api/valuation/[runId]] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
