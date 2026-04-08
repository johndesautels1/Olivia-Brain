import { randomUUID } from "crypto";

import { getServerEnv } from "@/lib/config/env";
import {
  getLondonCalendarAttendeesEndpoint,
  getLondonCalendarEntryEndpoint,
  getLondonCalendarPrepTasksEndpoint,
  LONDON_CALENDAR_INTERNAL_ENDPOINTS,
  type LondonCalendarAdapterErrorPayload,
  type LondonCalendarArchiveEntryRequest,
  type LondonCalendarArchiveResponse,
  type LondonCalendarAttendeesResponse,
  type LondonCalendarCreateEntryWithAttendeesRequest,
  type LondonCalendarEntriesRangeQuery,
  type LondonCalendarEntriesResponse,
  type LondonCalendarEntryResponse,
  type LondonCalendarHealthSnapshot,
  type LondonCalendarParseRequest,
  type LondonCalendarParseResponse,
  type LondonCalendarPrepTaskInput,
  type LondonCalendarPrepTaskResponse,
  type LondonCalendarPrepTasksQuery,
  type LondonCalendarPrepTasksResponse,
  type LondonCalendarRecommendationsResponse,
  type LondonCalendarUpdateEntryRequest,
  type LondonCalendarEntryUpdateInput,
  type LondonCalendarAttendeeInput,
} from "@/lib/adapters/london-calendar-contract";

const DEFAULT_TIMEOUT_MS = 15_000;
const OLIVIA_APP_ID = "olivia-brain";

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: QueryParams;
  idempotencyKey?: string;
  traceId?: string;
  timeoutMs?: number;
};

export class LondonCalendarAdapterError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;
  readonly details: string[];

  constructor({
    code,
    message,
    status,
    retryable = false,
    details = [],
  }: {
    code: string;
    message: string;
    status: number;
    retryable?: boolean;
    details?: string[];
  }) {
    super(message);
    this.name = "LondonCalendarAdapterError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.details = details;
  }
}

function getLondonCalendarAdapterConfig() {
  const env = getServerEnv();

  return {
    baseUrl: env.CLUES_LONDON_BASE_URL,
    apiKey: env.CLUES_LONDON_INTERNAL_API_KEY,
  };
}

export function isLondonCalendarAdapterConfigured() {
  const { baseUrl, apiKey } = getLondonCalendarAdapterConfig();
  return Boolean(baseUrl && apiKey);
}

function assertLondonCalendarAdapterConfigured() {
  const { baseUrl, apiKey } = getLondonCalendarAdapterConfig();

  if (!baseUrl || !apiKey) {
    throw new LondonCalendarAdapterError({
      code: "LONDON_CALENDAR_NOT_CONFIGURED",
      message:
        "CLUES London base URL and internal API key must both be configured before the adapter can be used.",
      status: 503,
    });
  }

  return { baseUrl, apiKey };
}

function buildLondonCalendarUrl(pathname: string, query?: QueryParams) {
  const { baseUrl } = assertLondonCalendarAdapterConfigured();
  const url = new URL(pathname, baseUrl);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

function buildLondonCalendarHeaders(options: RequestOptions = {}) {
  const { apiKey } = assertLondonCalendarAdapterConfigured();
  const headers = new Headers({
    Accept: "application/json",
    "x-olivia-app-id": OLIVIA_APP_ID,
    "x-olivia-signature": apiKey,
    "x-olivia-trace-id": options.traceId ?? randomUUID(),
  });

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.idempotencyKey) {
    headers.set("x-olivia-idempotency-key", options.idempotencyKey);
  }

  return headers;
}

function buildAdapterError(
  status: number,
  payload: unknown,
  fallbackMessage: string,
) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object"
  ) {
    const errorPayload = payload as LondonCalendarAdapterErrorPayload;

    return new LondonCalendarAdapterError({
      code: errorPayload.error.code || "LONDON_CALENDAR_REQUEST_FAILED",
      message: errorPayload.error.message || fallbackMessage,
      status,
      retryable: Boolean(errorPayload.error.retryable),
      details: errorPayload.error.details ?? [],
    });
  }

  return new LondonCalendarAdapterError({
    code: "LONDON_CALENDAR_REQUEST_FAILED",
    message: fallbackMessage,
    status,
  });
}

async function parseAdapterResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

async function requestLondonCalendar<T>(
  pathname: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = buildLondonCalendarUrl(pathname, options.query);
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: buildLondonCalendarHeaders(options),
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
    signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });

  const payload = await parseAdapterResponse(response);

  if (!response.ok) {
    throw buildAdapterError(
      response.status,
      payload,
      `CLUES London calendar adapter request failed with HTTP ${response.status}.`,
    );
  }

  return payload as T;
}

