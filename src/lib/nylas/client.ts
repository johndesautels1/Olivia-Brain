import { getServerEnv } from "@/lib/config/env";

const NYLAS_API_BASE_URL = "https://api.us.nylas.com/v3";

// Nylas Grant (connected account)
export interface NylasGrant {
  id: string;
  provider: string;
  email: string;
  name?: string;
  grantStatus: string;
  createdAt: number;
  updatedAt: number;
}

// Nylas Email Message
export interface NylasMessage {
  id: string;
  grantId: string;
  from: { name?: string; email: string }[];
  to: { name?: string; email: string }[];
  cc?: { name?: string; email: string }[];
  bcc?: { name?: string; email: string }[];
  subject: string;
  body: string;
  snippet: string;
  threadId: string;
  date: number;
  unread: boolean;
  starred: boolean;
  folders: string[];
  attachments?: { id: string; filename: string; contentType: string; size: number }[];
}

// Nylas Calendar Event
export interface NylasEvent {
  id: string;
  grantId: string;
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  when: {
    startTime?: number;
    endTime?: number;
    startDate?: string;
    endDate?: string;
    startTimezone?: string;
    endTimezone?: string;
  };
  participants: { email: string; name?: string; status?: string }[];
  busy: boolean;
  status: string;
  conferencing?: {
    provider: string;
    details: { url?: string; meetingCode?: string };
  };
}

// Nylas Calendar
export interface NylasCalendar {
  id: string;
  grantId: string;
  name: string;
  description?: string;
  isPrimary: boolean;
  readOnly: boolean;
  timezone?: string;
}

// Send email input
export interface NylasSendEmailInput {
  grantId: string;
  to: { email: string; name?: string }[];
  cc?: { email: string; name?: string }[];
  bcc?: { email: string; name?: string }[];
  subject: string;
  body: string;
  replyToMessageId?: string;
  trackingOptions?: {
    opens: boolean;
    links: boolean;
    threadReplies: boolean;
  };
}

// Create event input
export interface NylasCreateEventInput {
  grantId: string;
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  when: {
    startTime: number;
    endTime: number;
    startTimezone?: string;
    endTimezone?: string;
  };
  participants?: { email: string; name?: string }[];
  conferencing?: {
    provider: "Google Meet" | "Zoom Meeting" | "Microsoft Teams";
    autocreate?: { settings?: Record<string, unknown> };
  };
}

// Nylas service interface
export interface NylasService {
  isConfigured(): boolean;

  // Grants (connected accounts)
  listGrants(): Promise<NylasGrant[]>;
  getGrant(grantId: string): Promise<NylasGrant>;

  // Messages
  listMessages(grantId: string, options?: { limit?: number; unread?: boolean; folder?: string }): Promise<NylasMessage[]>;
  getMessage(grantId: string, messageId: string): Promise<NylasMessage>;
  sendMessage(input: NylasSendEmailInput): Promise<NylasMessage>;

  // Calendars
  listCalendars(grantId: string): Promise<NylasCalendar[]>;
  getPrimaryCalendar(grantId: string): Promise<NylasCalendar | null>;

  // Events
  listEvents(grantId: string, calendarId: string, options?: { start?: number; end?: number; limit?: number }): Promise<NylasEvent[]>;
  getEvent(grantId: string, calendarId: string, eventId: string): Promise<NylasEvent>;
  createEvent(input: NylasCreateEventInput): Promise<NylasEvent>;
  updateEvent(grantId: string, calendarId: string, eventId: string, updates: Partial<NylasCreateEventInput>): Promise<NylasEvent>;
  deleteEvent(grantId: string, calendarId: string, eventId: string): Promise<void>;
}

function getNylasApiKey() {
  return getServerEnv().NYLAS_API_KEY;
}

