"use client";

/**
 * StudioOliviaChat — Compact two-way chat for the Preparation Studio.
 *
 * Sits below the avatar, shows the last 3 messages, and includes a
 * compact input field. Injects document context (doc ID, title, current
 * question) into each message so Olivia has awareness of what the user
 * is working on.
 *
 * Design spec:
 * - Max-width: 480px, centered
 * - Shows last 3 messages only (compact, not full history)
 * - Input: 4-row textarea, rounded-xl, glassmorphic (Enter sends, Shift+Enter newline)
 * - Messages: condensed bubble style matching OliviaMessage pattern
 * - User messages: blue tint, assistant: gold border
 * - Auto-scroll to latest message
 * - Document context prefix: invisible to user, sent to API
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useOlivia, type OliviaMessageUI } from "@/components/olivia/OliviaProvider";

interface StudioOliviaChatProps {
  /** Document context injected into every message */
  documentId: string;
  documentTitle: string;
  documentType: string;
  /** Current active question text */
  currentQuestion: string;
  /** Current block index */
  currentBlockIndex: number;
  totalBlocks: number;
}

export function StudioOliviaChat({
  documentId,
  documentTitle,
  documentType,
  currentQuestion,
  currentBlockIndex,
  totalBlocks,
}: StudioOliviaChatProps) {
  const {
    messages,
    isLoading,
    sendMessage,
    isSpeaking,
  } = useOlivia();

  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Show only last 3 messages
  const visibleMessages = messages.slice(-3);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleMessages.length]);

  // Handle send — context is now injected structurally via OliviaProvider's
  // documentContext, so no need for the crude [Studio Context: ...] prefix
  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    setInputValue("");
    await sendMessage(text);
  }, [inputValue, isLoading, sendMessage]);

  // Handle enter key — Enter sends, Shift+Enter adds newline
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="w-full max-w-[480px] mx-auto flex flex-col gap-2">
      {/* Messages area — last 3 only.
          WC-06: role=log + aria-live=polite so screen readers announce new
          assistant messages as they stream in. While the avatar is speaking
          the same text via TTS, mark the transcript aria-hidden so SR does
          not double-announce in lockstep with the avatar voice. */}
      {visibleMessages.length > 0 && (
        <div
          ref={scrollRef}
          role="log"
          aria-live={isSpeaking ? "off" : "polite"}
          aria-atomic="false"
          aria-relevant="additions text"
          aria-hidden={isSpeaking || undefined}
          className="flex flex-col gap-2 overflow-y-auto px-1"
          style={{
            maxHeight: "180px",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.1) transparent",
          }}
        >
          {visibleMessages.map((msg) => (
            <StudioChatBubble key={msg.id} message={msg} />
          ))}
        </div>
      )}

      {/* Expanded input bar — 4-row textarea for meaningful questions */}
      <div
        className="flex items-end gap-2 rounded-xl px-3 py-2"
        style={{
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        {/* Textarea — 4 rows, Enter sends, Shift+Enter newline */}
        <textarea
          ref={inputRef}
          data-studio-olivia-input
          rows={4}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Olivia about this question... (Shift+Enter for new line)"
          className="flex-1 bg-transparent text-sm outline-none placeholder-opacity-40 resize-none w-full"
          style={{
            color: "#e2e8f0",
            lineHeight: "1.5",
          }}
          disabled={isLoading}
          aria-label="Chat with Olivia"
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={isLoading || !inputValue.trim()}
          className="flex items-center justify-center rounded-lg shrink-0 transition-all cursor-pointer disabled:cursor-not-allowed"
          style={{
            width: "32px",
            height: "32px",
            minWidth: "32px",
            background:
              inputValue.trim() && !isLoading
                ? "rgba(196, 169, 106, 0.15)"
                : "rgba(255, 255, 255, 0.04)",
            border: `1px solid ${
              inputValue.trim() && !isLoading
                ? "rgba(196, 169, 106, 0.25)"
                : "rgba(255, 255, 255, 0.06)"
            }`,
            color:
              inputValue.trim() && !isLoading
                ? "#C4A96A"
                : "rgba(255, 255, 255, 0.2)",
          }}
          aria-label="Send message"
        >
          {isLoading ? (
            <div
              className="h-4 w-4 animate-spin rounded-full"
              style={{
                border: "1.5px solid rgba(196, 169, 106, 0.2)",
                borderTop: "1.5px solid #C4A96A",
              }}
            />
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>

      {/* Speaking indicator */}
      {isSpeaking && (
        <div className="flex items-center justify-center gap-1.5 py-1">
          <span
            className="h-1.5 w-1.5 rounded-full animate-pulse"
            style={{ background: "#C4A96A" }}
          />
          <span
            className="uppercase tracking-wide"
            style={{
              fontSize: "10px",
              color: "rgba(196, 169, 106, 0.6)",
              letterSpacing: "0.06em",
            }}
          >
            Olivia is speaking
          </span>
        </div>
      )}
    </div>
  );
}

// ── Compact message bubble ─────────────────────────────────────────────

function StudioChatBubble({ message }: { message: OliviaMessageUI }) {
  const isUser = message.role === "user";

  // Context is now injected structurally — no prefix to strip
  const displayContent = message.content;

  // Loading state
  if (message.isLoading) {
    return (
      <div className="flex justify-start">
        <div
          className="rounded-xl rounded-bl-sm px-3 py-2 max-w-[85%]"
          style={{
            background: "rgba(15, 18, 25, 0.8)",
            border: "1px solid rgba(196, 169, 106, 0.12)",
          }}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full animate-bounce"
              style={{ background: "#C4A96A", animationDelay: "0ms" }}
            />
            <span
              className="h-1.5 w-1.5 rounded-full animate-bounce"
              style={{ background: "#C4A96A", animationDelay: "150ms" }}
            />
            <span
              className="h-1.5 w-1.5 rounded-full animate-bounce"
              style={{ background: "#C4A96A", animationDelay: "300ms" }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`rounded-xl px-3 py-2 max-w-[85%] ${
          isUser ? "rounded-br-sm" : "rounded-bl-sm"
        }`}
        style={
          isUser
            ? {
                background: "rgba(37, 99, 235, 0.15)",
                border: "1px solid rgba(37, 99, 235, 0.2)",
              }
            : {
                background: "rgba(15, 18, 25, 0.8)",
                border: "1px solid rgba(196, 169, 106, 0.12)",
              }
        }
      >
        <p
          className="text-xs leading-relaxed"
          style={{ color: "#e2e8f0" }}
        >
          {displayContent}
        </p>
        <div className="mt-0.5 text-right">
          <span
            style={{
              fontSize: "9px",
              color: "rgba(176, 190, 197, 0.3)",
            }}
          >
            {new Date(message.createdAt).toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
