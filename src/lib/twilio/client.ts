// src/lib/twilio/client.ts
// Twilio client for SMS, WhatsApp, and Voice
// Used by Olivia for outbound communications
// Region: Ireland (IE1) | Phone: +44 7863 751580

// Dynamic import to prevent build/runtime crashes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let twilioClient: any = null;

/**
 * Get or create the Twilio client (async due to dynamic import)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getTwilioClient(): Promise<any> {
  if (twilioClient) return twilioClient;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.");
  }

  // Dynamic import
  const Twilio = (await import("twilio")).default;
  twilioClient = Twilio(accountSid, authToken);
  return twilioClient;
}

/**
 * Get the configured Twilio phone number
 */
export function getTwilioPhoneNumber(): string {
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!phoneNumber) {
    throw new Error("TWILIO_PHONE_NUMBER not configured.");
  }
  return phoneNumber;
}

/**
 * Check if Twilio is configured
 */
export function isTwilioConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SMS Functions
// ═══════════════════════════════════════════════════════════════════════════

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an SMS message
 */
export async function sendSms(
  to: string,
  body: string
): Promise<SendSmsResult> {
  try {
    const client = await getTwilioClient();
    const from = getTwilioPhoneNumber();

    // Normalize phone number (ensure + prefix)
    const normalizedTo = to.startsWith("+") ? to : `+${to}`;

    const message = await client.messages.create({
      body,
      from,
      to: normalizedTo,
    });

    return {
      success: true,
      messageId: message.sid,
    };
  } catch (error: unknown) {
    console.error("[Twilio] SMS send failed:", error);
    // Extract Twilio error details if available
    const twilioError = error as { code?: number; message?: string; moreInfo?: string };
    const errorMessage = twilioError.message || (error instanceof Error ? error.message : "Failed to send SMS");
    const errorCode = twilioError.code;
    return {
      success: false,
      error: errorCode ? `[${errorCode}] ${errorMessage}` : errorMessage,
    };
  }
}

/**
 * Send an SMS from Olivia with her signature style
 */
export async function sendOliviaSms(
  to: string,
  message: string,
  includeSignature = true
): Promise<SendSmsResult> {
  const body = includeSignature
    ? `${message}\n\n— Olivia, your Chief of Staff\nLondon Tech Map`
    : message;

  return sendSms(to, body);
}

// ═══════════════════════════════════════════════════════════════════════════
// Calendar Reminder Functions
// ═══════════════════════════════════════════════════════════════════════════

export interface CalendarReminderOptions {
  eventTitle: string;
  eventTime: Date;
  location?: string;
  minutesBefore?: number;
}

/**
 * Send a calendar reminder SMS
 */
export async function sendCalendarReminderSms(
  to: string,
  options: CalendarReminderOptions
): Promise<SendSmsResult> {
  const { eventTitle, eventTime, location, minutesBefore = 15 } = options;

  const timeStr = eventTime.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  let message = `Reminder: "${eventTitle}" starts in ${minutesBefore} minutes at ${timeStr}`;

  if (location) {
    message += ` at ${location}`;
  }

  return sendOliviaSms(to, message);
}

/**
 * Send a meeting confirmation SMS
 */
export async function sendMeetingConfirmationSms(
  to: string,
  eventTitle: string,
  eventTime: Date,
  location?: string
): Promise<SendSmsResult> {
  const dateStr = eventTime.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const timeStr = eventTime.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  let message = `Meeting confirmed: "${eventTitle}" on ${dateStr} at ${timeStr}`;

  if (location) {
    message += ` — ${location}`;
  }

  return sendOliviaSms(to, message);
}

// ═══════════════════════════════════════════════════════════════════════════
// WhatsApp Functions
// ═══════════════════════════════════════════════════════════════════════════

export interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Get the WhatsApp-enabled Twilio phone number
 * WhatsApp numbers use whatsapp: prefix
 */
export function getTwilioWhatsAppNumber(): string {
  const phoneNumber = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER;
  if (!phoneNumber) {
    throw new Error("TWILIO_WHATSAPP_NUMBER or TWILIO_PHONE_NUMBER not configured.");
  }
  return phoneNumber;
}

/**
 * Check if WhatsApp is configured
 */
export function isWhatsAppConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    (process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER)
  );
}

/**
 * Send a WhatsApp message
 */
export async function sendWhatsApp(
  to: string,
  body: string
): Promise<SendWhatsAppResult> {
  try {
    const client = await getTwilioClient();
    const fromNumber = getTwilioWhatsAppNumber();

    // Normalize phone number (ensure + prefix, remove any existing whatsapp: prefix)
    let normalizedTo = to.replace(/^whatsapp:/, "");
    normalizedTo = normalizedTo.startsWith("+") ? normalizedTo : `+${normalizedTo}`;

    const message = await client.messages.create({
      body,
      from: `whatsapp:${fromNumber.replace(/^\+/, "")}`,
      to: `whatsapp:${normalizedTo.replace(/^\+/, "")}`,
    });

    return {
      success: true,
      messageId: message.sid,
    };
  } catch (error: unknown) {
    console.error("[Twilio] WhatsApp send failed:", error);
    const twilioError = error as { code?: number; message?: string; moreInfo?: string };
    const errorMessage = twilioError.message || (error instanceof Error ? error.message : "Failed to send WhatsApp");
    const errorCode = twilioError.code;
    return {
      success: false,
      error: errorCode ? `[${errorCode}] ${errorMessage}` : errorMessage,
    };
  }
}

