/**
 * AVATAR SERVICE STATUS API
 * ==========================
 *
 * Status and health check for all avatar services.
 *
 * GET /api/avatar - Get avatar service status and persona info
 */

import { NextResponse } from "next/server";
import {
  getAvatarServiceStatus,
  getAllAvatarIdentities,
} from "@/lib/avatar";

export async function GET() {
  const status = getAvatarServiceStatus();
  const identities = getAllAvatarIdentities();

  const realtimeReady = status.simli.configured || status.did.configured;
  const asyncReady =
    status.sadtalker.configured ||
    status.heygen.configured ||
    status.did.configured;

  return NextResponse.json({
    service: "Olivia Avatar Layer",
    phase: "2.2 - Avatar Layer",
    ready: realtimeReady || asyncReady,
    governingPrinciple: "The avatar is the face, not the brain.",
    realtime: {
      ready: realtimeReady,
      primary: {
        provider: "Simli",
        configured: status.simli.configured,
        features: ["Real-time lip sync", "Low latency", "WebRTC output"],
      },
      fallback: {
        provider: "D-ID Streams",
        configured: status.did.configured,
        features: ["Interactive sessions", "Streaming video"],
      },
    },
    async: {
      ready: asyncReady,
      providers: [
        {
          name: "SadTalker (Replicate)",
          configured: status.sadtalker.configured,
          useCase: "Cristiano™ Judge verdict presentations",
        },
        {
          name: "HeyGen",
          configured: status.heygen.configured,
          useCase: "Branded video generation, marketing content",
        },
        {
          name: "D-ID",
          configured: status.did.configured,
          useCase: "Fallback video generation",
        },
      ],
    },
    personas: identities.map((identity) => ({
      id: identity.personaId,
      name: identity.name,
      role: identity.role,
      primaryProvider: identity.primaryProvider,
      fallbackProviders: identity.fallbackProviders,
      defaultEmotion: identity.defaultEmotion,
      allowedEmotions: identity.allowedEmotions,
      hasVideoAvatar: identity.personaId !== "emelia",
    })),
    endpoints: {
      status: "GET /api/avatar",
      generate: "POST /api/avatar/generate",
      session: "POST /api/avatar/session",
    },
  });
}
