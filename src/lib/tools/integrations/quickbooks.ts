/**
 * QuickBooks read-only integration for Q3 auto-fill.
 *
 * LTM audit (2026-05-07): no LTM client — this is OB-original.
 */

import { getServerEnv } from "@/lib/config/env";
import { type IntegrationResponse, withMockFallback } from "./_types";

export interface QuickBooksRollup {
  realmId: string;
  revenueTtmPence: number;
  expensesTtmPence: number;
  netIncomeTtmPence: number;
  cashOnHandPence: number;
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

/** Fetch QuickBooks Online revenue + expense rollups for a realm. */
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
