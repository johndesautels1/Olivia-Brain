/**
 * OLIVIA BRAIN - STATUS CALLBACKS
 * ================================
 *
 * Handle Twilio status callbacks for calls, SMS, and recordings.
 */

import type { CallStatus, SMSStatus, PhoneCall, SMSMessage } from "./types";

/**
 * Call status callback payload
 */
export interface CallStatusCallback {
  CallSid: string;
  AccountSid: string;
  From: string;
  To: string;
  CallStatus: CallStatus;
  Direction: "inbound" | "outbound-api" | "outbound-dial";
  ApiVersion: string;
  CallDuration?: string;
  RecordingUrl?: string;
  RecordingSid?: string;
  RecordingDuration?: string;
  Timestamp?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

/**
 * SMS status callback payload
 */
export interface SMSStatusCallback {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  MessageStatus: SMSStatus;
  ErrorCode?: string;
  ErrorMessage?: string;
}

/**
 * Recording status callback payload
 */
export interface RecordingStatusCallback {
  RecordingSid: string;
  RecordingUrl: string;
  RecordingStatus: "in-progress" | "completed" | "absent" | "failed";
  RecordingDuration: string;
  RecordingChannels: string;
  RecordingSource: "DialVerb" | "Conference" | "OutboundAPI" | "Trunking";
  CallSid: string;
  AccountSid: string;
}

/**
 * Parse call status callback from form data
 */
export function parseCallStatusCallback(formData: FormData): CallStatusCallback {
  return {
    CallSid: formData.get("CallSid") as string,
    AccountSid: formData.get("AccountSid") as string,
    From: formData.get("From") as string,
    To: formData.get("To") as string,
    CallStatus: formData.get("CallStatus") as CallStatus,
    Direction: formData.get("Direction") as "inbound" | "outbound-api" | "outbound-dial",
    ApiVersion: formData.get("ApiVersion") as string,
    CallDuration: formData.get("CallDuration") as string | undefined,
    RecordingUrl: formData.get("RecordingUrl") as string | undefined,
    RecordingSid: formData.get("RecordingSid") as string | undefined,
    RecordingDuration: formData.get("RecordingDuration") as string | undefined,
    Timestamp: formData.get("Timestamp") as string | undefined,
    ErrorCode: formData.get("ErrorCode") as string | undefined,
    ErrorMessage: formData.get("ErrorMessage") as string | undefined,
  };
}

/**
 * Parse SMS status callback from form data
 */
export function parseSMSStatusCallback(formData: FormData): SMSStatusCallback {
  return {
    MessageSid: formData.get("MessageSid") as string,
    AccountSid: formData.get("AccountSid") as string,
    From: formData.get("From") as string,
    To: formData.get("To") as string,
    MessageStatus: formData.get("MessageStatus") as SMSStatus,
    ErrorCode: formData.get("ErrorCode") as string | undefined,
    ErrorMessage: formData.get("ErrorMessage") as string | undefined,
  };
}

/**
 * Parse recording status callback from form data
 */
export function parseRecordingStatusCallback(formData: FormData): RecordingStatusCallback {
  return {
    RecordingSid: formData.get("RecordingSid") as string,
    RecordingUrl: formData.get("RecordingUrl") as string,
    RecordingStatus: formData.get("RecordingStatus") as "in-progress" | "completed" | "absent" | "failed",
    RecordingDuration: formData.get("RecordingDuration") as string,
    RecordingChannels: formData.get("RecordingChannels") as string,
    RecordingSource: formData.get("RecordingSource") as "DialVerb" | "Conference" | "OutboundAPI" | "Trunking",
    CallSid: formData.get("CallSid") as string,
    AccountSid: formData.get("AccountSid") as string,
  };
}

/**
 * Convert callback to PhoneCall object
 */
export function callbackToPhoneCall(callback: CallStatusCallback): Partial<PhoneCall> {
  return {
    callSid: callback.CallSid,
    accountSid: callback.AccountSid,
    from: callback.From,
    to: callback.To,
    status: callback.CallStatus,
    direction: callback.Direction === "inbound" ? "inbound" : "outbound",
    duration: callback.CallDuration ? parseInt(callback.CallDuration, 10) : undefined,
    recordingUrl: callback.RecordingUrl,
  };
}

/**
 * Convert callback to SMSMessage object
 */
export function callbackToSMSMessage(callback: SMSStatusCallback): Partial<SMSMessage> {
  return {
    messageSid: callback.MessageSid,
    accountSid: callback.AccountSid,
    from: callback.From,
    to: callback.To,
    status: callback.MessageStatus,
    errorCode: callback.ErrorCode,
    errorMessage: callback.ErrorMessage,
  };
}

/**
 * Validate Twilio webhook signature
 */
export function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  const crypto = require("crypto");

  // Build the data string
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  // Calculate expected signature
  const expectedSignature = crypto
    .createHmac("sha1", authToken)
    .update(data)
    .digest("base64");

  return signature === expectedSignature;
}

/**
 * Handle call completion event
 */
export type CallCompletionHandler = (call: Partial<PhoneCall>) => Promise<void>;

/**
 * Handle SMS delivery event
 */
export type SMSDeliveryHandler = (message: Partial<SMSMessage>) => Promise<void>;

/**
 * Handle recording completion event
 */
export type RecordingCompletionHandler = (
  recording: RecordingStatusCallback
) => Promise<void>;

/**
 * Callback registry for event handlers
 */
export const callbackHandlers: {
  onCallStatus: CallCompletionHandler[];
  onSMSStatus: SMSDeliveryHandler[];
  onRecordingStatus: RecordingCompletionHandler[];
} = {
  onCallStatus: [],
  onSMSStatus: [],
  onRecordingStatus: [],
};

export function registerCallStatusHandler(handler: CallCompletionHandler): void {
  callbackHandlers.onCallStatus.push(handler);
}

export function registerSMSStatusHandler(handler: SMSDeliveryHandler): void {
  callbackHandlers.onSMSStatus.push(handler);
}

export function registerRecordingStatusHandler(handler: RecordingCompletionHandler): void {
  callbackHandlers.onRecordingStatus.push(handler);
}
