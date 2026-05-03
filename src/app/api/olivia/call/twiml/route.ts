// src/app/api/olivia/call/twiml/route.ts
// TwiML webhook for Olivia voice calls
// Returns TwiML that plays Olivia's audio message

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

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

export async function POST(request: NextRequest) {
  return handleTwiml(request);
}

export async function GET(request: NextRequest) {
  return handleTwiml(request);
}

async function handleTwiml(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const encodedMessage = searchParams.get("m");

    if (!encodedMessage) {
      // Return TwiML with error message
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-GB">Sorry, there was an error with this call. Please try again later.</Say>
  <Hangup/>
</Response>`;
      return new NextResponse(twiml, {
        status: 200,
        headers: {
          "Content-Type": "text/xml",
        },
      });
    }

    // Get the base URL for the audio endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      `https://${request.headers.get("host")}`;

    // Create the audio URL with the same encoded message
    const audioUrl = `${baseUrl}/api/olivia/call/audio?m=${encodedMessage}`;

    // Return TwiML that plays the audio
    // First play a brief pause, then the audio, then hang up
    // Note: URL is escaped to prevent XML injection
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Play>${escapeXml(audioUrl)}</Play>
  <Pause length="1"/>
  <Hangup/>
</Response>`;

    return new NextResponse(twiml, {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  } catch (error) {
    console.error("[Olivia TwiML] Error:", error);

    // Return error TwiML
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-GB">Sorry, there was an error. Goodbye.</Say>
  <Hangup/>
</Response>`;

    return new NextResponse(twiml, {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  }
}
