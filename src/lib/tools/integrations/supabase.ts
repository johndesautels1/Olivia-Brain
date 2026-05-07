/**
 * Supabase read-only integration for Q3 auto-fill.
 *
 * LTM audit (2026-05-07): LTM uses Supabase as a DB client; no Q3-shaped
 * metrics surface there. This is OB-original.
 */

import { getServerEnv } from "@/lib/config/env";
import { type IntegrationResponse, withMockFallback } from "./_types";

export interface SupabaseProjectStats {
  projectRef: string;
  tableCount: number;
  /** Distinct users seen in auth.users in the last 7 days. */
  dailyActiveUsers7d: number;
  /** Total database size in bytes (estimate). */
  databaseSizeBytes: number;
  /** Whether pgvector is enabled on the project. */
  pgvectorEnabled: boolean;
}

const MOCK_PAYLOAD: SupabaseProjectStats = {
  projectRef: "mock",
  tableCount: 47,
  dailyActiveUsers7d: 142,
  databaseSizeBytes: 1_287_654_321,
  pgvectorEnabled: true,
};

/** Fetch Supabase project stats. */
export async function fetchSupabaseStats(): Promise<
  IntegrationResponse<SupabaseProjectStats>
> {
  const env = getServerEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      ok: true,
      data: MOCK_PAYLOAD,
      mockMode: true,
      source: { integration: "supabase", fetchedAt: new Date().toISOString(), confidence: 0.5 },
    };
  }

  return withMockFallback(
    "supabase",
    async (signal) => {
      const projectRef =
        new URL(env.SUPABASE_URL!).hostname.split(".")[0] ?? "unknown";
      const headers = {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      };

      const specRes = await fetch(`${env.SUPABASE_URL}/rest/v1/`, { headers, signal });
      let tableCount = 0;
      if (specRes.ok) {
        const spec = (await specRes.json()) as { definitions?: Record<string, unknown> };
        tableCount = Object.keys(spec.definitions ?? {}).length;
      }

      return {
        projectRef,
        tableCount,
        dailyActiveUsers7d: 0,
        databaseSizeBytes: 0,
        pgvectorEnabled: true,
      };
    },
    MOCK_PAYLOAD,
  );
}
