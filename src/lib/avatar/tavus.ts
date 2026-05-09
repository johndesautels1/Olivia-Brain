/**
 * OLIVIA BRAIN - TAVUS AVATAR INTEGRATION
 * ========================================
 *
 * Track O5c — A/B candidate alongside Simli, HeyGen, and the live
 * LiveAvatar LITE path. Adapter mirrors the Simli adapter shape so the
 * realtime selector in `index.ts` can pick a vendor declaratively
 * without per-call branching at the call site.
 *
 * Tavus API surface (per O5 research memo §5):
 * - `POST /v2/conversations`           → realtime session, returns
 *   `conversation_url` (WebRTC join URL)
 * - `POST /v2/conversations/{id}/utterance` → REST utterance into an
 *   open conversation
 * - `DELETE /v2/conversations/{id}`    → end the session
 * - `POST /v2/videos`                  → async non-realtime video
 *   generation against a replica
 *
 * Phoneme-input claim:
 * The O5 memo (`docs/O5_AVATAR_LIPSYNC_RESEARCH.md §3.B`) cited Tavus
 * as a vendor that "does phoneme-driven sync server-side." O5d
 * (`docs/O5D_PHONEME_ALIGNMENT_RESEARCH.md`) flagged this as
 * unverified. The current REST utterance surface accepts plain text
 * only; whether Tavus exposes a phoneme/viseme metadata channel at a
 * different endpoint is the open question for O5c session 2's harness
 * wiring. See TODO O5c-S2 below.
 */

import { getServerEnv } from "@/lib/config/env";
import { withTraceSpan } from "@/lib/observability/tracer";
import type {
  AvatarSession,
  AvatarVideoRequest,
  AvatarVideoResult,
  RealtimeAvatarConfig,
  EmotionState,
} from "./types";
import { getAvatarIdentity } from "./identity";

const TAVUS_API_BASE = "https://tavusapi.com/v2";

export function isTavusConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.TAVUS_API_KEY);
}

// Tavus replica IDs — the Tavus dashboard's term for a trained avatar
// likeness. Configure per-persona in the Tavus console and surface here.
// TODO O5c-S2: replace placeholder IDs with real replicas during harness wiring.
const TAVUS_REPLICA_IDS: Record<string, string> = {
  olivia: "olivia-professional-v1",
  cristiano: "cristiano-judge-v1",
  emelia: "emelia-support-v1",
};

function getTavusReplicaId(personaId: string): string {
  return TAVUS_REPLICA_IDS[personaId] ?? TAVUS_REPLICA_IDS.olivia;
}

function emotionToTavusTone(emotion: EmotionState): string {
  const mapping: Record<EmotionState, string> = {
    neutral: "neutral",
    happy: "warm",
    confident: "confident",
    thoughtful: "measured",
    concerned: "concerned",
    emphatic: "emphatic",
    welcoming: "warm",
  };
  return mapping[emotion] ?? "neutral";
}

export async function createTavusSession(
  config: RealtimeAvatarConfig,
): Promise<AvatarSession> {
  const env = getServerEnv();

  if (!env.TAVUS_API_KEY) {
    throw new Error("Tavus API key not configured");
  }

  const identity = getAvatarIdentity(config.personaId);
  if (!identity) {
    throw new Error(`Unknown persona: ${config.personaId}`);
  }

  const sessionId = `tavus-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const session = await withTraceSpan(
    "olivia.tavus_create_session",
    {
      "olivia.persona": config.personaId,
      "olivia.session_id": sessionId,
    },
    async () => {
      const response = await fetch(`${TAVUS_API_BASE}/conversations`, {
        method: "POST",
        headers: {
          "x-api-key": env.TAVUS_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          replica_id: getTavusReplicaId(config.personaId),
          conversation_name: `olivia-${config.personaId}-${sessionId}`,
          properties: {
            // Tavus echoes a tone hint into its TTS pipeline. Real
            // emotion control sits behind the replica config.
            tone: emotionToTavusTone(identity.defaultEmotion),
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Tavus API error: ${response.status} - ${error}`);
      }

      return response.json();
    },
  );

  return {
    sessionId: session.conversation_id ?? sessionId,
    personaId: config.personaId,
    provider: "tavus",
    status: "initializing",
    createdAt: new Date(),
    videoStreamUrl: session.conversation_url,
  };
}

/**
 * Send a text utterance into an open Tavus conversation. Tavus runs
 * its own TTS server-side, so this is text-in not PCM-in (unlike
 * `sendAudioToSimli`). Kept under the same lifecycle name for adapter
 * symmetry; the realtime selector in `index.ts` picks the right call.
 *
 * O5c S3 verification: Tavus's `/v2/conversations/{id}/utterance`
 * endpoint accepts `{ text }` only — there is no documented phoneme
 * or viseme metadata channel in their REST conversation API. The
 * O5d REJECTED conclusion in `docs/O5D_PHONEME_ALIGNMENT_RESEARCH.md`
 * stands for our integration. If Tavus exposes a phoneme channel at
 * a different SDK tier later, re-open O5d then.
 */
export async function sendTavusUtterance(
  conversationId: string,
  text: string,
): Promise<void> {
  const env = getServerEnv();

  if (!env.TAVUS_API_KEY) {
    throw new Error("Tavus API key not configured");
  }

  await fetch(`${TAVUS_API_BASE}/conversations/${conversationId}/utterance`, {
    method: "POST",
    headers: {
      "x-api-key": env.TAVUS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });
}

export async function endTavusSession(conversationId: string): Promise<void> {
  const env = getServerEnv();

  if (!env.TAVUS_API_KEY) {
    throw new Error("Tavus API key not configured");
  }

  await fetch(`${TAVUS_API_BASE}/conversations/${conversationId}`, {
    method: "DELETE",
    headers: {
      "x-api-key": env.TAVUS_API_KEY,
    },
  });
}

export async function generateTavusVideo(
  request: AvatarVideoRequest,
): Promise<AvatarVideoResult> {
  const env = getServerEnv();

  if (!env.TAVUS_API_KEY) {
    throw new Error("Tavus API key not configured");
  }

  const startTime = Date.now();

  const result = await withTraceSpan(
    "olivia.tavus_generate_video",
    {
      "olivia.persona": request.personaId,
      "olivia.text_length": request.text.length,
    },
    async () => {
      const response = await fetch(`${TAVUS_API_BASE}/videos`, {
        method: "POST",
        headers: {
          "x-api-key": env.TAVUS_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          replica_id: getTavusReplicaId(request.personaId),
          script: request.text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Tavus API error: ${response.status} - ${error}`);
      }

      return response.json();
    },
  );

  return {
    videoUrl: result.download_url ?? result.hosted_url ?? "",
    durationMs: Date.now() - startTime,
    provider: "tavus",
    personaId: request.personaId,
  };
}

export async function getTavusSessionStatus(
  conversationId: string,
): Promise<AvatarSession["status"]> {
  const env = getServerEnv();

  if (!env.TAVUS_API_KEY) {
    throw new Error("Tavus API key not configured");
  }

  const response = await fetch(
    `${TAVUS_API_BASE}/conversations/${conversationId}`,
    {
      headers: {
        "x-api-key": env.TAVUS_API_KEY,
      },
    },
  );

  if (!response.ok) {
    return "error";
  }

  const data = await response.json();
  // Tavus returns "active" / "ended" / etc.; map to AvatarSession states.
  switch (data.status) {
    case "active":
      return "ready";
    case "ended":
      return "ended";
    default:
      return data.status ?? "ready";
  }
}