export async function getLondonCalendarHealthSnapshot() {
  return requestLondonCalendar<LondonCalendarHealthSnapshot>(
    LONDON_CALENDAR_INTERNAL_ENDPOINTS.health,
  );
}

export async function listLondonCalendarEntries(
  query: LondonCalendarEntriesRangeQuery,
) {
  return requestLondonCalendar<LondonCalendarEntriesResponse>(
    LONDON_CALENDAR_INTERNAL_ENDPOINTS.entries,
    {
      query: {
        externalUserRef: query.externalUserRef,
        start: query.start,
        end: query.end,
      },
    },
  );
}

export async function createLondonCalendarEntry(
  request: LondonCalendarCreateEntryWithAttendeesRequest,
) {
  return requestLondonCalendar<LondonCalendarEntryResponse>(
    LONDON_CALENDAR_INTERNAL_ENDPOINTS.entries,
    {
      method: "POST",
      body: request,
      idempotencyKey: randomUUID(),
    },
  );
}

export async function updateLondonCalendarEntry(
  entryId: string,
  request: LondonCalendarUpdateEntryRequest,
) {
  return requestLondonCalendar<LondonCalendarEntryResponse>(
    getLondonCalendarEntryEndpoint(entryId),
    {
      method: "PATCH",
      body: request,
      idempotencyKey: randomUUID(),
    },
  );
}

export async function archiveLondonCalendarEntry(
  entryId: string,
  request: LondonCalendarArchiveEntryRequest,
) {
  return requestLondonCalendar<LondonCalendarArchiveResponse>(
    getLondonCalendarEntryEndpoint(entryId),
    {
      method: "DELETE",
      body: request,
      idempotencyKey: randomUUID(),
    },
  );
}

export async function setLondonCalendarAttendees(
  entryId: string,
  request: {
    context: LondonCalendarUpdateEntryRequest["context"];
    externalUserRef: string;
    attendees: LondonCalendarAttendeeInput[];
  },
) {
  return requestLondonCalendar<LondonCalendarAttendeesResponse>(
    getLondonCalendarAttendeesEndpoint(entryId),
    {
      method: "POST",
      body: request,
      idempotencyKey: randomUUID(),
    },
  );
}

export async function getLondonCalendarPrepTasks(
  entryId: string,
  query: LondonCalendarPrepTasksQuery,
) {
  return requestLondonCalendar<LondonCalendarPrepTasksResponse>(
    getLondonCalendarPrepTasksEndpoint(entryId),
    {
      query: {
        externalUserRef: query.externalUserRef,
      },
    },
  );
}

export async function createLondonCalendarPrepTask(
  entryId: string,
  request: {
    context: LondonCalendarUpdateEntryRequest["context"];
    externalUserRef: string;
    task: LondonCalendarPrepTaskInput;
  },
) {
  return requestLondonCalendar<LondonCalendarPrepTaskResponse>(
    getLondonCalendarPrepTasksEndpoint(entryId),
    {
      method: "POST",
      body: request,
      idempotencyKey: randomUUID(),
    },
  );
}

export async function parseLondonCalendarRequest(
  request: LondonCalendarParseRequest,
) {
  return requestLondonCalendar<LondonCalendarParseResponse>(
    LONDON_CALENDAR_INTERNAL_ENDPOINTS.parse,
    {
      method: "POST",
      body: request,
    },
  );
}

export async function getLondonCalendarRecommendations(externalUserRef: string) {
  return requestLondonCalendar<LondonCalendarRecommendationsResponse>(
    LONDON_CALENDAR_INTERNAL_ENDPOINTS.recommendations,
    {
      query: {
        externalUserRef,
      },
    },
  );
}

export function createOliviaAdapterContext(
  overrides: Partial<LondonCalendarUpdateEntryRequest["context"]> = {},
) {
  return {
    tenantId: "clues-london",
    sourceApp: OLIVIA_APP_ID,
    actorType: "assistant",
    actorId: "olivia",
    requiresApproval: false,
    ...overrides,
  };
}

export function createLondonCalendarUpdateRequest(
  externalUserRef: string,
  updates: LondonCalendarEntryUpdateInput,
  context: Partial<LondonCalendarUpdateEntryRequest["context"]> = {},
): LondonCalendarUpdateEntryRequest {
  return {
    context: createOliviaAdapterContext(context),
    externalUserRef,
    updates,
  };
}
