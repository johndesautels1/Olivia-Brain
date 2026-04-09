/**
 * OLIVIA BRAIN - VAPI INTEGRATION
 * ================================
 *
 * Inbound phone AI agents using Vapi.
 *
 * Vapi Features:
 * - Pre-built phone AI infrastructure
 * - Low-latency voice conversations
 * - Custom assistant configuration
 * - Function calling support
 * - Webhook integrations
 *
 * Use Cases:
 * - Dedicated AI phone lines
 * - Lead qualification calls
 * - Appointment scheduling
 * - Customer service automation
 */

import { getServerEnv } from "@/lib/config/env";
import { withTraceSpan } from "@/lib/observability/tracer";
import type { RealtimeSession, VapiSessionConfig } from "./types";
import { getAvatarIdentity } from "@/lib/avatar/identity";

const VAPI_API_BASE = "https://api.vapi.ai";

export function isVapiConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.VAPI_API_KEY);
}

interface VapiAssistant {
  id: string;
  name: string;
  voice?: {
    provider: string;
    voiceId: string;
  };
  model?: {
    provider: string;
    model: string;
  };
  firstMessage?: string;
  transcriber?: {
    provider: string;
    model?: string;
  };
}

/**
 * Create a Vapi assistant for a persona
 */
export async function createVapiAssistant(
  personaId: string,
  options?: {
    name?: string;
    firstMessage?: string;
    systemPrompt?: string;
  }
): Promise<VapiAssistant> {
  const env = getServerEnv();

  if (!env.VAPI_API_KEY) {
    throw new Error("Vapi API key not configured");
  }

  const identity = getAvatarIdentity(personaId);
  const name = options?.name ?? identity?.name ?? "Olivia";

  const assistant = await withTraceSpan(
    "olivia.vapi_create_assistant",
    {
      "olivia.persona": personaId,
      "olivia.name": name,
    },
    async () => {
      const response = await fetch(`${VAPI_API_BASE}/assistant`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.VAPI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          voice: {
            provider: "11labs",
            voiceId: env.ELEVENLABS_VOICE_OLIVIA ?? "21m00Tcm4TlvDq8ikWAM",
          },
          model: {
            provider: "anthropic",
            model: "claude-sonnet-4-6",
            systemPrompt: options?.systemPrompt ?? buildSystemPrompt(personaId),
          },
          firstMessage: options?.firstMessage ?? getFirstMessage(personaId),
          transcriber: {
            provider: "deepgram",
            model: "nova-2",
          },
          silenceTimeoutSeconds: 30,
          maxDurationSeconds: 1800,
          backgroundSound: "off",
          backchannelingEnabled: true,
          responseDelaySeconds: 0.5,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Vapi API error: ${response.status} - ${error}`);
      }

      return response.json();
    }
  );

  return assistant;
}

function buildSystemPrompt(personaId: string): string {
  const identity = getAvatarIdentity(personaId);

  if (personaId === "cristiano") {
    return `You are Cristiano, THE JUDGE. You provide authoritative, decisive verdicts.
You speak with confidence and finality. Your word is the final say.
Be concise, professional, and commanding.`;
  }

  if (personaId === "emelia") {
    return `You are Emelia, a helpful back-end support specialist.
You assist with customer service, technical support, and general inquiries.
Be helpful, knowledgeable, and efficient.`;
  }

  return `You are Olivia, a client-facing executive assistant for CLUES Intelligence.
You help clients with relocation planning, real estate inquiries, and city evaluations.
Be warm, professional, and engaging. Ask clarifying questions when needed.
${identity?.voiceCharacteristics ?? ""}`;
}

function getFirstMessage(personaId: string): string {
  if (personaId === "cristiano") {
    return "This is Cristiano. I'm ready to deliver my verdict.";
  }

  if (personaId === "emelia") {
    return "Hi, this is Emelia from CLUES support. How can I help you today?";
  }

  return "Hi, this is Olivia from CLUES Intelligence. How can I help you with your relocation journey today?";
}

/**
 * Get a Vapi assistant by ID
 */
export async function getVapiAssistant(assistantId: string): Promise<VapiAssistant> {
  const env = getServerEnv();

  if (!env.VAPI_API_KEY) {
    throw new Error("Vapi API key not configured");
  }

  const response = await fetch(`${VAPI_API_BASE}/assistant/${assistantId}`, {
    headers: {
      Authorization: `Bearer ${env.VAPI_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Vapi API error: ${response.status}`);
  }

  return response.json();
}

/**
 * List all Vapi assistants
 */
export async function listVapiAssistants(): Promise<VapiAssistant[]> {
  const env = getServerEnv();

  if (!env.VAPI_API_KEY) {
    throw new Error("Vapi API key not configured");
  }

  const response = await fetch(`${VAPI_API_BASE}/assistant`, {
    headers: {
      Authorization: `Bearer ${env.VAPI_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Vapi API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Create an inbound call session (for webhook handling)
 */
export async function handleVapiInboundCall(
  config: VapiSessionConfig
): Promise<RealtimeSession> {
  const sessionId = `vapi-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  return {
    sessionId,
    personaId: config.personaId,
    provider: "vapi",
    mode: "voice-only",
    status: "connecting",
    createdAt: new Date(),
    phoneNumber: config.phoneNumber,
  };
}

/**
 * Vapi webhook event types
 */
export type VapiWebhookEvent =
  | "assistant-request"
  | "function-call"
  | "status-update"
  | "end-of-call-report"
  | "hang"
  | "speech-update"
  | "transcript";

export interface VapiWebhookPayload {
  message: {
    type: VapiWebhookEvent;
    call?: {
      id: string;
      phoneNumber?: string;
      status?: string;
    };
    functionCall?: {
      name: string;
      parameters: Record<string, unknown>;
    };
    transcript?: {
      text: string;
      role: "user" | "assistant";
    };
    endedReason?: string;
    recordingUrl?: string;
    summary?: string;
  };
}

/**
 * Handle Vapi assistant-request webhook (dynamic assistant selection)
 */
export function handleAssistantRequest(
  phoneNumber: string
): { assistantId?: string; assistant?: Partial<VapiAssistant> } {
  // Return a dynamic assistant configuration based on the phone number
  // In production, look up the caller and return appropriate assistant
  return {
    assistant: {
      name: "Olivia",
      voice: {
        provider: "11labs",
        voiceId: "21m00Tcm4TlvDq8ikWAM",
      },
      firstMessage: "Hello! This is Olivia from CLUES Intelligence. How can I assist you today?",
    },
  };
}

/**
 * Handle Vapi function call webhook
 */
export async function handleFunctionCall(
  functionName: string,
  parameters: Record<string, unknown>
): Promise<unknown> {
  // Implement function handlers for Vapi function calling
  switch (functionName) {
    case "scheduleAppointment":
      return { success: true, message: "Appointment scheduled" };

    case "lookupProperty":
      return { success: true, properties: [] };

    case "transferToHuman":
      return { transfer: true, department: parameters.department ?? "general" };

    default:
      return { error: `Unknown function: ${functionName}` };
  }
}

/**
 * Delete a Vapi assistant
 */
export async function deleteVapiAssistant(assistantId: string): Promise<void> {
  const env = getServerEnv();

  if (!env.VAPI_API_KEY) {
    throw new Error("Vapi API key not configured");
  }

  await fetch(`${VAPI_API_BASE}/assistant/${assistantId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${env.VAPI_API_KEY}`,
    },
  });
}
