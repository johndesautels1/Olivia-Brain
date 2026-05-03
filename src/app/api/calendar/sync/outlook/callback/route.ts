import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";
import {
  exchangeOutlookCode,
  saveOutlookSyncAccount,
} from "@/lib/calendar/outlook-sync";
import { verifyOAuthState } from "@/lib/calendar/crypto";

// GET — Microsoft OAuth callback
export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 10, windowMs: 60_000, prefix: "cal-oauth" });
  if (limited) return limited;

  try {
    const { userId } = await getAuthSession();
    if (!userId) {
      return NextResponse.redirect(
        new URL("/sign-in?redirect=/calendar", req.url)
      );
    }

    // userId IS the canonical user ID — no UserProfile lookup needed in Olivia Brain.

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(`/calendar?error=outlook_${error}`, req.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/calendar?error=no_code", req.url)
      );
    }

    // Verify HMAC-signed state parameter to prevent tampering/CSRF
    const state = searchParams.get("state") || "";
    const stateProfileId = verifyOAuthState(state);
    if (!stateProfileId || stateProfileId !== userId) {
      return NextResponse.redirect(
        new URL("/calendar?error=invalid_state", req.url)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeOutlookCode(code);

    // Get user info from Microsoft Graph
    const meRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    let email = "";
    let calendarId = "default";

    if (meRes.ok) {
      const meData = await meRes.json();
      email = meData.mail || meData.userPrincipalName || "";
      calendarId = meData.id || "default";
    }

    // Save the sync account with encrypted tokens
    await saveOutlookSyncAccount(userId, tokens, calendarId, email);

    return NextResponse.redirect(
      new URL("/calendar?sync=outlook_connected", req.url)
    );
  } catch (err) {
    console.error("Outlook OAuth callback error:", err);
    return NextResponse.redirect(
      new URL("/calendar?error=outlook_auth_failed", req.url)
    );
  }
}
