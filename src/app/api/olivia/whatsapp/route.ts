// src/app/api/olivia/whatsapp/route.ts
// API route for Olivia to send WhatsApp messages
// POST: Send WhatsApp to a user

import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";

// Inline env check to avoid module loading issues
function checkWhatsAppConfig() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const phone = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER;
  return { configured: !!(sid && token && phone), phone };
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const { userId } = await getAuthSession();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check WhatsApp configuration
    const config = checkWhatsAppConfig();
    if (!config.configured) {
      return NextResponse.json(
        { error: "WhatsApp service not configured" },
        { status: 503 }
      );
    }

    // Lazy import Twilio functions
    const { sendOliviaWhatsApp, sendCalendarReminderWhatsApp } = await import("@/lib/twilio/client");

    const body = await request.json();
    const { type, phoneNumber, to, message, eventTitle, eventTime, location, minutesBefore } = body;

    // Accept both 'to' and 'phoneNumber' for flexibility
    const phone = phoneNumber || to;

    // Validate phone number
    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case "reminder":
        // Calendar reminder
        if (!eventTitle || !eventTime) {
          return NextResponse.json(
            { error: "eventTitle and eventTime required for reminder" },
            { status: 400 }
          );
        }
        result = await sendCalendarReminderWhatsApp(phone, {
          eventTitle,
          eventTime: new Date(eventTime),
          location,
          minutesBefore: minutesBefore || 15,
        });
        break;

      case "custom":
      default:
        // Custom message from Olivia
        if (!message) {
          return NextResponse.json(
            { error: "Message is required" },
            { status: 400 }
          );
        }
        result = await sendOliviaWhatsApp(phone, message);
        break;
    }

    if (result.success) {
      console.log(`[Olivia WhatsApp] Sent ${type || "custom"} to ${phone.slice(0, 6)}*** - MessageID: ${result.messageId}`);

      return NextResponse.json({
        success: true,
        messageId: result.messageId,
      });
    } else {
      return NextResponse.json(
        { error: result.error || "Failed to send WhatsApp" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[Olivia WhatsApp] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: Check WhatsApp service status
export async function GET() {
  const config = checkWhatsAppConfig();

  return NextResponse.json({
    configured: config.configured,
    phoneNumber: config.configured ? config.phone : null,
  });
}
