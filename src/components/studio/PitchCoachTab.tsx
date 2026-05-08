"use client";

/**
 * `PitchCoachTab` — Inspector "Coach" tab (Track D Session 16).
 *
 * The four `/api/pitch/{draft,analyze,optimize,chat}` routes were
 * server-shipped in S15 but had no UI surface — this tab is the
 * client-side wiring. Three regions:
 *
 *   1. Config bar — projectName / persona / industry / tone / stage
 *      (persisted via usePitchConfig). Required by every route call.
 *   2. Action row — three buttons (Analyze active surface · Draft
 *      a section · Optimize active slides) that fire the matching
 *      route with the current config. Each surfaces its result inline
 *      with confidence + change notes.
 *   3. Coach chat — composer + log wired to /api/pitch/chat. Pitch-
 *      specific persona prompt; same cascade as the home composer
 *      but with the config baked in.
 *
 * The tab takes the parent's slides + activePlanIdx + activeDoc as
 * props so it can act on whichever surface is currently selected
 * (no double-state).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePitchConfig, PITCH_PERSONAS, type PitchConfig } from "@/hooks";
import type { Slide } from "@/lib/studio/types";
import { PLAN_SECTIONS } from "@/lib/studio/plan-sections";
import { MarkdownReply } from "@/components/home/reply-renderer";

interface CoachMessage {
  role: "user" | "olivia";
  text: string;
}

interface ActionResult {
  kind: "analyze" | "draft" | "optimize";
  ok: boolean;
  body: string;
  meta?: string;
}

export interface PitchCoachTabProps {
  slides: Slide[];
  activePlanIdx: number;
  navSection: string;
  onAuditEntry?: (text: string) => void;
}

export function PitchCoachTab({
  slides,
  activePlanIdx,
  navSection,
  onAuditEntry,
}: PitchCoachTabProps) {
  const { config, update } = usePitchConfig();
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isTyping]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const sendChat = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setInput("");
    setIsTyping(true);
    onAuditEntry?.(`Pitch coach: "${trimmed.slice(0, 60)}"`);

    try {
      const res = await fetch("/api/pitch/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, config }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { message?: string };
      const reply = data.message ?? "(no reply)";
      setMessages((m) => [...m, { role: "olivia", text: reply }]);
      onAuditEntry?.(`Coach reply (${reply.length} chars)`);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setMessages((m) => [
        ...m,
        {
          role: "olivia",
          text: "Pitch coach is offline. Try again or use the Olivia tab for general questions.",
        },
      ]);
    } finally {
      setIsTyping(false);
      abortRef.current = null;
    }
  }, [input, isTyping, config, onAuditEntry]);

  const handleAnalyze = useCallback(async () => {
    if (actionPending) return;
    setActionPending("analyze");
    setActionResult(null);
    onAuditEntry?.("Pitch coach: analyze");
    try {
      /* What gets analyzed depends on the current surface. */
      const content =
        navSection === "plan"
          ? PLAN_SECTIONS[activePlanIdx]?.title ?? "(empty plan)"
          : navSection === "pitch"
            ? slides.map((s) => `${s.type}: ${JSON.stringify(s.content)}`).join("\n") ||
              "(empty deck)"
            : "(no active surface)";
      const context =
        navSection === "plan" ? "business plan section" : "pitch deck";

      const res = await fetch("/api/pitch/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, context, config }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        analysis?: {
          insight: string;
          suggestion: string;
          warning: string | null;
          confidence: number;
          londonFit: string;
        };
        error?: string;
      };
      if (data.success && data.analysis) {
        setActionResult({
          kind: "analyze",
          ok: true,
          body: `${data.analysis.insight}\n\nSuggestion: ${data.analysis.suggestion}${data.analysis.warning ? `\n\nWarning: ${data.analysis.warning}` : ""}`,
          meta: `Confidence ${data.analysis.confidence}% · London fit: ${data.analysis.londonFit}`,
        });
      } else {
        setActionResult({
          kind: "analyze",
          ok: false,
          body: data.error ?? "Analyze failed.",
        });
      }
    } catch (err) {
      setActionResult({
        kind: "analyze",
        ok: false,
        body: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setActionPending(null);
    }
  }, [actionPending, navSection, activePlanIdx, slides, config, onAuditEntry]);

  const handleDraft = useCallback(async () => {
    if (actionPending) return;
    if (navSection !== "plan") {
      setActionResult({
        kind: "draft",
        ok: false,
        body: "Switch to Plan mode (left rail) to draft a business-plan section.",
      });
      return;
    }
    const section = PLAN_SECTIONS[activePlanIdx];
    if (!section) return;

    setActionPending("draft");
    setActionResult(null);
    onAuditEntry?.(`Pitch coach: draft ${section.title}`);

    try {
      const res = await fetch("/api/pitch/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionTitle: section.title,
          existingContent: "",
          config,
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        result?: { content: string; confidence: number; notes: string };
        error?: string;
      };
      if (data.success && data.result) {
        setActionResult({
          kind: "draft",
          ok: true,
          body: data.result.content,
          meta: `Confidence ${data.result.confidence}% · ${data.result.notes}`,
        });
      } else {
        setActionResult({
          kind: "draft",
          ok: false,
          body: data.error ?? "Draft failed.",
        });
      }
    } catch (err) {
      setActionResult({
        kind: "draft",
        ok: false,
        body: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setActionPending(null);
    }
  }, [actionPending, navSection, activePlanIdx, config, onAuditEntry]);

  const handleOptimize = useCallback(async () => {
    if (actionPending) return;
    if (slides.length === 0) {
      setActionResult({
        kind: "optimize",
        ok: false,
        body: "Apply an archetype from the Library tab first to load slides.",
      });
      return;
    }
    setActionPending("optimize");
    setActionResult(null);
    onAuditEntry?.(`Pitch coach: optimize ${slides.length} slides`);

    try {
      const res = await fetch("/api/pitch/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slides: slides.map((s) => ({
            id: s.id,
            type: s.type,
            text: typeof s.content === "string" ? s.content : "",
            fields:
              typeof s.content === "object" && s.content
                ? Object.fromEntries(
                    Object.entries(s.content as Record<string, unknown>).map(
                      ([k, v]) => [k, String(v ?? "")],
                    ),
                  )
                : {},
          })),
          config,
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        optimized?: number;
        total?: number;
        results?: Array<{
          slideId: string;
          success: boolean;
          result?: { text: string; confidence: number; changeNote: string };
        }>;
        error?: string;
      };
      if (data.success) {
        const successCount = data.optimized ?? 0;
        const total = data.total ?? slides.length;
        const sample = data.results?.find((r) => r.success && r.result);
        setActionResult({
          kind: "optimize",
          ok: true,
          body: sample?.result
            ? `${successCount}/${total} slides optimized.\n\nSample: ${sample.result.text}\n\nChange: ${sample.result.changeNote}`
            : `${successCount}/${total} slides optimized.`,
          meta: `Average confidence ${sample?.result?.confidence ?? 0}%`,
        });
      } else {
        setActionResult({
          kind: "optimize",
          ok: false,
          body: data.error ?? "Optimize failed.",
        });
      }
    } catch (err) {
      setActionResult({
        kind: "optimize",
        ok: false,
        body: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setActionPending(null);
    }
  }, [actionPending, slides, config, onAuditEntry]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          aria-hidden="true"
          style={{
            width: 24,
            height: 24,
            borderRadius: "var(--radius-full)",
            background:
              "linear-gradient(135deg, var(--aurum-primary), var(--aurum-soft))",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--fg-on-accent)",
            fontWeight: 700,
            fontSize: "var(--text-xs)",
          }}
        >
          C
        </span>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-md)",
            fontWeight: 600,
            color: "var(--aurum-primary)",
          }}
        >
          Pitch Coach
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--fg-tertiary)",
          }}
        >
          /api/pitch/*
        </span>
      </header>

      <ConfigPanel config={config} update={update} />

      <ActionRow
        onAnalyze={handleAnalyze}
        onDraft={handleDraft}
        onOptimize={handleOptimize}
        pending={actionPending}
      />

      {actionResult && <ResultPanel result={actionResult} />}

      <div
        role="log"
        aria-live="polite"
        style={{
          flex: 1,
          minHeight: 160,
          maxHeight: 320,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: 8,
          background: "var(--canvas-base)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
        }}
      >
        {messages.length === 0 && !isTyping && (
          <p
            style={{
              margin: 0,
              padding: 12,
              textAlign: "center",
              color: "var(--fg-tertiary)",
              fontSize: "var(--text-sm)",
              fontStyle: "italic",
            }}
          >
            Ask Olivia anything about your pitch — frameworks, story arc, investor objections, common pitfalls.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              padding: "8px 10px",
              borderRadius: "var(--radius-md)",
              background:
                m.role === "user" ? "var(--aurum-mute)" : "var(--surface-1)",
              border: `1px solid ${m.role === "user" ? "var(--border-aurum)" : "var(--border-subtle)"}`,
              color: "var(--fg-primary)",
              fontSize: "var(--text-sm)",
              lineHeight: 1.45,
            }}
          >
            {m.role === "olivia" ? (
              <MarkdownReply text={m.text} maxChartWidth={320} />
            ) : (
              <span style={{ whiteSpace: "pre-wrap" }}>{m.text}</span>
            )}
          </div>
        ))}
        {isTyping && (
          <div
            style={{
              alignSelf: "flex-start",
              padding: "8px 10px",
              borderRadius: "var(--radius-md)",
              background: "var(--surface-1)",
              border: "1px solid var(--border-aether)",
              color: "var(--aether-primary)",
              fontSize: "var(--text-sm)",
              fontStyle: "italic",
            }}
          >
            Olivia is thinking…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void sendChat();
            }
          }}
          placeholder="Ask the coach…"
          aria-label="Message to pitch coach"
          disabled={isTyping}
          style={{
            flex: 1,
            padding: "8px 10px",
            background: "var(--surface-1)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            color: "var(--fg-primary)",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={() => void sendChat()}
          disabled={isTyping || !input.trim()}
          aria-label="Send"
          style={{
            padding: "8px 14px",
            background: "var(--aurum-primary)",
            color: "var(--fg-on-accent)",
            border: "none",
            borderRadius: "var(--radius-md)",
            fontWeight: 600,
            fontSize: "var(--text-sm)",
            cursor: isTyping || !input.trim() ? "not-allowed" : "pointer",
            opacity: isTyping || !input.trim() ? 0.5 : 1,
          }}
        >
          →
        </button>
      </div>
    </div>
  );
}

function ConfigPanel({
  config,
  update,
}: {
  config: PitchConfig;
  update: <K extends keyof PitchConfig>(key: K, value: PitchConfig[K]) => void;
}) {
  return (
    <details
      style={{
        background: "var(--canvas-recess)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: 10,
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-2xs)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--aurum-primary)",
        }}
      >
        Config · {config.projectName} · {config.persona} · {config.stage}
      </summary>
      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
        <ConfigInput
          label="Project"
          value={config.projectName}
          onChange={(v) => update("projectName", v)}
        />
        <ConfigSelect
          label="Persona"
          value={config.persona}
          options={PITCH_PERSONAS.map((p) => ({ value: p.key, label: p.label }))}
          onChange={(v) => update("persona", v as PitchConfig["persona"])}
        />
        <ConfigInput
          label="Industry"
          value={config.industry}
          onChange={(v) => update("industry", v)}
        />
        <ConfigInput
          label="Tone"
          value={config.tone}
          onChange={(v) => update("tone", v)}
        />
        <ConfigInput
          label="Stage"
          value={config.stage}
          onChange={(v) => update("stage", v)}
        />
      </div>
    </details>
  );
}

function ConfigInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-2xs)",
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: "var(--fg-tertiary)",
        }}
      >
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "6px 8px",
          background: "var(--surface-1)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-sm)",
          color: "var(--fg-primary)",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          outline: "none",
        }}
      />
    </label>
  );
}

function ConfigSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-2xs)",
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: "var(--fg-tertiary)",
        }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "6px 8px",
          background: "var(--surface-1)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-sm)",
          color: "var(--fg-primary)",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          outline: "none",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActionRow({
  onAnalyze,
  onDraft,
  onOptimize,
  pending,
}: {
  onAnalyze: () => void;
  onDraft: () => void;
  onOptimize: () => void;
  pending: string | null;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
      <ActionButton
        label="Analyze"
        loading={pending === "analyze"}
        disabled={pending !== null}
        onClick={onAnalyze}
      />
      <ActionButton
        label="Draft"
        loading={pending === "draft"}
        disabled={pending !== null}
        onClick={onDraft}
      />
      <ActionButton
        label="Optimize"
        loading={pending === "optimize"}
        disabled={pending !== null}
        onClick={onOptimize}
      />
    </div>
  );
}

function ActionButton({
  label,
  loading,
  disabled,
  onClick,
}: {
  label: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "8px 10px",
        background: loading ? "var(--surface-2)" : "var(--surface-1)",
        border: `1px solid ${loading ? "var(--border-aurum)" : "var(--border-default)"}`,
        borderRadius: "var(--radius-md)",
        color: loading ? "var(--aurum-primary)" : "var(--fg-primary)",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-2xs)",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled && !loading ? 0.45 : 1,
        transition: "all var(--duration-micro) var(--ease-out-quart)",
      }}
    >
      {loading ? "…" : label}
    </button>
  );
}

function ResultPanel({ result }: { result: ActionResult }) {
  const tone = result.ok ? "var(--aurum-primary)" : "var(--coral-down)";
  const border = result.ok ? "var(--border-aurum)" : "var(--border-default)";
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        padding: 12,
        borderRadius: "var(--radius-md)",
        border: `1px solid ${border}`,
        background: result.ok ? "var(--aurum-mute)" : "var(--canvas-recess)",
        display: "grid",
        gap: 6,
        maxHeight: 200,
        overflowY: "auto",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-2xs)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: tone,
        }}
      >
        {result.kind} · {result.ok ? "ok" : "error"}
      </span>
      <p
        style={{
          margin: 0,
          color: "var(--fg-primary)",
          fontSize: "var(--text-sm)",
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
        }}
      >
        {result.body}
      </p>
      {result.meta && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            color: "var(--fg-tertiary)",
            letterSpacing: "0.06em",
          }}
        >
          {result.meta}
        </span>
      )}
    </div>
  );
}
