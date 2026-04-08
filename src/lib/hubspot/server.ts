import { getServerEnv } from "@/lib/config/env";

const HUBSPOT_API_BASE_URL = "https://api.hubapi.com";
const HUBSPOT_CRM_API_VERSION = "2026-03";
const HUBSPOT_ACCOUNT_API_VERSION = "2026-03";

export type HubSpotObjectType = "contacts" | "companies" | "deals";
export type HubSpotPropertyValue = string | number | boolean | null;
export type HubSpotPropertyMap = Record<string, HubSpotPropertyValue>;

export interface HubSpotAssociationInput {
  to: {
    id: string;
  };
  types: Array<{
    associationCategory: "HUBSPOT_DEFINED" | "USER_DEFINED";
    associationTypeId: number;
  }>;
}

export interface HubSpotObjectRecord {
  id: string;
  properties: HubSpotPropertyMap;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  archivedAt?: string;
  objectWriteTraceId?: string;
  url?: string;
}

export interface HubSpotAccountDetails {
  portalId: number;
  accountType: string;
  timeZone: string;
  companyCurrency?: string;
  additionalCurrencies?: string[];
  utcOffset?: string;
  utcOffsetMilliseconds?: number;
  uiDomain?: string;
  dataHostingLocation?: string;
}

export interface HubSpotHealthSnapshot {
  account: HubSpotAccountDetails;
  objects: Record<
    HubSpotObjectType,
    {
      countVisible: number;
      sampleId: string | null;
    }
  >;
}

type HubSpotCollectionResponse = {
  results: HubSpotObjectRecord[];
  total?: number;
  paging?: {
    next?: {
      after?: string;
      link?: string;
    };
  };
};

type HubSpotSearchRequest = {
  filterGroups?: Array<{
    filters: Array<{
      propertyName: string;
      operator:
        | "EQ"
        | "NEQ"
        | "LT"
        | "LTE"
        | "GT"
        | "GTE"
        | "BETWEEN"
        | "IN"
        | "NOT_IN"
        | "HAS_PROPERTY"
        | "NOT_HAS_PROPERTY"
        | "CONTAINS_TOKEN"
        | "NOT_CONTAINS_TOKEN";
      value?: string;
      values?: string[];
      highValue?: string;
    }>;
  }>;
  properties?: string[];
  limit?: number;
  after?: string;
  sorts?: string[];
};

const DEFAULT_PROPERTIES: Record<HubSpotObjectType, string[]> = {
  contacts: ["email", "firstname", "lastname", "phone", "lifecyclestage"],
  companies: ["name", "domain", "phone", "city", "country"],
  deals: ["dealname", "dealstage", "pipeline", "amount", "closedate"],
};

function getHubSpotAccessToken() {
  return getServerEnv().HUBSPOT_ACCESS_TOKEN;
}

function getHubSpotHeaders() {
  const token = getHubSpotAccessToken();

  if (!token) {
    throw new Error("HUBSPOT_ACCESS_TOKEN is not configured.");
  }

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function createHubSpotUrl(path: string, query?: Record<string, string | undefined>) {
  const url = new URL(path, HUBSPOT_API_BASE_URL);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (typeof value === "string" && value.length > 0) {
      url.searchParams.set(key, value);
    }
  }

  return url;
}

function buildHubSpotErrorMessage(payload: unknown, status: number) {
  if (!payload || typeof payload !== "object") {
    return `HubSpot request failed with HTTP ${status}.`;
  }

  const candidate = payload as {
    message?: unknown;
    category?: unknown;
    errors?: Array<{ message?: unknown; code?: unknown }>;
  };
  const segments: string[] = [];

  if (typeof candidate.message === "string" && candidate.message.length > 0) {
    segments.push(candidate.message);
  }

  if (typeof candidate.category === "string" && candidate.category.length > 0) {
    segments.push(`category=${candidate.category}`);
  }

  const firstError = candidate.errors?.[0];

  if (firstError) {
    if (typeof firstError.message === "string" && firstError.message.length > 0) {
      segments.push(firstError.message);
    }

    if (typeof firstError.code === "string" && firstError.code.length > 0) {
      segments.push(`code=${firstError.code}`);
    }
  }

  return segments.length > 0
    ? segments.join(" | ")
    : `HubSpot request failed with HTTP ${status}.`;
}

function parseHubSpotResponse(text: string) {
  if (text.length === 0) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {
      message: text,
    };
  }
}

