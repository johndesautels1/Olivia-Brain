// src/app/api/olivia/call/reminder/route.ts
// API route for Olivia to make reminder calls
// Can be triggered manually or by a cron job

import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";
import { makeCall } from "@/lib/twilio/client";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface ReminderCallResult {
  actionItemId: string;
  success: boolean;
  callSid?: string;
  error?: string;
}

/**
 * POST - Trigger reminder calls for pending action items
 * Body params:
 *   - actionItemIds: string[] - Specific action items to call about (optional)
 *   - dueBefore: ISO date string - Call about items due before this date (optional)
 *   - assignedTo: string - Filter by assignee (optional)
 *   - limit: number - Max calls to make (default 5)
 */
export async function POST(request: NextRequest) {
  // Rate limit: 10 reminder triggers per minute
  const limited = rateLimit(request, {
    limit: 10,
    windowMs: 60_000,
    prefix: "olivia-reminder",
  });
  if (limited) return limited;

  try {
    // Auth check
    const { userId } = await getAuthSession();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      actionItemIds,
      dueBefore,
      assignedTo,
      limit = 5,
    } = body;

    // Build query for pending action items
    const whereClause: {
      status: string;
      id?: { in: string[] };
      dueDate?: { lte: Date };
      assignedTo?: string;
    } = {
      status: "pending",
    };

    if (actionItemIds && Array.isArray(actionItemIds) && actionItemIds.length > 0) {
      whereClause.id = { in: actionItemIds };
    }

    if (dueBefore) {
      whereClause.dueDate = { lte: new Date(dueBefore) };
    }

    if (assignedTo) {
      whereClause.assignedTo = assignedTo;
    }

    // Find pending action items with associated contact info
    const actionItems = await prisma.voiceActionItem.findMany({
      where: whereClause,
      take: Math.min(limit, 10), // Max 10 calls per request
      include: {
        conversation: {
          include: {
            voiceContact: true,
          },
        },
      },
      orderBy: { dueDate: "asc" }, // Most urgent first
    });

    if (actionItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending action items found matching criteria",
        calls: [],
      });
    }

    // Get base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      `https://${request.headers.get("host")}`;

    // Group action items by phone number to avoid multiple calls to same person
    const itemsByPhone = new Map<string, typeof actionItems>();
    for (const item of actionItems) {
      // Determine phone number - could be from contact or from conversation
      let phone: string | null = null;

      if (item.conversation?.voiceContact?.phone) {
        phone = item.conversation.voiceContact.phone;
      } else if (item.conversation?.callerPhone) {
        phone = item.conversation.callerPhone;
      }

      if (phone) {
        const existing = itemsByPhone.get(phone) || [];
        existing.push(item);
        itemsByPhone.set(phone, existing);
      }
    }

    const results: ReminderCallResult[] = [];

    // Make calls for each unique phone number
    for (const [phone, items] of itemsByPhone) {
      // Build reminder message
      const itemDescriptions = items.map((item) => {
        const dueStr = item.dueDate
          ? ` due ${item.dueDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}`
          : "";
        return `${item.action}${dueStr}`;
      });

      const reminderMessage = items.length === 1
        ? `Hello, this is Olivia from London Tech Map. I'm calling with a reminder: ${itemDescriptions[0]}. Do you have a moment to discuss this?`
        : `Hello, this is Olivia from London Tech Map. I have ${items.length} reminders for you. First: ${itemDescriptions[0]}. Would you like to go through them?`;

      // Build TwiML URL for conversation mode
      const params = new URLSearchParams();
      params.set("type", "reminder");
      params.set("msg", Buffer.from(reminderMessage).toString("base64url"));
      params.set("purpose", `reminder_call_${items.map((i) => i.id).join("_")}`);
      const twimlUrl = `${baseUrl}/api/olivia/call/outbound?${params.toString()}`;

      // Status callback URL
      const statusCallbackUrl = `${baseUrl}/api/olivia/call/status`;

      try {
        const callResult = await makeCall({
          to: phone,
          twimlUrl,
          statusCallback: statusCallbackUrl,
          record: true,
          timeout: 30,
        });

        if (callResult.success) {
          // Mark items as reminder sent
          await prisma.voiceActionItem.updateMany({
            where: { id: { in: items.map((i) => i.id) } },
            data: {
              // We could add a reminderSentAt field, but for now just log
            },
          });

          for (const item of items) {
            results.push({
              actionItemId: item.id,
              success: true,
              callSid: callResult.callSid,
            });
          }
        } else {
          for (const item of items) {
            results.push({
              actionItemId: item.id,
              success: false,
              error: callResult.error,
            });
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        for (const item of items) {
          results.push({
            actionItemId: item.id,
            success: false,
            error: errorMsg,
          });
        }
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      message: `Initiated ${successCount} of ${results.length} reminder calls`,
      calls: results,
    });
  } catch (error) {
    console.error("[Olivia Reminder] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET - List pending action items that could trigger reminders
 * Query params:
 *   - dueBefore: ISO date string - Items due before this date
 *   - assignedTo: string - Filter by assignee
 *   - limit: number - Max items to return (default 20)
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const { userId } = await getAuthSession();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dueBefore = searchParams.get("dueBefore");
    const assignedTo = searchParams.get("assignedTo");
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Build query
    const whereClause: {
      status: string;
      dueDate?: { lte: Date };
      assignedTo?: string;
    } = {
      status: "pending",
    };

    if (dueBefore) {
      whereClause.dueDate = { lte: new Date(dueBefore) };
    }

    if (assignedTo) {
      whereClause.assignedTo = assignedTo;
    }

    const actionItems = await prisma.voiceActionItem.findMany({
      where: whereClause,
      take: Math.min(limit, 50),
      include: {
        conversation: {
          select: {
            id: true,
            callerPhone: true,
            voiceContact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    // Format response
    const items = actionItems.map((item) => ({
      id: item.id,
      action: item.action,
      assignedTo: item.assignedTo,
      dueDate: item.dueDate,
      priority: item.priority,
      contact: item.conversation?.voiceContact
        ? {
            id: item.conversation.voiceContact.id,
            name: [item.conversation.voiceContact.firstName, item.conversation.voiceContact.lastName]
              .filter(Boolean)
              .join(" "),
            phone: item.conversation.voiceContact.phone,
          }
        : item.conversation?.callerPhone
          ? { phone: item.conversation.callerPhone }
          : null,
    }));

    return NextResponse.json({
      count: items.length,
      items,
    });
  } catch (error) {
    console.error("[Olivia Reminder] GET Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
