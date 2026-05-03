// src/app/api/olivia/conversations/[id]/email/route.ts
// Send conversation transcript via email

import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import prisma from "@/lib/db/client";
import { sendConversationEmail } from "@/lib/email/resend";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limit: 5 emails per minute
  const limited = rateLimit(request, {
    limit: 5,
    windowMs: 60_000,
    prefix: "olivia-email",
  });
  if (limited) return limited;

  // Auth required
  let userId: string | null = null;
  try {
    const authResult = await getAuthSession();
    userId = authResult.userId;
  } catch {
    // Auth not available
  }

  if (!userId) {
    return NextResponse.json(
      { error: "Sign in required to email conversations" },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { recipientEmail } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Conversation ID required" },
        { status: 400 }
      );
    }

    if (!recipientEmail || typeof recipientEmail !== "string") {
      return NextResponse.json(
        { error: "Valid email address required" },
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

    // Fetch conversation with messages
    const conversation = await prisma.oliviaConversation.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        title: true,
        createdAt: true,
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            role: true,
            content: true,
          },
        },
      },
    });

    // Check ownership — userId on the conversation IS the Clerk user ID
    if (!conversation || conversation.userId !== userId) {
      return NextResponse.json(
        { error: "Conversation not found or access denied" },
        { status: 404 }
      );
    }

    // Format messages for email
    const messages = conversation.messages.map((m) => ({
      speaker: m.role === "assistant" ? "olivia" : "user",
      text: m.content,
    }));

    // Send email
    const emailResult = await sendConversationEmail({
      recipientEmail,
      conversationTitle: conversation.title || "Olivia Conversation",
      messages,
      conversationDate: conversation.createdAt.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Olivia Email Error]", error);
    return NextResponse.json(
      { error: "Failed to send conversation email" },
      { status: 500 }
    );
  }
}
