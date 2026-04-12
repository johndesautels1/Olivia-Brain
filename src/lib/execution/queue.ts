/**
 * Queue Service (Upstash QStash)
 * Sprint 4.4 — Durable Execution (Item 3: Serverless Queue)
 *
 * Fire-and-forget background task dispatch with guaranteed delivery.
 * Lighter than Inngest for simple deferred work: scheduled maintenance,
 * deferred notifications, rate-limited API calls.
 *
 * QStash delivers messages to HTTP endpoints via POST with:
 * - Guaranteed at-least-once delivery
 * - Configurable retries and delays
 * - Scheduled/cron delivery
 * - Automatic deduplication
 *
 * Environment: QSTASH_TOKEN (set in Vercel env vars)
 */

import { Client as QStashClient } from "@upstash/qstash";

import { getServerEnv } from "@/lib/config/env";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QueueMessage {
  /** Target URL endpoint to receive the message */
  destination: string;
  /** JSON-serializable payload */
  body: Record<string, unknown>;
  /** Delay in seconds before delivery (default: 0 = immediate) */
  delaySeconds?: number;
  /** Number of retries on failure (default: 3) */
  retries?: number;
  /** Deduplication key — prevents duplicate sends within 24h */
  deduplicationId?: string;
  /** Custom headers to include in the delivery request */
  headers?: Record<string, string>;
}

export interface ScheduledMessage {
  /** Target URL endpoint */
  destination: string;
  /** JSON-serializable payload */
  body: Record<string, unknown>;
  /** Cron expression (e.g., "0 2 * * *" = daily at 2am) */
  cron: string;
  /** Human-readable schedule name */
  scheduleName: string;
}

export interface QueueResult {
  /** QStash message ID for tracking */
  messageId: string;
  /** Whether the message was accepted */
  accepted: boolean;
}

export interface ScheduleResult {
  /** QStash schedule ID */
  scheduleId: string;
  /** Cron expression */
  cron: string;
}

// ─── Service Interface ───────────────────────────────────────────────────────

export interface QueueService {
  /** Send a one-time message to a URL endpoint */
  enqueue(message: QueueMessage): Promise<QueueResult>;
  /** Create a recurring cron schedule */
  createSchedule(message: ScheduledMessage): Promise<ScheduleResult>;
  /** Remove a recurring schedule by ID */
  removeSchedule(scheduleId: string): Promise<void>;
  /** List all active schedules */
  listSchedules(): Promise<ScheduleResult[]>;
}

// ─── QStash Implementation ───────────────────────────────────────────────────

class QStashQueueService implements QueueService {
  private client: QStashClient;

  constructor(token: string) {
    this.client = new QStashClient({ token });
  }

  /**
   * Send a one-time message to a URL endpoint.
   * QStash guarantees at-least-once delivery with automatic retries.
   */
  async enqueue(message: QueueMessage): Promise<QueueResult> {
    const {
      destination,
      body,
      delaySeconds,
      retries = 3,
      deduplicationId,
      headers = {},
    } = message;

    const result = await this.client.publishJSON({
      url: destination,
      body,
      delay: delaySeconds,
      retries,
      deduplicationId,
      headers,
    });

    return {
      messageId: result.messageId,
      accepted: true,
    };
  }

  /**
   * Create a recurring cron schedule.
   * QStash delivers the payload to the destination on the cron schedule.
   */
  async createSchedule(message: ScheduledMessage): Promise<ScheduleResult> {
    const { destination, body, cron } = message;

    const result = await this.client.schedules.create({
      destination,
      body: JSON.stringify(body),
      cron,
      headers: {
        "Content-Type": "application/json",
      },
    });

    return {
      scheduleId: result.scheduleId,
      cron,
    };
  }

  /**
   * Remove a recurring schedule by its ID.
   */
  async removeSchedule(scheduleId: string): Promise<void> {
    await this.client.schedules.delete(scheduleId);
  }

  /**
   * List all active schedules.
   */
  async listSchedules(): Promise<ScheduleResult[]> {
    const schedules = await this.client.schedules.list();

    return schedules.map((s) => ({
      scheduleId: s.scheduleId,
      cron: s.cron,
    }));
  }
}

// ─── NoOp Fallback ───────────────────────────────────────────────────────────

class NoOpQueueService implements QueueService {
  async enqueue(message: QueueMessage): Promise<QueueResult> {
    console.warn(
      "[Queue] No QStash token configured — message not queued:",
      message.destination
    );
    return { messageId: "noop", accepted: false };
  }

  async createSchedule(message: ScheduledMessage): Promise<ScheduleResult> {
    console.warn(
      "[Queue] No QStash token configured — schedule not created:",
      message.scheduleName
    );
    return { scheduleId: "noop", cron: message.cron };
  }

  async removeSchedule(): Promise<void> {
    console.warn("[Queue] No QStash token configured — remove skipped");
  }

  async listSchedules(): Promise<ScheduleResult[]> {
    console.warn("[Queue] No QStash token configured — returning empty");
    return [];
  }
}

// ─── Singleton Factory ───────────────────────────────────────────────────────

let queueService: QueueService | undefined;

/**
 * Get the queue service singleton.
 * Returns QStash-backed service if QSTASH_TOKEN is set, otherwise NoOp fallback.
 */
export function getQueueService(): QueueService {
  if (!queueService) {
    const env = getServerEnv();
    const token = (env as Record<string, string | undefined>).QSTASH_TOKEN;

    if (token) {
      queueService = new QStashQueueService(token);
    } else {
      queueService = new NoOpQueueService();
    }
  }

  return queueService;
}
