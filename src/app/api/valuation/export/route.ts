import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";
import type { ReconciledValuationResult } from "@/lib/valuation/types";

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// POST /api/valuation/export
// Export valuation data in JSON or CSV format.
// Body: { runId: string, format: 'json' | 'csv-methods' | 'csv-sensitivity' | 'csv-scenarios' }
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 10,
    windowMs: 60_000,
    prefix: "valuation-export",
  });
  if (limited) return limited;

  try {
    const { userId } = await getAuthSession();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = { id: userId };

    const body = await request.json();
    const { runId, format } = body as {
      runId?: string;
      format?: string;
    };

    if (!runId) {
      return NextResponse.json({ error: "Missing runId" }, { status: 400 });
    }

    const validFormats = ["json", "csv-methods", "csv-sensitivity", "csv-scenarios"];
    const exportFormat = format && validFormats.includes(format) ? format : "json";

    // Load run with sensitivities
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
          },
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

    const result = run.resultJson as unknown as ReconciledValuationResult | null;
    const inputSnapshot = run.inputSnapshotJson as Record<string, unknown> | null;
    const companyName = run.valuationSubject.companyName;

    // â”€â”€ JSON export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (exportFormat === "json") {
      const exportData = {
        exportedAt: new Date().toISOString(),
        company: {
          name: companyName,
          sector: run.valuationSubject.sector,
          stage: run.valuationSubject.stage,
        },
        run: {
          id: run.id,
          buyerType: run.buyerType,
          status: run.status,
          confidence: run.confidenceScore !== null && run.confidenceScore !== undefined ? Number(run.confidenceScore) : null,
          createdAt: run.createdAt.toISOString(),
          durationMs: run.runDurationMs,
        },
        valuation: {
          enterpriseValue: result?.enterpriseValue ?? null,
          equityValue: result?.equityValue ?? null,
          perShareValue: result?.perShareValue ?? null,
          methods: result?.methods ?? [],
          risks: result?.risks ?? [],
          opportunities: result?.opportunities ?? [],
          narrative: result?.narrative ?? null,
        },
        sensitivities: run.sensitivities.map((s) => ({
          variable: s.variableName,
          baseValue: Number(s.baseValue),
          lowValue: Number(s.lowValue),
          highValue: Number(s.highValue),
          lowValuation: Number(s.lowValuation),
          highValuation: Number(s.highValuation),
        })),
        inputSnapshot,
      };

      return new NextResponse(JSON.stringify(exportData, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${companyName.replace(/[^a-zA-Z0-9]/g, "_")}_valuation_${run.id.slice(0, 8)}.json"`,
        },
      });
    }

    // â”€â”€ CSV: Methods â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (exportFormat === "csv-methods") {
      const methods = result?.methods ?? [];
      const header = "Method,Enabled,Weight,Stage Fit,Data Quality,EV Low,EV Base,EV High,Summary";
      const rows = methods.map((m) =>
        [
          m.method,
          m.enabled,
          m.weight.toFixed(3),
          m.stageFit.toFixed(2),
          m.dataQuality.toFixed(2),
          m.enterpriseValue?.low ?? "",
          m.enterpriseValue?.base ?? "",
          m.enterpriseValue?.high ?? "",
          `"${(m.summary ?? "").replace(/"/g, '""')}"`,
        ].join(","),
      );

      const csv = [header, ...rows].join("\n");
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${companyName.replace(/[^a-zA-Z0-9]/g, "_")}_methods.csv"`,
        },
      });
    }

    // â”€â”€ CSV: Sensitivity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (exportFormat === "csv-sensitivity") {
      const header = "Variable,Base Value,Low Value,High Value,Low Valuation,High Valuation,Impact Range";
      const rows = run.sensitivities.map((s) => {
        const low = Number(s.lowValuation);
        const high = Number(s.highValuation);
        return [
          s.variableName,
          Number(s.baseValue),
          Number(s.lowValue),
          Number(s.highValue),
          low,
          high,
          Math.abs(high - low),
        ].join(",");
      });

      const csv = [header, ...rows].join("\n");
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${companyName.replace(/[^a-zA-Z0-9]/g, "_")}_sensitivity.csv"`,
        },
      });
    }

    // â”€â”€ CSV: Scenarios â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (exportFormat === "csv-scenarios") {
      const storedScenarios = (inputSnapshot?.["scenarios"] as Array<{
        name?: string;
        enterpriseValue?: number;
        probability?: number;
      }>) ?? [];

      const header = "Scenario,Enterprise Value,Probability,Weighted EV";
      const rows = storedScenarios.map((s) => {
        const ev = s.enterpriseValue ?? 0;
        const prob = s.probability ?? 0;
        return [
          s.name ?? "unknown",
          ev,
          prob.toFixed(3),
          Math.round(ev * prob),
        ].join(",");
      });

      const csv = [header, ...rows].join("\n");
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${companyName.replace(/[^a-zA-Z0-9]/g, "_")}_scenarios.csv"`,
        },
      });
    }

    return NextResponse.json({ error: "Unknown format" }, { status: 400 });
  } catch (err) {
    console.error("[api/valuation/export] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
