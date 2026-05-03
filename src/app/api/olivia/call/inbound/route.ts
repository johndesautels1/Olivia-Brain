// src/app/api/olivia/call/inbound/route.ts
// Twilio webhook for incoming calls to Olivia
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
 * Build TwiML response for conversation
 */
function buildConversationTwiml(params: {
  audioUrl?: string;
  fallbackText?: string;
  conversationId: string;
  baseUrl: string;
  isGreeting?: boolean;
}): string {
  const { audioUrl, fallbackText, conversationId, baseUrl, isGreeting } = params;
  const gatherUrl = `${baseUrl}/api/olivia/call/gather?cid=${conversationId}`;
  const statusUrl = `${baseUrl}/api/olivia/call/status?cid=${conversationId}`;

  // For the greeting, add a recording consent message first
  const consentMessage = isGreeting
    ? `<Say voice="Polly.Amy" language="en-GB">This call may be recorded for quality purposes.</Say><Pause length="1"/>`
    : "";

  // Use ElevenLabs audio if available, otherwise use Polly TTS
  const speechContent = audioUrl
    ? `<Play>${escapeXml(audioUrl)}</Play>`
    : `<Say voice="Polly.Amy" language="en-GB">${escapeXml(fallbackText || "Hello, this is Olivia. How can I help you?")}</Say>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${consentMessage}
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
 * POST handler for Twilio inbound call webhook
 */
export async function POST(request: NextRequest) {
  try {
    // Parse Twilio webhook data (form-encoded)
    const formData = await request.formData();
    const callSid = formData.get("CallSid") as string;
    const from = formData.get("From") as string; // Caller's phone
    const to = formData.get("To") as string; // Our Twilio number
    const callStatus = formData.get("CallStatus") as string;

    console.log(`[Olivia Inbound] New call: ${callSid} from ${from?.slice(0, 6)}*** status=${callStatus}`);

    if (!callSid || !from || !to) {
      console.error("[Olivia Inbound] Missing required Twilio parameters");
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
    const existingConversation = await prisma.voiceConversation.findUnique({
      where: { callSid },
    });

    let conversationId: string;

    if (existingConversation) {
      conversationId = existingConversation.id;
      console.log(`[Olivia Inbound] Resuming existing conversation: ${conversationId}`);
    } else {
      // Create new VoiceConversation record
      const conversation = await prisma.voiceConversation.create({
        data: {
          callSid,
          direction: "inbound",
          callerPhone: from,
          calledPhone: to,
          startedAt: new Date(),
          conversationType: "general", // Will be updated as we learn more
          fullTranscript: "", // Will be built up as conversation progresses
          status: "in_progress",
        },
      });
      conversationId = conversation.id;
      console.log(`[Olivia Inbound] Created conversation: ${conversationId}`);

      // Try to find existing VoiceContact by phone
      const existingContact = await prisma.voiceContact.findFirst({
        where: { phone: from },
      });

      if (existingContact) {
        await prisma.voiceConversation.update({
          where: { id: conversationId },
          data: { voiceContactId: existingContact.id },
        });
        console.log(`[Olivia Inbound] Linked to existing contact: ${existingContact.id}`);
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
      console.log(`[Olivia Inbound] Recording started: ${recordingResult.recordingSid}`);
      // Store the recording SID immediately
      await prisma.voiceConversation.update({
        where: { id: conversationId },
        data: { recordingSid: recordingResult.recordingSid },
      });
    } else {
      console.warn(`[Olivia Inbound] Failed to start recording: ${recordingResult.error}`);
    }

    // Generate Olivia's greeting
    const greetingText = getGreeting("inbound");

    // Try to generate ElevenLabs audio for the greeting
    let audioUrl: string | undefined;

    if (isElevenLabsConfigured()) {
      try {
        // Create a temporary audio URL by encoding the greeting
        const encodedGreeting = Buffer.from(greetingText).toString("base64url");
        audioUrl = `${baseUrl}/api/olivia/call/audio?m=${encodedGreeting}`;
      } catch (err) {
        console.error("[Olivia Inbound] Failed to prepare audio URL:", err);
      }
    }

    // Build TwiML response
    const twiml = buildConversationTwiml({
      audioUrl,
      fallbackText: greetingText,
      conversationId,
      baseUrl,
      isGreeting: true,
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
    console.error("[Olivia Inbound] Error:", error);

    // Return error TwiML
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy" language="en-GB">I apologise, we're experiencing technical difficulties. Please try calling back later.</Say>
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
