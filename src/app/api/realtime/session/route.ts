/**
 * REALTIME SESSION API
 * =====================
 *
 * Create and manage realtime conversation sessions.
 *
 * POST /api/realtime/session - Create a new session
 * GET /api/realtime/session - Get session creation info
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createRealtimeSession,
  getTransportServiceStatus,
  selectTransportProvider,
  type SessionMode,
  type TransportProvider,
} from "@/lib/realtime";
import type { PersonaId } from "@/lib/voice/types";

interface SessionRequest {
  personaId: PersonaId;
  mode?: SessionMode;
  provider?: TransportProvider;
  phoneNumber?: string;
  metadata?: Record<string, string>;
}

export async function POST(request: NextRequest) {
  try {
    const status = getTransportServiceStatus();

    const anyConfigured =
      status.livekit.configured ||
      status.twilio.configured ||
      status.vapi.configured ||
      status.retell.configured;

    if (!anyConfigured) {
      return NextResponse.json(
        {
          error: "No realtime transport configured",
          message:
            "Set LIVEKIT_API_KEY, TWILIO credentials, VAPI_API_KEY, or RETELL_API_KEY",
          configured: false,
        },
        { status: 503 }
      );
    }

    const body: SessionRequest = await request.json();
    const { personaId, mode = "voice-video", provider, phoneNumber, metadata } = body;

    if (!personaId) {
      return NextResponse.json(
        { error: "personaId is required" },
        { status: 400 }
      );
    }

    // Validate phone number for phone providers
    if (
      (provider === "twilio" || provider === "retell") &&
      !phoneNumber
    ) {
      return NextResponse.json(
        { error: "phoneNumber is required for phone-based sessions" },
        { status: 400 }
      );
    }

    const selectedProvider = provider ?? selectTransportProvider(mode);

    if (!selectedProvider) {
      return NextResponse.json(
        {
          error: "No suitable transport provider available",
          requestedMode: mode,
        },
        { status: 503 }
      );
    }

    const session = await createRealtimeSession({
      personaId,
      mode,
      provider: selectedProvider,
      phoneNumber,
      metadata,
    });

    return NextResponse.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        personaId: session.personaId,
        provider: session.provider,
        mode: session.mode,
        status: session.status,
        roomName: session.roomName,
        phoneNumber: session.phoneNumber,
        callSid: session.callSid,
        createdAt: session.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Realtime session error:", error);
    return NextResponse.json(
      {
        error: "Session creation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const status = getTransportServiceStatus();

  return NextResponse.json({
    service: "Realtime Session Management",
    description: "Create and manage realtime conversation sessions",
    configured:
      status.livekit.configured ||
      status.twilio.configured ||
      status.vapi.configured ||
      status.retell.configured,
    providers: status,
    usage: {
      method: "POST",
      body: {
        personaId: "Required: olivia | cristiano | emelia",
        mode: "Optional: voice-video | voice-only | text-only (default: voice-video)",
        provider: "Optional: livekit | twilio | vapi | retell (auto-selected if not specified)",
        phoneNumber: "Required for twilio/retell providers",
        metadata: "Optional: key-value pairs for tracking",
      },
    },
    modes: {
      "voice-video": "Full avatar experience (LiveKit preferred)",
      "voice-only": "Audio conversation only (phone providers preferred)",
      "text-only": "Text chat with optional TTS",
    },
  });
}
