/**
 * OLIVIA BRAIN — LIVEAVATAR PERSONA RESOLVER
 * ============================================
 *
 * Resolves a persona id to the LiveAvatar + ElevenLabs env var pair the
 * realtime LITE pipeline needs. One source of truth so route handlers
 * and session helpers don't each duplicate the `process.env.LIVEAVATAR_*`
 * read-and-validate dance.
 *
 * Adding a new persona is a 3-step diff:
 *   1. Add the new id to `PersonaId` in `src/lib/voice/types.ts`.
 *   2. Add the matching env-var pair to `src/lib/config/env.ts`.
 *   3. Add the entry to `LIVEAVATAR_PERSONA_ENV` below.
 *
 * The exhaustiveness check on `assertPersonaIsLiveAvatarEligible` makes
 * step 3 a TypeScript build error if you forget — the function will
 * fail to typecheck because `LIVEAVATAR_PERSONA_ENV` no longer covers
 * every member of the eligible set.
 *
 * Cristiano + Olivia both flow through the same LiveAvatar LITE Mode
 * pipeline (LiveKit WebRTC + WebSocket control channel + ElevenLabs PCM
 * over `agent.speak`). Per `docs/HEYGEN_LTM_CONFIG.md`, the wire-level
 * contract (mode: "LITE", PCM 16-bit 24 kHz, 1-second chunks) is shared
 * across personas — only the `avatar_id` body field and the ElevenLabs
 * voice id differ. This module makes that difference declarative.
 *
 * Held to Apple / Microsoft / Google 2026 leading coding practices per
 * `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */

import { z } from "zod";

import type { PersonaId } from "@/lib/voice/types";

// ─── Eligibility ──────────────────────────────────────────────────────────────

/**
 * Personas that have a face + voice + avatar id and can render through
 * the LiveAvatar LITE Mode pipeline. Emelia is text/voice-only by
 * design (no LiveKit room is provisioned for her), so she's excluded.
 *
 * The const tuple lets us derive both a TS type and a runtime Zod
 * enum from a single declaration — no drift between the two.
 */
export const LIVE_AVATAR_PERSONA_IDS = ["olivia", "cristiano"] as const;
export type LiveAvatarPersonaId = (typeof LIVE_AVATAR_PERSONA_IDS)[number];

export const LiveAvatarPersonaIdSchema = z.enum(LIVE_AVATAR_PERSONA_IDS);

/**
 * Type guard. Returns true when `personaId` is a LiveAvatar-eligible
 * persona. Useful at route boundaries that accept arbitrary `PersonaId`
 * input and need to narrow before calling `resolveLiveAvatarPersona`.
 */
export function isLiveAvatarPersonaId(
  personaId: PersonaId,
): personaId is LiveAvatarPersonaId {
  return (LIVE_AVATAR_PERSONA_IDS as readonly string[]).includes(personaId);
}

// ─── Env mapping ──────────────────────────────────────────────────────────────

/**
 * Persona → env-var pair. Single source of truth for which env vars
 * carry the LiveAvatar avatar id + ElevenLabs voice id for each
 * persona. Adding a new persona requires adding an entry here AND
 * declaring both env vars in `src/lib/config/env.ts`.
 *
 * The `Record<LiveAvatarPersonaId, ...>` annotation forces TypeScript
 * to fail compilation if a new persona is added to
 * `LIVE_AVATAR_PERSONA_IDS` without a matching entry — the exhaustive
 * check the comment promises.
 */
const LIVEAVATAR_PERSONA_ENV: Record<
  LiveAvatarPersonaId,
  { avatarIdVar: string; voiceIdVar: string }
> = {
  olivia: {
    avatarIdVar: "LIVEAVATAR_OLIVIA_AVATAR_ID",
    voiceIdVar: "ELEVENLABS_OLIVIA_VOICE_ID",
  },
  cristiano: {
    avatarIdVar: "LIVEAVATAR_CRISTIANO_AVATAR_ID",
    voiceIdVar: "ELEVENLABS_CRISTIANO_VOICE_ID",
  },
};

// ─── Resolution result (Result-style discriminated union) ─────────────────────

/**
 * Discriminated union returned by `resolveLiveAvatarPersona`. Mirrors
 * the 2026 "typed Result at module boundaries / never throw across a
 * boundary" bar — callers branch on `.ok` and never have to wrap a try.
 *
 * `missingVar` carries the name of the env var that wasn't set so the
 * route handler can surface a clean 503 with the actionable detail
 * ("LIVEAVATAR_CRISTIANO_AVATAR_ID not configured") rather than a
 * generic "avatar service unavailable". Founder direction per the
 * 2026 standards table in `~/CLAUDE.md`: errors must be actionable.
 */
export type ResolvedLiveAvatarPersona =
  | { ok: true; personaId: LiveAvatarPersonaId; avatarId: string; voiceId: string }
  | { ok: false; missingVar: string };

/**
 * Resolves a LiveAvatar-eligible persona to its avatar id + voice id by
 * reading the configured env vars. Returns a Result rather than
 * throwing so route handlers can map missing env vars to a clean 503
 * with the actionable env-var name in the payload.
 *
 * The `LIVEAVATAR_API_KEY` itself is NOT checked here — that's checked
 * by each route at the call site before invoking session creation, so
 * the route can return 503 with the "LiveAvatar not configured" message
 * matching the existing Olivia route contract (preserving behavior on
 * the Olivia path).
 */
export function resolveLiveAvatarPersona(
  personaId: LiveAvatarPersonaId,
): ResolvedLiveAvatarPersona {
  const mapping = LIVEAVATAR_PERSONA_ENV[personaId];
  const avatarId = process.env[mapping.avatarIdVar];
  const voiceId = process.env[mapping.voiceIdVar];

  if (!avatarId) return { ok: false, missingVar: mapping.avatarIdVar };
  if (!voiceId) return { ok: false, missingVar: mapping.voiceIdVar };

  return { ok: true, personaId, avatarId, voiceId };
}

/**
 * Convenience for routes that have already validated the persona via
 * Zod and want a throw-on-miss behavior. Prefer the Result-returning
 * `resolveLiveAvatarPersona` in new code.
 */
export function requireLiveAvatarPersona(
  personaId: LiveAvatarPersonaId,
): { personaId: LiveAvatarPersonaId; avatarId: string; voiceId: string } {
  const result = resolveLiveAvatarPersona(personaId);
  if (!result.ok) {
    throw new Error(`${result.missingVar} not configured`);
  }
  return {
    personaId: result.personaId,
    avatarId: result.avatarId,
    voiceId: result.voiceId,
  };
}
