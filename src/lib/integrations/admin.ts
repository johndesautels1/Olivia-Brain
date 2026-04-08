import { createClient } from "@supabase/supabase-js";

import { getAdminAuditStore } from "@/lib/admin/audit-store";
import { getServerEnv } from "@/lib/config/env";
import {
  INTEGRATION_CATALOG,
  type IntegrationCatalogEntry,
} from "@/lib/foundation/catalog";
import { isEnvKeyConfigured, isIntegrationConfigured } from "@/lib/foundation/status";
import { getLondonCalendarHealthSnapshot } from "@/lib/adapters/london-calendar";
import { getHubSpotHealthSnapshot } from "@/lib/hubspot/server";
import { getInstantlyHealthSnapshot } from "@/lib/instantly/server";
import { getResendHealthSnapshot } from "@/lib/resend/server";
import { getTwilioClient } from "@/lib/twilio/server";
import type {
  AdminDashboardData,
  AdminIntegrationStatus,
  IntegrationKeyStatus,
  IntegrationTestAction,
  IntegrationTestResult,
  PersistedIntegrationTestResult,
} from "@/lib/integrations/types";

function getIntegrationKeys(
  integration: IntegrationCatalogEntry,
  env: ReturnType<typeof getServerEnv>,
) {
  const requiredKeys: IntegrationKeyStatus[] = integration.requiredKeys.map((key) => ({
    key,
    required: true,
    present: isEnvKeyConfigured(env, key),
  }));
  const optionalKeys: IntegrationKeyStatus[] = (integration.optionalKeys ?? []).map(
    (key) => ({
      key,
      required: false,
      present: isEnvKeyConfigured(env, key),
    }),
  );

  return [...requiredKeys, ...optionalKeys];
}

function getIntegrationStatusSummary(
  integration: IntegrationCatalogEntry,
  env: ReturnType<typeof getServerEnv>,
) {
  const configured = isIntegrationConfigured(integration, env);
  const requiredKeys = integration.requiredKeys.map((key) =>
    isEnvKeyConfigured(env, key),
  );
  const presentRequiredKeyCount = requiredKeys.filter(Boolean).length;

  if (configured) {
    return {
      configured,
      status: "configured" as const,
      presentRequiredKeyCount,
    };
  }

  if (presentRequiredKeyCount > 0) {
    return {
      configured,
      status: "partial" as const,
      presentRequiredKeyCount,
    };
  }

  return {
    configured,
    status: "missing" as const,
    presentRequiredKeyCount,
  };
}

function getSupportedActions(integrationId: string): IntegrationTestAction[] {
  const liveCheckSupported = new Set([
    "supabase",
    "twilio",
    "tavily",
    "hubspot",
    "clues_london_calendar",
    "resend",
    "instantly",
  ]);

  return liveCheckSupported.has(integrationId)
    ? ["validate-env", "live-check"]
    : ["validate-env"];
}

export function getAdminIntegrationStatuses(): AdminIntegrationStatus[] {
  const env = getServerEnv();

  return INTEGRATION_CATALOG.map((integration) => {
    const keys = getIntegrationKeys(integration, env);
    const statusSummary = getIntegrationStatusSummary(integration, env);

    return {
      id: integration.id,
      label: integration.label,
      group: integration.group,
      purpose: integration.purpose,
      status: statusSummary.status,
      configured: statusSummary.configured,
      requiredKeyCount: integration.requiredKeys.length,
      presentRequiredKeyCount: statusSummary.presentRequiredKeyCount,
      optionalKeyCount: integration.optionalKeys?.length ?? 0,
      presentOptionalKeyCount: keys.filter((key) => !key.required && key.present).length,
      keys,
      supportedActions: getSupportedActions(integration.id),
    };
  });
}

async function listRecentAdminActivity() {
  const store = getAdminAuditStore();
  const [recentTests, recentAuditLogs] = await Promise.all([
    store.listRecentIntegrationTestRuns(12),
    store.listRecentAuditLogs(20),
  ]);

  return {
    recentTests,
    recentAuditLogs,
  };
}

export async function getAdminDashboardData(actor: string): Promise<AdminDashboardData> {
  const integrations = getAdminIntegrationStatuses();
  const store = getAdminAuditStore();

  await store.appendAuditLog({
    eventType: "dashboard_view",
    actor,
    summary: "Viewed the admin integrations dashboard.",
    metadata: {
      integrationCount: integrations.length,
    },
  });

  const { recentTests, recentAuditLogs } = await listRecentAdminActivity();

  return {
    integrations,
    recentTests,
    recentAuditLogs,
  };
}

