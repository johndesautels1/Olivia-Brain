import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";
import type { ReconciledValuationResult } from "@/lib/valuation/types";

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// POST /api/valuation/compare
// Compare multiple valuation runs (across scenarios or buyer types).
// Accepts a list of run IDs and returns side-by-side comparison data.
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 15,
    windowMs: 60_000,
    prefix: "valuation-compare",
  });
  if (limited) return limited;

  try {
    const { userId } = await getAuthSession();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = { id: userId };

    const body = await request.json();
    const { runIds, valuationSubjectId } = body as {
      runIds?: string[];
      valuationSubjectId?: string;
    };

    // Either provide explicit run IDs or a subject ID to get all runs
    let runs;
    if (runIds && runIds.length > 0) {
      runs = await prisma.valuationRun.findMany({
        where: {
          id: { in: runIds },
          isArchived: false,
        },
        include: {
          valuationSubject: {
            select: {
              id: true,
              companyName: true,
              sector: true,
              stage: true,
              userId: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (valuationSubjectId) {
      runs = await prisma.valuationRun.findMany({
        where: {
          valuationSubjectId,
          isArchived: false,
        },
        include: {
          valuationSubject: {
            select: {
              id: true,
              companyName: true,
              sector: true,
              stage: true,
              userId: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
    } else {
      return NextResponse.json(
        { error: "Provide runIds array or valuationSubjectId" },
        { status: 400 },
      );
    }

    if (runs.length === 0) {
      return NextResponse.json(
        { error: "No valuation runs found" },
        { status: 404 },
      );
    }

    // Verify ownership (all runs must belong to this user)
    for (const run of runs) {
      if (run.valuationSubject.userId !== profile.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    // Build comparison matrix
    const comparisons = runs.map((run) => {
      const result = run.resultJson as unknown as ReconciledValuationResult | null;
      const inputSnapshot = run.inputSnapshotJson as Record<string, unknown> | null;

      return {
        runId: run.id,
        scenarioName: (inputSnapshot?.["scenarioName"] as string) ?? "base",
        buyerType: run.buyerType ?? "vc",
        companyName: run.valuationSubject.companyName,
        sector: run.valuationSubject.sector ?? "Other",
        stage: run.valuationSubject.stage ?? "early_revenue",
        status: run.status,
        confidence: run.confidenceScore !== null && run.confidenceScore !== undefined ? Number(run.confidenceScore) : null,
        enterpriseValue: result?.enterpriseValue ?? { low: 0, base: 0, high: 0 },
        equityValue: result?.equityValue ?? { low: 0, base: 0, high: 0 },
        methodCount: result?.methods?.filter((m) => m.enabled).length ?? 0,
        risks: result?.risks ?? [],
        opportunities: result?.opportunities ?? [],
        createdAt: run.createdAt.toISOString(),
        runDurationMs: run.runDurationMs,
      };
    });

    // Summary statistics
    const evValues = comparisons
      .map((c) => c.enterpriseValue.base)
      .filter((v) => v > 0);
    const summary = {
      totalRuns: comparisons.length,
      minEV: evValues.length > 0 ? Math.min(...evValues) : 0,
      maxEV: evValues.length > 0 ? Math.max(...evValues) : 0,
      averageEV:
        evValues.length > 0
          ? Math.round(evValues.reduce((a, b) => a + b, 0) / evValues.length)
          : 0,
      spread:
        evValues.length > 1
          ? Math.max(...evValues) - Math.min(...evValues)
          : 0,
    };

    return NextResponse.json({
      ok: true,
      comparisons,
      summary,
    });
  } catch (err) {
    console.error("[api/valuation/compare] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