async function hubSpotRequest<T>(
  path: string,
  init?: RequestInit,
  query?: Record<string, string | undefined>,
): Promise<T> {
  const response = await fetch(createHubSpotUrl(path, query), {
    ...init,
    headers: {
      ...getHubSpotHeaders(),
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  const payload = parseHubSpotResponse(text);

  if (!response.ok) {
    throw new Error(buildHubSpotErrorMessage(payload, response.status));
  }

  return payload as T;
}

function getObjectPath(objectType: HubSpotObjectType) {
  return `/crm/objects/${HUBSPOT_CRM_API_VERSION}/${objectType}`;
}

export function isHubSpotConfigured() {
  return Boolean(getHubSpotAccessToken());
}

export async function getHubSpotAccountDetails() {
  return hubSpotRequest<HubSpotAccountDetails>(
    `/account-info/${HUBSPOT_ACCOUNT_API_VERSION}/details`,
  );
}

export async function listHubSpotRecords(
  objectType: HubSpotObjectType,
  options?: {
    limit?: number;
    properties?: string[];
    after?: string;
  },
) {
  return hubSpotRequest<HubSpotCollectionResponse>(getObjectPath(objectType), undefined, {
    limit: String(options?.limit ?? 10),
    after: options?.after,
    properties: (options?.properties ?? DEFAULT_PROPERTIES[objectType]).join(","),
  });
}

export async function getHubSpotRecord(
  objectType: HubSpotObjectType,
  objectId: string,
  options?: {
    properties?: string[];
    idProperty?: string;
  },
) {
  return hubSpotRequest<HubSpotObjectRecord>(
    `${getObjectPath(objectType)}/${encodeURIComponent(objectId)}`,
    undefined,
    {
      properties: (options?.properties ?? DEFAULT_PROPERTIES[objectType]).join(","),
      idProperty: options?.idProperty,
    },
  );
}

export async function searchHubSpotRecords(
  objectType: HubSpotObjectType,
  request: HubSpotSearchRequest,
) {
  return hubSpotRequest<HubSpotCollectionResponse>(`${getObjectPath(objectType)}/search`, {
    method: "POST",
    body: JSON.stringify({
      limit: request.limit ?? 10,
      properties: request.properties ?? DEFAULT_PROPERTIES[objectType],
      filterGroups: request.filterGroups ?? [],
      sorts: request.sorts ?? [],
      after: request.after,
    }),
  });
}

export async function createHubSpotRecord(
  objectType: HubSpotObjectType,
  properties: HubSpotPropertyMap,
  associations?: HubSpotAssociationInput[],
) {
  return hubSpotRequest<HubSpotObjectRecord>(getObjectPath(objectType), {
    method: "POST",
    body: JSON.stringify({
      properties,
      associations,
    }),
  });
}

export async function updateHubSpotRecord(
  objectType: HubSpotObjectType,
  objectId: string,
  properties: HubSpotPropertyMap,
  options?: {
    idProperty?: string;
  },
) {
  return hubSpotRequest<HubSpotObjectRecord>(
    `${getObjectPath(objectType)}/${encodeURIComponent(objectId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        properties,
      }),
    },
    {
      idProperty: options?.idProperty,
    },
  );
}

export async function lookupHubSpotContactByEmail(email: string) {
  const response = await searchHubSpotRecords("contacts", {
    limit: 1,
    properties: DEFAULT_PROPERTIES.contacts,
    filterGroups: [
      {
        filters: [
          {
            propertyName: "email",
            operator: "EQ",
            value: email,
          },
        ],
      },
    ],
  });

  return response.results[0] ?? null;
}

export async function lookupHubSpotCompanyByDomain(domain: string) {
  const response = await searchHubSpotRecords("companies", {
    limit: 1,
    properties: DEFAULT_PROPERTIES.companies,
    filterGroups: [
      {
        filters: [
          {
            propertyName: "domain",
            operator: "EQ",
            value: domain,
          },
        ],
      },
    ],
  });

  return response.results[0] ?? null;
}

export async function lookupHubSpotDealByName(dealName: string) {
  const response = await searchHubSpotRecords("deals", {
    limit: 1,
    properties: DEFAULT_PROPERTIES.deals,
    filterGroups: [
      {
        filters: [
          {
            propertyName: "dealname",
            operator: "EQ",
            value: dealName,
          },
        ],
      },
    ],
  });

  return response.results[0] ?? null;
}

export async function getHubSpotHealthSnapshot(): Promise<HubSpotHealthSnapshot> {
  const [account, contacts, companies, deals] = await Promise.all([
    getHubSpotAccountDetails(),
    listHubSpotRecords("contacts", { limit: 1 }),
    listHubSpotRecords("companies", { limit: 1 }),
    listHubSpotRecords("deals", { limit: 1 }),
  ]);

  return {
    account,
    objects: {
      contacts: {
        countVisible: contacts.results.length,
        sampleId: contacts.results[0]?.id ?? null,
      },
      companies: {
        countVisible: companies.results.length,
        sampleId: companies.results[0]?.id ?? null,
      },
      deals: {
        countVisible: deals.results.length,
        sampleId: deals.results[0]?.id ?? null,
      },
    },
  };
}
