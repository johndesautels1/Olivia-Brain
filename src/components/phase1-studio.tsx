"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { PHASE_ONE_PILLARS } from "@/lib/foundation/catalog";
import type {
  ChatResponsePayload,
  FoundationStatus,
  FoundationTrace,
  IntegrationGroup,
} from "@/lib/foundation/types";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: string;
};

const integrationGroupLabels: Record<IntegrationGroup, string> = {
  platform: "Platform",
  search: "Search",
  ops: "Ops",
  telephony: "Telephony",
  avatar: "Avatar And Voice",
  execution: "Durable Execution",
  observability: "Observability",
};

function createInitialAssistantMessage(): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content:
      "Phase 1 is live as a real foundation app now. Ask for architecture changes, provider strategy, or the next implementation slice and the orchestration path will route it through the new backend.",
  };
}

export function Phase1Studio() {
  const [status, setStatus] = useState<FoundationStatus | null>(null);
  const [traces, setTraces] = useState<FoundationTrace[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [message, setMessage] = useState(
    "Break down the next concrete task for Phase 1.",
  );
  const [messages, setMessages] = useState<ChatMessage[]>([
    createInitialAssistantMessage(),
  ]);
  const [forceMock, setForceMock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const configuredProviderCount = useMemo(
    () => status?.providers.filter((provider) => provider.configured).length ?? 0,
    [status],
  );
  const configuredIntegrationCount = useMemo(
    () => status?.integrations.filter((integration) => integration.configured).length ?? 0,
    [status],
  );
  const groupedIntegrations = useMemo(() => {
    const entries = Object.entries(integrationGroupLabels).map(([group, label]) => ({
      group: group as IntegrationGroup,
      label,
      items:
        status?.integrations.filter((integration) => integration.group === group) ?? [],
    }));

    return entries.filter((entry) => entry.items.length > 0);
  }, [status]);

  useEffect(() => {
    void refreshStatus();
  }, []);

  async function refreshStatus() {
    const [healthResponse, traceResponse] = await Promise.all([
      fetch("/api/health", { cache: "no-store" }),
      fetch("/api/traces", { cache: "no-store" }),
    ]);

    const healthData = (await healthResponse.json()) as FoundationStatus;
    const traceData = (await traceResponse.json()) as { traces: FoundationTrace[] };

    setStatus(healthData);
    setTraces(traceData.traces);
  }

  async function sendMessage() {
    const trimmed = message.trim();

    if (!trimmed) {
      return;
    }

    setError(null);

    const outboundMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    setMessages((current) => [...current, outboundMessage]);
    setMessage("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId,
          message: trimmed,
          forceMock,
        }),
      });

      const payload = (await response.json()) as
        | ChatResponsePayload
        | { error: string };

      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Chat request failed.");
      }

      setConversationId(payload.conversationId);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: payload.response,
          meta: `${payload.provider} / ${payload.model} / ${payload.intent}`,
        },
      ]);

      startTransition(() => {
        void refreshStatus();
      });
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? caughtError.message
          : "Unknown error during chat request.";

      setError(nextError);
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Olivia Brain</p>
          <h1>Phase 1 Foundation</h1>
          <p className="hero-body">
            The roadmap is now an actual foundation app: React UI, orchestration
            graph, model cascade, memory layer, and readiness tracking for the
            external systems that Phase 1 depends on.
          </p>
        </div>
        <div className="hero-panel">
          <div className="hero-stat">
            <span>Runtime</span>
            <strong>{status?.runtimeMode ?? "loading"}</strong>
          </div>
          <div className="hero-stat">
            <span>Live providers</span>
            <strong>{configuredProviderCount}</strong>
          </div>
          <div className="hero-stat">
            <span>Memory backend</span>
            <strong>{status?.memory.backend ?? "loading"}</strong>
          </div>
          <div className="hero-stat">
            <span>Configured systems</span>
            <strong>
              {status ? `${configuredIntegrationCount}/${status.integrations.length}` : "loading"}
            </strong>
          </div>
        </div>
      </section>

      <section className="pillars-grid">
        {PHASE_ONE_PILLARS.map((pillar) => (
          <article className="card pillar-card" key={pillar.title}>
            <p className="card-kicker">{pillar.title}</p>
            <p>{pillar.detail}</p>
          </article>
        ))}
      </section>

      <section className="workspace-grid">
        <article className="card chat-card">
          <div className="section-heading">
            <div>
              <p className="card-kicker">Control Surface</p>
              <h2>Talk To The Foundation</h2>
            </div>
            <label className="toggle">
              <input
                checked={forceMock}
                onChange={(event) => setForceMock(event.target.checked)}
                type="checkbox"
              />
              <span>Force mock mode</span>
            </label>
          </div>

          <div className="chat-log">
            {messages.map((entry) => (
              <div
                className={`bubble ${entry.role === "assistant" ? "assistant" : "user"}`}
                key={entry.id}
              >
                <p className="bubble-role">{entry.role === "assistant" ? "Olivia" : "You"}</p>
                <p>{entry.content}</p>
                {entry.meta ? <p className="bubble-meta">{entry.meta}</p> : null}
              </div>
            ))}
          </div>

          <div className="composer">
            <textarea
              className="composer-input"
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask for the next Phase 1 task, architecture changes, or readiness gaps."
              rows={4}
              value={message}
            />
            <div className="composer-row">
              <button
                className="primary-button"
                disabled={isPending}
                onClick={() => {
                  void sendMessage();
                }}
                type="button"
              >
                {isPending ? "Sending..." : "Send"}
              </button>
              {conversationId ? (
                <p className="conversation-label">Conversation {conversationId.slice(0, 8)}</p>
              ) : (
                <p className="conversation-label">New conversation</p>
              )}
            </div>
            {error ? <p className="error-text">{error}</p> : null}
          </div>
        </article>

        <aside className="status-column">
          <article className="card">
            <div className="section-heading">
              <div>
                <p className="card-kicker">Readiness</p>
                <h2>Provider Surface</h2>
              </div>
            </div>
            <div className="stack-list">
              {status?.providers.map((provider) => (
                <div className="stack-row" key={provider.id}>
                  <div>
                    <strong>{provider.label}</strong>
                    <p>{provider.modelId}</p>
                  </div>
                  <span
                    className={`status-badge ${
                      provider.configured ? "status-ready" : "status-missing"
                    }`}
                  >
                    {provider.configured ? "configured" : "missing"}
                  </span>
                </div>
              )) ?? <p className="muted">Loading provider status...</p>}
            </div>
          </article>

          <article className="card">
            <div className="section-heading">
              <div>
                <p className="card-kicker">Systems</p>
                <h2>Integration Surface</h2>
              </div>
            </div>
            {status ? (
              <div className="stack-list">
                {groupedIntegrations.map((group) => (
                  <div className="integration-group" key={group.group}>
                    <p className="group-label">{group.label}</p>
                    <div className="stack-list">
                      {group.items.map((integration) => (
                        <div className="stack-row" key={integration.id}>
                          <div>
                            <strong>{integration.label}</strong>
                            <p>{integration.purpose}</p>
                          </div>
                          <span
                            className={`status-badge ${
                              integration.configured ? "status-ready" : "status-missing"
                            }`}
                          >
                            {integration.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">Loading integration status...</p>
            )}
          </article>
        </aside>
      </section>

      <section className="bottom-grid">
        <article className="card">
          <div className="section-heading">
            <div>
              <p className="card-kicker">Tracing</p>
              <h2>Recent Graph Runs</h2>
            </div>
          </div>
          <div className="trace-list">
            {traces.length === 0 ? (
              <p className="muted">No traces yet. Send a message to exercise the graph.</p>
            ) : (
              traces.map((trace) => (
                <div className="trace-row" key={trace.id}>
                  <div>
                    <strong>{trace.intent}</strong>
                    <p>{trace.responsePreview}</p>
                  </div>
                  <div className="trace-meta">
                    <span>{trace.selectedProvider}</span>
                    <span>{trace.runtimeMode}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="card">
          <div className="section-heading">
            <div>
              <p className="card-kicker">Next Up</p>
              <h2>Foundation Gaps</h2>
            </div>
          </div>
          <div className="stack-list">
            {status?.recommendedNextActions.map((action) => (
              <div className="stack-row stack-row-tight" key={action}>
                <div>
                  <p>{action}</p>
                </div>
              </div>
            )) ?? <p className="muted">Loading next actions...</p>}
          </div>
        </article>
      </section>
    </main>
  );
}
