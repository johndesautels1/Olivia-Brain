/**
 * OLIVIA BRAIN - UNIFIED AVATAR INTERFACE
 * ========================================
 *
 * Single entry point for all avatar services with automatic fallback.
 *
 * Avatar Provider Hierarchy:
 * - Olivia™: Simli (primary) → HeyGen → D-ID
 * - Cristiano™: SadTalker (primary) → HeyGen → D-ID
 * - Emelia™: Voice only (no video avatar)
 *
 * GOVERNING PRINCIPLE:
 * "The avatar is the face, not the brain."
 */

export * from "./types";
export * from "./identity";
export * from "./emotions";
export * from "./simli";
export * from "./sadtalker";
export * from "./heygen";
export * from "./did";
export * from "./tavus";
export * from "./liveavatar";
export * from "./status";

import { withTraceSpan } from "@/lib/observability/tracer";
import type {
  AvatarProvider,
  AvatarServiceStatus,
  AvatarSession,
  AvatarVideoRequest,
  AvatarVideoResult,
  RealtimeAvatarConfig,
} from "./types";
import {
  getAvatarIdentity,
  getAllAvatarIdentities,
  OLIVIA_IDENTITY,
  CRISTIANO_IDENTITY,
  EMELIA_IDENTITY,
} from "./identity";
import { isSimliConfigured, createSimliSession, generateSimliVideo } from "./simli";
import { isSadTalkerConfigured, generateSadTalkerVideo } from "./sadtalker";
import { isHeyGenConfigured, generateHeyGenVideo } from "./heygen";
import { isDIDConfigured, generateDIDVideo, createDIDStreamSession } from "./did";
import { isTavusConfigured, createTavusSession, generateTavusVideo } from "./tavus";

export function getAvatarServiceStatus(): AvatarServiceStatus {
  return {
    simli: {
      configured: isSimliConfigured(),
      available: isSimliConfigured(),
    },
    sadtalker: {
      configured: isSadTalkerConfigured(),
      available: isSadTalkerConfigured(),
    },
    heygen: {
      configured: isHeyGenConfigured(),
      available: isHeyGenConfigured(),
    },
    did: {
      configured: isDIDConfigured(),
      available: isDIDConfigured(),
    },
    tavus: {
      configured: isTavusConfigured(),
      available: isTavusConfigured(),
    },
  };
}

function getAvailableProviders(): AvatarProvider[] {
  const available: AvatarProvider[] = [];

  if (isSimliConfigured()) available.push("simli");
  if (isSadTalkerConfigured()) available.push("sadtalker");
  if (isHeyGenConfigured()) available.push("heygen");
  if (isDIDConfigured()) available.push("did");
  if (isTavusConfigured()) available.push("tavus");

  return available;
}

function selectProvider(personaId: string): AvatarProvider | null {
  const identity = getAvatarIdentity(personaId);
  if (!identity) return null;

  const available = getAvailableProviders();

  // Check primary provider
  if (available.includes(identity.primaryProvider)) {
    return identity.primaryProvider;
  }

  // Check fallbacks in order
  for (const fallback of identity.fallbackProviders) {
    if (available.includes(fallback)) {
      return fallback;
    }
  }

  return null;
}

/**
 * Generate an avatar video with automatic provider selection and fallback.
 */
