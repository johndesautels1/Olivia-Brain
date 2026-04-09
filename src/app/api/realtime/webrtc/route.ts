/**
 * WEBRTC CONNECTION API
 * ======================
 *
 * Get WebRTC connection credentials for browser clients.
 *
 * POST /api/realtime/webrtc - Get LiveKit connection info
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getWebRTCConnectionInfo,
  getTransportServiceStatus,
} from "@/lib/realtime";
import type { PersonaId } from "@/lib/voice/types";

interface WebRTCRequest {
  personaId: PersonaId;
  roomName?: string;
  participantName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const status = getTransportServiceStatus();

    if (!status.livekit.configured) {
      return NextResponse.json(
        {
          error: "LiveKit not configured",
          message: "Set LIVEKIT_API_KEY and LIVEKIT_API_SECRET for WebRTC",
          configured: false,
        },
        { status: 503 }
      );
    }

    const body: WebRTCRequest = await request.json();
    const { personaId, roomName, participantName } = body;

    if (!personaId) {
      return NextResponse.json(
        { error: "personaId is required" },
        { status: 400 }
      );
    }

    const connectionInfo = await getWebRTCConnectionInfo({
      personaId,
      roomName,
      participantName,
    });

    return NextResponse.json({
      success: true,
      connection: {
        wsUrl: connectionInfo.wsUrl,
        token: connectionInfo.token,
        roomName: connectionInfo.roomName,
      },
      instructions: {
        client: "Use LiveKit client SDK to connect",
        example: "const room = new Room(); await room.connect(wsUrl, token);",
      },
    });
  } catch (error) {
    console.error("WebRTC connection error:", error);
    return NextResponse.json(
      {
        error: "Failed to get WebRTC credentials",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const status = getTransportServiceStatus();

  return NextResponse.json({
    service: "WebRTC Connection (LiveKit)",
    description: "Get WebRTC connection credentials for browser clients",
    configured: status.livekit.configured,
    usage: {
      method: "POST",
      body: {
        personaId: "Required: olivia | cristiano | emelia",
        roomName: "Optional: custom room name (auto-generated if not specified)",
        participantName: "Optional: participant display name",
      },
    },
    response: {
      wsUrl: "LiveKit WebSocket URL",
      token: "JWT access token for the room",
      roomName: "Room name to join",
    },
    clientSdk: "https://docs.livekit.io/client-sdk-js/",
  });
}
