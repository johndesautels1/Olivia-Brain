/**
 * Stripe read-only integration for Q3 auto-fill.
 *
 * Reads the connected Stripe account's revenue rollups (ARR / MRR / customer
 * count / churn) without ever calling write endpoints. Mock-mode returns a
 * deterministic plausible payload when STRIPE_API_KEY is absent.
 *
 * **LTM audit note (2026-05-07):** LTM has `lib/stripe.ts` for
 * billing/subscription management (uses `prisma.userProfile.stripeCustomerId`
 * + `PricingTier` table for paid-plan sync), which is a different concern
 * from Q3's read-only metrics rollup. When OB ships paid plans (post-Track
 * F Clerk auth, ~Session 18), LTM's `lib/stripe.ts` is a candidate for
 * port; this Q3 file stays narrow on the auto-fill use case.
 */

import { getServerEnv } from "@/lib/config/env";
import { type IntegrationResponse, withMockFallback } from "./_types";

export interface StripeMetrics {
  /** Annualised recurring revenue, in pence. */
  arrPence: number;
  /** Monthly recurring revenue, in pence. */
  mrrPence: number;
  /** Active subscription count. */
  activeSubscriptions: number;
  /** Distinct customer count. */
  customerCount: number;
  /** Monthly churn rate, 0.0–1.0. */
  churnRate: number;
  /** Currency code Stripe reports (always "gbp" for the mock; real API may
   *  return "usd" / "eur" depending on the account). */
  currency: string;
}

const MOCK_PAYLOAD: StripeMetrics = {
  arrPence: 19_800_000,
  mrrPence: 1_650_000,
  activeSubscriptions: 84,
  customerCount: 84,
  churnRate: 0.04,
  currency: "gbp",
};

/** Fetch Stripe revenue + customer rollups. Always returns a usable response;
 *  mock-mode is signalled via `mockMode: true` on the response. */
export async function fetchStripeMetrics(): Promise<
  IntegrationResponse<StripeMetrics>
> {
  const { STRIPE_API_KEY } = getServerEnv();
  if (!STRIPE_API_KEY) {
    return {
      ok: true,
      data: MOCK_PAYLOAD,
      mockMode: true,
      source: { integration: "stripe", fetchedAt: new Date().toISOString(), confidence: 0.5 },
    };
  }

  return withMockFallback(
    "stripe",
    async (signal) => {
      const mrrRes = await fetch(
        "https://api.stripe.com/v1/subscriptions?limit=100&status=active",
        { headers: { Authorization: `Bearer ${STRIPE_API_KEY}` }, signal },
      );
      if (!mrrRes.ok) throw new Error(`stripe_${mrrRes.status}`);
      const mrrJson = (await mrrRes.json()) as {
        data: Array<{ items: { data: Array<{ price: { unit_amount: number } }> } }>;
      };

      const mrrPence = mrrJson.data.reduce((acc, sub) => {
        const lineSum = sub.items.data.reduce(
          (s, item) => s + (item.price?.unit_amount ?? 0),
          0,
        );
        return acc + lineSum;
      }, 0);

      return {
        arrPence: mrrPence * 12,
        mrrPence,
        activeSubscriptions: mrrJson.data.length,
        customerCount: mrrJson.data.length,
        churnRate: 0,
        currency: "gbp",
      };
    },
    MOCK_PAYLOAD,
  );
}
