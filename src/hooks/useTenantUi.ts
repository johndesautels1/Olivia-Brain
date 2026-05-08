"use client";

/**
 * `useTenantUi` — adaptive surface suppression + brand overrides
 * (Track I Session 24).
 *
 * Pulls `/api/home/tenant-ui` on mount. The route resolves the current
 * tenant via `x-tenant-slug` header (set by host apps embedding Olivia)
 * or `?tenant=slug` query param, then reads three `tenant_configs`
 * keys: `ui.suppressedSurfaces`, `ui.brandName`, `ui.accentColor`.
 *
 * Standalone mode (no tenant) returns empty defaults — every surface
 * remains visible. The host can pass `?tenant=clueslondon-prod` (for
 * example) to suppress the Olivia map + calendar surfaces because the
 * host already provides them.
 *
 * Surface keys are matched against route pathnames OR registered
 * surface ids. The contract is a simple string — `/calendar`, `/map`,
 * `voice`, etc.
 */

import { useEffect, useMemo, useState } from "react";

export interface TenantUiSnap {
  suppressedSurfaces: readonly string[];
  brandName: string | null;
  accentColor: string | null;
  tenantSlug: string | null;
  ready: boolean;
}

const EMPTY_READY: TenantUiSnap = {
  suppressedSurfaces: [],
  brandName: null,
  accentColor: null,
  tenantSlug: null,
  ready: true,
};

export function useTenantUi(): TenantUiSnap {
  const [snap, setSnap] = useState<TenantUiSnap>({
    suppressedSurfaces: [],
    brandName: null,
    accentColor: null,
    tenantSlug: null,
    ready: false,
  });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      try {
        const res = await fetch("/api/home/tenant-ui", {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          suppressedSurfaces?: string[];
          brandName?: string | null;
          accentColor?: string | null;
          tenantSlug?: string | null;
        };
        if (cancelled) return;
        setSnap({
          suppressedSurfaces: data.suppressedSurfaces ?? [],
          brandName: data.brandName ?? null,
          accentColor: data.accentColor ?? null,
          tenantSlug: data.tenantSlug ?? null,
          ready: true,
        });
      } catch (err) {
        if (cancelled || (err instanceof Error && err.name === "AbortError")) return;
        /* Treat any failure as standalone — show everything. */
        setSnap(EMPTY_READY);
      }
    }

    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return snap;
}

/**
 * `isSurfaceSuppressed` — small helper for filter callsites.
 *
 * Matches case-insensitively against the `suppressedSurfaces` list.
 * Accepts either a route path (`/calendar`) or a surface id (`calendar`)
 * — both forms work, host apps can use whichever feels natural.
 */
export function isSurfaceSuppressed(
  suppressed: readonly string[],
  surface: string,
): boolean {
  if (suppressed.length === 0) return false;
  const norm = surface.replace(/^\//, "").toLowerCase();
  return suppressed.some((s) => s.replace(/^\//, "").toLowerCase() === norm);
}

/**
 * `useFilteredSurfaces` — convenience for filtering an array of items
 * with a `key`/`href`/`id` field by the suppression list.
 */
export function useFilteredSurfaces<T>(
  items: readonly T[],
  surfaceKey: (item: T) => string,
  suppressed: readonly string[],
): T[] {
  return useMemo(
    () => items.filter((item) => !isSurfaceSuppressed(suppressed, surfaceKey(item))),
    [items, surfaceKey, suppressed],
  );
}