function buildValidationResult(integrationId: string): IntegrationTestResult {
  const statuses = getAdminIntegrationStatuses();
  const integration = statuses.find((item) => item.id === integrationId);

  if (!integration) {
    throw new Error(`Unknown integration "${integrationId}".`);
  }

  const missingRequired = integration.keys
    .filter((key) => key.required && !key.present)
    .map((key) => key.key);
  const presentOptional = integration.keys
    .filter((key) => !key.required && key.present)
    .map((key) => key.key);

  return {
    integrationId,
    action: "validate-env",
    ok: integration.configured,
    summary: integration.configured
      ? `${integration.label} has all required environment variables.`
      : `${integration.label} is missing required environment variables.`,
    details: [
      `Required keys present: ${integration.presentRequiredKeyCount}/${integration.requiredKeyCount}`,
      integration.optionalKeyCount > 0
        ? `Optional keys present: ${integration.presentOptionalKeyCount}/${integration.optionalKeyCount}`
        : "Optional keys present: 0/0",
      missingRequired.length > 0
        ? `Missing required keys: ${missingRequired.join(", ")}`
        : "Missing required keys: none",
      presentOptional.length > 0
        ? `Present optional keys: ${presentOptional.join(", ")}`
        : "Present optional keys: none",
    ],
    testedAt: new Date().toISOString(),
    durationMs: 0,
  };
}

async function runSupabaseLiveCheck(): Promise<{ ok: boolean; summary: string; details: string[] }> {
  const env = getServerEnv();
  const client = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      persistSession: false,
    },
  });
  const { count, error } = await client
    .from("conversations")
    .select("id", { head: true, count: "exact" });

  if (error) {
    return {
      ok: false,
      summary: "Supabase live check failed.",
      details: [error.message],
    };
  }

  return {
    ok: true,
    summary: "Supabase responded successfully.",
    details: [`Conversation rows visible: ${count ?? 0}`],
  };
}

async function runTwilioLiveCheck(): Promise<{ ok: boolean; summary: string; details: string[] }> {
  const env = getServerEnv();
  const client = getTwilioClient();

  if (!client) {
    return {
      ok: false,
      summary: "Twilio client could not be created from the current environment.",
      details: ["Configure account SID plus auth token or API key/secret."],
    };
  }

  const account = await client.api.v2010.accounts(env.TWILIO_ACCOUNT_SID!).fetch();
  const numbers = await client.incomingPhoneNumbers.list({ limit: 1 });

  return {
    ok: true,
    summary: "Twilio account query succeeded.",
    details: [
      `Account status: ${account.status}`,
      `Account friendly name: ${account.friendlyName}`,
      `Incoming numbers visible: ${numbers.length > 0 ? "yes" : "no"}`,
    ],
  };
}

async function runTavilyLiveCheck(): Promise<{ ok: boolean; summary: string; details: string[] }> {
  const env = getServerEnv();
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: env.TAVILY_API_KEY,
      query: "Olivia Brain integration health check",
      topic: "general",
      max_results: 1,
      search_depth: "basic",
      include_answer: false,
      include_raw_content: false,
    }),
    signal: AbortSignal.timeout(15000),
  });

  const payload = (await response.json()) as {
    results?: Array<{ title?: string; url?: string }>;
    error?: string;
  };

  if (!response.ok) {
    return {
      ok: false,
      summary: "Tavily search request failed.",
      details: [payload.error ?? `HTTP ${response.status}`],
    };
  }

  const topResult = payload.results?.[0];

  return {
    ok: true,
    summary: "Tavily search request succeeded.",
    details: [
      `Top result title: ${topResult?.title ?? "none"}`,
      `Top result URL: ${topResult?.url ?? "none"}`,
    ],
  };
}

async function runHubSpotLiveCheck(): Promise<{
  ok: boolean;
  summary: string;
  details: string[];
}> {
  const snapshot = await getHubSpotHealthSnapshot();

  return {
    ok: true,
    summary: "HubSpot account and CRM object queries succeeded.",
    details: [
      `Portal ID: ${snapshot.account.portalId}`,
      `Account type: ${snapshot.account.accountType}`,
      `Timezone: ${snapshot.account.timeZone}`,
      `UI domain: ${snapshot.account.uiDomain ?? "none"}`,
      `Contacts visible: ${snapshot.objects.contacts.countVisible > 0 ? "yes" : "no"}${snapshot.objects.contacts.sampleId ? ` (sample ${snapshot.objects.contacts.sampleId})` : ""}`,
      `Companies visible: ${snapshot.objects.companies.countVisible > 0 ? "yes" : "no"}${snapshot.objects.companies.sampleId ? ` (sample ${snapshot.objects.companies.sampleId})` : ""}`,
      `Deals visible: ${snapshot.objects.deals.countVisible > 0 ? "yes" : "no"}${snapshot.objects.deals.sampleId ? ` (sample ${snapshot.objects.deals.sampleId})` : ""}`,
    ],
  };
}

async function runCluesLondonCalendarLiveCheck(): Promise<{
  ok: boolean;
  summary: string;
  details: string[];
}> {
  const snapshot = await getLondonCalendarHealthSnapshot();

  return {
    ok: snapshot.ok,
    summary: snapshot.ok
      ? "CLUES London calendar adapter responded successfully."
      : "CLUES London calendar adapter health check reported attention required.",
    details: [
      `Service: ${snapshot.service}`,
      `Version: ${snapshot.version}`,
      `Caller acknowledged: ${snapshot.caller ?? "unknown"}`,
      `Capabilities: ${
        snapshot.capabilities.length > 0
          ? snapshot.capabilities.join(", ")
          : "none reported"
      }`,
    ],
  };
}