/**
 * Send a WhatsApp message from Olivia with her signature style
 */
export async function sendOliviaWhatsApp(
  to: string,
  message: string,
  includeSignature = true
): Promise<SendWhatsAppResult> {
  const body = includeSignature
    ? `${message}\n\n— Olivia, your Chief of Staff\nLondon Tech Map`
    : message;

  return sendWhatsApp(to, body);
}

/**
 * Send a calendar reminder via WhatsApp
 */
export async function sendCalendarReminderWhatsApp(
  to: string,
  options: CalendarReminderOptions
): Promise<SendWhatsAppResult> {
  const { eventTitle, eventTime, location, minutesBefore = 15 } = options;

  const timeStr = eventTime.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  let message = `📅 Reminder: "${eventTitle}" starts in ${minutesBefore} minutes at ${timeStr}`;

  if (location) {
    message += ` at ${location}`;
  }

  return sendOliviaWhatsApp(to, message);
}

// ═══════════════════════════════════════════════════════════════════════════
// Voice Call Functions
// ═══════════════════════════════════════════════════════════════════════════

export interface MakeCallResult {
  success: boolean;
  callSid?: string;
  error?: string;
}

export interface CallOptions {
  to: string;
  twimlUrl: string;
  statusCallback?: string;
  timeout?: number;
  record?: boolean;
}

/**
 * Check if Voice calling is configured
 */
export function isVoiceConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}

/**
 * Initiate an outbound voice call
 * The twimlUrl should return TwiML instructions for what to say/play
 */
export async function makeCall(options: CallOptions): Promise<MakeCallResult> {
  try {
    const client = await getTwilioClient();
    const from = getTwilioPhoneNumber();

    // Normalize phone number (ensure + prefix)
    const normalizedTo = options.to.startsWith("+") ? options.to : `+${options.to}`;

    const callParams: {
      to: string;
      from: string;
      url: string;
      method: "POST";
      timeout?: number;
      record?: boolean;
      statusCallback?: string;
      statusCallbackMethod?: "POST";
    } = {
      to: normalizedTo,
      from,
      url: options.twimlUrl,
      method: "POST" as const,
    };

    if (options.timeout) {
      callParams.timeout = options.timeout;
    }

    if (options.record) {
      callParams.record = true;
    }

    if (options.statusCallback) {
      callParams.statusCallback = options.statusCallback;
      callParams.statusCallbackMethod = "POST";
    }

    const call = await client.calls.create(callParams);

    return {
      success: true,
      callSid: call.sid,
    };
  } catch (error: unknown) {
    console.error("[Twilio] Voice call failed:", error);
    const twilioError = error as { code?: number; message?: string; moreInfo?: string };
    const errorMessage = twilioError.message || (error instanceof Error ? error.message : "Failed to make call");
    const errorCode = twilioError.code;
    return {
      success: false,
      error: errorCode ? `[${errorCode}] ${errorMessage}` : errorMessage,
    };
  }
}

/**
 * Make a call from Olivia with custom audio
 * audioUrl: publicly accessible URL to the audio file
 */
export async function makeOliviaCall(
  to: string,
  twimlUrl: string
): Promise<MakeCallResult> {
  return makeCall({
    to,
    twimlUrl,
    timeout: 30, // 30 second ring timeout
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Call Recording Functions
// ═══════════════════════════════════════════════════════════════════════════

export interface StartRecordingResult {
  success: boolean;
  recordingSid?: string;
  error?: string;
}

/**
 * Start recording an active call
 * @param callSid - The Twilio Call SID
 * @param recordingStatusCallback - URL to receive recording status webhooks
 */
export async function startCallRecording(
  callSid: string,
  recordingStatusCallback?: string
): Promise<StartRecordingResult> {
  try {
    const client = await getTwilioClient();

    const recordingParams: {
      recordingStatusCallback?: string;
      recordingStatusCallbackMethod?: string;
    } = {};

    if (recordingStatusCallback) {
      recordingParams.recordingStatusCallback = recordingStatusCallback;
      recordingParams.recordingStatusCallbackMethod = "POST";
    }

    const recording = await client
      .calls(callSid)
      .recordings.create(recordingParams);

    return {
      success: true,
      recordingSid: recording.sid,
    };
  } catch (error: unknown) {
    console.error("[Twilio] Start recording failed:", error);
    const twilioError = error as { code?: number; message?: string };
    const errorMessage = twilioError.message || (error instanceof Error ? error.message : "Failed to start recording");
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Stop recording an active call
 * @param callSid - The Twilio Call SID
 * @param recordingSid - The recording SID to stop (optional - stops all if not provided)
 */
export async function stopCallRecording(
  callSid: string,
  recordingSid?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getTwilioClient();

    if (recordingSid) {
      await client
        .calls(callSid)
        .recordings(recordingSid)
        .update({ status: "stopped" });
    } else {
      // Stop all recordings on the call
      const recordings = await client.calls(callSid).recordings.list();
      for (const recording of recordings) {
        if (recording.status === "in-progress") {
          await client
            .calls(callSid)
            .recordings(recording.sid)
            .update({ status: "stopped" });
        }
      }
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("[Twilio] Stop recording failed:", error);
    const twilioError = error as { code?: number; message?: string };
    return {
      success: false,
      error: twilioError.message || "Failed to stop recording",
    };
  }
}
