// =============================================================================
// AGENTIC CALENDAR — Google Calendar Sync Engine
// OAuth 2.0 flow + incremental sync using Google Calendar API v3.
// Uses syncToken for efficient delta sync after initial full sync.
// =============================================================================
import prisma from "@/lib/db/client";
import { encryptTokens, decryptTokens } from "./crypto";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || "";
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || "https://clueslondon.com"}/api/calendar/sync/google/callback`;

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

// ─── OAuth URL Generation ───────────────────────────────────────────────────

export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// ─── Token Exchange ─────────────────────────────────────────────────────────

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export async function exchangeGoogleCode(code: string): Promise<GoogleTokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(30_000), // 30s timeout
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google token exchange failed: ${err}`);
  }

  return res.json();
}

// ─── Token Refresh ──────────────────────────────────────────────────────────

async function refreshGoogleToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(30_000), // 30s timeout
  });

  if (!res.ok) {
    throw new Error("Google token refresh failed");
  }

  return res.json();
}

// ─── Get Valid Access Token ─────────────────────────────────────────────────

async function getValidAccessToken(syncAccountId: string): Promise<string> {
  const account = await prisma.calendarSyncAccount.findUnique({
    where: { id: syncAccountId },
    select: {
      accessTokenEnc: true,
      refreshTokenEnc: true,
      tokenExpiresAt: true,
    },
  });

  if (!account) throw new Error("Sync account not found");

  const tokens = decryptTokens({
    accessTokenEnc: account.accessTokenEnc,
    refreshTokenEnc: account.refreshTokenEnc,
  });

  if (!tokens.accessToken) throw new Error("No access token");

  // Check if token is still valid (with 5 min buffer)
  const expiresAt = account.tokenExpiresAt;
  const isExpired = !expiresAt || expiresAt.getTime() < Date.now() + 5 * 60 * 1000;

  if (!isExpired) {
    return tokens.accessToken;
  }

  // Refresh the token
  if (!tokens.refreshToken) throw new Error("No refresh token for renewal");

  const refreshed = await refreshGoogleToken(tokens.refreshToken);
  const encrypted = encryptTokens({
    accessToken: refreshed.access_token,
    refreshToken: tokens.refreshToken,
  });

  await prisma.calendarSyncAccount.update({
    where: { id: syncAccountId },
    data: {
      accessTokenEnc: encrypted.accessTokenEnc,
      refreshTokenEnc: encrypted.refreshTokenEnc,
      tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
    },
  });

  return refreshed.access_token;
}

// ─── Save Sync Account ─────────────────────────────────────────────────────

export async function saveGoogleSyncAccount(
  userId: string,
  tokens: GoogleTokenResponse,
  calendarId: string,
  email: string
): Promise<string> {
  const encrypted = encryptTokens({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || null,
  });

  const account = await prisma.calendarSyncAccount.upsert({
    where: {
      userId_provider_providerAccountId: {
        userId,
        provider: "google",
        providerAccountId: calendarId,
      },
    },
    create: {
      userId,
      provider: "google",
      providerAccountId: calendarId,
      providerEmail: email,
      accessTokenEnc: encrypted.accessTokenEnc,
      refreshTokenEnc: encrypted.refreshTokenEnc,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      syncDirection: "bidirectional",
    },
    update: {
      accessTokenEnc: encrypted.accessTokenEnc,
      refreshTokenEnc: encrypted.refreshTokenEnc,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      providerEmail: email,
      isActive: true,
      consecutiveErrors: 0,
      lastSyncError: null,
    },
  });

  return account.id;
}

// ─── Incremental Sync ───────────────────────────────────────────────────────

interface GoogleCalendarEvent {
  id: string;
  status: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  htmlLink?: string;
  hangoutLink?: string;
  updated?: string;
  extendedProperties?: {
    private?: Record<string, string>;
    shared?: Record<string, string>;
  };
}