async function runResendLiveCheck(): Promise<{
  ok: boolean;
  summary: string;
  details: string[];
}> {
  const snapshot = await getResendHealthSnapshot();

  if (!snapshot.hasConfiguredDomain) {
    return {
      ok: false,
      summary: "Resend API key is valid but no sending domains are configured.",
      details: [
        "The account responded successfully, but /domains returned no domains.",
        "Add and verify at least one sending domain before using Resend for production email.",
      ],
    };
  }

  return {
    ok: true,
    summary: "Resend domain query succeeded.",
    details: [
      `Configured domains visible: ${snapshot.domainCount}`,
      `Top domain: ${snapshot.topDomain?.name ?? "none"}`,
      `Top domain status: ${snapshot.topDomain?.status ?? "unknown"}`,
      `Sending capability: ${snapshot.topDomain?.capabilities?.sending ?? "unknown"}`,
      `Receiving capability: ${snapshot.topDomain?.capabilities?.receiving ?? "unknown"}`,
      `Region: ${snapshot.topDomain?.region ?? "unknown"}`,
    ],
  };
}

async function runInstantlyLiveCheck(): Promise<{
  ok: boolean;
  summary: string;
  details: string[];
}> {
  const snapshot = await getInstantlyHealthSnapshot();

  return {
    ok: true,
    summary: "Instantly account and campaign queries succeeded.",
    details: [
      `Accounts visible: ${snapshot.accountCount}`,
      `Campaigns visible: ${snapshot.campaignCount}`,
      `Top account email: ${snapshot.topAccount?.email ?? "none"}`,
      `Top account status: ${snapshot.topAccount?.status ?? "unknown"}`,
      `Top account provider: ${snapshot.topAccount?.provider ?? "unknown"}`,
      `Top campaign name: ${snapshot.topCampaign?.name ?? "none"}`,
      `Top campaign status: ${
        snapshot.topCampaign?.campaign_status ??
        snapshot.topCampaign?.status ??
        "unknown"
      }`,
      `Top campaign active: ${
        typeof snapshot.topCampaign?.is_active === "boolean"
          ? snapshot.topCampaign.is_active
            ? "yes"
            : "no"
          : "unknown"
      }`,
    ],
  };
}

export async function runIntegrationTest(
  integrationId: string,
  action: IntegrationTestAction,
): Promise<IntegrationTestResult> {
  const startedAt = Date.now();

  if (action === "validate-env") {
    return buildValidationResult(integrationId);
  }

  const validation = buildValidationResult(integrationId);

  if (!validation.ok) {
    return {
      ...validation,
      action,
      summary: `${validation.summary} Live test skipped.`,
      details: [...validation.details, "Live test was not run because the environment is incomplete."],
      durationMs: Date.now() - startedAt,
    };
  }

  let result: { ok: boolean; summary: string; details: string[] };

  try {
    switch (integrationId) {
      case "supabase":
        result = await runSupabaseLiveCheck();
        break;
      case "twilio":
        result = await runTwilioLiveCheck();
        break;
      case "tavily":
        result = await runTavilyLiveCheck();
        break;
      case "hubspot":
        result = await runHubSpotLiveCheck();
        break;
      case "clues_london_calendar":
        result = await runCluesLondonCalendarLiveCheck();
        break;
      case "resend":
        result = await runResendLiveCheck();
        break;
      case "instantly":
        result = await runInstantlyLiveCheck();
        break;
      default:
        result = {
          ok: false,
          summary: "Live test is not implemented for this integration yet.",
          details: [
            "Only environment validation is currently supported for this integration.",
          ],
        };
        break;
    }
  } catch (error) {
    const integration = getAdminIntegrationStatuses().find((item) => item.id === integrationId);
    const label = integration?.label ?? integrationId;
    const message =
      error instanceof Error ? error.message : "Unexpected integration live-check error.";

    result = {
      ok: false,
      summary: `${label} live check failed.`,
      details: [message],
    };
  }

  return {
    integrationId,
    action,
    ok: result.ok,
    summary: result.summary,
    details: result.details,
    testedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
  };
}

export async function runTrackedIntegrationTest(
  integrationId: string,
  action: IntegrationTestAction,
  actor: string,
): Promise<{
  result: PersistedIntegrationTestResult;
  dashboard: AdminDashboardData;
}> {
  const store = getAdminAuditStore();
  const result = await runIntegrationTest(integrationId, action);
  const persistedResult = await store.appendIntegrationTestRun({
    ...result,
    actor,
  });

  await store.appendAuditLog({
    eventType: "integration_test",
    actor,
    summary: `${action} ran for ${integrationId}. ${persistedResult.ok ? "Result OK." : "Attention required."}`,
    metadata: {
      integrationId,
      action,
      ok: persistedResult.ok,
      durationMs: persistedResult.durationMs,
      source: persistedResult.source,
    },
  });

  const { recentTests, recentAuditLogs } = await listRecentAdminActivity();

  return {
    result: persistedResult,
    dashboard: {
      integrations: getAdminIntegrationStatuses(),
      recentTests,
      recentAuditLogs,
    },
  };
}
