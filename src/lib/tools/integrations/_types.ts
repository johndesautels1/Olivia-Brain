/**
 * Shared types for the Q3 read-only integrations (Track O Session O1).
 *
 * Each integration backs one or more fields in the Quantara 56-field
 * paragraphical intake form (Track Q). When the operator API key is
 * present the integration hits the real API with `AbortSignal.timeout`;
 * when absent it returns a deterministic mock-mode payload with a lower
 * confidence score so the Q3 UI can ship day 1 without gating on
 * operator key provisioning.
 */

/** Fixed mock-mode confidence floor. Real-API responses use 0.90. */
export const MOCK_MODE_CONFIDENCE = 0.5;

/** Fixed real-API confidence ceiling. Per-field confidence may be lower
 *  if the integration knows it's interpolating or reading a stale signal. */
export const REAL_API_CONFIDENCE = 0.9;

/** Default network timeout for every read-only integration call. */
export const INTEGRATION_TIMEOUT_MS = 8_000;

export interface IntegrationSource {
  /** Stable id (e.g. "stripe", "github", "companies_house"). Used by the
   *  Q3 UI to render the source chip and by the audit trace to attribute
   *  the field's provenance. */
  integration: string;
  /** ISO timestamp when the value was fetched. */
  fetchedAt: string;
  /** 0.0–1.0. Mock-mode = MOCK_MODE_CONFIDENCE. Real API = REAL_API_CONFIDENCE
   *  unless the integration flags a per-field downgrade. */
  confidence: number;
}

export interface IntegrationResponse<T> {
  ok: boolean;
  data: T | null;
  mockMode: boolean;
  source: IntegrationSource;
  /** Sanitized error message — no PII per rule #8. */
  error?: string;
}

/** Build the shared `source` block. Pass `mockMode: true` to use the
 *  mock confidence floor. */
export function makeSource(
  integration: string,
  mockMode: boolean,
): IntegrationSource {
  return {
    integration,
    fetchedAt: new Date().toISOString(),
    confidence: mockMode ? MOCK_MODE_CONFIDENCE : REAL_API_CONFIDENCE,
  };
}

/** Wrap a real-API fetch with AbortSignal + sanitized error reporting.
 *  Falls back to the supplied mock payload on any failure (timeout, network,
 *  parse). The mockMode flag on the returned response reflects the actual
 *  path taken. */
export async function withMockFallback<T>(
  integration: string,
  realFetch: (signal: AbortSignal) => Promise<T>,
  mockPayload: T,
): Promise<IntegrationResponse<T>> {
  const controller = AbortSignal.timeout(INTEGRATION_TIMEOUT_MS);
  try {
    const data = await realFetch(controller);
    return {
      ok: true,
      data,
      mockMode: false,
      source: makeSource(integration, false),
    };
  } catch (error) {
    return {
      ok: true,
      data: mockPayload,
      mockMode: true,
      source: makeSource(integration, true),
      error: error instanceof Error ? error.name : "fetch_failed",
    };
  }
}
