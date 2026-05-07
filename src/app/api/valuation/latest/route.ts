import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GET /api/valuation/latest?subjectId=xxx (optional)
// Returns the authenticated user's most recent completed ValuationRun ID
// and ValuationSubject ID. The workbench uses this to auto-load data
// when no URL params are provided.
// If ?subjectId= is provided, scopes the query to that specific subject.
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 30,
    windowMs: 60_000,
    prefix: "valuation-latest",
  });
  if (limited) return limited;

  try {
    const { userId } = await getAuthSession();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = { id: userId };

    // Optional: scope to a specific subject
    const subjectId = request.nextUrl.searchParams.get("subjectId");

    // Find the user's most recent COMPLETED valuation run, then get its subject
    const latestRun = await prisma.valuationRun.findFirst({
      where: {
        isArchived: false,
        status: "completed",
        valuationSubject: {
          userId: userId,
          isArchived: false,
          ...(subjectId ? { id: subjectId } : {}),
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        valuationSubject: {
          select: { id: true, companyName: true },
        },
      },
    });

    const subject = latestRun
      ? { id: latestRun.valuationSubject.id, companyName: latestRun.valuationSubject.companyName, valuationRuns: [{ id: latestRun.id }] }
      : null;

    if (!subject) {
      return NextResponse.json({
        ok: true,
        hasData: false,
        subjectId: null,
        runId: null,
        companyName: null,
      });
    }

    const latestRunId = subject.valuationRuns[0]?.id ?? null;

    return NextResponse.json({
      ok: true,
      hasData: latestRunId !== null,
      subjectId: subject.id,
      runId: latestRunId,
      companyName: subject.companyName,
    });
  } catch (err) {
    console.error("[api/valuation/latest] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
