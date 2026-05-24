/**
 * `/cristiano` — standalone Cristiano dashboard route.
 *
 * Mounts `<CristianoDashboard />` in a max-width-7xl page container.
 * Same component is embeddable inside the Ask Olivia dashboard
 * surface when that lands — see `src/components/cristiano/
 * CristianoDashboard.tsx` for the parent component.
 *
 * Deep-link support: `?tab=ask|library|inbox` selects the initial
 * sub-tab without flicker (server-resolved, passed to client). Useful
 * for gateway-inbox push notifications that link directly to the new
 * verdict (`/cristiano?tab=inbox`) and for LTM/lifescore backports
 * that want to deep-link from their own UI.
 *
 * Auth: this page renders for any session. The downstream API routes
 * (`/api/cristiano/*`) enforce per-user authentication and return 401
 * to unauthenticated callers — the UI surfaces that error inside the
 * sub-tab fetch path.
 *
 * Held to Apple / Microsoft / Google 2026 leading coding practices per
 * `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */

import type { Metadata } from "next";

import {
  CRISTIANO_DASHBOARD_TABS,
  CristianoDashboard,
  type CristianoDashboardTab,
} from "@/components/cristiano/CristianoDashboard";

export const metadata: Metadata = {
  title: "Cristiano — The Judge | Olivia Brain",
  description:
    "One-way verdict surface. Submit a structured rubric and watch Cristiano render the decision via the LiveAvatar LITE pipeline.",
};

/**
 * Server-resolve the `?tab=` query param. Returns the validated sub-tab
 * id (one of CRISTIANO_DASHBOARD_TABS) or undefined when absent /
 * unrecognised. Falling back to undefined lets the dashboard's own
 * sessionStorage-restore logic pick the last-viewed tab — the deep
 * link only OVERRIDES that fallback when the URL explicitly asks.
 */
function resolveTabFromSearchParams(
  raw: string | string[] | undefined,
): CristianoDashboardTab | undefined {
  if (typeof raw !== "string") return undefined;
  if ((CRISTIANO_DASHBOARD_TABS as readonly string[]).includes(raw)) {
    return raw as CristianoDashboardTab;
  }
  return undefined;
}

export default async function CristianoPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const params = await searchParams;
  const initialTab = resolveTabFromSearchParams(params.tab);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <CristianoDashboard initialTab={initialTab} />
    </main>
  );
}
