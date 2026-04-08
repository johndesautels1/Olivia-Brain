import { getServerEnv } from "@/lib/config/env";

const INSTANTLY_API_BASE_URL = "https://api.instantly.ai";

export interface InstantlyAccount {
  id?: string;
  email?: string;
  status?: string;
  warmup_status?: string;
  provider?: string;
  workspace_id?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface InstantlyCampaign {
  id?: string;
  name?: string;
  status?: string;
  campaign_status?: string;
  is_active?: boolean;
  created_at?: string;
  [key: string]: unknown;
}

export interface InstantlyLeadInput {
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  personalization?: string;
  website?: string;
  phone?: string;
  custom_variables?: Record<string, boolean | number | string | null>;
  assigned_to?: string;
  [key: string]: unknown;
}

export interface InstantlyCampaignCreateInput {
  name: string;
  [key: string]: unknown;
}

export interface InstantlyLeadCreateResult {
  id?: string;
  email?: string;
  [key: string]: unknown;
}

export interface InstantlyBulkLeadAddResult {
  status?: string;
  total_sent?: number;
  leads_uploaded?: number;
  duplicated_leads?: number;
  skipped_count?: number;
  invalid_email_count?: number;
  created_leads?: InstantlyLeadCreateResult[];
  [key: string]: unknown;
}

export interface InstantlyHealthSnapshot {
  accountCount: number;
  campaignCount: number;
  topAccount: InstantlyAccount | null;
  topCampaign: InstantlyCampaign | null;
}

function getInstantlyApiKey() {
  return getServerEnv().INSTANTLY_API_KEY;
}

function getInstantlyHeaders() {
  const apiKey = getInstantlyApiKey();

  if (!apiKey) {
    throw new Error("INSTANTLY_API_KEY is not configured.");
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

function createInstantlyUrl(path: string, query?: Record<string, string | undefined>) {
  const url = new URL(path, INSTANTLY_API_BASE_URL);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (typeof value === "string" && value.length > 0) {
      url.searchParams.set(key, value);
    }
  }

  return url;
}

function parseInstantlyResponse(text: string) {
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

function buildInstantlyErrorMessage(payload: unknown, status: number) {
  if (!payload || typeof payload !== "object") {
    return `Instantly request failed with HTTP ${status}.`;
  }

  const candidate = payload as {
    message?: unknown;
    error?: unknown;
    details?: unknown;
  };
  const parts: string[] = [];

  if (typeof candidate.message === "string" && candidate.message.length > 0) {
    parts.push(candidate.message);
  }

  if (typeof candidate.error === "string" && candidate.error.length > 0) {
    parts.push(candidate.error);
  }

  if (typeof candidate.details === "string" && candidate.details.length > 0) {
    parts.push(candidate.details);
  }

  return parts.length > 0
    ? parts.join(" | ")
    : `Instantly request failed with HTTP ${status}.`;
}

async function instantlyRequest<T>(
  path: string,
  init?: RequestInit,
  query?: Record<string, string | undefined>,
): Promise<T> {
  const response = await fetch(createInstantlyUrl(path, query), {
    ...init,
    headers: {
      ...getInstantlyHeaders(),
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  const payload = parseInstantlyResponse(text);

  if (!response.ok) {
    throw new Error(buildInstantlyErrorMessage(payload, response.status));
  }

  return payload as T;
}

function extractArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const candidate = payload as {
    items?: unknown;
    results?: unknown;
    data?: unknown;
    accounts?: unknown;
    campaigns?: unknown;
  };

  for (const value of [
    candidate.items,
    candidate.results,
    candidate.data,
    candidate.accounts,
    candidate.campaigns,
  ]) {
    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return [];
}

export function isInstantlyConfigured() {
  return Boolean(getInstantlyApiKey());
}

export async function listInstantlyAccounts() {
  const payload = await instantlyRequest<unknown>("/api/v2/accounts");
  return extractArray<InstantlyAccount>(payload);
}

export async function getInstantlyAccount(email: string) {
  return instantlyRequest<InstantlyAccount>(`/api/v2/accounts/${encodeURIComponent(email)}`);
}

export async function listInstantlyCampaigns() {
  const payload = await instantlyRequest<unknown>("/api/v2/campaigns");
  return extractArray<InstantlyCampaign>(payload);
}

export async function getInstantlyCampaign(campaignId: string) {
  return instantlyRequest<InstantlyCampaign>(
    `/api/v2/campaigns/${encodeURIComponent(campaignId)}`,
  );
}

export async function createInstantlyCampaign(input: InstantlyCampaignCreateInput) {
  return instantlyRequest<InstantlyCampaign>("/api/v2/campaigns", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function patchInstantlyCampaign(
  campaignId: string,
  updates: Record<string, unknown>,
) {
  return instantlyRequest<InstantlyCampaign>(
    `/api/v2/campaigns/${encodeURIComponent(campaignId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(updates),
    },
  );
}

export async function activateInstantlyCampaign(campaignId: string) {
  return instantlyRequest<Record<string, unknown>>(
    `/api/v2/campaigns/${encodeURIComponent(campaignId)}/activate`,
    {
      method: "POST",
    },
  );
}

export async function pauseInstantlyCampaign(campaignId: string) {
  return instantlyRequest<Record<string, unknown>>(
    `/api/v2/campaigns/${encodeURIComponent(campaignId)}/pause`,
    {
      method: "POST",
    },
  );
}

export async function createInstantlyLead(input: InstantlyLeadInput) {
  return instantlyRequest<InstantlyLeadCreateResult>("/api/v2/leads", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function addInstantlyLeadsToCampaignOrList(input: {
  leads: InstantlyLeadInput[];
  campaignId?: string;
  listId?: string;
}) {
  return instantlyRequest<InstantlyBulkLeadAddResult>("/api/v2/leads/add", {
    method: "POST",
    body: JSON.stringify({
      leads: input.leads,
      campaign_id: input.campaignId,
      list_id: input.listId,
    }),
  });
}

export async function getInstantlyHealthSnapshot(): Promise<InstantlyHealthSnapshot> {
  const [accounts, campaigns] = await Promise.all([
    listInstantlyAccounts(),
    listInstantlyCampaigns(),
  ]);

  return {
    accountCount: accounts.length,
    campaignCount: campaigns.length,
    topAccount: accounts[0] ?? null,
    topCampaign: campaigns[0] ?? null,
  };
}
