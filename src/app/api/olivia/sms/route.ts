// src/app/api/olivia/sms/route.ts
// API route for Olivia to send SMS messages
// POST: Send SMS to a user

import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";

// Inline env check to avoid module loading issues
function checkTwilioConfig() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const phone = process.env.TWILIO_PHONE_NUMBER;
  return { configured: !!(sid && token && phone), sid, token, phone };
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const { userId } = await getAuthSession();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check Twilio configuration
    const config = checkTwilioConfig();
    if (!config.configured) {
      return NextResponse.json(
        { error: "SMS service not configured", debug: { hasSid: !!config.sid, hasToken: !!config.token, hasPhone: !!config.phone } },
        { status: 503 }
      );
    }

    // Lazy import Twilio functions
    const { sendOliviaSms, sendCalendarReminderSms, sendMeetingConfirmationSms } = await import("@/lib/twilio/client");

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
        result = await sendCalendarReminderSms(phone, {
          eventTitle,
          eventTime: new Date(eventTime),
          location,
          minutesBefore: minutesBefore || 15,
        });
        break;

      case "confirmation":
        // Meeting confirmation
        if (!eventTitle || !eventTime) {
          return NextResponse.json(
            { error: "eventTitle and eventTime required for confirmation" },
            { status: 400 }
          );
        }
        result = await sendMeetingConfirmationSms(
          phone,
          eventTitle,
          new Date(eventTime),
          location
        );
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
        result = await sendOliviaSms(phone, message);
        break;
    }

    if (result.success) {
      // Log the SMS send for analytics (optional)
      console.log(`[Olivia SMS] Sent ${type || "custom"} to ${phone.slice(0, 6)}*** - MessageID: ${result.messageId}`);

      return NextResponse.json({
        success: true,
        messageId: result.messageId,
      });
    } else {
      return NextResponse.json(
        { error: result.error || "Failed to send SMS" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[Olivia SMS] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: Check SMS service status
export async function GET() {
  const config = checkTwilioConfig();

  return NextResponse.json({
    configured: config.configured,
    phoneNumber: config.configured ? config.phone : null,
    debug: {
      hasSid: !!config.sid,
      hasToken: !!config.token,
      hasPhone: !!config.phone,
    },
  });
}
