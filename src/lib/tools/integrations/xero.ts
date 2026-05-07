/**
 * Xero read-only integration for Q3 auto-fill (UK-first).
 *
 * Reads revenue + expense rollups for the connected Xero tenant. Mock-mode
 * returns a deterministic plausible payload when XERO_API_KEY is absent.
 *
 * Xero uses OAuth 2.0 + a tenant ID. Q3 will gather the tenant ID via the
 * Composio Xero connector; until then this module ships in mock-only mode.
 */

import { getServerEnv } from "@/lib/config/env";
import { type IntegrationResponse, withMockFallback } from "./_types";

export interface XeroRollup {
  tenantId: string;
  /** Trailing-12-months revenue, in pence. */
  revenueTtmPence: number;
  /** Trailing-12-months expenses, in pence. */
  expensesTtmPence: number;
  /** Trailing-12-months net income, in pence. */
  netIncomeTtmPence: number;
  /** Currency reported by Xero (always "GBP" in the mock). */
  currency: string;
}

const MOCK_PAYLOAD: XeroRollup = {
  tenantId: "0",
  revenueTtmPence: 24_500_000,
  expensesTtmPence: 18_900_000,
  netIncomeTtmPence: 5_600_000,
  currency: "GBP",
};

/** Fetch Xero revenue + expense rollups for a tenant. Mock-mode signalled
 *  via `mockMode: true` on the response. */
export async function fetchXeroRollup(
  tenantId: string,
): Promise<IntegrationResponse<XeroRollup>> {
  const { XERO_API_KEY } = getServerEnv();
  if (!XERO_API_KEY) {
    return {
      ok: true,
      data: { ...MOCK_PAYLOAD, tenantId },
      mockMode: true,
      source: { integration: "xero", fetchedAt: new Date().toISOString(), confidence: 0.5 },
    };
  }

  return withMockFallback(
    "xero",
    async (signal) => {
      const res = await fetch(
        "https://api.xero.com/api.xro/2.0/Reports/ProfitAndLoss?periods=12&timeframe=MONTH",
        {
          headers: {
            Authorization: `Bearer ${XERO_API_KEY}`,
            "xero-tenant-id": tenantId,
            Accept: "application/json",
          },
          signal,
        },
      );
      if (!res.ok) throw new Error(`xero_${res.status}`);
      const json = (await res.json()) as {
        Reports?: Array<{ Rows?: Array<{ Title?: string; Cells?: Array<{ Value?: string }> }> }>;
      };

      const rows = json.Reports?.[0]?.Rows ?? [];
      const revenue = sumRow(rows, "Total Income");
      const expenses = sumRow(rows, "Total Expenses");

      return {
        tenantId,
        revenueTtmPence: revenue,
        expensesTtmPence: expenses,
        netIncomeTtmPence: revenue - expenses,
        currency: "GBP",
      };
    },
    { ...MOCK_PAYLOAD, tenantId },
  );
}

function sumRow(
  rows: Array<{ Title?: string; Cells?: Array<{ Value?: string }> }>,
  title: string,
): number {
  const row = rows.find((r) => r.Title === title);
  if (!row?.Cells) return 0;
  const lastCell = row.Cells[row.Cells.length - 1]?.Value ?? "0";
  const num = parseFloat(lastCell.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(num) ? Math.round(num * 100) : 0;
}
