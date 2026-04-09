import { NextResponse } from "next/server";

import { requireAdminAccess } from "@/lib/admin/auth";
import { getApprovalGateService } from "@/lib/tools/approval-gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/approvals - List pending approvals
export async function GET(request: Request) {
  const access = requireAdminAccess(request);

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId") ?? undefined;

  try {
    const approvalService = getApprovalGateService();
    const approvals = await approvalService.getPendingApprovals(clientId);

    return NextResponse.json({
      approvals,
      count: approvals.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch approvals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/admin/approvals - Resolve an approval
export async function POST(request: Request) {
  const access = requireAdminAccess(request);

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await request.json();
    const { approvalId, action, note } = body as {
      approvalId: string;
      action: "approve" | "reject";
      note?: string;
    };

    if (!approvalId) {
      return NextResponse.json({ error: "approvalId is required" }, { status: 400 });
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    const approvalService = getApprovalGateService();
    const status = action === "approve" ? "approved" : "rejected";
    const resolved = await approvalService.resolveApproval(
      approvalId,
      status,
      access.actor,
      note
    );

    return NextResponse.json({
      success: true,
      approval: resolved,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to resolve approval";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
