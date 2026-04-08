import { NextResponse } from "next/server";

import { requireAdminAccess } from "@/lib/admin/auth";
import { getTTLService } from "@/lib/memory/ttl";
import { getSemanticSearchService } from "@/lib/memory/semantic-search";
import { getMem0Service } from "@/lib/memory/mem0";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = requireAdminAccess(request);

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  return NextResponse.json({
    endpoints: {
      "POST /api/admin/memory": "Run memory maintenance cycle",
      "POST /api/admin/memory?action=cleanup": "Clean up expired memories",
      "POST /api/admin/memory?action=decay": "Decay importance scores",
      "POST /api/admin/memory?action=embed": "Embed unembedded conversation turns",
      "POST /api/admin/memory?action=sync&clientId=xxx": "Sync Mem0 to Supabase for a client",
    },
    note: "Include x-admin-key header for authentication",
  });
}

export async function POST(request: Request) {
  const access = requireAdminAccess(request);

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action") ?? "maintenance";

  try {
    switch (action) {
      case "cleanup": {
        const ttlService = getTTLService();
        const deletedCount = await ttlService.cleanupExpired();
        return NextResponse.json({
          success: true,
          action: "cleanup",
          deletedCount,
        });
      }

      case "decay": {
        const body = await request.json().catch(() => ({}));
        const decayFactor = body.decayFactor ?? 0.95;
        const accessThresholdDays = body.accessThresholdDays ?? 30;

        const ttlService = getTTLService();
        const decayedCount = await ttlService.decayImportance({
          decayFactor,
          accessThresholdDays,
        });

        return NextResponse.json({
          success: true,
          action: "decay",
          decayedCount,
          config: { decayFactor, accessThresholdDays },
        });
      }

      case "embed": {
        const body = await request.json().catch(() => ({}));
        const limit = body.limit ?? 100;

        const searchService = getSemanticSearchService();
        const embeddedCount = await searchService.embedUnembeddedTurns(limit);

        return NextResponse.json({
          success: true,
          action: "embed",
          embeddedCount,
        });
      }

      case "sync": {
        const clientId = url.searchParams.get("clientId");
        if (!clientId) {
          return NextResponse.json(
            { error: "clientId query parameter required for sync action" },
            { status: 400 }
          );
        }

        const mem0Service = getMem0Service();
        const syncedCount = await mem0Service.syncToSupabase(clientId);

        return NextResponse.json({
          success: true,
          action: "sync",
          clientId,
          syncedCount,
        });
      }

      case "maintenance":
      default: {
        const body = await request.json().catch(() => ({}));
        const decayFactor = body.decayFactor ?? 0.95;
        const accessThresholdDays = body.accessThresholdDays ?? 30;

        const ttlService = getTTLService();
        const result = await ttlService.runMaintenanceCycle({
          decayFactor,
          accessThresholdDays,
        });

        // Also embed unembedded turns
        const searchService = getSemanticSearchService();
        const embeddedCount = await searchService.embedUnembeddedTurns(100);

        return NextResponse.json({
          success: true,
          action: "maintenance",
          ...result,
          embeddedCount,
        });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Memory operation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
