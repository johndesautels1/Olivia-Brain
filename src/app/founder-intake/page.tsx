/**
 * `/founder-intake` — Quantara founder-valuation intake.
 *
 * Track Q Session Q2 destination. Mounts `IntakeForm` inside the
 * canonical `WorkspaceShell` (the form provides its own shell).
 *
 * Q2 ships the non-metamorphic baseline: 56-field render, live
 * data-completeness bar, "Field N/56" header chip, save against
 * `ValuationSubject` via `/api/founder-intake`. Q3 adds Olivia
 * auto-fill via Composio; Q5 adds investor-class metamorphic UI.
 *
 * Resume flow (loading the user's most-recent intake) is intentionally
 * **client-side**: the page itself is a no-auth server component that
 * just mounts the form. The form fetches existing values via
 * `GET /api/founder-intake` if the founder is signed in. Pre-Clerk
 * (Track F Session 18) the route returns 503 without `STUB_USER_ID`,
 * which the form treats as "fresh start" — no error UI is necessary
 * for unauthenticated visitors.
 */
import { IntakeForm } from "@/components/quantara";

export const metadata = {
  title: "Founder Valuation Intake — Olivia Brain",
  description:
    "56 founder-verified metrics that feed Olivia's valuation engine and capital-partner matching.",
};

export default function FounderIntakePage() {
  return <IntakeForm />;
}
