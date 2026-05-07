import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";
import { buildValuationInput } from "@/lib/valuation/bridge";
import { SensitivityAnalyzer } from "@/lib/valuation/sensitivity";
import type { BuyerType, Scenario } from "@/lib/valuation/types";

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GET /api/valuation/sensitivity?runId=xxx
// Returns tornado diagram data and scenario comparisons for an existing
// valuation run. Re-runs SensitivityAnalyzer against the frozen input.
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const DEFAULT_SCENARIO: Scenario = {
  name: "base",
  revenueGrowthShockPct: 0,
  multipleShockPct: 0,
  marginShockPct: 0,
  discountRateShockPct: 0,
  strategicPremiumPct: 0,
  concentrationPenaltyPct: 0,
  synergyPremiumPct: 0,
  controlPremiumPct: 0,
};

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 20,
    windowMs: 60_000,
    prefix: "valuation-sensitivity",
  });
  if (limited) return limited;

  try {
    const { userId } = await getAuthSession();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = { id: userId };

    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId");
    if (!runId) {
      return NextResponse.json(
        { error: "Missing runId query parameter" },
        { status: 400 },
      );
    }

    // Load run with subject
    const run = await prisma.valuationRun.findUnique({
      where: { id: runId },
      include: {
        valuationSubject: {
          select: { id: true, userId: true },
        },
        sensitivities: true,
      },
    });

    if (!run) {
      return NextResponse.json(
        { error: "Valuation run not found" },
        { status: 404 },
      );
    }

    if (run.valuationSubject.userId !== profile.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // If we already have stored sensitivities, return them
    if (run.sensitivities.length > 0) {
      const sensitivities = run.sensitivities.map((s) => ({
        id: s.id,
        variableName: s.variableName,
        baseValue: Number(s.baseValue),
        minValue: Number(s.lowValue),
        maxValue: Number(s.highValue),
        impactLow: Number(s.lowValuation),
        impactHigh: Number(s.highValuation),
      }));

      return NextResponse.json({ ok: true, runId, sensitivities });
    }

    // No stored sensitivities â€” recompute from the frozen input
    const { input } = await buildValuationInput(run.valuationSubject.id);

    const buyerType: BuyerType = (run.buyerType as BuyerType) ?? "vc";
    const inputSnapshot = run.inputSnapshotJson as Record<string, unknown> | null;
    const scenarioName = (inputSnapshot?.["scenarioName"] as string) ?? "base";
    const scenario: Scenario = { ...DEFAULT_SCENARIO, name: scenarioName };

    const analyzer = new SensitivityAnalyzer(input, scenario, buyerType);
    const tornadoBars = analyzer.generateTornadoData();

    // Persist for next time
    if (tornadoBars.length > 0) {
      await prisma.valuationSensitivity.createMany({
        data: tornadoBars.map((bar) => ({
          valuationRunId: run.id,
          variableName: bar.variable,
          baseValue: bar.baseResult,
          lowValue: bar.lowValue,
          highValue: bar.highValue,
          lowValuation: bar.lowResult,
          highValuation: bar.highResult,
        })),
      });
    }

    const sensitivities = tornadoBars.map((bar, i) => ({
      id: `computed-${i}`,
      variableName: bar.variable,
      baseValue: bar.baseResult,
      minValue: bar.lowValue,
      maxValue: bar.highValue,
      impactLow: bar.lowResult,
      impactHigh: bar.highResult,
    }));

    return NextResponse.json({ ok: true, runId, sensitivities });
  } catch (err) {
    console.error("[api/valuation/sensitivity] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
