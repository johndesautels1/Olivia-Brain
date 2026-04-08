import { NextResponse } from "next/server";

import { listRecentTraces } from "@/lib/observability/traces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    traces: listRecentTraces(),
  });
}
