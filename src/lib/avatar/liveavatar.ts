/**
 * OLIVIA BRAIN - LIVEAVATAR LITE ADAPTER (THIN)
 * ==============================================
 *
 * Track O5c session 3.
 *
 * LiveAvatar LITE is the production realtime avatar surface today
 * (`OliviaVideoAvatar.tsx` → `/api/olivia/liveavatar/*`). The full
 * client lifecycle — LiveKit WebRTC join, `agent.speak` WebSocket
 * messages, MediaRecorder capture — lives in `OliviaVideoAvatar` and
 * stays there for now (the abstraction lift was scoped out of S3).
 *
 * What this file owns:
 * - A `liveavatar` first-class entry in the avatar abstraction so the
 *   harness UI and decision-rubric page can probe it without
 *   importing `OliviaVideoAvatar`'s internals.
 * - `isLiveAvatarConfigured()` so the harness can enable/disable its
 *   live-trigger button.
 *
 * What this file deliberately does NOT own (yet):
 * - WebSocket connection lifecycle. That stays inside
 *   `OliviaVideoAvatar` until the abstraction lift lands.
 * - `createSession` / `sendAudio` / `endSession` style functions —
 *   they would mirror `simli.ts`, but the LiveAvatar protocol is
 *   browser-WebSocket-driven and OliviaVideoAvatar already implements
 *   it. Duplicating it here would create two sources of truth.
 *
 * If you're tempted to expand this file: read
 * `docs/HEYGEN_LTM_CONFIG.md` first — the WebSocket message format is
 * pinned by LTM's working integration and any drift is dangerous.
 */

import { getServerEnv } from "@/lib/config/env";

export function isLiveAvatarConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.LIVEAVATAR_API_KEY && env.LIVEAVATAR_OLIVIA_AVATAR_ID);
}

/**
 * Non-secret config exposed to clients for harness wiring.
 * NEVER include the API key here — only IDs that are safe in the
 * browser (matches the LTM convention; the avatar ID is rendered into
 * client-side LiveKit join URLs anyway).
 */
export interface LiveAvatarPublicConfig {
  oliviaAvatarId: string | null;
}

export function getLiveAvatarPublicConfig(): LiveAvatarPublicConfig {
  const env = getServerEnv();
  return {
    oliviaAvatarId: env.LIVEAVATAR_OLIVIA_AVATAR_ID ?? null,
  };
}

/**
 * Speak-stream endpoint path. Exposed so the harness's live-trigger
 * button has a single source of truth for the URL it POSTs to.
 */
export const LIVEAVATAR_SPEAK_STREAM_PATH =
  "/api/olivia/liveavatar/speak-stream";
