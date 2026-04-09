/**
 * OLIVIA BRAIN - UNIFIED TELEPHONY INTERFACE
 * ===========================================
 *
 * Single entry point for all telephony services.
 *
 * Features:
 * - SMS messaging (send/receive)
 * - Call recording with consent
 * - SIP trunking
 * - Status callbacks
 * - Barge-in handling
 * - Turn-taking policy
 */

export * from "./types";
export * from "./sms";
export * from "./recording";
export * from "./sip";
export * from "./callbacks";
export * from "./turn-taking";

import type { TelephonyServiceStatus } from "./types";
import { isSMSConfigured } from "./sms";
import { isRecordingConfigured } from "./recording";
import { isSIPConfigured } from "./sip";
import { getServerEnv } from "@/lib/config/env";

export function getTelephonyServiceStatus(): TelephonyServiceStatus {
  const env = getServerEnv();

  const voiceConfigured = Boolean(
    env.TWILIO_ACCOUNT_SID &&
    env.TWILIO_AUTH_TOKEN &&
    env.TWILIO_PHONE_NUMBER
  );

  return {
    sms: {
      configured: isSMSConfigured(),
      available: isSMSConfigured(),
    },
    voice: {
      configured: voiceConfigured,
      available: voiceConfigured,
    },
    sip: {
      configured: isSIPConfigured(),
      available: isSIPConfigured(),
    },
    recording: {
      configured: isRecordingConfigured(),
      available: isRecordingConfigured(),
    },
  };
}

/**
 * Check if any telephony service is configured
 */
export function isTelephonyConfigured(): boolean {
  const status = getTelephonyServiceStatus();
  return (
    status.sms.configured ||
    status.voice.configured ||
    status.sip.configured
  );
}
