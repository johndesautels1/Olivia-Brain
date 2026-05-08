/**
 * `GET /api/home/tenant-ui` — current tenant's home-page UI overrides
 * (Track I Session 24 — adaptive surface suppression).
 *
 * Returns:
 *   - `suppressedSurfaces` — list of surface keys this tenant doesn't
 *     want surfaced (e.g. when LTM mounts Olivia inside its own map +
 *     calendar, the LTM tenant suppresses Olivia's `/map` + `/calendar`
 *     so the user sees only LTM's chrome).
 *   - `brandName` — optional wordmark override for the header.
 *   - `accentColor` — optional accent color override (LCH string).
 *
 * Source of truth: the per-tenant `tenant_configs` table, key
 * `ui.suppressedSurfaces` (JSON array). `ui.brandName` and
 * `ui.accentColor` are also looked up.
 *
 * Standalone mode (no tenant context, no tenant slug header) returns
 * empty defaults — every surface remains visible.
 *
 * The route is read-only and side-effect-free; safe to poll.
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TenantUiResponse {
  suppressedSurfaces: string[];
  brandName: string | null;
  accentColor: string | null;
  tenantSlug: string | null;
}

const EMPTY: TenantUiResponse = {
  suppressedSurfaces: [],
  brandName: null,
  accentColor: null,
  tenantSlug: null,
};

export async function GET(request: NextRequest) {
  /* Tenant resolution: prefer the `x-tenant-slug` header (set by host
   * apps that embed Olivia), fall back to `?tenant=slug` query param.
   * Both are explicit; we don't sniff from cookies/auth here. */
  const slugFromHeader = request.headers.get("x-tenant-slug");
  const slugFromQuery = request.nextUrl.searchParams.get("tenant");
  const slug = slugFromHeader ?? slugFromQuery;

  if (!slug) {
    return NextResponse.json(EMPTY);
  }

  let prisma: typeof import("@/lib/db/client").default;
  try {
    prisma = (await import("@/lib/db/client")).default;
  } catch {
    return NextResponse.json(EMPTY);
  }

  const tenant = await prisma.tenants
    .findUnique({ where: { slug }, select: { id: true } })
    .catch(() => null);

  if (!tenant) {
    return NextResponse.json(EMPTY);
  }

  /* Pull all three keys in parallel; any missing key just renders the
   * default (no override). */
  const [suppressedRow, brandRow, accentRow] = await Promise.allSettled([
    prisma.tenant_configs.findUnique({
      where: { tenant_id_key: { tenant_id: tenant.id, key: "ui.suppressedSurfaces" } },
    }),
    prisma.tenant_configs.findUnique({
      where: { tenant_id_key: { tenant_id: tenant.id, key: "ui.brandName" } },
    }),
    prisma.tenant_configs.findUnique({
      where: { tenant_id_key: { tenant_id: tenant.id, key: "ui.accentColor" } },
    }),
  ]);

  const suppressedSurfaces = parseSurfacesValue(
    suppressedRow.status === "fulfilled" ? suppressedRow.value?.value : null,
  );
  const brandName =
    brandRow.status === "fulfilled" && brandRow.value?.value
      ? brandRow.value.value
      : null;
  const accentColor =
    accentRow.status === "fulfilled" && accentRow.value?.value
      ? accentRow.value.value
      : null;

  const body: TenantUiResponse = {
    suppressedSurfaces,
    brandName,
    accentColor,
    tenantSlug: slug,
  };
  return NextResponse.json(body);
}

function parseSurfacesValue(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    /* Allow comma-separated as a fallback for hand-edited values. */
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
}
