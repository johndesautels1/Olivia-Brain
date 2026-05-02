/**
 * LiveAvatar LITE Mode Session Management — Olivia path
 *
 * Handles session creation and start for Olivia's real-time streaming avatar.
 * LITE mode: we bring our own STT, LLM, and TTS (ElevenLabs).
 * LiveAvatar handles only the avatar rendering + WebRTC streaming.
 *
 * Flow:
 *   1. createSessionToken() → gets session_id + session_token
 *   2. startSession(token) → gets LiveKit room URL + room token
 *   3. Client connects to LiveKit room via livekit-client SDK
 *   4. Server sends TTS audio via WebSocket → agent.speak command
 *
 * Ported from London-Tech-Map. Reference: docs/HEYGEN_LTM_CONFIG.md
 */

const LIVEAVATAR_API_BASE = "https://api.liveavatar.com/v1";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface LiveAvatarSessionToken {
  sessionId: string;
  sessionToken: string;
}

export interface LiveAvatarSession {
  sessionId: string;
  livekitUrl: string;
  livekitToken: string;
  websocketUrl?: string;
}

// ─── Session Token Creation ─────────────────────────────────────────────────────

/**
 * Creates a LiveAvatar session token with LITE (CUSTOM) mode configuration.
 * Must be called from the server — requires LIVEAVATAR_API_KEY.
 */
export async function createSessionToken(): Promise<LiveAvatarSessionToken> {
  const apiKey = process.env.LIVEAVATAR_API_KEY;
  const avatarId = process.env.LIVEAVATAR_OLIVIA_AVATAR_ID;

  if (!apiKey) {
    throw new Error("LIVEAVATAR_API_KEY not configured");
  }
  if (!avatarId) {
    throw new Error("LIVEAVATAR_OLIVIA_AVATAR_ID not configured");
  }

  const body: Record<string, unknown> = {
    avatar_id: avatarId,
    mode: "LITE",
    video_settings: {
      quality: "high",
      encoding: "H264",
    },
  };

  const response = await fetch(`${LIVEAVATAR_API_BASE}/sessions/token`, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error(`[LiveAvatar] Token request failed — status: ${response.status}, url: ${LIVEAVATAR_API_BASE}/sessions/token, avatarId: ${avatarId}, response: ${text.slice(0, 500)}`);
    throw new Error(`LiveAvatar token error (${response.status}): ${text.slice(0, 300)}`);
  }

  const json = await response.json();
  console.log("[LiveAvatar] Token response keys:", Object.keys(json), "data keys:", json.data ? Object.keys(json.data) : "no data field");
  const data = json.data;

  if (!data?.session_id || !data?.session_token) {
    console.error("[LiveAvatar] Token response missing fields. Full response:", JSON.stringify(json).slice(0, 500));
    throw new Error("LiveAvatar token response missing session_id or session_token");
  }

  return {
    sessionId: data.session_id,
    sessionToken: data.session_token,
  };
}

// ─── Session Start ──────────────────────────────────────────────────────────────

/**
 * Starts a LiveAvatar session using the session token.
 * Returns LiveKit room credentials for WebRTC connection.
 */
export async function startSession(sessionToken: string): Promise<LiveAvatarSession> {
  const response = await fetch(`${LIVEAVATAR_API_BASE}/sessions/start`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error(`[LiveAvatar] Start request failed — status: ${response.status}, response: ${text.slice(0, 500)}`);
    throw new Error(`LiveAvatar start error (${response.status}): ${text.slice(0, 300)}`);
  }

  const json = await response.json();
  console.log("[LiveAvatar] Start response keys:", Object.keys(json), "data keys:", json.data ? Object.keys(json.data) : "no data field");
  const data = json.data || json;

  if (!data.livekit_url || !data.livekit_client_token) {
    console.error("[LiveAvatar] Start response missing livekit_url/livekit_client_token. Available keys:", JSON.stringify(Object.keys(data)), "Full data:", JSON.stringify(data).slice(0, 500));
    throw new Error("LiveAvatar start response missing livekit_url or livekit_client_token");
  }

  return {
    sessionId: data.session_id || "",
    livekitUrl: data.livekit_url,
    livekitToken: data.livekit_client_token,
    websocketUrl: data.ws_url || undefined,
  };
}

// ─── Combined: Create + Start ───────────────────────────────────────────────────

/**
 * Convenience: creates a session token and immediately starts the session.
 * Returns everything the client needs to connect.
 */
export async function createAndStartSession(): Promise<LiveAvatarSession & { sessionToken: string }> {
  const { sessionId, sessionToken } = await createSessionToken();
  const session = await startSession(sessionToken);

  return {
    ...session,
    sessionId: session.sessionId || sessionId,
    sessionToken,
  };
}
