"use client";

/**
 * /test-avatar — Session 2 Smoke Test
 *
 * Proof-of-life for the LiveAvatar LITE pipeline ported in session 1+2:
 *   1. Click "Start Live Avatar" → POST /api/olivia/liveavatar
 *   2. LiveKit room connects, video element starts streaming
 *   3. WebSocket to LiveAvatar opens
 *   4. Type a message, click "Speak" → POST /api/olivia/liveavatar/speak
 *      → ElevenLabs PCM → forward as agent.speak frame → avatar lip-syncs
 *
 * Auth: routes are gated by requireAdminKey (Authorization: Bearer ADMIN_API_KEY)
 * until Clerk lands in week 1. Pass the key via query param: /test-avatar?key=...
 *
 * NOT a production page. Will be removed or relocated once Clerk auth is wired.
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OliviaProvider } from "@/components/olivia/OliviaProvider";
import {
  OliviaVideoAvatar,
  type OliviaVideoAvatarRef,
  type AvatarState,
} from "@/components/olivia/OliviaVideoAvatar";

function SmokeTest() {
  const searchParams = useSearchParams();
  const [adminKey, setAdminKey] = useState<string>("");
  const [keyInput, setKeyInput] = useState<string>("");
  const [draft, setDraft] = useState<string>(
    "Hello, I'm Olivia. This is the session two smoke test for Olivia Brain."
  );
  const [lastReply, setLastReply] = useState<string>("");
  const [avatarState, setAvatarState] = useState<AvatarState>("disconnected");
  const [history, setHistory] = useState<string[]>([]);
  const avatarRef = useRef<OliviaVideoAvatarRef>(null);

  // Load admin key from query param on mount
  useEffect(() => {
    const fromQuery = searchParams.get("key");
    if (fromQuery) {
      setAdminKey(fromQuery);
      setKeyInput(fromQuery);
    }
  }, [searchParams]);

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

      {/* Compose + actions */}
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
          What should Olivia say?
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
