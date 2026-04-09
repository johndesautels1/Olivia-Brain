/**
 * TELEPHONY SERVICE STATUS API
 * =============================
 *
 * Status and health check for all telephony services.
 *
 * GET /api/telephony - Get telephony service status
 */

import { NextResponse } from "next/server";
import { getTelephonyServiceStatus, DEFAULT_TURN_TAKING_CONFIG } from "@/lib/telephony";

export async function GET() {
  const status = getTelephonyServiceStatus();

  return NextResponse.json({
    service: "Olivia Telephony",
    phase: "2.4 - Telephony Completion",
    ready:
      status.sms.configured ||
      status.voice.configured ||
      status.sip.configured,
    services: {
      sms: {
        configured: status.sms.configured,
        features: ["Send/Receive", "MMS", "Delivery tracking", "Opt-out handling"],
      },
      voice: {
        configured: status.voice.configured,
        features: ["Inbound/Outbound", "Recording", "Transcription"],
      },
      sip: {
        configured: status.sip.configured,
        features: ["SIP trunking", "Origination", "Termination"],
      },
      recording: {
        configured: status.recording.configured,
        features: ["Consent flows", "Storage", "GDPR deletion"],
      },
    },
    turnTaking: {
      enabled: true,
      config: {
        minSilenceForTurnEnd: `${DEFAULT_TURN_TAKING_CONFIG.minSilenceForTurnEnd}ms`,
        maxSilenceBeforePrompt: `${DEFAULT_TURN_TAKING_CONFIG.maxSilenceBeforePrompt}ms`,
        bargeInEnabled: DEFAULT_TURN_TAKING_CONFIG.bargeInEnabled,
        backchannelEnabled: DEFAULT_TURN_TAKING_CONFIG.enableBackchannel,
      },
    },
    endpoints: {
      status: "GET /api/telephony",
      sms: "POST /api/telephony/sms",
      callbacks: "POST /api/telephony/callbacks/*",
    },
  });
}
