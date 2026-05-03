"use client";

/**
 * /test-avatar — Sessions 2 + 6 Smoke Test
 *
 * Two flows exercised on this page:
 *
 *  A. Manual lip-sync (session 2):
 *     1. Click "Start Live Avatar" → POST /api/olivia/liveavatar
 *     2. LiveKit room connects, video element starts streaming
 *     3. WebSocket to LiveAvatar opens
 *     4. Type text in "Make Olivia speak this exact text", click Speak →
 *        POST /api/olivia/liveavatar/speak → ElevenLabs PCM → lip-syncs
 *
 *  B. Full conversation loop (session 6):
 *     1. Type a question in "Talk to Olivia", click Ask
 *     2. useOlivia().sendMessage() → POST /api/olivia/chat
 *     3. Cascade walks (Anthropic → OpenAI → Google → ...)
 *     4. Reply persists to conversations + conversation_turns
 *     5. Latest assistant message in messages[] is routed into the
 *        avatar's `lastReply` prop, triggering ElevenLabs + lip-sync
 *
 * Auth posture:
 *   - /api/olivia/liveavatar is gated by requireAdminKey (Bearer ADMIN_API_KEY)
 *     until Clerk lands in Track F / Session 18. Pass via ?key= or paste below.
 *   - /api/olivia/chat is NOT gated (session 4 design); rate-limited per IP.
 *
 * NOT a production page. Will be removed or relocated once Clerk auth is wired.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { OliviaProvider, useOlivia } from "@/components/olivia/OliviaProvider";
import {
  OliviaVideoAvatar,
  type OliviaVideoAvatarRef,
  type AvatarState,
} from "@/components/olivia/OliviaVideoAvatar";

function SmokeTest() {
  const olivia = useOlivia();
  const [adminKey, setAdminKey] = useState<string>("");
  const [keyInput, setKeyInput] = useState<string>("");
  const [draft, setDraft] = useState<string>(
    "Hello, I'm Olivia. This is the session two smoke test for Olivia Brain."
  );
  const [chatInput, setChatInput] = useState<string>(
    "Hi Olivia — what can you do for me on Olivia Brain today?"
  );
  const [lastReply, setLastReply] = useState<string>("");
  const [avatarState, setAvatarState] = useState<AvatarState>("disconnected");
  const [history, setHistory] = useState<string[]>([]);
  const avatarRef = useRef<OliviaVideoAvatarRef>(null);

  /**
   * Latest assistant message from the cascade. Memoised so the effect below
   * fires once per new reply, not on every messages[] reference change.
   */
  const latestAssistant = useMemo(() => {
    const finished = olivia.messages.filter(
      (m) => m.role === "assistant" && !m.isLoading && m.content.trim().length > 0,
    );
    return finished[finished.length - 1];
  }, [olivia.messages]);

  /**
   * When the cascade returns a new assistant reply, route it into the
   * avatar's `lastReply` prop so the LiveAvatar speaks it with lip-sync.
   * Also push it into the recent-prompts list so the user can replay it.
   */
  useEffect(() => {
    if (!latestAssistant) return;
    if (latestAssistant.content === lastReply) return;
    setLastReply(latestAssistant.content);
    setHistory((prev) => [latestAssistant.content, ...prev].slice(0, 10));
  }, [latestAssistant, lastReply]);

  async function handleAskOlivia() {
    const text = chatInput.trim();
    if (!text || olivia.isLoading) return;
    setChatInput("");
    await olivia.sendMessage(text);
  }

  // Load admin key from ?key= on mount. Plain DOM read — no useSearchParams
  // (which forces a Suspense boundary at the page level) and no Next route
  // segment config. Simpler, fewer wrappers, prerender-safe.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromQuery = new URLSearchParams(window.location.search).get("key");
    if (fromQuery) {
      setAdminKey(fromQuery);
      setKeyInput(fromQuery);
    }
  }, []);

  function handleSpeak() {
    const text = draft.trim();
    if (!text) return;
    setLastReply(text);
    setHistory((prev) => [text, ...prev].slice(0, 10));
  }

  function handleInterrupt() {
    avatarRef.current?.interrupt();
  }

  function handleReplay() {
    avatarRef.current?.replayLast();
  }

  return (
    <main
      style={{
        maxWidth: 880,
        margin: "0 auto",
        padding: "32px 20px 64px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <p
          style={{
            margin: 0,
            color: "var(--gold)",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "0.75rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Session 2 · Smoke Test
        </p>
        <h1 style={{ margin: 0, fontSize: "2rem", lineHeight: 1.05 }}>
          LiveAvatar Proof of Life
        </h1>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.95rem" }}>
          Click <strong>Start Live Avatar</strong>, then type a message and hit{" "}
          <strong>Speak</strong>. The avatar should lip-sync the text.
        </p>
      </header>

      {/* Admin key gate */}
      <section
        style={{
          padding: 16,
          borderRadius: 16,
          background: "var(--panel)",
          border: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <label
          htmlFor="adminKey"
          style={{
            color: "var(--gold)",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "0.72rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Admin API key
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            id="adminKey"
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Paste ADMIN_API_KEY here, or pass ?key= in the URL"
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "rgba(5, 11, 21, 0.72)",
              color: "var(--text)",
              fontFamily: "var(--font-mono), monospace",
              fontSize: "0.85rem",
            }}
          />
          <button
            onClick={() => setAdminKey(keyInput.trim())}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg, var(--gold), #e2c78b)",
              color: "#1b1308",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Use key
          </button>
        </div>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.78rem" }}>
          {adminKey
            ? `Using key ending …${adminKey.slice(-6)}. Clerk replaces this in week 1.`
            : "Without a key, /api/olivia/liveavatar will return 401."}
        </p>
      </section>

      {/* Avatar */}
      <section
        style={{
          padding: 16,
          borderRadius: 16,
          background: "var(--panel)",
          border: "1px solid var(--border)",
        }}
      >
        <OliviaVideoAvatar
          ref={avatarRef}
          adminKey={adminKey || undefined}
          lastReply={lastReply}
          onStateChange={setAvatarState}
        />
      </section>

      {/* Talk to Olivia — full conversation loop (session 6) */}
      <section
        style={{
          padding: 16,
          borderRadius: 16,
          background: "var(--panel)",
          border: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <label
          htmlFor="chatInput"
          style={{
            color: "var(--gold)",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "0.72rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Talk to Olivia (cascade reply → avatar speaks)
        </label>
        <textarea
          id="chatInput"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          rows={3}
          disabled={olivia.isLoading}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "rgba(5, 11, 21, 0.72)",
            color: "var(--text)",
            fontFamily: "inherit",
            fontSize: "0.95rem",
            resize: "vertical",
            opacity: olivia.isLoading ? 0.6 : 1,
          }}
          placeholder="Ask Olivia anything. Goes to /api/olivia/chat → cascade → reply."
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={() => void handleAskOlivia()}
            disabled={!chatInput.trim() || olivia.isLoading}
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              border: "none",
              background: "linear-gradient(135deg, var(--gold), #e2c78b)",
              color: "#1b1308",
              fontWeight: 700,
              cursor:
                chatInput.trim() && !olivia.isLoading ? "pointer" : "not-allowed",
              opacity: chatInput.trim() && !olivia.isLoading ? 1 : 0.5,
            }}
          >
            {olivia.isLoading ? "Thinking…" : "Ask Olivia"}
          </button>
          <span
            style={{
              color: "var(--muted)",
              fontFamily: "var(--font-mono), monospace",
              fontSize: "0.78rem",
            }}
          >
            turns · {olivia.messages.length}
          </span>
          {olivia.error && (
            <span
              style={{
                color: "var(--coral, #f28d7f)",
                fontFamily: "var(--font-mono), monospace",
                fontSize: "0.78rem",
                marginLeft: "auto",
              }}
            >
              error · {olivia.error}
            </span>
          )}
        </div>
        {olivia.messages.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              maxHeight: 220,
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {olivia.messages.map((m) => (
              <div
                key={m.id}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background:
                    m.role === "user"
                      ? "rgba(5, 11, 21, 0.5)"
                      : "rgba(216, 170, 96, 0.08)",
                  color: "var(--text)",
                  fontSize: "0.88rem",
                  opacity: m.isLoading ? 0.55 : 1,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: "0.7rem",
                    color: m.role === "user" ? "var(--muted)" : "var(--gold)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  {m.role}
                  {m.isLoading ? " · thinking" : ""}
                </div>
                <div>{m.isLoading ? "…" : m.content}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Manual lip-sync (session 2) — speak exact text without cascade */}
      <section
        style={{
          padding: 16,
          borderRadius: 16,
          background: "var(--panel)",
          border: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <label
          htmlFor="draft"
          style={{
            color: "var(--gold)",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "0.72rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Make Olivia speak this exact text (no cascade)
        </label>
        <textarea
          id="draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "rgba(5, 11, 21, 0.72)",
            color: "var(--text)",
            fontFamily: "inherit",
            fontSize: "0.95rem",
            resize: "vertical",
          }}
          placeholder="Type a message. Max 2000 chars sent to ElevenLabs."
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={handleSpeak}
            disabled={
              !draft.trim() ||
              (avatarState !== "connected" && avatarState !== "speaking")
            }
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              border: "none",
              background: "linear-gradient(135deg, var(--gold), #e2c78b)",
              color: "#1b1308",
              fontWeight: 700,
              cursor:
                draft.trim() &&
                (avatarState === "connected" || avatarState === "speaking")
                  ? "pointer"
                  : "not-allowed",
              opacity:
                draft.trim() &&
                (avatarState === "connected" || avatarState === "speaking")
                  ? 1
                  : 0.5,
            }}
          >
            Speak
          </button>
          <button
            onClick={handleInterrupt}
            disabled={avatarState !== "speaking"}
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text)",
              cursor: avatarState === "speaking" ? "pointer" : "not-allowed",
              opacity: avatarState === "speaking" ? 1 : 0.5,
            }}
          >
            Interrupt
          </button>
          <button
            onClick={handleReplay}
            disabled={
              avatarState !== "connected" && avatarState !== "speaking"
            }
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text)",
              cursor:
                avatarState === "connected" || avatarState === "speaking"
                  ? "pointer"
                  : "not-allowed",
              opacity:
                avatarState === "connected" || avatarState === "speaking"
                  ? 1
                  : 0.5,
            }}
          >
            Replay last
          </button>
          <span
            style={{
              alignSelf: "center",
              marginLeft: "auto",
              color: "var(--muted)",
              fontFamily: "var(--font-mono), monospace",
              fontSize: "0.78rem",
            }}
          >
            state · {avatarState}
          </span>
        </div>
      </section>

      {/* Recent prompts */}
      {history.length > 0 && (
        <section
          style={{
            padding: 16,
            borderRadius: 16,
            background: "var(--panel)",
            border: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <p
            style={{
              margin: 0,
              color: "var(--gold)",
              fontFamily: "var(--font-mono), monospace",
              fontSize: "0.72rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Recent prompts
          </p>
          {history.map((h, i) => (
            <button
              key={i}
              onClick={() => setDraft(h)}
              style={{
                textAlign: "left",
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "rgba(5, 11, 21, 0.5)",
                color: "var(--text)",
                cursor: "pointer",
                fontSize: "0.88rem",
              }}
            >
              {h}
            </button>
          ))}
        </section>
      )}
    </main>
  );
}

export default function TestAvatarPage() {
  return (
    <OliviaProvider>
      <SmokeTest />
    </OliviaProvider>
  );
}
