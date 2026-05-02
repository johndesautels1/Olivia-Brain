/**
 * LiveAvatar API Client — Server-side (LITE Mode)
 *
 * Handles session lifecycle: create token → start → keep-alive → stop.
 * Also provides avatar listing, transcript retrieval, and credit checking.
 * This runs on the backend (API routes) — never expose the API key to the client.
 *
 * Ported from London-Tech-Map. Reference: docs/HEYGEN_LTM_CONFIG.md
 */

import type {
  LiveAvatarResponse,
  CreateSessionTokenRequest,
  CreateSessionTokenResponse,
  StartSessionResponse,
  StopSessionRequest,
  KeepAliveRequest,
  SessionEntry,
  HistoricSessionEntry,
  SessionTranscript,
  Avatar,
  PaginatedResponse,
  LiveAvatarClientConfig,
  SessionEndReason,
} from "./types";

const LIVEAVATAR_API_BASE = "https://api.liveavatar.com";
const REQUEST_TIMEOUT = 30_000;

function getApiKey(): string {
  const key = process.env.LIVEAVATAR_API_KEY;
  if (!key) {
    throw new Error("LIVEAVATAR_API_KEY not configured in environment variables");
  }
  return key;
}

async function apiRequest<T>(
  path: string,
  options: {
    method: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
    authType?: "apiKey" | "bearer";
    token?: string;
  },
): Promise<T> {
  const { method, body, authType = "apiKey", token } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (authType === "apiKey") {
    headers["X-API-KEY"] = getApiKey();
  } else if (authType === "bearer" && token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${LIVEAVATAR_API_BASE}${path}`;

  console.log(`[liveavatar] ${method} ${path}`);

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error(`[liveavatar] API error ${response.status} on ${method} ${path}: ${text.slice(0, 300)}`);
    throw new Error(`LiveAvatar API error (${response.status}): ${text.slice(0, 200)}`);
  }

  const json = (await response.json()) as LiveAvatarResponse<T>;

  if (json.code !== 100) {
    throw new Error(`LiveAvatar error (code ${json.code}): ${json.message || "Unknown error"}`);
  }

  return json.data as T;
}

// ─── Session Management ─────────────────────────────────────────────────────────

/**
 * Creates a session token and starts the session in one call.
 * Returns everything the frontend needs to initialize the LiveAvatarSession SDK.
 */
export async function createAndStartSession(
  avatarId: string,
  options?: {
    sandbox?: boolean;
    maxDuration?: number;
    quality?: "high" | "medium" | "low";
  },
): Promise<LiveAvatarClientConfig> {
  const { sandbox = false, maxDuration = 600, quality = "high" } = options || {};

  const tokenRequest: CreateSessionTokenRequest = {
    avatar_id: avatarId,
    mode: "LITE",
    is_sandbox: sandbox,
    video_settings: {
      quality,
      encoding: "H264",
    },
    max_session_duration: maxDuration,
  };

  const tokenData = await apiRequest<CreateSessionTokenResponse>(
    "/v1/sessions/token",
    { method: "POST", body: tokenRequest },
  );

  console.log(`[liveavatar] Session token created — session_id: ${tokenData.session_id}`);

  const sessionData = await apiRequest<StartSessionResponse>(
    "/v1/sessions/start",
    { method: "POST", authType: "bearer", token: tokenData.session_token },
  );

  console.log(`[liveavatar] Session started — ws_url present: ${!!sessionData.ws_url}, livekit_url present: ${!!sessionData.livekit_url}`);

  return {
    sessionToken: tokenData.session_token,
    sessionId: sessionData.session_id,
    wsUrl: sessionData.ws_url,
    livekitUrl: sessionData.livekit_url,
    livekitClientToken: sessionData.livekit_client_token,
    maxSessionDuration: sessionData.max_session_duration,
  };
}

/**
 * Stop a session. Call when user closes the avatar or navigates away.
 */
export async function stopSession(
  sessionId: string,
  reason: SessionEndReason = "USER_CLOSED",
): Promise<void> {
  const body: StopSessionRequest = { session_id: sessionId, reason };
  await apiRequest("/v1/sessions/stop", { method: "POST", body });
  console.log(`[liveavatar] Session ${sessionId} stopped (reason: ${reason})`);
}

/**
 * Keep a session alive. Call every 3-4 minutes to prevent 5-minute idle timeout.
 */
export async function keepSessionAlive(sessionId: string): Promise<void> {
  const body: KeepAliveRequest = { session_id: sessionId };
  await apiRequest("/v1/sessions/keep-alive", { method: "POST", body });
}

/**
 * Get session transcript after a conversation ends.
 */
export async function getSessionTranscript(
  sessionId: string,
): Promise<SessionTranscript> {
  return apiRequest<SessionTranscript>(
    `/v1/sessions/${encodeURIComponent(sessionId)}/transcript`,
    { method: "GET" },
  );
}

/**
 * List active or historic sessions.
 */
export async function listSessions(
  type: "active" | "historic" = "active",
  page = 1,
  pageSize = 20,
): Promise<PaginatedResponse<SessionEntry | HistoricSessionEntry>> {
  return apiRequest<PaginatedResponse<SessionEntry | HistoricSessionEntry>>(
    `/v1/sessions?type=${type}&page=${page}&page_size=${pageSize}`,
    { method: "GET" },
  );
}

// ─── Avatar Management ──────────────────────────────────────────────────────────

export async function listUserAvatars(
  page = 1,
  pageSize = 20,
): Promise<PaginatedResponse<Avatar>> {
  return apiRequest<PaginatedResponse<Avatar>>(
    `/v1/avatars?page=${page}&page_size=${pageSize}`,
    { method: "GET" },
  );
}

export async function getAvatar(avatarId: string): Promise<Avatar> {
  return apiRequest<Avatar>(
    `/v1/avatars/${encodeURIComponent(avatarId)}`,
    { method: "GET" },
  );
}

// ─── Credit Checking ────────────────────────────────────────────────────────────

export interface CreditBalance {
  credits: number;
}

/**
 * Check current credit balance. LITE mode = 1 credit/minute.
 */
export async function getCreditBalance(): Promise<CreditBalance> {
  return apiRequest<CreditBalance>(
    "/v1/users/credits",
    { method: "GET" },
  );
}

// ─── Avatar ID Helpers ──────────────────────────────────────────────────────────

/**
 * Get Olivia's avatar ID from environment variables.
 */
export function getOliviaAvatarId(): string {
  const id = process.env.LIVEAVATAR_OLIVIA_AVATAR_ID;
  if (!id) throw new Error("LIVEAVATAR_OLIVIA_AVATAR_ID not configured");
  return id;
}
