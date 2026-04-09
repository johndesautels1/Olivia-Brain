/**
 * OLIVIA BRAIN - TWILIO CONVERSATIONRELAY
 * ========================================
 *
 * AI-powered phone calls using Twilio ConversationRelay.
 *
 * ConversationRelay Features:
 * - Bidirectional audio streaming
 * - Real-time transcription
 * - TTS integration
 * - Call recording with consent
 * - DTMF handling
 *
 * Use Cases:
 * - Inbound AI phone support
 * - Outbound AI calls
 * - Warm transfers to human agents
 */

import { getServerEnv } from "@/lib/config/env";
import { withTraceSpan } from "@/lib/observability/tracer";
import type {
  RealtimeSession,
  TwilioSessionConfig,
  TranscriptEvent,
} from "./types";

export function isTwilioConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(
    env.TWILIO_ACCOUNT_SID &&
    (env.TWILIO_AUTH_TOKEN || (env.TWILIO_API_KEY && env.TWILIO_API_SECRET))
  );
}

/**
 * Initialize an outbound AI call via Twilio
 */
export async function initiateOutboundCall(
  config: TwilioSessionConfig
): Promise<RealtimeSession> {
  const env = getServerEnv();

  if (!isTwilioConfigured()) {
    throw new Error("Twilio credentials not configured");
  }

  const sessionId = `tw-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const fromNumber = config.fromNumber ?? env.TWILIO_PHONE_NUMBER;

  if (!fromNumber) {
    throw new Error("No from number specified and TWILIO_PHONE_NUMBER not set");
  }

  const call = await withTraceSpan(
    "olivia.twilio_outbound_call",
    {
      "olivia.persona": config.personaId,
      "olivia.to": config.toNumber,
      "olivia.from": fromNumber,
    },
    async () => {
      const auth = env.TWILIO_AUTH_TOKEN
        ? `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`
        : `${env.TWILIO_API_KEY}:${env.TWILIO_API_SECRET}`;

      const twimlUrl = config.webhookUrl ?? env.TWILIO_CONVERSATION_RELAY_URL;

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Calls.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(auth).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: config.toNumber,
            From: fromNumber,
            Url: twimlUrl ?? "",
            StatusCallback: config.statusCallback ?? env.TWILIO_STATUS_CALLBACK_URL ?? "",
            Record: config.recordingEnabled ? "true" : "false",
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Twilio API error: ${response.status} - ${error}`);
      }

      return response.json();
    }
  );

  return {
    sessionId,
    personaId: config.personaId,
    provider: "twilio",
    mode: "voice-only",
    status: "connecting",
    createdAt: new Date(),
    phoneNumber: config.toNumber,
    callSid: call.sid,
  };
}

/**
 * Generate TwiML for ConversationRelay
 */
export function generateConversationRelayTwiML(
  config: {
    personaId: string;
    welcomeMessage?: string;
    voiceId?: string;
    language?: string;
    interruptible?: boolean;
  }
): string {
  const env = getServerEnv();

  const wsUrl = env.TWILIO_CONVERSATION_RELAY_URL ??
    `wss://${env.NEXT_PUBLIC_APP_URL?.replace('https://', '')}/api/twilio/relay`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <ConversationRelay
      url="${wsUrl}"
      voice="Google.en-US-Neural2-F"
      language="en-US"
      transcriptionProvider="google"
      speechModel="phone_call"
      interruptible="${config.interruptible !== false}"
      dtmfDetection="true"
    >
      <Parameter name="personaId" value="${config.personaId}" />
      <Parameter name="welcomeMessage" value="${config.welcomeMessage ?? ''}" />
    </ConversationRelay>
  </Connect>
</Response>`;
}

/**
 * Generate TwiML for inbound call handling
 */
export function generateInboundTwiML(
  personaId: string,
  options?: {
    welcomeMessage?: string;
    recordConsent?: boolean;
  }
): string {
  const parts: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Response>',
  ];

  if (options?.recordConsent) {
    parts.push(
      '  <Say voice="Google.en-US-Neural2-F">This call may be recorded for quality assurance.</Say>',
      '  <Pause length="1"/>'
    );
  }

  if (options?.welcomeMessage) {
    parts.push(
      `  <Say voice="Google.en-US-Neural2-F">${options.welcomeMessage}</Say>`
    );
  }

  parts.push(
    '  <Connect>',
    `    <ConversationRelay url="wss://olivia-brain.vercel.app/api/twilio/relay">`,
    `      <Parameter name="personaId" value="${personaId}" />`,
    '    </ConversationRelay>',
    '  </Connect>',
    '</Response>'
  );

  return parts.join('\n');
}

/**
 * Handle ConversationRelay WebSocket messages
 */
export interface RelayMessage {
  type: "setup" | "prompt" | "interrupt" | "dtmf" | "end";
  streamSid?: string;
  callSid?: string;
  customParameters?: Record<string, string>;
  voicePrompt?: string;
  dtmfDigits?: string;
  handoffData?: string;
}

export interface RelayResponse {
  type: "text" | "audio" | "end" | "handoff";
  token?: string;
  audio?: string;
  handoffData?: string;
}

/**
 * Create a response for ConversationRelay
 */
export function createRelayTextResponse(text: string): RelayResponse {
  return {
    type: "text",
    token: text,
  };
}

export function createRelayEndResponse(): RelayResponse {
  return {
    type: "end",
  };
}

export function createRelayHandoffResponse(data: Record<string, unknown>): RelayResponse {
  return {
    type: "handoff",
    handoffData: JSON.stringify(data),
  };
}

/**
 * End an active call
 */
export async function endCall(callSid: string): Promise<void> {
  const env = getServerEnv();

  if (!isTwilioConfigured()) {
    throw new Error("Twilio credentials not configured");
  }

  const auth = env.TWILIO_AUTH_TOKEN
    ? `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`
    : `${env.TWILIO_API_KEY}:${env.TWILIO_API_SECRET}`;

  await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Calls/${callSid}.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(auth).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        Status: "completed",
      }),
    }
  );
}

/**
 * Get call status
 */
export async function getCallStatus(
  callSid: string
): Promise<{
  status: string;
  duration: number;
  direction: string;
}> {
  const env = getServerEnv();

  if (!isTwilioConfigured()) {
    throw new Error("Twilio credentials not configured");
  }

  const auth = env.TWILIO_AUTH_TOKEN
    ? `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`
    : `${env.TWILIO_API_KEY}:${env.TWILIO_API_SECRET}`;

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Calls/${callSid}.json`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(auth).toString("base64")}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Twilio API error: ${response.status}`);
  }

  const data = await response.json();

  return {
    status: data.status,
    duration: parseInt(data.duration ?? "0", 10),
    direction: data.direction,
  };
}