function getNylasHeaders() {
  const apiKey = getNylasApiKey();
  if (!apiKey) {
    throw new Error("NYLAS_API_KEY is not configured.");
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

async function nylasRequest<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = new URL(path, NYLAS_API_BASE_URL);

  const response = await fetch(url, {
    ...init,
    headers: {
      ...getNylasHeaders(),
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(30000),
  });

  const json = await response.json();

  if (!response.ok) {
    const error = json.error?.message ?? json.message ?? "Nylas request failed";
    throw new Error(error);
  }

  return json.data ?? json;
}

class NylasServiceImpl implements NylasService {
  isConfigured(): boolean {
    return Boolean(getNylasApiKey());
  }

  async listGrants(): Promise<NylasGrant[]> {
    const result = await nylasRequest<NylasGrant[]>("/grants");
    return result;
  }

  async getGrant(grantId: string): Promise<NylasGrant> {
    return nylasRequest<NylasGrant>(`/grants/${grantId}`);
  }

  async listMessages(
    grantId: string,
    options?: { limit?: number; unread?: boolean; folder?: string }
  ): Promise<NylasMessage[]> {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.unread !== undefined) params.set("unread", String(options.unread));
    if (options?.folder) params.set("in", options.folder);

    const queryString = params.toString();
    const path = `/grants/${grantId}/messages${queryString ? `?${queryString}` : ""}`;

    return nylasRequest<NylasMessage[]>(path);
  }

  async getMessage(grantId: string, messageId: string): Promise<NylasMessage> {
    return nylasRequest<NylasMessage>(`/grants/${grantId}/messages/${messageId}`);
  }

  async sendMessage(input: NylasSendEmailInput): Promise<NylasMessage> {
    return nylasRequest<NylasMessage>(`/grants/${input.grantId}/messages/send`, {
      method: "POST",
      body: JSON.stringify({
        to: input.to,
        cc: input.cc,
        bcc: input.bcc,
        subject: input.subject,
        body: input.body,
        reply_to_message_id: input.replyToMessageId,
        tracking_options: input.trackingOptions,
      }),
    });
  }

  async listCalendars(grantId: string): Promise<NylasCalendar[]> {
    return nylasRequest<NylasCalendar[]>(`/grants/${grantId}/calendars`);
  }

  async getPrimaryCalendar(grantId: string): Promise<NylasCalendar | null> {
    const calendars = await this.listCalendars(grantId);
    return calendars.find((c) => c.isPrimary) ?? calendars[0] ?? null;
  }

  async listEvents(
    grantId: string,
    calendarId: string,
    options?: { start?: number; end?: number; limit?: number }
  ): Promise<NylasEvent[]> {
    const params = new URLSearchParams();
    params.set("calendar_id", calendarId);
    if (options?.start) params.set("start", String(options.start));
    if (options?.end) params.set("end", String(options.end));
    if (options?.limit) params.set("limit", String(options.limit));

    return nylasRequest<NylasEvent[]>(`/grants/${grantId}/events?${params.toString()}`);
  }

  async getEvent(grantId: string, calendarId: string, eventId: string): Promise<NylasEvent> {
    return nylasRequest<NylasEvent>(
      `/grants/${grantId}/events/${eventId}?calendar_id=${calendarId}`
    );
  }

  async createEvent(input: NylasCreateEventInput): Promise<NylasEvent> {
    return nylasRequest<NylasEvent>(`/grants/${input.grantId}/events?calendar_id=${input.calendarId}`, {
      method: "POST",
      body: JSON.stringify({
        title: input.title,
        description: input.description,
        location: input.location,
        when: {
          start_time: input.when.startTime,
          end_time: input.when.endTime,
          start_timezone: input.when.startTimezone,
          end_timezone: input.when.endTimezone,
        },
        participants: input.participants?.map((p) => ({ email: p.email, name: p.name })),
        conferencing: input.conferencing,
      }),
    });
  }

  async updateEvent(
    grantId: string,
    calendarId: string,
    eventId: string,
    updates: Partial<NylasCreateEventInput>
  ): Promise<NylasEvent> {
    return nylasRequest<NylasEvent>(
      `/grants/${grantId}/events/${eventId}?calendar_id=${calendarId}`,
      {
        method: "PUT",
        body: JSON.stringify({
          title: updates.title,
          description: updates.description,
          location: updates.location,
          when: updates.when
            ? {
                start_time: updates.when.startTime,
                end_time: updates.when.endTime,
                start_timezone: updates.when.startTimezone,
                end_timezone: updates.when.endTimezone,
              }
            : undefined,
          participants: updates.participants?.map((p) => ({ email: p.email, name: p.name })),
        }),
      }
    );
  }

  async deleteEvent(grantId: string, calendarId: string, eventId: string): Promise<void> {
    await nylasRequest<void>(
      `/grants/${grantId}/events/${eventId}?calendar_id=${calendarId}`,
      { method: "DELETE" }
    );
  }
}

class NoOpNylasService implements NylasService {
  isConfigured(): boolean {
    return false;
  }

  async listGrants(): Promise<NylasGrant[]> {
    console.warn("[Nylas] NYLAS_API_KEY not configured");
    return [];
  }

  async getGrant(): Promise<NylasGrant> {
    throw new Error("Nylas not configured");
  }

  async listMessages(): Promise<NylasMessage[]> {
    return [];
  }

  async getMessage(): Promise<NylasMessage> {
    throw new Error("Nylas not configured");
  }

  async sendMessage(): Promise<NylasMessage> {
    throw new Error("Nylas not configured");
  }

  async listCalendars(): Promise<NylasCalendar[]> {
    return [];
  }

  async getPrimaryCalendar(): Promise<NylasCalendar | null> {
    return null;
  }

  async listEvents(): Promise<NylasEvent[]> {
    return [];
  }

  async getEvent(): Promise<NylasEvent> {
    throw new Error("Nylas not configured");
  }

  async createEvent(): Promise<NylasEvent> {
    throw new Error("Nylas not configured");
  }

  async updateEvent(): Promise<NylasEvent> {
    throw new Error("Nylas not configured");
  }

  async deleteEvent(): Promise<void> {
    throw new Error("Nylas not configured");
  }
}

let nylasService: NylasService | undefined;

export function getNylasService(): NylasService {
  if (!nylasService) {
    const env = getServerEnv();

    if (env.NYLAS_API_KEY) {
      nylasService = new NylasServiceImpl();
    } else {
      nylasService = new NoOpNylasService();
    }
  }

  return nylasService;
}

export function isNylasConfigured(): boolean {
  return Boolean(getServerEnv().NYLAS_API_KEY);
}