export async function generateAvatarVideo(
  request: AvatarVideoRequest,
  audioUrl?: string
): Promise<AvatarVideoResult> {
  return withTraceSpan(
    "olivia.avatar_generate",
    {
      "olivia.persona": request.personaId,
      "olivia.text_length": request.text.length,
    },
    async () => {
      const identity = getAvatarIdentity(request.personaId);

      if (!identity) {
        throw new Error(`Unknown persona: ${request.personaId}`);
      }

      // Emelia has no video avatar
      if (request.personaId === "emelia") {
        throw new Error("Emelia™ is voice-only and does not have a video avatar");
      }

      const provider = selectProvider(request.personaId);
      if (!provider) {
        throw new Error("No avatar provider configured");
      }

      // Try providers in order
      const providersToTry = [
        provider,
        ...identity.fallbackProviders.filter((p) => p !== provider),
      ];

      for (const p of providersToTry) {
        try {
          switch (p) {
            case "simli":
              if (isSimliConfigured()) {
                return await generateSimliVideo(request);
              }
              break;

            case "sadtalker":
              if (isSadTalkerConfigured() && audioUrl) {
                return await generateSadTalkerVideo(request, audioUrl);
              }
              break;

            case "heygen":
              if (isHeyGenConfigured()) {
                return await generateHeyGenVideo(request);
              }
              break;

            case "did":
              if (isDIDConfigured()) {
                return await generateDIDVideo(request);
              }
              break;

            case "tavus":
              if (isTavusConfigured()) {
                return await generateTavusVideo(request);
              }
              break;
          }
        } catch (error) {
          console.warn(
            `[Avatar] ${p} failed, trying next provider:`,
            error instanceof Error ? error.message : error
          );
        }
      }

      throw new Error("All avatar providers failed");
    }
  );
}

/**
 * Create a realtime avatar session for interactive conversations.
 */
export async function createAvatarSession(
  config: RealtimeAvatarConfig
): Promise<AvatarSession> {
  return withTraceSpan(
    "olivia.avatar_session_create",
    {
      "olivia.persona": config.personaId,
    },
    async () => {
      const identity = getAvatarIdentity(config.personaId);

      if (!identity) {
        throw new Error(`Unknown persona: ${config.personaId}`);
      }

      // Emelia has no video avatar
      if (config.personaId === "emelia") {
        throw new Error("Emelia™ is voice-only and does not support video sessions");
      }

      // For realtime sessions, prefer Simli, then D-ID, then Tavus.
      // Tavus is gated to a fallback slot until O5c session 3's decision
      // rubric (`docs/O5_AVATAR_LIPSYNC_RESEARCH.md §5`) ranks vendors
      // by latency × 0.4 + lip-sync MOS × 0.4 + cost × 0.2.
      if (isSimliConfigured()) {
        return await createSimliSession(config);
      }

      if (isDIDConfigured()) {
        return await createDIDStreamSession(config);
      }

      if (isTavusConfigured()) {
        return await createTavusSession(config);
      }

      throw new Error("No realtime avatar provider configured (need SIMLI_API_KEY, DID_API_KEY, or TAVUS_API_KEY)");
    }
  );
}

export { getAllAvatarIdentities, getAvatarIdentity };
export { OLIVIA_IDENTITY, CRISTIANO_IDENTITY, EMELIA_IDENTITY };

/* ─────────────────────────────────────────────────────────────────────────────
 * Track O5c-Lift S2 — LiveAvatarHandle factory dispatcher.
 * ───────────────────────────────────────────────────────────────────── */

import { createLiveAvatarLiveHandle } from "./liveavatar";
import { createTavusLiveHandle } from "./tavus";
import { createSimliLiveHandle } from "./simli";
import type {
  CreateLiveAvatarHandleOptions,
  LiveAvatarHandle,
  LiveAvatarProvider,
} from "./types";

export interface CreateLiveAvatarHandleArgs extends CreateLiveAvatarHandleOptions {
  /** Vendor to instantiate. */
  provider: LiveAvatarProvider;
}

/**
 * Dispatch to the per-vendor handle factory.
 *
 * Today only `liveavatar` (HeyGen LITE Mode) returns a fully
 * functional handle. `tavus` and `simli` return honest stubs whose
 * connect() / speak() methods surface a clearly-labelled deferred-
 * implementation error — see the per-file factories for what's
 * needed to make them live.
 */
export function createLiveAvatarHandle(
  args: CreateLiveAvatarHandleArgs,
): LiveAvatarHandle {
  const { provider, ...opts } = args;
  switch (provider) {
    case "liveavatar":
      return createLiveAvatarLiveHandle(opts);
    case "tavus":
      return createTavusLiveHandle(opts);
    case "simli":
      return createSimliLiveHandle(opts);
    default: {
      // Exhaustive — TS will error here if a new LiveAvatarProvider is
      // added without a case above.
      const exhaustive: never = provider;
      throw new Error(`Unknown LiveAvatarProvider: ${String(exhaustive)}`);
    }
  }
}
