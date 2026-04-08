import { NextResponse } from "next/server";

import { requireAdminAccess } from "@/lib/admin/auth";
import { getAdminDashboardData } from "@/lib/integrations/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = requireAdminAccess(request);

  if (!access.ok) {
    return NextResponse.json(
      {
        error: access.error,
      },
      { status: access.status },
    );
  }

  try {
    const dashboard = await getAdminDashboardData(access.actor);

    return NextResponse.json({
      mode: access.mode,
      dashboard,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected admin dashboard storage error.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}
