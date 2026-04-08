import twilio from "twilio";
import { z } from "zod";

import { getServerEnv } from "@/lib/config/env";

const inboundVoicePayloadSchema = z.object({
  CallSid: z.string().optional(),
  AccountSid: z.string().optional(),
  CallStatus: z.string().optional(),
  From: z.string().optional(),
  To: z.string().optional(),
  Direction: z.string().optional(),
  CallerName: z.string().optional(),
  ForwardedFrom: z.string().optional(),
});

export type TwilioInboundVoicePayload = z.infer<typeof inboundVoicePayloadSchema>;

export function getTwilioClient() {
  const env = getServerEnv();

  if (!env.TWILIO_ACCOUNT_SID) {
    return null;
  }

  if (env.TWILIO_API_KEY && env.TWILIO_API_SECRET) {
    return twilio(env.TWILIO_API_KEY, env.TWILIO_API_SECRET, {
      accountSid: env.TWILIO_ACCOUNT_SID,
    });
  }

  if (env.TWILIO_AUTH_TOKEN) {
    return twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  }

  return null;
}

export function parseTwilioInboundVoicePayload(payload: Record<string, string>) {
  return inboundVoicePayloadSchema.parse(payload);
}

function getCanonicalRequestUrl(request: Request) {
  const env = getServerEnv();
  const requestUrl = new URL(request.url);

  if (env.NEXT_PUBLIC_APP_URL) {
    const baseUrl = new URL(env.NEXT_PUBLIC_APP_URL);

    return new URL(`${requestUrl.pathname}${requestUrl.search}`, baseUrl).toString();
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");

  if (forwardedProto && host) {
    return `${forwardedProto}://${host}${requestUrl.pathname}${requestUrl.search}`;
  }

  return requestUrl.toString();
}

export function validateTwilioWebhookRequest(input: {
  request: Request;
  body: string;
  params: Record<string, string>;
  method: "GET" | "POST";
}) {
  const env = getServerEnv();
  const signature = input.request.headers.get("x-twilio-signature");

  if (!env.TWILIO_AUTH_TOKEN) {
    return {
      ok: true,
      mode: "skipped" as const,
      reason: "Twilio auth token is not configured yet.",
    };
  }

  if (!signature) {
    return {
      ok: env.NODE_ENV !== "production",
      mode: "skipped" as const,
      reason:
        env.NODE_ENV === "production"
          ? "Twilio signature header is missing."
          : "Twilio signature header is missing in a non-production environment.",
    };
  }

  const requestUrl = getCanonicalRequestUrl(input.request);
  const params = input.method === "POST" ? input.params : {};
  const ok = twilio.validateRequest(
    env.TWILIO_AUTH_TOKEN,
    signature,
    requestUrl,
    params,
  );

  return {
    ok,
    mode: "validated" as const,
    reason: ok ? undefined : "Twilio request signature validation failed.",
  };
}

export function buildInboundVoiceTwiml(payload: TwilioInboundVoicePayload) {
  const env = getServerEnv();
  const response = new twilio.twiml.VoiceResponse();
  const callerLabel =
    payload.CallerName || payload.From || "caller";

  if (env.TWILIO_CONVERSATION_RELAY_URL) {
    const connect = response.connect();

    connect.conversationRelay({
      url: env.TWILIO_CONVERSATION_RELAY_URL,
      welcomeGreeting: `Welcome to ${env.NEXT_PUBLIC_APP_NAME}. Olivia is joining the call now.`,
      transcriptionLanguage: "en-US",
      ttsLanguage: "en-US",
      interruptible: "speech",
      reportInputDuringAgentSpeech: true,
      dtmfDetection: true,
    });

    return response.toString();
  }

  response.say(
    {
      voice: "alice",
      language: "en-US",
    },
    `Hello ${callerLabel}. You have reached ${env.NEXT_PUBLIC_APP_NAME}. The Twilio telephony layer is connected, but the live conversation runtime is not configured yet. Please try again after the voice stack is enabled.`,
  );
  response.hangup();

  return response.toString();
}
