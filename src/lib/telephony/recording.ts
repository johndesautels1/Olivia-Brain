/**
 * OLIVIA BRAIN - CALL RECORDING WITH CONSENT
 * ===========================================
 *
 * Compliant call recording with consent flow management.
 *
 * Features:
 * - Pre-call consent prompts
 * - Verbal consent detection
 * - DTMF consent (press 1 to consent)
 * - Recording storage and retrieval
 * - Transcription integration
 */

import { getServerEnv } from "@/lib/config/env";
import { withTraceSpan } from "@/lib/observability/tracer";
import type { RecordingConsent, PhoneCall } from "./types";

export function isRecordingConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(
    env.TWILIO_ACCOUNT_SID &&
    env.TWILIO_AUTH_TOKEN &&
    env.TWILIO_RECORDING_CALLBACK_URL
  );
}

/**
 * Recording consent announcement text
 */
export const CONSENT_ANNOUNCEMENT = {
  twoParty:
    "This call may be recorded for quality assurance and training purposes. " +
    "By continuing this call, you consent to being recorded. " +
    "If you do not consent, please hang up now.",

  twoPartyWithDTMF:
    "This call may be recorded for quality assurance and training purposes. " +
    "Press 1 to consent to recording, or press 2 to continue without recording.",

  oneParty:
    "Please note that this call may be recorded for quality assurance purposes.",

  explicit:
    "Before we continue, I need to inform you that this call will be recorded. " +
    "Do you consent to this call being recorded? Please say yes or no.",
};

/**
 * Generate TwiML for consent flow
 */
export function generateConsentTwiML(
  options: {
    consentType: "twoParty" | "twoPartyWithDTMF" | "oneParty" | "explicit";
    onConsentUrl: string;
    onDeclineUrl?: string;
    voice?: string;
  }
): string {
  const announcement = CONSENT_ANNOUNCEMENT[options.consentType];
  const voice = options.voice ?? "Google.en-US-Neural2-F";

  if (options.consentType === "twoPartyWithDTMF") {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="dtmf" numDigits="1" action="${options.onConsentUrl}" timeout="10">
    <Say voice="${voice}">${announcement}</Say>
  </Gather>
  <Say voice="${voice}">We did not receive a response. Continuing without recording.</Say>
  <Redirect>${options.onDeclineUrl ?? options.onConsentUrl}?consent=false</Redirect>
</Response>`;
  }

  if (options.consentType === "explicit") {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" speechTimeout="3" action="${options.onConsentUrl}" timeout="10">
    <Say voice="${voice}">${announcement}</Say>
  </Gather>
  <Say voice="${voice}">We did not hear a response. Continuing without recording.</Say>
  <Redirect>${options.onDeclineUrl ?? options.onConsentUrl}?consent=false</Redirect>
</Response>`;
  }

  // For oneParty and implicit twoParty, just announce and continue
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}">${announcement}</Say>
  <Pause length="1"/>
  <Redirect>${options.onConsentUrl}?consent=implicit</Redirect>
</Response>`;
}

/**
 * Process consent response
 */
export function processConsentResponse(
  callSid: string,
  input: string | undefined,
  inputType: "dtmf" | "speech" | "implicit"
): RecordingConsent {
  let consentGiven = false;
  let consentMethod: RecordingConsent["consentMethod"] = "verbal";

  if (inputType === "dtmf") {
    consentGiven = input === "1";
    consentMethod = "dtmf";
  } else if (inputType === "speech") {
    const normalized = (input ?? "").toLowerCase().trim();
    consentGiven = ["yes", "yeah", "yep", "sure", "okay", "ok", "i consent", "consent"].some(
      (word) => normalized.includes(word)
    );
    consentMethod = "verbal";
  } else if (inputType === "implicit") {
    // Implicit consent through continued call
    consentGiven = true;
    consentMethod = "verbal";
  }

  return {
    callSid,
    consentGiven,
    consentMethod,
    timestamp: new Date(),
    consentText: input,
  };
}

/**
 * Start call recording
 */
export async function startRecording(
  callSid: string,
  options?: {
    trim?: "trim-silence" | "do-not-trim";
    recordingChannels?: "mono" | "dual";
    recordingStatusCallback?: string;
  }
): Promise<string> {
  const env = getServerEnv();

  if (!isRecordingConfigured()) {
    throw new Error("Recording not configured");
  }

  return withTraceSpan(
    "olivia.recording_start",
    {
      "olivia.call_sid": callSid,
    },
    async () => {
      const auth = `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`;

      const params = new URLSearchParams({
        Trim: options?.trim ?? "trim-silence",
        RecordingChannels: options?.recordingChannels ?? "mono",
      });

      if (options?.recordingStatusCallback ?? env.TWILIO_RECORDING_CALLBACK_URL) {
        params.set(
          "RecordingStatusCallback",
          options?.recordingStatusCallback ?? env.TWILIO_RECORDING_CALLBACK_URL!
        );
      }

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Calls/${callSid}/Recordings.json`,
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
        throw new Error(`Twilio recording error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return data.sid;
    }
  );
}

/**
 * Stop call recording
 */
export async function stopRecording(
  callSid: string,
  recordingSid: string
): Promise<void> {
  const env = getServerEnv();

  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio credentials not configured");
  }

  const auth = `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`;

  await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Calls/${callSid}/Recordings/${recordingSid}.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(auth).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ Status: "stopped" }),
    }
  );
}

/**
 * Get recording URL
 */
export async function getRecordingUrl(recordingSid: string): Promise<string> {
  const env = getServerEnv();

  return `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Recordings/${recordingSid}.mp3`;
}

/**
 * Delete recording (for GDPR compliance)
 */
export async function deleteRecording(recordingSid: string): Promise<void> {
  const env = getServerEnv();

  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio credentials not configured");
  }

  const auth = `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`;

  await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Recordings/${recordingSid}.json`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Basic ${Buffer.from(auth).toString("base64")}`,
      },
    }
  );
}
