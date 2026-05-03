// src/app/api/olivia/call/recording/route.ts
// Twilio webhook for call recording completion
// Also provides endpoint to fetch/stream recordings

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/client";

export const dynamic = "force-dynamic";

/**
 * POST - Twilio recording status webhook
 * Called when a recording is completed
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Twilio sends these fields for recording callbacks
    const callSid = formData.get("CallSid") as string | null;
    const recordingSid = formData.get("RecordingSid") as string | null;
    const recordingUrl = formData.get("RecordingUrl") as string | null;
    const recordingStatus = formData.get("RecordingStatus") as string | null;
    const recordingDuration = formData.get("RecordingDuration") as string | null;

    console.log(`[Olivia Recording] Webhook received: CallSid=${callSid}, RecordingSid=${recordingSid}, Status=${recordingStatus}`);

    if (!callSid) {
      console.error("[Olivia Recording] Missing CallSid in webhook");
      return NextResponse.json({ error: "Missing CallSid" }, { status: 400 });
    }

    // Find the conversation by callSid
    const conversation = await prisma.voiceConversation.findFirst({
      where: { callSid: callSid },
    });

    if (!conversation) {
      console.error(`[Olivia Recording] Conversation not found for CallSid: ${callSid}`);
      // Return 200 to prevent Twilio from retrying
      return NextResponse.json({ success: false, message: "Conversation not found" });
    }

    // Only process completed recordings
    if (recordingStatus === "completed" && recordingSid && recordingUrl) {
      // Store the recording info
      await prisma.voiceConversation.update({
        where: { id: conversation.id },
        data: {
          recordingSid,
          recordingUrl,
          // Update duration if provided
          ...(recordingDuration ? { durationSeconds: parseInt(recordingDuration, 10) } : {}),
        },
      });

      console.log(`[Olivia Recording] Stored recording for conversation ${conversation.id}: ${recordingUrl}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Olivia Recording] Webhook error:", error);
    // Return 200 to prevent Twilio from retrying
    return NextResponse.json({ success: false, error: "Internal error" });
  }
}

/**
 * GET - Fetch recording info or stream the recording
 * Query params:
 *   - cid: Conversation ID (required)
 *   - stream: If true, proxy the recording audio
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("cid");
    const shouldStream = searchParams.get("stream") === "true";

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversation ID" }, { status: 400 });
    }

    const conversation = await prisma.voiceConversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        recordingSid: true,
        recordingUrl: true,
        durationSeconds: true,
        callerPhone: true,
        startedAt: true,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (!conversation.recordingUrl) {
      return NextResponse.json({ error: "No recording available" }, { status: 404 });
    }

    // If streaming requested, proxy the audio from Twilio
    if (shouldStream) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;

      if (!accountSid || !authToken) {
        return NextResponse.json({ error: "Twilio not configured" }, { status: 503 });
      }

      // Build authenticated Twilio URL for the recording
      // Twilio recordings are accessible at: {recordingUrl}.mp3
      const audioUrl = `${conversation.recordingUrl}.mp3`;

      // Fetch from Twilio with authentication
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
      const audioResponse = await fetch(audioUrl, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      });

      if (!audioResponse.ok) {
        console.error(`[Olivia Recording] Failed to fetch recording: ${audioResponse.status}`);
        return NextResponse.json({ error: "Failed to fetch recording" }, { status: 500 });
      }

      // Stream the audio back
      const audioBuffer = await audioResponse.arrayBuffer();
      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": audioBuffer.byteLength.toString(),
          "Content-Disposition": `inline; filename="recording-${conversation.id}.mp3"`,
        },
      });
    }

    // Return recording metadata
    return NextResponse.json({
      conversationId: conversation.id,
      recordingSid: conversation.recordingSid,
      recordingUrl: conversation.recordingUrl,
      durationSeconds: conversation.durationSeconds,
      callerPhone: conversation.callerPhone,
      startedAt: conversation.startedAt,
      streamUrl: `/api/olivia/call/recording?cid=${conversation.id}&stream=true`,
    });
  } catch (error) {
    console.error("[Olivia Recording] GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
