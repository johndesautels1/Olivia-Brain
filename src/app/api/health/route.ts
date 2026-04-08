import { NextResponse } from "next/server";

import { getFoundationStatus } from "@/lib/foundation/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getFoundationStatus());
}
