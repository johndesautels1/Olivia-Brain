/**
 * REALTIME TRANSPORT STATUS API
 * ==============================
 *
 * Status and health check for all realtime transport services.
 *
 * GET /api/realtime - Get transport service status
 */

import { NextResponse } from "next/server";
import {
  getTransportServiceStatus,
  getPipelineHealthTargets,
} from "@/lib/realtime";

export async function GET() {
  const status = getTransportServiceStatus();
  const pipelineTargets = getPipelineHealthTargets();

  const webReady = status.livekit.configured;
  const phoneReady =
    status.twilio.configured ||
    status.vapi.configured ||
    status.retell.configured;

  return NextResponse.json({
    service: "Olivia Realtime Transport",
    phase: "2.3 - Realtime Transport",
    ready: webReady || phoneReady,
    web: {
      ready: webReady,
      provider: {
        name: "LiveKit",
        configured: status.livekit.configured,
        features: ["WebRTC", "Low latency", "Video support", "Recording"],
      },
    },
    phone: {
      ready: phoneReady,
      providers: [
        {
          name: "Twilio ConversationRelay",
          configured: status.twilio.configured,
          direction: "bidirectional",
          features: ["Inbound/Outbound", "Recording", "DTMF"],
        },
        {
          name: "Vapi",
          configured: status.vapi.configured,
          direction: "inbound",
          features: ["AI phone agents", "Function calling", "Webhooks"],
        },
        {
          name: "Retell AI",
          configured: status.retell.configured,
          direction: "outbound",
          features: ["Ultra-low latency", "Custom LLM", "Call scheduling"],
        },
      ],
    },
    pipeline: {
      target: "sub-800ms TTFB",
      stages: [
        { name: "STT", target: `${pipelineTargets.target.sttLatencyMs}ms`, provider: "Deepgram" },
        { name: "LLM", target: `${pipelineTargets.target.llmLatencyMs}ms`, provider: "9-model cascade" },
        { name: "TTS", target: `${pipelineTargets.target.ttsLatencyMs}ms`, provider: "ElevenLabs" },
        { name: "Avatar", target: `${pipelineTargets.target.avatarLatencyMs}ms`, provider: "Simli" },
      ],
      acceptable: pipelineTargets.acceptable,
    },
    endpoints: {
      status: "GET /api/realtime",
      session: "POST /api/realtime/session",
      webrtc: "POST /api/realtime/webrtc",
    },
  });
}
