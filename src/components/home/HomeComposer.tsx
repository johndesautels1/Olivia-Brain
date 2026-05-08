"use client";

/**
 * `HomeComposer` — Cursor-style composer with `@context` chips wired
 * to the 9-model cascade at `/api/olivia/chat`.
 *
 * Behaviors:
 *   - Auto-grows up to a max height (textarea, not input).
 *   - `⏎` sends · `⌘⏎` triggers council mode (judge-on-top, future U6).
 *   - Inflight: hero state goes `thinking`; on reply, parent flips to
 *     `speaking` and renders the reply beneath the headline.
 *   - AbortController cancels in-flight on submit-while-pending or
 *     unmount.
 *   - Chips are visual context placeholders — U5 wires them to real
 *     `pageContext` / `documentContext` fields the chat route accepts.
 */

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { AvatarOrbState } from "@/components/primitives";

const CHIPS = ["@calendar", "@subject", "@doc", "+ctx"] as const;

export interface HomeComposerProps {
  onStateChange: (state: AvatarOrbState) => void;
  onReply: (reply: string) => void;
  onAudit?: (text: string) => void;
  /** Optional external prompt seed (e.g. from suggestion chip click).
   *  When provided, the composer fills + focuses; the parent should
   *  pass a stable string per pick (incrementing nonce or uuid). */
  seedPrompt?: { value: string; nonce: number } | null;
  /** Fires when the input transitions from empty → non-empty so the
   *  parent can hide adjacent affordances (suggestion chips). */
  onActiveChange?: (active: boolean) => void;
}

export function HomeComposer({
  onStateChange,
  onReply,
  onAudit,
  seedPrompt,
  onActiveChange,
}: HomeComposerProps) {
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [activeChips, setActiveChips] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  /* Seed-prompt → fill + focus when a chip is picked. */
  useEffect(() => {
    if (!seedPrompt) return;
    setInput(seedPrompt.value);
    /* defer to next frame so the textarea has rendered the new value */
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      el?.focus();
      el?.setSelectionRange(seedPrompt.value.length, seedPrompt.value.length);
    });
  }, [seedPrompt]);

  /* Cancel inflight on unmount. */
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  /* Auto-grow textarea up to 6 lines. */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const max = 6 * 22;
    el.style.height = `${Math.min(max, el.scrollHeight)}px`;
  }, [input]);

  /* Notify parent on first transition from empty → non-empty. */
  useEffect(() => {
    if (input.trim().length > 0) onActiveChange?.(true);
  }, [input, onActiveChange]);

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || pending) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPending(true);
    setError(null);
    onStateChange("thinking");
    onAudit?.(`Asked Olivia: "${trimmed.slice(0, 60)}${trimmed.length > 60 ? "…" : ""}"`);

    try {
      const res = await fetch("/api/olivia/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          pageContext: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { reply?: string };
      const reply = data.reply ?? "(no reply)";
      onReply(reply);
      onAudit?.(`Olivia replied (${reply.length} chars)`);
      setInput("");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      const msg = "Olivia is momentarily offline — try again or open the inspector chat.";
      setError(msg);
      onStateChange("error");
      onAudit?.("Composer error — fell back to placeholder");
      window.setTimeout(() => onStateChange("idle"), 1800);
    } finally {
      setPending(false);
      abortRef.current = null;
    }
  }, [input, pending, onStateChange, onReply, onAudit]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void send();
      }
    },
    [send],
  );

  const toggleChip = useCallback((chip: string) => {
    setActiveChips((prev) => {
      const next = new Set(prev);
      if (next.has(chip)) next.delete(chip);
      else next.add(chip);
      return next;
    });
  }, []);

  return (
    <form
      role="search"
      aria-label="Ask Olivia"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
      style={{
        marginInline: "auto",
        width: "100%",
        maxWidth: 760,
        display: "grid",
        gap: 12,
        padding: 18,
        borderRadius: "var(--radius-xl)",
        background: "var(--surface-1)",
        border: "1px solid var(--border-default)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.04), 0 30px 80px rgba(0, 0, 0, 0.32)",
        transition:
          "border-color var(--duration-default) var(--ease-out-quart)",
      }}
    >
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask Olivia anything…"
        aria-label="Ask Olivia"
        disabled={pending}
        rows={1}
        style={{
          background: "transparent",
          border: "none",
          outline: "none",
          color: "var(--fg-primary)",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-md)",
          lineHeight: 1.45,
          padding: 4,
          resize: "none",
          minHeight: 22,
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CHIPS.map((chip) => {
            const active = activeChips.has(chip);
            return (
              <button
                type="button"
                key={chip}
                onClick={() => toggleChip(chip)}
                aria-pressed={active}
                style={{
                  padding: "4px 10px",
                  borderRadius: "var(--radius-full)",
                  background: active ? "var(--aurum-mute)" : "var(--canvas-recess)",
                  border: `1px solid ${active ? "var(--border-aurum)" : "var(--border-subtle)"}`,
                  color: active ? "var(--aurum-primary)" : "var(--fg-tertiary)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-2xs)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  transition:
                    "background var(--duration-micro) var(--ease-out-quart), color var(--duration-micro) var(--ease-out-quart), border-color var(--duration-micro) var(--ease-out-quart)",
                }}
              >
                {chip}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              color: "var(--fg-tertiary)",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
            }}
          >
            ⏎ to send
          </span>
          <button
            type="submit"
            disabled={pending || !input.trim()}
            aria-label="Send to Olivia"
            style={{
              padding: "8px 16px",
              borderRadius: "var(--radius-full)",
              background: pending
                ? "var(--surface-2)"
                : "linear-gradient(135deg, var(--aurum-primary), var(--aurum-soft))",
              color: pending ? "var(--fg-tertiary)" : "var(--fg-on-accent)",
              border: "none",
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              fontSize: "var(--text-sm)",
              cursor: pending || !input.trim() ? "not-allowed" : "pointer",
              opacity: !input.trim() && !pending ? 0.5 : 1,
              transition:
                "opacity var(--duration-micro) var(--ease-out-quart), background var(--duration-default) var(--ease-out-quart)",
            }}
          >
            {pending ? "Thinking…" : "Send →"}
          </button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          style={{
            margin: 0,
            color: "var(--coral-down)",
            fontSize: "var(--text-2xs)",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {error}
        </p>
      )}
    </form>
  );
}
