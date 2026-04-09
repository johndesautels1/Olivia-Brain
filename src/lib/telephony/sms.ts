/**
 * OLIVIA BRAIN - TWILIO SMS INTEGRATION
 * ======================================
 *
 * Full SMS capabilities for Olivia conversations.
 *
 * Features:
 * - Send/receive SMS messages
 * - MMS support (images, documents)
 * - Conversation threading
 * - Delivery status tracking
 * - Opt-out handling
 */

import { getServerEnv } from "@/lib/config/env";
import { withTraceSpan } from "@/lib/observability/tracer";
import type { SMSMessage, SMSStatus } from "./types";

export function isSMSConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(
    env.TWILIO_ACCOUNT_SID &&
    env.TWILIO_AUTH_TOKEN &&
    (env.TWILIO_PHONE_NUMBER || env.TWILIO_MESSAGING_SERVICE_SID)
  );
}

interface SendSMSOptions {
  to: string;
  body: string;
  from?: string;
  mediaUrl?: string[];
  statusCallback?: string;
  conversationId?: string;
}

/**
 * Send an SMS message
 */
export async function sendSMS(options: SendSMSOptions): Promise<SMSMessage> {
  const env = getServerEnv();

  if (!isSMSConfigured()) {
    throw new Error("Twilio SMS not configured");
  }

  const from = options.from ?? env.TWILIO_PHONE_NUMBER;
  const messagingServiceSid = env.TWILIO_MESSAGING_SERVICE_SID;

  return withTraceSpan(
    "olivia.sms_send",
    {
      "olivia.to": options.to,
      "olivia.from": from ?? "messaging_service",
      "olivia.body_length": options.body.length,
    },
    async () => {
      const auth = `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`;

      const params = new URLSearchParams({
        To: options.to,
        Body: options.body,
      });

      if (messagingServiceSid) {
        params.set("MessagingServiceSid", messagingServiceSid);
      } else if (from) {
        params.set("From", from);
      }

      if (options.statusCallback) {
        params.set("StatusCallback", options.statusCallback);
      }

      if (options.mediaUrl?.length) {
        options.mediaUrl.forEach((url) => params.append("MediaUrl", url));
      }

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(auth).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params,
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Twilio SMS error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      return {
        messageSid: data.sid,
        accountSid: data.account_sid,
        from: data.from,
        to: data.to,
        body: data.body,
        status: data.status as SMSStatus,
        direction: "outbound",
        sentAt: new Date(data.date_created),
        conversationId: options.conversationId,
      };
    }
  );
}

/**
 * Get SMS message status
 */
export async function getSMSStatus(messageSid: string): Promise<SMSMessage> {
  const env = getServerEnv();

  if (!isSMSConfigured()) {
    throw new Error("Twilio SMS not configured");
  }

  const auth = `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`;

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages/${messageSid}.json`,
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
    messageSid: data.sid,
    accountSid: data.account_sid,
    from: data.from,
    to: data.to,
    body: data.body,
    status: data.status as SMSStatus,
    direction: data.direction === "outbound-api" ? "outbound" : "inbound",
    sentAt: data.date_sent ? new Date(data.date_sent) : undefined,
    errorCode: data.error_code,
    errorMessage: data.error_message,
  };
}

/**
 * Handle inbound SMS webhook
 */
export interface InboundSMS {
  messageSid: string;
  from: string;
  to: string;
  body: string;
  numMedia: number;
  mediaUrls: string[];
}

export function parseInboundSMS(formData: FormData): InboundSMS {
  const numMedia = parseInt(formData.get("NumMedia") as string ?? "0", 10);
  const mediaUrls: string[] = [];

  for (let i = 0; i < numMedia; i++) {
    const url = formData.get(`MediaUrl${i}`) as string;
    if (url) mediaUrls.push(url);
  }

  return {
    messageSid: formData.get("MessageSid") as string,
    from: formData.get("From") as string,
    to: formData.get("To") as string,
    body: formData.get("Body") as string,
    numMedia,
    mediaUrls,
  };
}

/**
 * Generate TwiML response for SMS
 */
export function generateSMSResponse(message?: string): string {
  if (!message) {
    return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;
}

/**
 * Generate TwiML for SMS with media
 */
export function generateSMSResponseWithMedia(
  message: string,
  mediaUrls: string[]
): string {
  const mediaElements = mediaUrls
    .map((url) => `    <Media>${escapeXml(url)}</Media>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>
    <Body>${escapeXml(message)}</Body>
${mediaElements}
  </Message>
</Response>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Check if a phone number has opted out
 */
export async function checkOptOutStatus(phoneNumber: string): Promise<boolean> {
  // In production, check against a database of opt-outs
  // For now, return false (not opted out)
  return false;
}

/**
 * Handle opt-out request (STOP, UNSUBSCRIBE, etc.)
 */
export function isOptOutMessage(body: string): boolean {
  const optOutKeywords = ["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"];
  const normalized = body.trim().toUpperCase();
  return optOutKeywords.includes(normalized);
}

/**
 * Handle opt-in request (START, YES, etc.)
 */
export function isOptInMessage(body: string): boolean {
  const optInKeywords = ["START", "YES", "UNSTOP", "SUBSCRIBE"];
  const normalized = body.trim().toUpperCase();
  return optInKeywords.includes(normalized);
}
