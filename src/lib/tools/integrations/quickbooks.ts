/**
 * QuickBooks read-only integration for Q3 auto-fill.
 *
 * Reads revenue + expense rollups for the connected QuickBooks Online
 * company. Mock-mode returns a deterministic plausible payload when
 * QUICKBOOKS_API_KEY is absent.
 *
 * QuickBooks Online uses OAuth 2.0 + a realm (company) ID. Q3 will gather
 * the realm ID via the Composio QuickBooks connector once the integration
 * is enabled; until then this module ships in mock-only mode.
 */

import { getServerEnv } from "@/lib/config/env";
import { type IntegrationResponse, withMockFallback } from "./_types";

export interface QuickBooksRollup {
  realmId: string;
  /** Trailing-12-months revenue, in pence. */
  revenueTtmPence: number;
  /** Trailing-12-months expenses, in pence. */
  expensesTtmPence: number;
  /** Trailing-12-months net income, in pence. */
  netIncomeTtmPence: number;
  /** Cash on hand (latest balance sheet), in pence. */
  cashOnHandPence: number;
  /** Currency reported by QBO (always "GBP" in the mock). */
  currency: string;
}

const MOCK_PAYLOAD: QuickBooksRollup = {
  realmId: "0",
  revenueTtmPence: 24_500_000,
  expensesTtmPence: 18_900_000,
  netIncomeTtmPence: 5_600_000,
  cashOnHandPence: 7_200_000,
  currency: "GBP",
};

/** Fetch QuickBooks Online revenue + expense rollups for a realm. Mock-mode
 *  signalled via `mockMode: true` on the response. */
export async function fetchQuickBooksRollup(
  realmId: string,
): Promise<IntegrationResponse<QuickBooksRollup>> {
  const { QUICKBOOKS_API_KEY } = getServerEnv();
  if (!QUICKBOOKS_API_KEY) {
    return {
      ok: true,
      data: { ...MOCK_PAYLOAD, realmId },
      mockMode: true,
      source: { integration: "quickbooks", fetchedAt: new Date().toISOString(), confidence: 0.5 },
    };
  }

  return withMockFallback(
    "quickbooks",
    async (signal) => {
      // QBO Profit & Loss summary endpoint.
      const url =
        `https://quickbooks.api.intuit.com/v3/company/${encodeURIComponent(realmId)}/reports/ProfitAndLoss?accounting_method=Accrual&summarize_column_by=Total`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${QUICKBOOKS_API_KEY}`,
          Accept: "application/json",
        },
        signal,
      });
      if (!res.ok) throw new Error(`qbo_${res.status}`);
      const json = (await res.json()) as {
        Rows?: { Row?: Array<{ Summary?: { ColData?: Array<{ value?: string }> }; group?: string }> };
      };

      // Real parsing is bookkeeping-domain-heavy; for O1 we extract just the
      // headline numbers. Q4 (truth-score-agent integration) will deepen this.
      const revenuePence = parseGbpToPence(
        findRowValue(json.Rows?.Row, "Income"),
      );
      const expensesPence = parseGbpToPence(
        findRowValue(json.Rows?.Row, "Expenses"),
      );

      return {
        realmId,
        revenueTtmPence: revenuePence,
        expensesTtmPence: expensesPence,
        netIncomeTtmPence: revenuePence - expensesPence,
        cashOnHandPence: 0,
        currency: "GBP",
      };
    },
    { ...MOCK_PAYLOAD, realmId },
  );
}

function findRowValue(
  rows: Array<{ Summary?: { ColData?: Array<{ value?: string }> }; group?: string }> | undefined,
  group: string,
): string {
  if (!rows) return "0";
  const row = rows.find((r) => r.group === group);
  return row?.Summary?.ColData?.[1]?.value ?? "0";
}

function parseGbpToPence(value: string): number {
  const num = parseFloat(value.replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}
