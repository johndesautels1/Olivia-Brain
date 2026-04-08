import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminAccess } from "@/lib/admin/auth";
import { runIntegrationTest } from "@/lib/integrations/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  integrationId: z.string().min(1),
  action: z.enum(["validate-env", "live-check"]),
});

export async function POST(request: Request) {
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
    const payload = requestSchema.parse(await request.json());
    const result = await runIntegrationTest(payload.integrationId, payload.action);

    return NextResponse.json({
      mode: access.mode,
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected integration test error.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 400 },
    );
  }
}
