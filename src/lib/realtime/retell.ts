/**
 * OLIVIA BRAIN - RETELL AI INTEGRATION
 * =====================================
 *
 * Outbound voice agents using Retell AI.
 *
 * Retell Features:
 * - Ultra-low latency (sub-500ms)
 * - Natural conversation flow
 * - Custom LLM integration
 * - Call scheduling
 * - Webhook events
 *
 * Use Cases:
 * - Outbound lead calls
 * - Follow-up reminders
 * - Appointment confirmations
 * - Survey collection
 */

import { getServerEnv } from "@/lib/config/env";
import { withTraceSpan } from "@/lib/observability/tracer";
import type { RealtimeSession, RetellSessionConfig } from "./types";
import { getAvatarIdentity } from "@/lib/avatar/identity";

const RETELL_API_BASE = "https://api.retellai.com";

export function isRetellConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.RETELL_API_KEY);
}

interface RetellAgent {
  agent_id: string;
  agent_name: string;
  voice_id: string;
  llm_websocket_url?: string;
  webhook_url?: string;
}

interface RetellCall {
  call_id: string;
  call_status: "registered" | "ongoing" | "ended" | "error";
  from_number: string;
  to_number: string;
  direction: "inbound" | "outbound";
  agent_id: string;
  start_timestamp?: number;
  end_timestamp?: number;
  disconnection_reason?: string;
}

/**
 * Create a Retell agent for a persona
 */
export async function createRetellAgent(
  personaId: string,
  options?: {
    agentName?: string;
    webhookUrl?: string;
    llmWebsocketUrl?: string;
  }
): Promise<RetellAgent> {
  const env = getServerEnv();

  if (!env.RETELL_API_KEY) {
    throw new Error("Retell API key not configured");
  }

  const identity = getAvatarIdentity(personaId);
  const agentName = options?.agentName ?? identity?.name ?? "Olivia";

  const agent = await withTraceSpan(
    "olivia.retell_create_agent",
    {
      "olivia.persona": personaId,
      "olivia.agent_name": agentName,
    },
    async () => {
      const response = await fetch(`${RETELL_API_BASE}/create-agent`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RETELL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_name: agentName,
          voice_id: getRetellVoiceId(personaId),
          response_engine: {
            type: "retell-llm",
            llm_id: "gpt-4o", // Use Retell's hosted LLM
          },
          webhook_url: options?.webhookUrl,
          ambient_sound: null,
          responsiveness: 0.8,
          interruption_sensitivity: 0.8,
          enable_backchannel: true,
          backchannel_frequency: 0.8,
          reminder_trigger_ms: 10000,
          reminder_max_count: 2,
          language: "en-US",
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Retell API error: ${response.status} - ${error}`);
      }

      return response.json();
    }
  );

  return agent;
}

function getRetellVoiceId(personaId: string): string {
  // Retell voice IDs (these would be configured in Retell dashboard)
  const voiceMap: Record<string, string> = {
    olivia: "11labs-Rachel",
    cristiano: "11labs-Adam",
    emelia: "11labs-Elli",
  };

  return voiceMap[personaId] ?? voiceMap.olivia;
}

/**
 * Initiate an outbound call via Retell
 */
export async function initiateRetellCall(
  config: RetellSessionConfig
): Promise<RealtimeSession> {
  const env = getServerEnv();

  if (!env.RETELL_API_KEY) {
    throw new Error("Retell API key not configured");
  }

  const fromNumber = config.fromNumber ?? env.TWILIO_PHONE_NUMBER;

  if (!fromNumber) {
    throw new Error("No from number specified");
  }

  if (!config.agentId) {
    throw new Error("Agent ID is required for Retell calls");
  }

  const sessionId = `retell-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const call = await withTraceSpan(
    "olivia.retell_outbound_call",
    {
      "olivia.persona": config.personaId,
      "olivia.to": config.toNumber,
      "olivia.agent_id": config.agentId,
    },
    async () => {
      const response = await fetch(`${RETELL_API_BASE}/create-phone-call`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RETELL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from_number: fromNumber,
          to_number: config.toNumber,
          agent_id: config.agentId,
          metadata: config.metadata,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Retell API error: ${response.status} - ${error}`);
      }

      return response.json() as Promise<RetellCall>;
    }
  );

  return {
    sessionId,
    personaId: config.personaId,
    provider: "retell",
    mode: "voice-only",
    status: "connecting",
    createdAt: new Date(),
    phoneNumber: config.toNumber,
    callSid: call.call_id,
  };
}

/**
 * Get call details
 */
export async function getRetellCall(callId: string): Promise<RetellCall> {
  const env = getServerEnv();

  if (!env.RETELL_API_KEY) {
    throw new Error("Retell API key not configured");
  }

  const response = await fetch(`${RETELL_API_BASE}/get-call/${callId}`, {
    headers: {
      Authorization: `Bearer ${env.RETELL_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Retell API error: ${response.status}`);
  }

  return response.json();
}

/**
 * End an active call
 */
export async function endRetellCall(callId: string): Promise<void> {
  const env = getServerEnv();

  if (!env.RETELL_API_KEY) {
    throw new Error("Retell API key not configured");
  }

  await fetch(`${RETELL_API_BASE}/end-call/${callId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RETELL_API_KEY}`,
    },
  });
}

/**
 * List all agents
 */
export async function listRetellAgents(): Promise<RetellAgent[]> {
  const env = getServerEnv();

  if (!env.RETELL_API_KEY) {
    throw new Error("Retell API key not configured");
  }

  const response = await fetch(`${RETELL_API_BASE}/list-agents`, {
    headers: {
      Authorization: `Bearer ${env.RETELL_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Retell API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Delete an agent
 */
export async function deleteRetellAgent(agentId: string): Promise<void> {
  const env = getServerEnv();

  if (!env.RETELL_API_KEY) {
    throw new Error("Retell API key not configured");
  }

  await fetch(`${RETELL_API_BASE}/delete-agent/${agentId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${env.RETELL_API_KEY}`,
    },
  });
}

/**
 * Retell webhook event types
 */
export type RetellWebhookEvent =
  | "call_started"
  | "call_ended"
  | "call_analyzed";

export interface RetellWebhookPayload {
  event: RetellWebhookEvent;
  call: RetellCall;
  transcript?: string;
  recording_url?: string;
  call_analysis?: {
    call_summary?: string;
    user_sentiment?: "positive" | "neutral" | "negative";
    call_successful?: boolean;
    custom_analysis_data?: Record<string, unknown>;
  };
}

/**
 * Verify Retell webhook signature
 */
export function verifyRetellWebhook(
  payload: string,
  signature: string
): boolean {
  const env = getServerEnv();

  if (!env.RETELL_API_KEY) {
    return false;
  }

  const crypto = require("crypto");
  const expectedSignature = crypto
    .createHmac("sha256", env.RETELL_API_KEY)
    .update(payload)
    .digest("hex");

  return signature === expectedSignature;
}
