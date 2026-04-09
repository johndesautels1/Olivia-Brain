/**
 * SMS API
 * ========
 *
 * Send and receive SMS messages.
 *
 * POST /api/telephony/sms - Send an SMS
 * GET /api/telephony/sms - Get SMS endpoint info
 */

import { NextRequest, NextResponse } from "next/server";
import {
  sendSMS,
  isSMSConfigured,
  parseInboundSMS,
  generateSMSResponse,
  isOptOutMessage,
  isOptInMessage,
} from "@/lib/telephony";

interface SendSMSRequest {
  to: string;
  body: string;
  from?: string;
  mediaUrl?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    // Handle inbound SMS webhook from Twilio
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      const inbound = parseInboundSMS(formData);

      // Check for opt-out/opt-in
      if (isOptOutMessage(inbound.body)) {
        return new NextResponse(
          generateSMSResponse("You have been unsubscribed. Reply START to resubscribe."),
          {
            headers: { "Content-Type": "text/xml" },
          }
        );
      }

      if (isOptInMessage(inbound.body)) {
        return new NextResponse(
          generateSMSResponse("Welcome back! You are now subscribed to messages."),
          {
            headers: { "Content-Type": "text/xml" },
          }
        );
      }

      // Auto-respond with Olivia
      const response = `Hi! This is Olivia from CLUES Intelligence. I received your message: "${inbound.body}". How can I help you today?`;

      return new NextResponse(generateSMSResponse(response), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Handle outbound SMS request
    if (!isSMSConfigured()) {
      return NextResponse.json(
        {
          error: "SMS not configured",
          message: "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER",
          configured: false,
        },
        { status: 503 }
      );
    }

    const body: SendSMSRequest = await request.json();
    const { to, body: messageBody, from, mediaUrl } = body;

    if (!to) {
      return NextResponse.json(
        { error: "to phone number is required" },
        { status: 400 }
      );
    }

    if (!messageBody) {
      return NextResponse.json(
        { error: "message body is required" },
        { status: 400 }
      );
    }

    const message = await sendSMS({
      to,
      body: messageBody,
      from,
      mediaUrl,
    });

    return NextResponse.json({
      success: true,
      message: {
        messageSid: message.messageSid,
        from: message.from,
        to: message.to,
        status: message.status,
        sentAt: message.sentAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error("SMS error:", error);
    return NextResponse.json(
      {
        error: "SMS failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const configured = isSMSConfigured();

  return NextResponse.json({
    service: "SMS Messaging",
    configured,
    usage: {
      send: {
        method: "POST",
        body: {
          to: "Required: Phone number (E.164 format)",
          body: "Required: Message text",
          from: "Optional: From number (defaults to configured number)",
          mediaUrl: "Optional: Array of media URLs for MMS",
        },
      },
      webhook: {
        description: "Twilio will POST to this endpoint for inbound SMS",
        contentType: "application/x-www-form-urlencoded",
      },
    },
    features: ["SMS", "MMS", "Opt-out handling", "Delivery tracking"],
  });
}
