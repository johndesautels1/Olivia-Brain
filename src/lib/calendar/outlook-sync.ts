// =============================================================================
// AGENTIC CALENDAR — Microsoft Outlook Calendar Sync Engine
// OAuth 2.0 flow + delta sync using Microsoft Graph API.
// Uses deltaToken for efficient incremental sync after initial full sync.
// =============================================================================
import prisma from "@/lib/db/client";
import { encryptTokens, decryptTokens } from "./crypto";

const MS_CLIENT_ID = process.env.MICROSOFT_CALENDAR_CLIENT_ID || "";
const MS_CLIENT_SECRET = process.env.MICROSOFT_CALENDAR_CLIENT_SECRET || "";
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || "https://clueslondon.com"}/api/calendar/sync/outlook/callback`;
const MS_TENANT = "common"; // multi-tenant

const SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "Calendars.ReadWrite",
].join(" ");

// ─── OAuth URL Generation ───────────────────────────────────────────────────

export function getOutlookAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: MS_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    response_mode: "query",
    state,
  });
  return `https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0/authorize?${params.toString()}`;
}

// ─── Token Exchange ─────────────────────────────────────────────────────────

interface MsTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export async function exchangeOutlookCode(code: string): Promise<MsTokenResponse> {
  const res = await fetch(
    `https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: MS_CLIENT_ID,
        client_secret: MS_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(30_000), // 30s timeout
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Microsoft token exchange failed: ${err}`);
  }

  return res.json();
}

// ─── Token Refresh ──────────────────────────────────────────────────────────

async function refreshOutlookToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  const res = await fetch(
    `https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: MS_CLIENT_ID,
        client_secret: MS_CLIENT_SECRET,
        grant_type: "refresh_token",
        scope: SCOPES,
      }),
      signal: AbortSignal.timeout(30_000), // 30s timeout
    }
  );

  if (!res.ok) {
    throw new Error("Microsoft token refresh failed");
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

  const refreshed = await refreshOutlookToken(tokens.refreshToken);
  const newRefreshToken = refreshed.refresh_token || tokens.refreshToken;
  const encrypted = encryptTokens({
    accessToken: refreshed.access_token,
    refreshToken: newRefreshToken,
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

export async function saveOutlookSyncAccount(
  userId: string,
  tokens: MsTokenResponse,
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
        provider: "outlook",
        providerAccountId: calendarId,
      },
    },
    create: {
      userId,
      provider: "outlook",
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

// ─── Delta Sync ─────────────────────────────────────────────────────────────

interface MsCalendarEvent {
  id: string;
  subject?: string;
  body?: { content?: string; contentType?: string };
  location?: { displayName?: string };
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
  isAllDay?: boolean;
  webLink?: string;
  onlineMeeting?: { joinUrl?: string };
  "@removed"?: { reason: string };
}

interface SyncResult {
  created: number;
  updated: number;
  deleted: number;
  conflicts: number;
  nextDeltaToken: string | null;
}

export async function syncOutlookCalendar(
  syncAccountId: string,
  userId: string
): Promise<SyncResult> {
  const account = await prisma.calendarSyncAccount.findUnique({
    where: { id: syncAccountId },
    select: { syncToken: true },
  });

  if (!account) throw new Error("Sync account not found");

  const accessToken = await getValidAccessToken(syncAccountId);

  let allEvents: MsCalendarEvent[] = [];
  let nextDeltaToken: string | null = null;

  // Build initial URL
  let url: string;
  if (account.syncToken) {
    url = account.syncToken; // deltaToken is a full URL in Microsoft Graph
  } else {
    // Initial sync: 6 months back, 12 months forward
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 12);

    url = `https://graph.microsoft.com/v1.0/me/calendarView/delta?startDateTime=${startDate.toISOString()}&endDateTime=${endDate.toISOString()}&$top=50`;
  }

  // Paginate through results
  do {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(60_000), // 60s timeout for sync operations
    });

    if (res.status === 410 || res.status === 404) {
      // Delta token expired — reset and do full sync
      await prisma.calendarSyncAccount.update({
        where: { id: syncAccountId },
        data: { syncToken: null },
      });
      return syncOutlookCalendar(syncAccountId, userId);
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Microsoft Graph API error: ${res.status} ${errText}`);
    }

    const data = await res.json();
    allEvents = allEvents.concat(data.value || []);

    // Check for next page or delta link
    if (data["@odata.nextLink"]) {
      url = data["@odata.nextLink"];
    } else {
      nextDeltaToken = data["@odata.deltaLink"] || null;
      break;
    }
  } while (true); // eslint-disable-line no-constant-condition

  // Process events
  let created = 0;
  let updated = 0;
  let deleted = 0;
  let conflicts = 0;

  for (const msEvent of allEvents) {
    // Handle deleted events
    if (msEvent["@removed"]) {
      const existing = await prisma.calendarEntry.findFirst({
        where: {
          userId,
          externalCalendarId: msEvent.id,
          externalProvider: "outlook",
        },
      });
      if (existing) {
        await prisma.calendarEntry.update({
          where: { id: existing.id },
          data: { isArchived: true },
        });
        deleted++;
      }
      continue;
    }

    const startDt = msEvent.start?.dateTime;
    if (!startDt) continue;

    const endDt = msEvent.end?.dateTime;

    // Microsoft Graph returns datetime without timezone offset — append Z if needed
    const startIso = startDt.endsWith("Z") ? startDt : `${startDt}Z`;
    const endIso = endDt ? (endDt.endsWith("Z") ? endDt : `${endDt}Z`) : null;

    const entryData = {
      title: msEvent.subject || "Untitled",
      description: msEvent.body?.contentType === "text" ? msEvent.body.content || null : null,
      location: msEvent.location?.displayName || null,
      virtualUrl: msEvent.onlineMeeting?.joinUrl || null,
      startDatetime: new Date(startIso),
      endDatetime: endIso ? new Date(endIso) : new Date(new Date(startIso).getTime() + 60 * 60 * 1000),
      allDay: msEvent.isAllDay || false,
      category: "synced_external" as const,
      externalCalendarId: msEvent.id,
      externalProvider: "outlook" as const,
    };

    const existing = await prisma.calendarEntry.findFirst({
      where: {
        userId,
        externalCalendarId: msEvent.id,
        externalProvider: "outlook",
      },
    });

    if (existing) {
      // Check for conflicts
      if (
        existing.title !== entryData.title ||
        existing.startDatetime.getTime() !== entryData.startDatetime.getTime()
      ) {
        if (existing.updatedAt > (existing.createdAt || new Date(0))) {
          await prisma.calendarSyncConflict.create({
            data: {
              syncAccountId,
              localEntryId: existing.id,
              externalEventId: msEvent.id,
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
      syncToken: nextDeltaToken,
      lastSyncAt: new Date(),
      lastSyncError: null,
      consecutiveErrors: 0,
    },
  });

  return { created, updated, deleted, conflicts, nextDeltaToken };
}

// ─── Push Local Event to Outlook ────────────────────────────────────────────

export async function pushEventToOutlook(
  syncAccountId: string,
  entryId: string
): Promise<string | null> {
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

  const msEvent = {
    subject: entry.title,
    body: entry.description
      ? { contentType: "text", content: entry.description }
      : undefined,
    location: entry.location
      ? { displayName: entry.location }
      : undefined,
    start: {
      dateTime: entry.startDatetime.toISOString(),
      timeZone: "UTC",
    },
    end: {
      dateTime: (entry.endDatetime || new Date(entry.startDatetime.getTime() + 3600000)).toISOString(),
      timeZone: "UTC",
    },
    isAllDay: entry.allDay,
  };

  let url: string;
  let method: string;

  if (entry.externalCalendarId) {
    url = `https://graph.microsoft.com/v1.0/me/events/${entry.externalCalendarId}`;
    method = "PATCH";
  } else {
    url = "https://graph.microsoft.com/v1.0/me/events";
    method = "POST";
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(msEvent),
    signal: AbortSignal.timeout(30_000), // 30s timeout
  });

  if (!res.ok) return null;

  const data = await res.json();

  if (!entry.externalCalendarId && data.id) {
    await prisma.calendarEntry.update({
      where: { id: entryId },
      data: { externalCalendarId: data.id, externalProvider: "outlook" },
    });
  }

  return data.id;
}