// Private extendedProperties keys used for round-trip sync
const EXT_PROP_APP_ID = "londonTechMapId";
const EXT_PROP_APP_SOURCE = "londonTechMapSource";
const EXT_PROP_APP_SOURCE_VALUE = "london-tech-map-calendar";

interface SyncResult {
  created: number;
  updated: number;
  deleted: number;
  conflicts: number;
  nextSyncToken: string | null;
}

export async function syncGoogleCalendar(
  syncAccountId: string,
  userId: string
): Promise<SyncResult> {
  const account = await prisma.calendarSyncAccount.findUnique({
    where: { id: syncAccountId },
    select: { syncToken: true, providerAccountId: true },
  });

  if (!account) throw new Error("Sync account not found");

  const accessToken = await getValidAccessToken(syncAccountId);
  const calendarId = account.providerAccountId || "primary";

  let allEvents: GoogleCalendarEvent[] = [];
  let nextPageToken: string | undefined;
  let nextSyncToken: string | null = null;

  // Fetch events (incremental if syncToken exists, full otherwise)
  do {
    const params = new URLSearchParams({
      maxResults: "250",
      singleEvents: "true",
    });

    if (account.syncToken) {
      params.set("syncToken", account.syncToken);
    } else {
      // Initial sync: 6 months back, 12 months forward
      const timeMin = new Date();
      timeMin.setMonth(timeMin.getMonth() - 6);
      const timeMax = new Date();
      timeMax.setMonth(timeMax.getMonth() + 12);
      params.set("timeMin", timeMin.toISOString());
      params.set("timeMax", timeMax.toISOString());
    }

    if (nextPageToken) {
      params.set("pageToken", nextPageToken);
    }

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(60_000), // 60s timeout for sync operations
      }
    );

    if (res.status === 410) {
      // syncToken expired — reset and do full sync
      await prisma.calendarSyncAccount.update({
        where: { id: syncAccountId },
        data: { syncToken: null },
      });
      return syncGoogleCalendar(syncAccountId, userId);
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Calendar API error: ${res.status} ${errText}`);
    }

    const data = await res.json();
    allEvents = allEvents.concat(data.items || []);
    nextPageToken = data.nextPageToken;
    nextSyncToken = data.nextSyncToken || null;
  } while (nextPageToken);

  // Process events
  let created = 0;
  let updated = 0;
  let deleted = 0;
  let conflicts = 0;

  for (const gEvent of allEvents) {
    if (gEvent.status === "cancelled") {
      // Delete local entry if it exists — check extendedProperties first
      const cancelledLinkedId = gEvent.extendedProperties?.private?.[EXT_PROP_APP_ID];
      let cancelledEntry = cancelledLinkedId
        ? await prisma.calendarEntry.findFirst({
            where: { id: cancelledLinkedId, userId },
          })
        : null;

      if (!cancelledEntry) {
        cancelledEntry = await prisma.calendarEntry.findFirst({
          where: {
            userId,
            externalCalendarId: gEvent.id,
            externalProvider: "google",
          },
        });
      }

      if (cancelledEntry) {
        await prisma.calendarEntry.update({
          where: { id: cancelledEntry.id },
          data: { isArchived: true },
        });
        deleted++;
      }
      continue;
    }

    const startDt = gEvent.start?.dateTime || gEvent.start?.date;
    const endDt = gEvent.end?.dateTime || gEvent.end?.date;
    const isAllDay = !gEvent.start?.dateTime && !!gEvent.start?.date;

    if (!startDt) continue;

    const entryData = {
      title: gEvent.summary || "Untitled",
      description: gEvent.description || null,
      location: gEvent.location || null,
      virtualUrl: gEvent.hangoutLink || null,
      startDatetime: new Date(startDt),
      endDatetime: endDt ? new Date(endDt) : new Date(new Date(startDt).getTime() + 60 * 60 * 1000),
      allDay: isAllDay,
      category: "synced_external" as const,
      externalCalendarId: gEvent.id,
      externalProvider: "google" as const,
    };

    // Try to match by our internal ID stored in extendedProperties first,
    // then fall back to matching by externalCalendarId (Google event ID).
    const linkedEntryId = gEvent.extendedProperties?.private?.[EXT_PROP_APP_ID];
    let existing = linkedEntryId
      ? await prisma.calendarEntry.findFirst({
          where: { id: linkedEntryId, userId },
        })
      : null;

    if (!existing) {
      existing = await prisma.calendarEntry.findFirst({
        where: {
          userId,
          externalCalendarId: gEvent.id,
          externalProvider: "google",
        },
      });
    }

    if (existing) {
      // Check for conflicts
      if (
        existing.title !== entryData.title ||
        existing.startDatetime.getTime() !== entryData.startDatetime.getTime()
      ) {
        // If user modified locally, create conflict
        if (existing.updatedAt > (existing.createdAt || new Date(0))) {
          await prisma.calendarSyncConflict.create({
            data: {
              syncAccountId,
              localEntryId: existing.id,
              externalEventId: gEvent.id,
              conflictType: "time_mismatch",
              localDataJson: {
                title: existing.title,
                startDatetime: existing.startDatetime.toISOString(),
              },
              remoteDataJson: {
                title: entryData.title,
                startDatetime: entryData.startDatetime.toISOString(),
              },
            },
          });
          conflicts++;
          continue;
        }
      }

      await prisma.calendarEntry.update({
        where: { id: existing.id },
        data: entryData,
      });
      updated++;
    } else {
      await prisma.calendarEntry.create({
        data: {
          userId,
          ...entryData,
          entryType: "event",
          priority: "medium",
        },
      });
      created++;
    }
  }

  // Update sync state
  await prisma.calendarSyncAccount.update({
    where: { id: syncAccountId },
    data: {
      syncToken: nextSyncToken,
      lastSyncAt: new Date(),
      lastSyncError: null,
      consecutiveErrors: 0,
    },
  });

  return { created, updated, deleted, conflicts, nextSyncToken };
}

// ─── Push Local Event to Google ─────────────────────────────────────────────

export async function pushEventToGoogle(
  syncAccountId: string,
  entryId: string
): Promise<string | null> {
  const account = await prisma.calendarSyncAccount.findUnique({
    where: { id: syncAccountId },
    select: { providerAccountId: true },
  });

  if (!account) return null;

  const entry = await prisma.calendarEntry.findUnique({
    where: { id: entryId },
    select: {
      title: true,
      description: true,
      location: true,
      startDatetime: true,
      endDatetime: true,
      allDay: true,
      externalCalendarId: true,
    },
  });

  if (!entry) return null;

  const accessToken = await getValidAccessToken(syncAccountId);
  const calendarId = account.providerAccountId || "primary";

  const googleEvent = {
    summary: entry.title,
    description: entry.description || undefined,
    location: entry.location || undefined,
    start: entry.allDay
      ? { date: entry.startDatetime.toISOString().split("T")[0] }
      : { dateTime: entry.startDatetime.toISOString() },
    end: entry.allDay
      ? { date: (entry.endDatetime || entry.startDatetime).toISOString().split("T")[0] }
      : { dateTime: (entry.endDatetime || new Date(entry.startDatetime.getTime() + 3600000)).toISOString() },
    extendedProperties: {
      private: {
        [EXT_PROP_APP_ID]: entryId,
        [EXT_PROP_APP_SOURCE]: EXT_PROP_APP_SOURCE_VALUE,
      },
    },
  };

  let url: string;
  let method: string;

  if (entry.externalCalendarId) {
    // Update existing
    url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(entry.externalCalendarId)}`;
    method = "PUT";
  } else {
    // Create new
    url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
    method = "POST";
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(googleEvent),
    signal: AbortSignal.timeout(30_000), // 30s timeout
  });

  if (!res.ok) return null;

  const data = await res.json();

  // Save external event ID on local entry
  if (!entry.externalCalendarId && data.id) {
    await prisma.calendarEntry.update({
      where: { id: entryId },
      data: { externalCalendarId: data.id, externalProvider: "google" },
    });
  }

  return data.id;
}
