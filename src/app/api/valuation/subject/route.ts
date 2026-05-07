import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// POST /api/valuation/subject
// Creates or returns an existing ValuationSubject from DNA metadata.
// Called when the user navigates to the Valuation tab in the pipeline.
//
// Body: { companyName, sector?, stage?, businessModel?, analysisResultId? }
// Returns: { ok, subjectId, created, latestRunId? }
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 10,
    windowMs: 60_000,
    prefix: "valuation-subject",
  });
  if (limited) return limited;

  try {
    const { userId } = await getAuthSession();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = { id: userId };

    const body = await request.json();
    const { companyName, sector, stage, businessModel, analysisResultId, companiesHouseNumber } =
      body as {
        companyName?: string;
        sector?: string;
        stage?: string;
        businessModel?: string;
        analysisResultId?: string;
        companiesHouseNumber?: string;
      };

    if (!companyName || !companyName.trim()) {
      return NextResponse.json(
        { error: "companyName is required" },
        { status: 400 },
      );
    }

    // Check if user already has a non-archived subject with this company name
    const existing = await prisma.valuationSubject.findFirst({
      where: {
        userId: userId,
        companyName: companyName.trim(),
        isArchived: false,
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        valuationRuns: {
          where: { isArchived: false, status: "completed" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true },
        },
      },
    });

    if (existing) {
      // Update metadata if it changed
      await prisma.valuationSubject.update({
        where: { id: existing.id },
        data: {
          sector: sector || undefined,
          stage: stage || undefined,
          businessModel: businessModel || undefined,
          analysisResultId: analysisResultId || undefined,
          companiesHouseNumber: companiesHouseNumber || undefined,
        },
      });

      return NextResponse.json({
        ok: true,
        subjectId: existing.id,
        created: false,
        latestRunId: existing.valuationRuns[0]?.id ?? null,
      });
    }

    // Create new ValuationSubject
    const subject = await prisma.valuationSubject.create({
      data: {
        userId: userId,
        companyName: companyName.trim(),
        sector: sector || null,
        stage: stage || null,
        businessModel: businessModel || null,
        analysisResultId: analysisResultId || null,
        companiesHouseNumber: companiesHouseNumber || null,
      },
    });

    return NextResponse.json({
      ok: true,
      subjectId: subject.id,
      created: true,
      latestRunId: null,
    });
  } catch (err) {
    console.error("[api/valuation/subject] Error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
