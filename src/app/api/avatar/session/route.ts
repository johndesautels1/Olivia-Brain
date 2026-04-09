/**
 * AVATAR SESSION API
 * ===================
 *
 * Create and manage realtime avatar sessions for interactive conversations.
 *
 * POST /api/avatar/session - Create a new realtime avatar session
 * GET /api/avatar/session - Get session creation info
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createAvatarSession,
  getAvatarServiceStatus,
  getAvatarIdentity,
} from "@/lib/avatar";
import type { PersonaId } from "@/lib/voice/types";

interface SessionRequest {
  personaId: PersonaId;
}

export async function POST(request: NextRequest) {
  try {
    const status = getAvatarServiceStatus();

    const realtimeConfigured = status.simli.configured || status.did.configured;

    if (!realtimeConfigured) {
      return NextResponse.json(
        {
          error: "No realtime avatar provider configured",
          message: "Set SIMLI_API_KEY or DID_API_KEY for realtime sessions",
          configured: false,
        },
        { status: 503 }
      );
    }

    const body: SessionRequest = await request.json();
    const { personaId } = body;

    if (!personaId) {
      return NextResponse.json(
        { error: "personaId is required" },
        { status: 400 }
      );
    }

    const identity = getAvatarIdentity(personaId);
    if (!identity) {
      return NextResponse.json(
        { error: `Unknown persona: ${personaId}` },
        { status: 400 }
      );
    }

    // Emelia is voice-only
    if (personaId === "emelia") {
      return NextResponse.json(
        {
          error: "Emelia™ is voice-only",
          message: "Emelia does not support video sessions. Use voice-only mode.",
        },
        { status: 400 }
      );
    }

    const session = await createAvatarSession({
      personaId,
    });

    return NextResponse.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        personaId: session.personaId,
        provider: session.provider,
        status: session.status,
        videoStreamUrl: session.videoStreamUrl,
        audioStreamUrl: session.audioStreamUrl,
        createdAt: session.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Avatar session error:", error);
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
  const status = getAvatarServiceStatus();

  return NextResponse.json({
    service: "Avatar Realtime Sessions",
    description: "Create interactive avatar sessions for real-time conversations",
    configured: status.simli.configured || status.did.configured,
    providers: {
      primary: {
        name: "Simli",
        configured: status.simli.configured,
        features: ["Real-time lip sync", "Low latency", "WebRTC"],
      },
      fallback: {
        name: "D-ID Streams",
        configured: status.did.configured,
        features: ["Interactive streaming", "Text-to-video"],
      },
    },
    usage: {
      method: "POST",
      body: { personaId: "olivia | cristiano" },
    },
    response: {
      sessionId: "Unique session identifier",
      videoStreamUrl: "WebRTC/streaming URL for video",
      audioStreamUrl: "Audio input URL (if applicable)",
    },
    note: "Sessions are for realtime interaction. Use /api/avatar/generate for async video.",
  });
}
