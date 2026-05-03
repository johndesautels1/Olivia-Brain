import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";
import {
  exchangeGoogleCode,
  saveGoogleSyncAccount,
} from "@/lib/calendar/google-sync";
import { verifyOAuthState } from "@/lib/calendar/crypto";

// GET — Google OAuth callback
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
        new URL(`/calendar?error=google_${error}`, req.url)
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
    const tokens = await exchangeGoogleCode(code);

    // Get user's primary calendar info
    const calendarRes = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    let calendarId = "primary";
    let email = "";

    if (calendarRes.ok) {
      const calData = await calendarRes.json();
      calendarId = calData.id || "primary";
      email = calData.id || "";
    }

    // Save the sync account with encrypted tokens
    await saveGoogleSyncAccount(userId, tokens, calendarId, email);

    return NextResponse.redirect(
      new URL("/calendar?sync=google_connected", req.url)
    );
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(
      new URL("/calendar?error=google_auth_failed", req.url)
    );
  }
}
