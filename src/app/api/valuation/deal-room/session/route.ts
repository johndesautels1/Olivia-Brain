import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";
import { requireTier } from "@/lib/require-tier";
import {
  createWarRoomCalendarEntry,
  notifyWarRoomStarted,
} from "@/lib/valuation/war-room-calendar";

// ─── GET — list sessions or fetch single session with messages ────────────
//
// Schema deltas vs. LTM (preserved deliberately so the bicycle-wheel
// boundary stays clean):
//   - LTM `DealRoomSession.companyName / calendarEntryId / duration /
//     rubricScores / negotiationAnchors / exhibitsTabled` are LTM-domain
//     extras; OB persists `rubricScoresJson` + `durationSeconds` only.
//     Company name reaches Olivia Brain via the
//     `valuationRun → valuationSubject` relation chain.
//   - LTM `DealRoomMessage.sessionId` → OB `dealRoomSessionId`. LTM
//     `exhibitRef` (single Int) → OB `exhibitsJson` (Json[]). The route
//     accepts both shapes from the body and writes to OB's columns.
//   - LTM `UserProfile.phone` lookup is dropped — OB has no UserProfile
//     model. SMS notifications fall back to a no-op until Track F (Clerk)
//     wires phone numbers via the user identity provider.
//
// Tier gate: Enterprise (matches LTM). Pre-Clerk this is a stub that
// passes any authenticated caller through (`@/lib/require-tier`).

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, {
    limit: 30,
    windowMs: 60_000,
    prefix: "deal-room",
  });
  if (limited) return limited;

  const tierCheck = await requireTier("enterprise", "Deal Room");
  if (!tierCheck.authorized) return tierCheck.response;
  const { profileId: userId } = tierCheck;

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("id");

  if (sessionId) {
    const session = await prisma.dealRoomSession.findFirst({
      where: { id: sessionId, userId, isArchived: false },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, session });
  }

  const sessions = await prisma.dealRoomSession.findMany({
    where: { userId, isArchived: false },
    orderBy: { startedAt: "desc" },
    take: 50,
    select: {
      id: true,
      valuationRunId: true,
      buyerType: true,
      status: true,
      overallScore: true,
      rubricScoresJson: true,
      durationSeconds: true,
      startedAt: true,
      completedAt: true,
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json({ ok: true, sessions });
}

// ─── POST — create session or add message(s) ──────────────────────────────

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, {
    limit: 20,
    windowMs: 60_000,
    prefix: "deal-room-write",
  });
  if (limited) return limited;

  const tierCheck = await requireTier("enterprise", "Deal Room");
  if (!tierCheck.authorized) return tierCheck.response;
  const { profileId: userId } = tierCheck;

  const body = (await req.json()) as Record<string, unknown>;
  const action = body.action as string;

  if (action === "create") {
    const buyerType = (body.buyerType as string) || "vc";
    const valuationRunId = body.valuationRunId as string | undefined;

    if (!valuationRunId) {
      return NextResponse.json(
        { error: "valuationRunId required" },
        { status: 400 },
      );
    }

    // Look up the valuation run to source the company name for downstream
    // notifications (calendar entry title, SMS body). The OB schema does not
    // persist company name on DealRoomSession itself.
    const run = await prisma.valuationRun.findFirst({
      where: { id: valuationRunId },
      select: { valuationSubject: { select: { companyName: true } } },
    });
    const companyName = run?.valuationSubject.companyName ?? "Unknown";

    const session = await prisma.dealRoomSession.create({
      data: {
        userId,
        valuationRunId,
        buyerType,
        status: "active",
      },
    });

    // Spawn calendar entry + Olivia notification (best-effort, non-blocking).
    void (async () => {
      await createWarRoomCalendarEntry({
        userId,
        companyName,
        buyerType,
        sessionId: session.id,
        valuationRunId,
      });
      // Phone-based SMS is wired post-Clerk (Track F). For now the helper
      // no-ops when phoneNumber is null.
      await notifyWarRoomStarted(companyName, buyerType, null);
    })();

    return NextResponse.json(
      { ok: true, sessionId: session.id },
      { status: 201 },
    );
  }

  if (action === "add_message") {
    const sessionId = body.sessionId as string;
    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId required" },
        { status: 400 },
      );
    }

    const session = await prisma.dealRoomSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    });
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 },
      );
    }

    const message = await prisma.dealRoomMessage.create({
      data: {
        dealRoomSessionId: sessionId,
        role: (body.role as string) || "user",
        content: (body.content as string) || "",
      },
    });

    await prisma.dealRoomSession
      .update({ where: { id: sessionId }, data: { updatedAt: new Date() } })
      .catch(() => {
        /* best-effort */
      });

    return NextResponse.json(
      { ok: true, messageId: message.id },
      { status: 201 },
    );
  }

  if (action === "add_messages") {
    const sessionId = body.sessionId as string;
    const messages = body.messages as { role: string; content: string }[];
    if (!sessionId || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "sessionId and messages[] required" },
        { status: 400 },
      );
    }

    const session = await prisma.dealRoomSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    });
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 },
      );
    }

    const created = await prisma.dealRoomMessage.createMany({
      data: messages.map((m) => ({
        dealRoomSessionId: sessionId,
        role: m.role || "user",
        content: (m.content || "").trim(),
      })),
    });

    await prisma.dealRoomSession
      .update({ where: { id: sessionId }, data: { updatedAt: new Date() } })
      .catch(() => {
        /* best-effort */
      });

    return NextResponse.json(
      { ok: true, count: created.count },
      { status: 201 },
    );
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// ─── DELETE — soft-archive a session ──────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const limited = rateLimit(req, {
    limit: 10,
    windowMs: 60_000,
    prefix: "deal-room-delete",
  });
  if (limited) return limited;

  const tierCheck = await requireTier("enterprise", "Deal Room");
  if (!tierCheck.authorized) return tierCheck.response;
  const { profileId: userId } = tierCheck;

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("id");
  if (!sessionId) {
    return NextResponse.json(
      { error: "id query param required" },
      { status: 400 },
    );
  }

  const session = await prisma.dealRoomSession.findFirst({
    where: { id: sessionId, userId, isArchived: false },
    select: { id: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  await prisma.dealRoomSession.update({
    where: { id: sessionId },
    data: { isArchived: true },
  });

  return NextResponse.json({ ok: true, archived: true });
}

// ─── PUT — update session (scores, status, completion) ────────────────────

export async function PUT(req: NextRequest) {
  const limited = rateLimit(req, {
    limit: 20,
    windowMs: 60_000,
    prefix: "deal-room-update",
  });
  if (limited) return limited;

  const tierCheck = await requireTier("enterprise", "Deal Room");
  if (!tierCheck.authorized) return tierCheck.response;
  const { profileId: userId } = tierCheck;

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("id");
  if (!sessionId) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const existing = await prisma.dealRoomSession.findFirst({
    where: { id: sessionId, userId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const data: Prisma.DealRoomSessionUpdateInput = {};

  if (typeof body.status === "string") data.status = body.status;
  if (body.rubricScoresJson !== undefined) {
    data.rubricScoresJson = body.rubricScoresJson as Prisma.InputJsonValue;
  } else if (body.rubricScores !== undefined) {
    // Accept the LTM-shaped `rubricScores` field too — pass-through to JSON.
    data.rubricScoresJson = body.rubricScores as Prisma.InputJsonValue;
  }
  if (typeof body.overallScore === "number") data.overallScore = body.overallScore;
  if (typeof body.durationSeconds === "number") {
    data.durationSeconds = body.durationSeconds;
  } else if (typeof body.duration === "number") {
    data.durationSeconds = body.duration;
  }
  if (typeof body.completedAt === "string") {
    data.completedAt = new Date(body.completedAt);
  }

  const updated = await prisma.dealRoomSession.update({
    where: { id: sessionId },
    data,
  });

  return NextResponse.json({ ok: true, session: updated });
}
