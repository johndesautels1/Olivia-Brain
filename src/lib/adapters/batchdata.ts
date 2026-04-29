/**
 * BatchData API Adapter
 *
 * BatchData provides property data enrichment: owner info, property
 * details, mortgage records, tax assessments, and skip tracing.
 *
 * Docs: https://developer.batchdata.com/
 * Auth: Bearer token
 * Used for: Property records, owner lookup, mortgage data, tax data
 * Coverage: United States
 */

import { getServerEnv } from "@/lib/config/env";

const DEFAULT_TIMEOUT_MS = 15_000;
const BATCHDATA_API_BASE = "https://api.batchdata.com/api/v1";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BDAddressLookup {
  street: string;
  city: string;
  state: string;
  zip: string;
  unit?: string;
}

export interface BDPropertyRecord {
  id: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    county: string;
    latitude: number;
    longitude: number;
    fips: string;
    apn: string;
  };
  owner: {
    names: string[];
    mailingAddress?: {
      street: string;
      city: string;
      state: string;
      zip: string;
    };
    ownerOccupied: boolean;
    ownershipType: string;
    vestingType?: string;
  };
  property: {
    propertyType: string;
    bedrooms: number;
    bathrooms: number;
    buildingArea: number;
    lotSize: number;
    yearBuilt: number;
    stories: number;
    pool: boolean;
    garage: boolean;
    garageSpaces: number;
    buildingCondition?: string;
    roofType?: string;
    heatingType?: string;
    coolingType?: string;
    constructionType?: string;
  };
  tax: {
    assessedValue: number;
    assessedLandValue: number;
    assessedImprovementValue: number;
    marketValue: number;
    taxAmount: number;
    taxYear: number;
    taxDelinquentYear?: number;
    exemptions?: string[];
  };
  mortgage?: {
    lenderName: string;
    amount: number;
    date: string;
    interestRate?: number;
    term?: number;
    type?: string;
    dueDate?: string;
  };
  lastSale?: {
    date: string;
    price: number;
    buyer: string;
    seller: string;
    documentType: string;
  };
}

export interface BDSkipTraceResult {
  names: string[];
  phones: Array<{
    number: string;
    type: string;
    carrier?: string;
    lineType?: string;
  }>;
  emails: Array<{
    address: string;
    type?: string;
  }>;
  addresses: Array<{
    street: string;
    city: string;
    state: string;
    zip: string;
    type: string;
  }>;
}

export interface BDSearchResult<T> {
  status: string;
  data: T;
  totalRecords: number;
}

// ─── Error ───────────────────────────────────────────────────────────────────

export class BatchDataAdapterError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;

  constructor({
    code,
    message,
    status,
    retryable = false,
  }: {
    code: string;
    message: string;
    status: number;
    retryable?: boolean;
  }) {
    super(message);
    this.name = "BatchDataAdapterError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

// ─── Configuration ──────────────────────────────────────────────────────────

function getBDConfig() {
  const env = getServerEnv();
  return { apiKey: env.BATCHDATA_API_KEY };
}

export function isBatchDataConfigured(): boolean {
  return Boolean(getBDConfig().apiKey);
}

function assertConfigured() {
  const { apiKey } = getBDConfig();
  if (!apiKey) {
    throw new BatchDataAdapterError({
      code: "BATCHDATA_NOT_CONFIGURED",
      message: "BatchData API key must be configured.",
      status: 503,
    });
  }
  return { apiKey };
}

// ─── Core Request Function ──────────────────────────────────────────────────

async function bdRequest<T>(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
  params?: Record<string, string>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const { apiKey } = assertConfigured();

  const url = new URL(`${BATCHDATA_API_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new BatchDataAdapterError({
      code: `BATCHDATA_HTTP_${response.status}`,
      message: `BatchData API failed: HTTP ${response.status} ${response.statusText}`,
      status: response.status,
      retryable: response.status >= 500 || response.status === 429,
    });
  }

  return (await response.json()) as T;
}

// ─── Public API Functions ───────────────────────────────────────────────────

/**
 * Look up a property record by address.
 */
export async function getPropertyByAddress(
  address: BDAddressLookup
): Promise<BDSearchResult<BDPropertyRecord[]>> {
  return bdRequest<BDSearchResult<BDPropertyRecord[]>>(
    "POST",
    "/property/lookup",
    {
      requests: [
        {
          street: address.street,
          city: address.city,
          state: address.state,
          zip: address.zip,
          unit: address.unit,
        },
      ],
    }
  );
}

/**
 * Look up a property record by APN (Assessor Parcel Number).
 */
export async function getPropertyByAPN(
  apn: string,
  fips: string
): Promise<BDSearchResult<BDPropertyRecord[]>> {
  return bdRequest<BDSearchResult<BDPropertyRecord[]>>(
    "POST",
    "/property/lookup",
    {
      requests: [{ apn, fips }],
    }
  );
}

/**
 * Get owner information for a property.
 */
export async function getOwnerInfo(
  address: BDAddressLookup
): Promise<BDPropertyRecord["owner"] | null> {
  const result = await getPropertyByAddress(address);
  if (result.data.length === 0) return null;
  return result.data[0].owner;
}

/**
 * Skip trace an address — find contact info for the owner.
 */
export async function skipTrace(
  address: BDAddressLookup
): Promise<BDSearchResult<BDSkipTraceResult[]>> {
  return bdRequest<BDSearchResult<BDSkipTraceResult[]>>(
    "POST",
    "/property/skip-trace",
    {
      requests: [
        {
          street: address.street,
          city: address.city,
          state: address.state,
          zip: address.zip,
        },
      ],
    }
  );
}

/**
 * Batch lookup multiple properties at once (up to 100 per request).
 */
export async function batchPropertyLookup(
  addresses: BDAddressLookup[]
): Promise<BDSearchResult<BDPropertyRecord[]>> {
  if (addresses.length > 100) {
    throw new BatchDataAdapterError({
      code: "BATCHDATA_LIMIT_EXCEEDED",
      message: "Batch lookup limited to 100 addresses per request.",
      status: 400,
    });
  }

  return bdRequest<BDSearchResult<BDPropertyRecord[]>>(
    "POST",
    "/property/lookup",
    {
      requests: addresses.map((a) => ({
        street: a.street,
        city: a.city,
        state: a.state,
        zip: a.zip,
        unit: a.unit,
      })),
    }
  );
}
