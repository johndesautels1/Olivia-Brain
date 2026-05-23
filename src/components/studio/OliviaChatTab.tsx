"use client";

/**
 * `OliviaChatTab` — Inspector "Olivia" tab body. Live chat composer
 * wired to the `/api/olivia/chat` cascade route (Sessions 4–6).
 *
 * Reference: `docs/STUDIO_OLIVIA_DESIGN.md` § 2.5 (Olivia tab — chat
 * zone). Per the design: header row + analyzing state + insight cards
 * + chat zone + composer.
 *
 * S18 ships the chat zone + composer (the most-load-bearing surface).
 * Insight cards (Confidence / Insight / Suggestion / Warning / London
 * Ecosystem Fit) wire post-Track-V when `/api/olivia/analyze` lands.
 *
 * # North-star alignment
 *
 * This is THE primary surface for Olivia's "live-avatar / chat-avatar
 * Chief Intelligence Officer" role. Every conversation here flows
 * through the 9-provider cascade with Cristiano (Opus 4.6) as the
 * judge — same brain across all six product surfaces.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { MarkdownReply } from "@/components/home/reply-renderer";

interface ChatMessage {
  role: "user" | "olivia";
  text: string;
}

export interface OliviaChatTabProps {
  /** Push an audit entry on send + receive. Optional. */
  onAuditEntry?: (text: string) => void;
}

export function OliviaChatTab({ onAuditEntry }: OliviaChatTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* Scroll-pin to latest message. */
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isTyping]);

  /* Cancel any in-flight request on unmount. */
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    const userMsg: ChatMessage = { role: "user", text: trimmed };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setIsTyping(true);
    onAuditEntry?.(`Sent message: "${trimmed.slice(0, 60)}${trimmed.length > 60 ? "…" : ""}"`);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/olivia/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { reply?: string };
      const reply = data.reply ?? "(no reply)";
      setMessages((m) => [...m, { role: "olivia", text: reply }]);
      onAuditEntry?.(`Olivia replied (${reply.length} chars)`);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setMessages((m) => [
        ...m,
        {
          role: "olivia",
          text: "I'm momentarily offline — try again or use the live-avatar at /test-avatar while I get back.",
        },
      ]);
      onAuditEntry?.("Olivia chat error — fell back to placeholder");
    } finally {
      setIsTyping(false);
      abortRef.current = null;
    }
  }, [input, isTyping, onAuditEntry]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          aria-hidden="true"
          style={{
            width: 24,
            height: 24,
            borderRadius: "var(--radius-full)",
            background:
              "linear-gradient(135deg, var(--aurum-primary), var(--aether-primary))",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--fg-on-accent)",
            fontWeight: 700,
            fontSize: "var(--text-xs)",
          }}
        >
          O
        </span>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-md)",
            fontWeight: 600,
            color: "var(--aether-primary)",
          }}
        >
          Olivia
        </span>
        <span
          style={{
            fontSize: "var(--text-2xs)",
            color: "var(--fg-tertiary)",
            marginLeft: "auto",
          }}
        >
          Real-time intelligence
        </span>
      </div>

      {/* Message list */}
      <div
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        style={{
          flex: 1,
          minHeight: 200,
          maxHeight: 360,
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
            Ask Olivia anything — about your pitch, your plan, your London tech ecosystem fit, or her own architecture.
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

      {/* Composer */}
      <div style={{ display: "flex", gap: 6 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Ask Olivia…"
          aria-label="Message to Olivia"
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
          }}
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={isTyping || !input.trim()}
          aria-label="Send message"
          style={{
            padding: "8px 14px",
            background: "var(--aurum-primary)",
            color: "var(--fg-on-accent)",
            border: "none",
            borderRadius: "var(--radius-md)",
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            fontSize: "var(--text-sm)",
            cursor: isTyping || !input.trim() ? "not-allowed" : "pointer",
            opacity: isTyping || !input.trim() ? 0.5 : 1,
            transition: "opacity var(--duration-micro) var(--ease-out-quart)",
          }}
        >
          →
        </button>
      </div>
    </div>
  );
}
