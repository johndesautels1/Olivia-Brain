/**
 * LiveAvatar LITE Mode Session Management — Persona-aware
 *
 * Handles session creation and start for any LiveAvatar-eligible
 * persona (Olivia, Cristiano). LITE mode: we bring our own STT, LLM,
 * and TTS (ElevenLabs). LiveAvatar handles only the avatar rendering
 * + WebRTC streaming.
 *
 * Flow:
 *   1. createSessionToken(personaId) → gets session_id + session_token
 *   2. startSession(token) → gets LiveKit room URL + room token
 *   3. Client connects to LiveKit room via livekit-client SDK
 *   4. Server sends TTS audio via WebSocket → agent.speak command
 *
 * Persona-aware refactor (2026-05-24):
 *   - All exported functions accept an optional `personaId` parameter
 *     defaulting to "olivia" so existing call sites keep their behavior.
 *   - Avatar id resolution moved to `src/lib/avatar/personas.ts` so
 *     adding a third persona is a 1-file diff.
 *   - 100% no breaking changes on the Olivia path: same function
 *     names, same return shapes, same default behavior when called
 *     without arguments. Same wire contract to LiveAvatar.
 *
 * Ported from London-Tech-Map. Reference: docs/HEYGEN_LTM_CONFIG.md
 */

import {
  requireLiveAvatarPersona,
  type LiveAvatarPersonaId,
} from "@/lib/avatar/personas";

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
 * Must be called from the server — requires LIVEAVATAR_API_KEY and the
 * persona-specific avatar id env var (e.g. LIVEAVATAR_OLIVIA_AVATAR_ID
 * or LIVEAVATAR_CRISTIANO_AVATAR_ID).
 *
 * @param personaId Which persona's avatar to provision. Defaults to
 *   "olivia" so existing Olivia-only call sites work unchanged.
 *   Throws with the missing env-var name if the persona's avatar id is
 *   not configured (callers turn this into a clean 503 at the boundary).
 */
export async function createSessionToken(
  personaId: LiveAvatarPersonaId = "olivia",
): Promise<LiveAvatarSessionToken> {
  const apiKey = process.env.LIVEAVATAR_API_KEY;

  if (!apiKey) {
    throw new Error("LIVEAVATAR_API_KEY not configured");
  }

  // Resolve the persona's avatar id. Throws with the missing env-var
  // name (e.g. "LIVEAVATAR_CRISTIANO_AVATAR_ID not configured") so the
  // route handler can map directly to a 503 with that detail.
  const { avatarId } = requireLiveAvatarPersona(personaId);

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
    console.error(`[LiveAvatar] Token request failed — persona: ${personaId}, status: ${response.status}, url: ${LIVEAVATAR_API_BASE}/sessions/token, avatarId: ${avatarId}, response: ${text.slice(0, 500)}`);
    throw new Error(`LiveAvatar token error (${response.status}): ${text.slice(0, 300)}`);
  }

  const json = await response.json();
  console.log(`[LiveAvatar] Token response — persona: ${personaId}, keys:`, Object.keys(json), "data keys:", json.data ? Object.keys(json.data) : "no data field");
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
 * Convenience: creates a session token for the given persona and
 * immediately starts the session. Returns everything the client needs
 * to connect. Defaults to "olivia" so existing Olivia-only call sites
 * work unchanged.
 */
export async function createAndStartSession(
  personaId: LiveAvatarPersonaId = "olivia",
): Promise<LiveAvatarSession & { sessionToken: string; personaId: LiveAvatarPersonaId }> {
  const { sessionId, sessionToken } = await createSessionToken(personaId);
  const session = await startSession(sessionToken);

  return {
    ...session,
    sessionId: session.sessionId || sessionId,
    sessionToken,
    personaId,
  };
}
