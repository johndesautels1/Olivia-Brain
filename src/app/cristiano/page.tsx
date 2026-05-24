/**
 * `/cristiano` — standalone Cristiano dashboard route.
 *
 * Mounts `<CristianoDashboard />` in a max-width-7xl page container.
 * Same component is embeddable inside the Ask Olivia dashboard
 * surface when that lands — see `src/components/cristiano/
 * CristianoDashboard.tsx` for the parent component.
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

import { CristianoDashboard } from "@/components/cristiano/CristianoDashboard";

export const metadata: Metadata = {
  title: "Cristiano — The Judge | Olivia Brain",
  description:
    "One-way verdict surface. Submit a structured rubric and watch Cristiano render the decision via the LiveAvatar LITE pipeline.",
};

export default function CristianoPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <CristianoDashboard />
    </main>
  );
}
