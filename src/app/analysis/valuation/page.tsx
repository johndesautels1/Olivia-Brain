/**
 * /analysis/valuation — Track V Session V8 destination.
 *
 * Mounts the full `ValuationWorkbench`. The workbench accepts every
 * prop optionally (subjectId, latestRunId, onValuationComplete, userTier)
 * so this default page renders the empty-state shell that consumers wire
 * up to a real subject via query params or future routing in V9.
 *
 * Pre-Clerk: every signed-in caller is treated as `enterprise`-tier so
 * the Deal Room / War Room slots aren't blanked out by the tier gate.
 * Track F Session 18 swaps in the real `getUserTier()` lookup.
 */

import { ValuationWorkbench } from "@/components/valuation/ValuationWorkbench";

export const metadata = {
  title: "Valuation Workbench — Olivia Brain",
};

export default function ValuationAnalysisPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--canvas-base)" }}>
      <ValuationWorkbench userTier="enterprise" />
    </main>
  );
}
