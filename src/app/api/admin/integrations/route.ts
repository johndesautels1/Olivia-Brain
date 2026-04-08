import { NextResponse } from "next/server";

import { requireAdminAccess } from "@/lib/admin/auth";
import { getAdminIntegrationStatuses } from "@/lib/integrations/admin";

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

  return NextResponse.json({
    mode: access.mode,
    integrations: getAdminIntegrationStatuses(),
  });
}
