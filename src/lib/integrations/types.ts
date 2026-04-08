import type { IntegrationGroup, StatusLevel } from "@/lib/foundation/types";

export type IntegrationTestAction = "validate-env" | "live-check";

export interface IntegrationKeyStatus {
  key: string;
  required: boolean;
  present: boolean;
}

export interface AdminIntegrationStatus {
  id: string;
  label: string;
  group: IntegrationGroup;
  purpose: string;
  status: StatusLevel | "partial";
  configured: boolean;
  requiredKeyCount: number;
  presentRequiredKeyCount: number;
  optionalKeyCount: number;
  presentOptionalKeyCount: number;
  keys: IntegrationKeyStatus[];
  supportedActions: IntegrationTestAction[];
}

export interface IntegrationTestResult {
  integrationId: string;
  action: IntegrationTestAction;
  ok: boolean;
  summary: string;
  details: string[];
  testedAt: string;
  durationMs: number;
}

export interface PersistedIntegrationTestResult extends IntegrationTestResult {
  id: string;
  source: "supabase" | "memory";
  actor: string;
}

export interface AdminAuditLogEntry {
  id: string;
  eventType: "dashboard_view" | "integration_test";
  actor: string;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  source: "supabase" | "memory";
}

export interface AdminDashboardData {
  integrations: AdminIntegrationStatus[];
  recentTests: PersistedIntegrationTestResult[];
  recentAuditLogs: AdminAuditLogEntry[];
}
