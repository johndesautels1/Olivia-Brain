import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/config/env";
import type {
  AdminAuditLogEntry,
  PersistedIntegrationTestResult,
} from "@/lib/integrations/types";

type AdminAuditLogInput = Omit<AdminAuditLogEntry, "id" | "source" | "createdAt">;
type PersistedIntegrationTestInput = Omit<
  PersistedIntegrationTestResult,
  "id" | "source"
>;

interface AdminAuditStore {
  appendIntegrationTestRun(
    entry: PersistedIntegrationTestInput,
  ): Promise<PersistedIntegrationTestResult>;
  appendAuditLog(entry: AdminAuditLogInput): Promise<AdminAuditLogEntry>;
  listRecentIntegrationTestRuns(limit?: number): Promise<PersistedIntegrationTestResult[]>;
  listRecentAuditLogs(limit?: number): Promise<AdminAuditLogEntry[]>;
}

type AdminAuditMemoryBucket = {
  integrationTests: PersistedIntegrationTestResult[];
  auditLogs: AdminAuditLogEntry[];
};

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function toMetadataRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

declare global {
  var __oliviaAdminAuditBucket: AdminAuditMemoryBucket | undefined;
}

function getMemoryBucket() {
  if (!globalThis.__oliviaAdminAuditBucket) {
    globalThis.__oliviaAdminAuditBucket = {
      integrationTests: [],
      auditLogs: [],
    };
  }

  return globalThis.__oliviaAdminAuditBucket;
}

class InMemoryAdminAuditStore implements AdminAuditStore {
  async appendIntegrationTestRun(entry: PersistedIntegrationTestInput) {
    const bucket = getMemoryBucket();
    const record: PersistedIntegrationTestResult = {
      id: crypto.randomUUID(),
      source: "memory",
      ...entry,
    };

    bucket.integrationTests.unshift(record);
    bucket.integrationTests.splice(50);

    return record;
  }

  async appendAuditLog(entry: AdminAuditLogInput) {
    const bucket = getMemoryBucket();
    const record: AdminAuditLogEntry = {
      id: crypto.randomUUID(),
      source: "memory",
      ...entry,
      createdAt: new Date().toISOString(),
    };

    bucket.auditLogs.unshift(record);
    bucket.auditLogs.splice(100);

    return record;
  }

  async listRecentIntegrationTestRuns(limit = 12) {
    return getMemoryBucket().integrationTests.slice(0, limit);
  }

  async listRecentAuditLogs(limit = 20) {
    return getMemoryBucket().auditLogs.slice(0, limit);
  }
}

class SupabaseAdminAuditStore implements AdminAuditStore {
  private client = createClient(
    getServerEnv().SUPABASE_URL!,
    getServerEnv().SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
      },
    },
  );

  async appendIntegrationTestRun(
    entry: PersistedIntegrationTestInput,
  ) {
    const { data, error } = await this.client
      .from("integration_test_runs")
      .insert({
        integration_id: entry.integrationId,
        action: entry.action,
        ok: entry.ok,
        actor: entry.actor,
        summary: entry.summary,
        details: entry.details,
        tested_at: entry.testedAt,
        duration_ms: entry.durationMs,
      })
      .select(
        "id, integration_id, action, ok, actor, summary, details, tested_at, duration_ms",
      )
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Supabase could not insert integration test run.");
    }

    return {
      id: data.id,
      source: "supabase" as const,
      integrationId: data.integration_id,
      action: data.action,
      ok: data.ok,
      actor: data.actor,
      summary: data.summary,
      details: toStringArray(data.details),
      testedAt: data.tested_at,
      durationMs: data.duration_ms,
    };
  }

  async appendAuditLog(entry: AdminAuditLogInput) {
    const { data, error } = await this.client
      .from("admin_audit_logs")
      .insert({
        event_type: entry.eventType,
        actor: entry.actor,
        summary: entry.summary,
        metadata: entry.metadata,
      })
      .select("id, event_type, actor, summary, metadata, created_at")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Supabase could not insert admin audit log.");
    }

    return {
      id: data.id,
      source: "supabase" as const,
      eventType: data.event_type,
      actor: data.actor,
      summary: data.summary,
      metadata: toMetadataRecord(data.metadata),
      createdAt: data.created_at,
    };
  }

  async listRecentIntegrationTestRuns(limit = 12) {
    const { data, error } = await this.client
      .from("integration_test_runs")
      .select(
        "id, integration_id, action, ok, actor, summary, details, tested_at, duration_ms",
      )
      .order("tested_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      source: "supabase" as const,
      integrationId: row.integration_id,
      action: row.action,
      ok: row.ok,
      actor: row.actor,
      summary: row.summary,
      details: toStringArray(row.details),
      testedAt: row.tested_at,
      durationMs: row.duration_ms,
    }));
  }

  async listRecentAuditLogs(limit = 20) {
    const { data, error } = await this.client
      .from("admin_audit_logs")
      .select("id, event_type, actor, summary, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      source: "supabase" as const,
      eventType: row.event_type,
      actor: row.actor,
      summary: row.summary,
      metadata: toMetadataRecord(row.metadata),
      createdAt: row.created_at,
    }));
  }
}

class SafeAdminAuditStore implements AdminAuditStore {
  constructor(
    private readonly primary: AdminAuditStore,
    private readonly fallback: AdminAuditStore,
  ) {}

  async appendIntegrationTestRun(
    entry: PersistedIntegrationTestInput,
  ) {
    try {
      return await this.primary.appendIntegrationTestRun(entry);
    } catch {
      return this.fallback.appendIntegrationTestRun(entry);
    }
  }

  async appendAuditLog(entry: AdminAuditLogInput) {
    try {
      return await this.primary.appendAuditLog(entry);
    } catch {
      return this.fallback.appendAuditLog(entry);
    }
  }

  async listRecentIntegrationTestRuns(limit?: number) {
    try {
      return await this.primary.listRecentIntegrationTestRuns(limit);
    } catch {
      return this.fallback.listRecentIntegrationTestRuns(limit);
    }
  }

  async listRecentAuditLogs(limit?: number) {
    try {
      return await this.primary.listRecentAuditLogs(limit);
    } catch {
      return this.fallback.listRecentAuditLogs(limit);
    }
  }
}

export function getAdminAuditStore(): AdminAuditStore {
  const env = getServerEnv();
  const fallback = new InMemoryAdminAuditStore();

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return fallback;
  }

  return new SafeAdminAuditStore(new SupabaseAdminAuditStore(), fallback);
}
