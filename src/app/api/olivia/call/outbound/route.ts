// src/app/api/olivia/call/outbound/route.ts
// Twilio webhook for outbound Olivia calls in conversation mode
// Creates VoiceConversation record and returns TwiML to start conversation loop

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/client";
import { getGreeting } from "@/lib/olivia/voice-conversation";
import { isElevenLabsConfigured } from "@/lib/elevenlabs/client";
import { startCallRecording } from "@/lib/twilio/client";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Escape special XML characters to prevent injection
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Build TwiML response for outbound conversation
 */
function buildConversationTwiml(params: {
  audioUrl?: string;
  fallbackText?: string;
  conversationId: string;
  baseUrl: string;
}): string {
  const { audioUrl, fallbackText, conversationId, baseUrl } = params;
  const gatherUrl = `${baseUrl}/api/olivia/call/gather?cid=${conversationId}`;

  // Use ElevenLabs audio if available, otherwise use Polly TTS
  const speechContent = audioUrl
    ? `<Play>${escapeXml(audioUrl)}</Play>`
    : `<Say voice="Polly.Amy" language="en-GB">${escapeXml(fallbackText || "Hello, this is Olivia from London Tech Map.")}</Say>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${speechContent}
  <Gather input="speech"
          action="${escapeXml(gatherUrl)}"
          method="POST"
          speechTimeout="auto"
          speechModel="phone_call"
          enhanced="true"
          language="en-GB">
  </Gather>
  <Say voice="Polly.Amy" language="en-GB">I didn't hear anything. Are you still there?</Say>
  <Redirect method="POST">${escapeXml(gatherUrl)}&amp;silence=true</Redirect>
</Response>`;
}

/**
 * POST handler for Twilio outbound call webhook
 * Called when an outbound conversation call is answered
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationType = searchParams.get("type") || "general";
    const initialMessage = searchParams.get("msg"); // Base64url encoded initial message
    const purpose = searchParams.get("purpose"); // Purpose of the call

    // Parse Twilio webhook data
    const formData = await request.formData();
    const callSid = formData.get("CallSid") as string;
    const to = formData.get("To") as string; // Called party
    const from = formData.get("From") as string; // Our Twilio number
    const callStatus = formData.get("CallStatus") as string;

    console.log(`[Olivia Outbound] Call answered: ${callSid} to ${to?.slice(0, 6)}*** status=${callStatus}`);

    if (!callSid || !to || !from) {
      console.error("[Olivia Outbound] Missing required Twilio parameters");
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy" language="en-GB">Sorry, there was an error with this call.</Say>
  <Hangup/>
</Response>`,
        { status: 200, headers: { "Content-Type": "text/xml" } }
      );
    }

    // Check if conversation already exists (Twilio may retry)
    let conversation = await prisma.voiceConversation.findUnique({
      where: { callSid },
    });

    let conversationId: string;

    if (conversation) {
      conversationId = conversation.id;
      console.log(`[Olivia Outbound] Resuming existing conversation: ${conversationId}`);
    } else {
      // Create new VoiceConversation record for outbound call
      conversation = await prisma.voiceConversation.create({
        data: {
          callSid,
          direction: "outbound",
          callerPhone: from, // Olivia's number
          calledPhone: to, // Recipient's number
          startedAt: new Date(),
          conversationType,
          fullTranscript: "",
          status: "in_progress",
          extractedData: purpose ? { purpose } : {},
        },
      });
      conversationId = conversation.id;
      console.log(`[Olivia Outbound] Created conversation: ${conversationId}`);

      // Try to find existing VoiceContact by phone
      const existingContact = await prisma.voiceContact.findFirst({
        where: { phone: to },
      });

      if (existingContact) {
        await prisma.voiceConversation.update({
          where: { id: conversationId },
          data: { voiceContactId: existingContact.id },
        });
        console.log(`[Olivia Outbound] Linked to existing contact: ${existingContact.id}`);
      }
    }

    // Get base URL for callbacks
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      `https://${request.headers.get("host")}`;

    // Start call recording
    const recordingCallbackUrl = `${baseUrl}/api/olivia/call/recording`;
    const recordingResult = await startCallRecording(callSid, recordingCallbackUrl);

    if (recordingResult.success) {
      console.log(`[Olivia Outbound] Recording started: ${recordingResult.recordingSid}`);
      await prisma.voiceConversation.update({
        where: { id: conversationId },
        data: { recordingSid: recordingResult.recordingSid },
      });
    } else {
      console.warn(`[Olivia Outbound] Failed to start recording: ${recordingResult.error}`);
    }

    // Determine greeting based on conversation type
    let greetingText: string;

    if (initialMessage) {
      // Decode custom initial message
      try {
        greetingText = Buffer.from(initialMessage, "base64url").toString("utf-8");
      } catch {
        greetingText = getGreeting("outbound", conversationType);
      }
    } else {
      greetingText = getGreeting("outbound", conversationType);
    }

    // Generate ElevenLabs audio URL if configured
    let audioUrl: string | undefined;
    if (isElevenLabsConfigured()) {
      const encodedGreeting = Buffer.from(greetingText).toString("base64url");
      audioUrl = `${baseUrl}/api/olivia/call/audio?m=${encodedGreeting}`;
    }

    // Build TwiML response
    const twiml = buildConversationTwiml({
      audioUrl,
      fallbackText: greetingText,
      conversationId,
      baseUrl,
    });

    // Update transcript with Olivia's greeting
    await prisma.voiceConversation.update({
      where: { id: conversationId },
      data: {
        fullTranscript: `Olivia: ${greetingText}`,
      },
    });

    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("[Olivia Outbound] Error:", error);

    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy" language="en-GB">I apologise, we're experiencing technical difficulties. Goodbye.</Say>
  <Hangup/>
</Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  }
}

// Also handle GET for Twilio testing
export async function GET(request: NextRequest) {
  return POST(request);
}
