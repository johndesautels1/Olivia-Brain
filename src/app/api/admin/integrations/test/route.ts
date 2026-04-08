import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminAccess } from "@/lib/admin/auth";
import { runTrackedIntegrationTest } from "@/lib/integrations/admin";

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
    const { result, dashboard } = await runTrackedIntegrationTest(
      payload.integrationId,
      payload.action,
      access.actor,
    );

    return NextResponse.json({
      mode: access.mode,
      result,
      dashboard,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected integration test error.";
    const status =
      error instanceof z.ZodError || message.startsWith("Unknown integration") ? 400 : 500;

    return NextResponse.json(
      {
        error: message,
      },
      { status },
    );
  }
}
