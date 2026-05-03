// src/app/api/olivia/call/route.ts
// API route for Olivia to make outbound voice calls
// POST: Initiate a voice call with Olivia's ElevenLabs voice

import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// E.164 phone number validation regex
// Matches: +1234567890 or 1234567890 (7-15 digits)
const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/;

// Inline env check to avoid module loading issues
function checkTwilioConfig() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const phone = process.env.TWILIO_PHONE_NUMBER;
  return { configured: !!(sid && token && phone), sid, token, phone };
}

function checkElevenLabsConfig() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_OLIVIA_VOICE_ID;
  return { configured: !!(apiKey && voiceId), apiKey, voiceId };
}

export async function POST(request: NextRequest) {
  // Rate limit: 5 calls per minute (calls are expensive)
  const limited = rateLimit(request, {
    limit: 5,
    windowMs: 60_000,
    prefix: "olivia-call",
  });
  if (limited) return limited;

  try {
    // Auth check
    const { userId } = await getAuthSession();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check Twilio configuration
    const twilioConfig = checkTwilioConfig();
    if (!twilioConfig.configured) {
      return NextResponse.json(
        { error: "Voice service not configured (Twilio)" },
        { status: 503 }
      );
    }

    // Check ElevenLabs configuration
    const elevenLabsConfig = checkElevenLabsConfig();
    if (!elevenLabsConfig.configured) {
      return NextResponse.json(
        { error: "Voice service not configured (ElevenLabs)" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { to, message, conversation, conversationType, purpose } = body;

    // Validate phone number
    if (!to) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Validate phone number format (E.164)
    const cleanPhone = to.replace(/[\s\-\(\)]/g, ""); // Remove formatting
    if (!PHONE_REGEX.test(cleanPhone)) {
      return NextResponse.json(
        { error: "Invalid phone number format. Use international format (e.g., +447123456789)" },
        { status: 400 }
      );
    }

    // For conversation mode, message is optional (will use default greeting)
    // For one-way mode, message is required
    if (!conversation && (!message || typeof message !== "string" || message.trim().length === 0)) {
      return NextResponse.json(
        { error: "Message is required for one-way calls" },
        { status: 400 }
      );
    }

    if (message && message.length > 2000) {
      return NextResponse.json(
        { error: "Message too long (max 2000 characters)" },
        { status: 400 }
      );
    }

    // Get the base URL for the TwiML webhook
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      `https://${request.headers.get("host")}`;

    let twimlUrl: string;

    if (conversation) {
      // Bi-directional conversation mode
      // Use the outbound conversation endpoint
      const params = new URLSearchParams();
      params.set("type", conversationType || "general");
      if (message) {
        params.set("msg", Buffer.from(message.trim()).toString("base64url"));
      }
      if (purpose) {
        params.set("purpose", purpose);
      }
      twimlUrl = `${baseUrl}/api/olivia/call/outbound?${params.toString()}`;
    } else {
      // One-way message mode (original behavior)
      const encodedMessage = Buffer.from(message.trim()).toString("base64url");
      twimlUrl = `${baseUrl}/api/olivia/call/twiml?m=${encodedMessage}`;
    }

    // Lazy import Twilio functions
    const { makeOliviaCall, makeCall } = await import("@/lib/twilio/client");

    // Initiate the call
    // For conversation mode, include status callback
    let result;
    if (conversation) {
      const statusCallbackUrl = `${baseUrl}/api/olivia/call/status`;
      result = await makeCall({
        to,
        twimlUrl,
        statusCallback: statusCallbackUrl,
        record: true, // Enable recording for conversation calls
        timeout: 30,
      });
    } else {
      result = await makeOliviaCall(to, twimlUrl);
    }

    if (result.success) {
      console.log(`[Olivia Call] Initiated ${conversation ? "conversation" : "one-way"} call to ${to.slice(0, 6)}*** - CallSID: ${result.callSid}`);

      return NextResponse.json({
        success: true,
        callSid: result.callSid,
        mode: conversation ? "conversation" : "one-way",
        conversationType: conversation ? (conversationType || "general") : undefined,
      });
    } else {
      return NextResponse.json(
        { error: result.error || "Failed to initiate call" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[Olivia Call] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: Check voice call service status
export async function GET() {
  const twilioConfig = checkTwilioConfig();
  const elevenLabsConfig = checkElevenLabsConfig();

  return NextResponse.json({
    configured: twilioConfig.configured && elevenLabsConfig.configured,
    twilio: {
      configured: twilioConfig.configured,
      phoneNumber: twilioConfig.configured ? twilioConfig.phone : null,
    },
    elevenlabs: {
      configured: elevenLabsConfig.configured,
    },
  });
}
