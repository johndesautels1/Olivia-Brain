import { getServerEnv } from "@/lib/config/env";

const RESEND_API_BASE_URL = "https://api.resend.com";

export type ResendRecipient = string | string[];

export interface ResendEmailAttachment {
  content?: string;
  filename: string;
  path?: string;
}

export interface ResendEmailTag {
  name: string;
  value: string;
}

export interface ResendSendEmailInput {
  from: string;
  to: ResendRecipient;
  subject: string;
  html?: string;
  text?: string;
  cc?: ResendRecipient;
  bcc?: ResendRecipient;
  replyTo?: string;
  headers?: Record<string, string>;
  attachments?: ResendEmailAttachment[];
  tags?: ResendEmailTag[];
  idempotencyKey?: string;
}

export interface ResendSentEmail {
  id: string;
}

export interface ResendDomain {
  id: string;
  name: string;
  status: string;
  created_at: string;
  region?: string;
  capabilities?: {
    sending?: string;
    receiving?: string;
  };
}

export interface ResendListDomainsResponse {
  object: "list";
  has_more: boolean;
  data: ResendDomain[];
}

export interface ResendHealthSnapshot {
  domainCount: number;
  hasConfiguredDomain: boolean;
  topDomain: ResendDomain | null;
}

function getResendApiKey() {
  return getServerEnv().RESEND_API_KEY;
}

function getResendHeaders(headers?: Record<string, string>, idempotencyKey?: string) {
  const apiKey = getResendApiKey();

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    ...(headers ?? {}),
  };
}

function createResendUrl(path: string, query?: Record<string, string | undefined>) {
  const url = new URL(path, RESEND_API_BASE_URL);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (typeof value === "string" && value.length > 0) {
      url.searchParams.set(key, value);
    }
  }

  return url;
}

function parseResendResponse(text: string) {
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

function buildResendErrorMessage(payload: unknown, status: number) {
  if (!payload || typeof payload !== "object") {
    return `Resend request failed with HTTP ${status}.`;
  }

  const candidate = payload as {
    message?: unknown;
    name?: unknown;
    error?: unknown;
  };
  const parts: string[] = [];

  if (typeof candidate.message === "string" && candidate.message.length > 0) {
    parts.push(candidate.message);
  }

  if (typeof candidate.error === "string" && candidate.error.length > 0) {
    parts.push(candidate.error);
  }

  if (typeof candidate.name === "string" && candidate.name.length > 0) {
    parts.push(`name=${candidate.name}`);
  }

  return parts.length > 0
    ? parts.join(" | ")
    : `Resend request failed with HTTP ${status}.`;
}

async function resendRequest<T>(
  path: string,
  init?: RequestInit,
  query?: Record<string, string | undefined>,
  idempotencyKey?: string,
): Promise<T> {
  const response = await fetch(createResendUrl(path, query), {
    ...init,
    headers: getResendHeaders(
      init?.headers && typeof init.headers === "object"
        ? (init.headers as Record<string, string>)
        : undefined,
      idempotencyKey,
    ),
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  const payload = parseResendResponse(text);

  if (!response.ok) {
    throw new Error(buildResendErrorMessage(payload, response.status));
  }

  return payload as T;
}

export function isResendConfigured() {
  return Boolean(getResendApiKey());
}

export async function sendTransactionalEmail(input: ResendSendEmailInput) {
  return resendRequest<ResendSentEmail>(
    "/emails",
    {
      method: "POST",
      body: JSON.stringify({
        from: input.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        cc: input.cc,
        bcc: input.bcc,
        replyTo: input.replyTo,
        headers: input.headers,
        attachments: input.attachments,
        tags: input.tags,
      }),
    },
    undefined,
    input.idempotencyKey,
  );
}

export async function listResendDomains(options?: {
  limit?: number;
  after?: string;
  before?: string;
}) {
  return resendRequest<ResendListDomainsResponse>("/domains", undefined, {
    limit: typeof options?.limit === "number" ? String(options.limit) : undefined,
    after: options?.after,
    before: options?.before,
  });
}

export async function getResendHealthSnapshot(): Promise<ResendHealthSnapshot> {
  const response = await listResendDomains({ limit: 5 });
  const topDomain = response.data[0] ?? null;

  return {
    domainCount: response.data.length,
    hasConfiguredDomain: response.data.length > 0,
    topDomain,
  };
}
