"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import type { IntegrationGroup } from "@/lib/foundation/types";
import type {
  AdminAuditLogEntry,
  AdminDashboardData,
  AdminIntegrationStatus,
  PersistedIntegrationTestResult,
} from "@/lib/integrations/types";

const integrationGroupLabels: Record<IntegrationGroup, string> = {
  platform: "Platform",
  search: "Search",
  ops: "Ops",
  telephony: "Telephony",
  avatar: "Avatar And Voice",
  execution: "Durable Execution",
  observability: "Observability",
};

type DashboardResponse = {
  mode: "secured" | "dev-open";
  dashboard: AdminDashboardData;
};

async function fetchDashboardPayload(key: string) {
  const response = await fetch("/api/admin/integrations", {
    cache: "no-store",
    headers: key
      ? {
          "x-admin-key": key,
        }
      : {},
  });

  const payload = (await response.json()) as DashboardResponse | { error: string };

  if (!response.ok || "error" in payload) {
    throw new Error("error" in payload ? payload.error : "Failed to load admin dashboard.");
  }

  return payload;
}

function formatActor(actor: string) {
  return actor.replace(":", " / ");
}

function formatMetadataValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "yes" : "no";
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function formatMetadata(metadata: Record<string, unknown>) {
  const entries = Object.entries(metadata);

  if (entries.length === 0) {
    return "No metadata recorded.";
  }

  return entries
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${formatMetadataValue(value)}`)
    .join(" | ");
}

export function AdminIntegrationsDashboard() {
  const [adminKey, setAdminKey] = useState("");
  const [connectedMode, setConnectedMode] = useState<"secured" | "dev-open" | null>(
    null,
  );
  const [integrations, setIntegrations] = useState<AdminIntegrationStatus[]>([]);
  const [recentTests, setRecentTests] = useState<PersistedIntegrationTestResult[]>([]);
  const [recentAuditLogs, setRecentAuditLogs] = useState<AdminAuditLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const storedAdminKeyRef = useRef("");

  const groupedIntegrations = useMemo(() => {
    return Object.entries(integrationGroupLabels)
      .map(([group, label]) => ({
        group: group as IntegrationGroup,
        label,
        items: integrations.filter((integration) => integration.group === group),
      }))
      .filter((group) => group.items.length > 0);
  }, [integrations]);

  const configuredCount = useMemo(
    () => integrations.filter((integration) => integration.status === "configured").length,
    [integrations],
  );
  const partialCount = useMemo(
    () => integrations.filter((integration) => integration.status === "partial").length,
    [integrations],
  );
  const latestResultsByIntegration = useMemo(() => {
    return recentTests.reduce<Record<string, PersistedIntegrationTestResult>>((map, result) => {
      if (!map[result.integrationId]) {
        map[result.integrationId] = result;
      }

      return map;
    }, {});
  }, [recentTests]);

  function applyDashboardData(dashboard: AdminDashboardData) {
    setIntegrations(dashboard.integrations);
    setRecentTests(dashboard.recentTests);
    setRecentAuditLogs(dashboard.recentAuditLogs);
  }

  async function loadDashboard(keyOverride?: string) {
    const key = keyOverride ?? (adminKey || storedAdminKeyRef.current);

    setError(null);
    const payload = await fetchDashboardPayload(key);

    setConnectedMode(payload.mode);
    applyDashboardData(payload.dashboard);
  }

  async function handleConnect() {
    try {
      await loadDashboard(adminKey);

      if (adminKey) {
        storedAdminKeyRef.current = adminKey;
        window.sessionStorage.setItem("olivia-admin-key", adminKey);
      } else {
        storedAdminKeyRef.current = "";
        window.sessionStorage.removeItem("olivia-admin-key");
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unknown admin connection error.",
      );
    }
  }

  useEffect(() => {
    const savedKey = window.sessionStorage.getItem("olivia-admin-key");

    if (!savedKey) {
      return;
    }

    storedAdminKeyRef.current = savedKey;

    void (async () => {
      try {
        const payload = await fetchDashboardPayload(savedKey);

        setConnectedMode(payload.mode);
        applyDashboardData(payload.dashboard);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unknown admin connection error.",
        );
      }
    })();
  }, []);

  async function handleRefresh() {
    try {
      await loadDashboard();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unknown dashboard refresh error.",
      );
    }
  }

  async function handleTest(
    integrationId: string,
    action: "validate-env" | "live-check",
  ) {
    setError(null);

    const response = await fetch("/api/admin/integrations/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...((adminKey || storedAdminKeyRef.current)
          ? {
              "x-admin-key": adminKey || storedAdminKeyRef.current,
            }
          : {}),
      },
      body: JSON.stringify({
        integrationId,
        action,
      }),
    });

    const payload = (await response.json()) as
      | {
          mode: "secured" | "dev-open";
          result: PersistedIntegrationTestResult;
          dashboard: AdminDashboardData;
        }
      | { error: string };

    if (!response.ok || "error" in payload) {
      throw new Error("error" in payload ? payload.error : "Integration test failed.");
    }

    setConnectedMode(payload.mode);
    applyDashboardData(payload.dashboard);
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Admin</p>
          <h1>Integrations</h1>
          <p className="hero-body">
            Review environment readiness, inspect required versus optional keys,
            and run safe test actions without touching production data paths.
          </p>
          <div className="admin-hero-actions">
            <Link className="secondary-link" href="/">
              Back to foundation
            </Link>
          </div>
        </div>
        <div className="hero-panel">
          <div className="hero-stat">
            <span>Configured</span>
            <strong>{integrations.length > 0 ? configuredCount : "loading"}</strong>
          </div>
          <div className="hero-stat">
            <span>Partial</span>
            <strong>{integrations.length > 0 ? partialCount : "loading"}</strong>
          </div>
          <div className="hero-stat">
            <span>Access mode</span>
            <strong>{connectedMode ?? "not connected"}</strong>
          </div>
        </div>
      </section>

      <section className="card admin-gate">
        <div className="section-heading">
          <div>
            <p className="card-kicker">Admin Access</p>
            <h2>Connect</h2>
          </div>
        </div>
        <div className="admin-gate-row">
          <input
            className="admin-input"
            onChange={(event) => setAdminKey(event.target.value)}
            placeholder="Enter ADMIN_API_KEY for production or leave blank in local dev."
            type="password"
            value={adminKey}
          />
          <button className="primary-button" onClick={() => void handleConnect()} type="button">
            Load dashboard
          </button>
          <button
            className="secondary-button"
            onClick={() => {
              startTransition(() => {
                void handleRefresh();
              });
            }}
            type="button"
          >
            {isPending ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
        {connectedMode === "dev-open" ? (
          <p className="admin-warning">
            Development mode is open because `ADMIN_API_KEY` is not configured.
            Do not leave the admin dashboard unsecured in production.
          </p>
        ) : null}
      </section>

      <section className="admin-groups">
        {groupedIntegrations.map((group) => (
          <article className="card" key={group.group}>
            <div className="section-heading">
              <div>
                <p className="card-kicker">{group.label}</p>
                <h2>{group.items.length} integrations</h2>
              </div>
            </div>
            <div className="admin-card-grid">
              {group.items.map((integration) => {
                const result = latestResultsByIntegration[integration.id];

                return (
                  <div className="integration-admin-card" key={integration.id}>
                    <div className="integration-admin-top">
                      <div>
                        <strong>{integration.label}</strong>
                        <p>{integration.purpose}</p>
                      </div>
                      <span
                        className={`status-badge ${
                          integration.status === "configured"
                            ? "status-ready"
                            : integration.status === "partial"
                              ? "status-warn"
                              : "status-missing"
                        }`}
                      >
                        {integration.status}
                      </span>
                    </div>

                    <div className="key-metrics">
                      <span>
                        Required {integration.presentRequiredKeyCount}/{integration.requiredKeyCount}
                      </span>
                      <span>
                        Optional {integration.presentOptionalKeyCount}/{integration.optionalKeyCount}
                      </span>
                    </div>

                    <div className="key-list">
                      {integration.keys.map((key) => (
                        <div className="key-row" key={key.key}>
                          <span className="key-name">{key.key}</span>
                          <span
                            className={`key-state ${
                              key.present ? "key-state-on" : "key-state-off"
                            }`}
                          >
                            {key.required ? "required" : "optional"} /{" "}
                            {key.present ? "present" : "missing"}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="admin-action-row">
                      <button
                        className="secondary-button"
                        onClick={() => void handleTest(integration.id, "validate-env")}
                        type="button"
                      >
                        Validate env
                      </button>
                      {integration.supportedActions.includes("live-check") ? (
                        <button
                          className="primary-button"
                          onClick={() => void handleTest(integration.id, "live-check")}
                          type="button"
                        >
                          Run live check
                        </button>
                      ) : null}
                    </div>

                    {result ? (
                      <div className="test-result">
                        <div className="integration-admin-top">
                          <strong>{result.summary}</strong>
                          <span
                            className={`status-badge ${
                              result.ok ? "status-ready" : "status-missing"
                            }`}
                          >
                            {result.ok ? "ok" : "failed"}
                          </span>
                        </div>
                        <p className="test-meta">
                          {result.action} in {result.durationMs} ms at {new Date(result.testedAt).toLocaleString()}
                        </p>
                        <p className="test-meta">
                          {formatActor(result.actor)} via {result.source}
                        </p>
                        <div className="test-detail-list">
                          {result.details.map((detail) => (
                            <p key={detail}>{detail}</p>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </section>

      <section className="admin-feed-grid">
        <article className="card">
          <div className="section-heading">
            <div>
              <p className="card-kicker">History</p>
              <h2>Recent Integration Tests</h2>
            </div>
          </div>
          {recentTests.length === 0 ? (
            <p className="muted">No integration test history has been recorded yet.</p>
          ) : (
            <div className="admin-feed-list">
              {recentTests.map((result) => {
                const integration = integrations.find((item) => item.id === result.integrationId);

                return (
                  <div className="admin-feed-row" key={result.id}>
                    <div className="integration-admin-top">
                      <div>
                        <strong>{integration?.label ?? result.integrationId}</strong>
                        <p>{result.summary}</p>
                      </div>
                      <div className="admin-feed-badges">
                        <span
                          className={`status-badge ${
                            result.ok ? "status-ready" : "status-missing"
                          }`}
                        >
                          {result.ok ? "ok" : "attention"}
                        </span>
                        <span
                          className={`status-badge ${
                            result.source === "supabase" ? "status-ready" : "status-warn"
                          }`}
                        >
                          {result.source}
                        </span>
                      </div>
                    </div>
                    <p className="test-meta">
                      {result.action} by {formatActor(result.actor)} in {result.durationMs} ms at{" "}
                      {new Date(result.testedAt).toLocaleString()}
                    </p>
                    <div className="test-detail-list">
                      {result.details.slice(0, 3).map((detail) => (
                        <p key={`${result.id}-${detail}`}>{detail}</p>
                      ))}
                      {result.details.length > 3 ? (
                        <p>Additional details: {result.details.length - 3} more lines.</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className="card">
          <div className="section-heading">
            <div>
              <p className="card-kicker">Audit Trail</p>
              <h2>Recent Admin Events</h2>
            </div>
          </div>
          {recentAuditLogs.length === 0 ? (
            <p className="muted">No admin audit events have been recorded yet.</p>
          ) : (
            <div className="admin-feed-list">
              {recentAuditLogs.map((entry) => (
                <div className="admin-feed-row" key={entry.id}>
                  <div className="integration-admin-top">
                    <div>
                      <strong>{entry.summary}</strong>
                      <p>{formatMetadata(entry.metadata)}</p>
                    </div>
                    <div className="admin-feed-badges">
                      <span
                        className={`status-badge ${
                          entry.eventType === "dashboard_view"
                            ? "status-ready"
                            : "status-warn"
                        }`}
                      >
                        {entry.eventType.replace("_", " ")}
                      </span>
                      <span
                        className={`status-badge ${
                          entry.source === "supabase" ? "status-ready" : "status-warn"
                        }`}
                      >
                        {entry.source}
                      </span>
                    </div>
                  </div>
                  <p className="test-meta">
                    {formatActor(entry.actor)} at {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
