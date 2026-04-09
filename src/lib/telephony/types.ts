/**
 * OLIVIA BRAIN - TELEPHONY TYPES
 * ===============================
 *
 * Shared types for telephony services (SMS, calls, SIP).
 */

import type { PersonaId } from "@/lib/voice/types";

export type CallDirection = "inbound" | "outbound";
export type CallStatus =
  | "queued"
  | "ringing"
  | "in-progress"
  | "completed"
  | "busy"
  | "failed"
  | "no-answer"
  | "canceled";

export type SMSStatus =
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "failed"
  | "undelivered";

export interface PhoneCall {
  callSid: string;
  accountSid: string;
  from: string;
  to: string;
  direction: CallDirection;
  status: CallStatus;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  recordingUrl?: string;
  transcriptUrl?: string;
  personaId?: PersonaId;
  conversationId?: string;
}

export interface SMSMessage {
  messageSid: string;
  accountSid: string;
  from: string;
  to: string;
  body: string;
  status: SMSStatus;
  direction: CallDirection;
  sentAt?: Date;
  deliveredAt?: Date;
  errorCode?: string;
  errorMessage?: string;
  personaId?: PersonaId;
  conversationId?: string;
}

export interface RecordingConsent {
  callSid: string;
  consentGiven: boolean;
  consentMethod: "verbal" | "dtmf" | "pre-authorized";
  timestamp: Date;
  consentText?: string;
}

export interface BargeInEvent {
  callSid: string;
  timestamp: Date;
  interruptedText: string;
  userInput: string;
  action: "stop" | "pause" | "ignore";
}

export interface TurnTakingState {
  currentSpeaker: "agent" | "user" | "none";
  silenceDurationMs: number;
  lastSpeechEndTime: Date;
  turnCount: number;
  isUserInterrupting: boolean;
}

export interface SIPConfig {
  trunkSid: string;
  domain: string;
  username?: string;
  password?: string;
  originationUri?: string;
  terminationUri?: string;
}

export interface TelephonyServiceStatus {
  sms: { configured: boolean; available: boolean };
  voice: { configured: boolean; available: boolean };
  sip: { configured: boolean; available: boolean };
  recording: { configured: boolean; available: boolean };
}
