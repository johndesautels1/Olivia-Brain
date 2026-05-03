import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/client";
import { syncGoogleCalendar } from "@/lib/calendar/google-sync";
import { syncOutlookCalendar } from "@/lib/calendar/outlook-sync";
import { markExpiredWebhooks } from "@/lib/queries/calendar";
import { createSystemAlert } from "@/lib/system-alerts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Max consecutive errors before skipping an account (circuit breaker)
const MAX_CONSECUTIVE_ERRORS = 5;

export async function GET(request: NextRequest) {
  // ── Auth ──
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "CRON_SECRET not configured" },
        { status: 503 }
      );
    }
  }

  const startTime = Date.now();
  const results: {
    accountId: string;
    provider: string;
    email: string | null;
    status: "synced" | "skipped" | "failed";
    created?: number;
    updated?: number;
    deleted?: number;
    conflicts?: number;
    error?: string;
  }[] = [];

  try {
    // ── Mark expired webhooks ──
    const expiredResult = await markExpiredWebhooks();
    const webhooksExpired = expiredResult.count;

    // ── Find all active sync accounts ──
    const accounts = await prisma.calendarSyncAccount.findMany({
      where: {
        isActive: true,
        isArchived: false,
        provider: { in: ["google", "outlook"] },
      },
      select: {
        id: true,
        provider: true,
        providerEmail: true,
        userId: true,
        consecutiveErrors: true,
        lastSyncAt: true,
      },
      orderBy: { lastSyncAt: "asc" }, // sync least-recently-synced first
    });

    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    for (const account of accounts) {
      // Circuit breaker: skip accounts with too many consecutive errors
      if (account.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        results.push({
          accountId: account.id,
          provider: account.provider,
          email: account.providerEmail,
          status: "skipped",
          error: `Skipped: ${account.consecutiveErrors} consecutive errors`,
        });
        skipped++;
        continue;
      }

      try {
        let syncResult;

        if (account.provider === "google") {
          syncResult = await syncGoogleCalendar(
            account.id,
            account.userId
          );
        } else if (account.provider === "outlook") {
          syncResult = await syncOutlookCalendar(
            account.id,
            account.userId
          );
        } else {
          continue;
        }

        results.push({
          accountId: account.id,
          provider: account.provider,
          email: account.providerEmail,
          status: "synced",
          created: syncResult.created,
          updated: syncResult.updated,
          deleted: syncResult.deleted,
          conflicts: syncResult.conflicts,
        });
        succeeded++;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Unknown sync error";

        // Update consecutive error count on the account
        await prisma.calendarSyncAccount.update({
          where: { id: account.id },
          data: {
            consecutiveErrors: { increment: 1 },
            lastSyncError: errorMsg,
          },
        });

        results.push({
          accountId: account.id,
          provider: account.provider,
          email: account.providerEmail,
          status: "failed",
          error: errorMsg,
        });
        failed++;
      }
    }

    // ── Alert on failures ──
    if (failed > 0) {
      await createSystemAlert({
        source: "cron/calendar-sync",
        severity: failed >= accounts.length ? "critical" : "warning",
        title: `Calendar sync: ${failed} of ${accounts.length} accounts failed`,
        message: results
          .filter((r) => r.status === "failed")
          .map((r) => `${r.provider} (${r.email}): ${r.error}`)
          .join("; "),
        metadata: { failed, succeeded, skipped, webhooksExpired },
      });
    }

    const elapsed = Date.now() - startTime;

    return NextResponse.json({
      accounts: accounts.length,
      succeeded,
      failed,
      skipped,
      webhooksExpired,
      results,
      elapsedMs: elapsed,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Calendar sync cron error:", err);

    await createSystemAlert({
      source: "cron/calendar-sync",
      severity: "critical",
      title: "Calendar sync cron failed entirely",
      message: err instanceof Error ? err.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Cron execution failed" },
      { status: 500 }
    );
  }
}
