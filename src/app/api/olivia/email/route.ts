// src/app/api/olivia/email/route.ts
// API route for Olivia to send custom emails
// POST: Send email to a user

import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { sendOliviaEmail } from "@/lib/email/resend";

// Inline env check
function checkEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  return { configured: !!apiKey };
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const { userId } = await getAuthSession();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check email configuration
    const config = checkEmailConfig();
    if (!config.configured) {
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { email, to, subject, message } = body;

    // Accept both 'to' and 'email' for flexibility
    const recipientEmail = email || to;

    // Validate email
    if (!recipientEmail) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 }
      );
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const result = await sendOliviaEmail({
      recipientEmail,
      subject: subject || "Message from Olivia",
      message,
    });

    if (result.success) {
      console.log(`[Olivia Email] Sent to ${recipientEmail.slice(0, 3)}***`);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: result.error || "Failed to send email" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[Olivia Email] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: Check email service status
export async function GET() {
  const config = checkEmailConfig();

  return NextResponse.json({
    configured: config.configured,
  });
}
