"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { CalendarEntryWithDetails } from "@/lib/queries/calendar";
import { AgendaRail } from "@/components/calendar/AgendaRail";
import { FocusMode } from "@/components/calendar/FocusMode";
import { CalendarEntryModal } from "@/components/calendar/CalendarEntryModal";
import { CalendarNotepad } from "@/components/calendar/CalendarNotepad";
import { OliviaConsentModal } from "@/components/olivia/OliviaConsentModal";

// Dynamic imports with SSR disabled
const OliviaDisplayScreen = dynamic(
  () =>
    import("@/components/olivia/OliviaDisplayScreen").then(
      (mod) => mod.OliviaDisplayScreen,
    ),
  { ssr: false },
);

const CalendarView = dynamic(
  () =>
    import("@/components/calendar/CalendarView").then(
      (mod) => mod.CalendarView
    ),
  { ssr: false, loading: () => <CalendarSkeleton /> }
);

interface EcosystemEvent {
  id: string;
  type: "ecosystem_event";
  title: string;
  startDatetime: string | null;
  endDatetime: string | null;
  eventType: string;
  organizer: string | null;
  venue: string | null;
  district: string | null;
  website: string | null;
  isPromoted: boolean;
  prestigeScore: number | null;
  isAddedToCalendar: boolean;
}

export function CalendarPageClient() {
  const [personalEntries, setPersonalEntries] = useState<CalendarEntryWithDetails[]>([]);
  const [ecosystemEvents, setEcosystemEvents] = useState<EcosystemEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nlpText, setNlpText] = useState("");
  const [nlpParsing, setNlpParsing] = useState(false);
  const [nlpResult, setNlpResult] = useState<{
    olivia_message: string;
    success: boolean;
    extracted_event?: Record<string, unknown>;
  } | null>(null);
  const [chatLog, setChatLog] = useState<{ speaker: "user" | "olivia"; text: string }[]>([]);
  const chatLogRef = useRef<HTMLDivElement>(null);
  // Layer 1: Conversation persistence
  const [conversationId, setConversationId] = useState<string | null>(null);
  // Layer 2: GDPR Consent
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [hasConsent, setHasConsent] = useState<boolean | null>(null); // null = unknown, true = granted, false = declined
  const [showAgenda, setShowAgenda] = useState(true);
  const [showSync, setShowSync] = useState(false);
  const [showFocusMode, setShowFocusMode] = useState(false);
  const [agendaModalEntry, setAgendaModalEntry] = useState<CalendarEntryWithDetails | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [occOpen, setOccOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [lastOliviaReply, setLastOliviaReply] = useState<string | undefined>(undefined);
  const [focusNoteId, setFocusNoteId] = useState<string | null>(null);
  const notesTabRef = useRef<HTMLDivElement>(null);
  const occContentRef = useRef<HTMLDivElement>(null);
  const historyDropdownRef = useRef<HTMLDivElement>(null);

  // ── Conversation management state ──
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{
    id: string;
    title: string;
    createdAt: string;
    messageCount: number;
  }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Calculate a 2-month window centered on now
  const getDateRange = useCallback(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    const end = new Date(now);
    end.setDate(end.getDate() + 60);
    return { start, end };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const { start, end } = getDateRange();
      const res = await fetch(
        `/api/calendar/entries?start=${start.toISOString()}&end=${end.toISOString()}`
      );

      if (res.status === 401) {
        setError("Sign in to view your calendar");
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error("Failed to load calendar data");

      const data = await res.json();
      setPersonalEntries(data.personalEntries || []);
      setEcosystemEvents(data.ecosystemEvents || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Layer 1: Restore conversationId from sessionStorage on mount
  useEffect(() => {
    const storedConvId = sessionStorage.getItem("olivia-conversation-id");
    if (storedConvId) {
      setConversationId(storedConvId);
    }
  }, []);

  // Auto-scroll chat log when new messages arrive
  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [chatLog]);

  // NLP parse handler (from text input or voice)
  const handleNlpParse = useCallback(
    async (text: string, fromVoice = false) => {
      // Add user message to chat log
      setChatLog((prev) => [...prev, { speaker: "user", text }]);
      setNlpParsing(true);
      setNlpResult(null);
      try {
        const res = await fetch("/api/calendar/olivia", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Layer 1: Include conversationId for context continuity
          body: JSON.stringify({
            action: "parse",
            text,
            fromVoice,
            conversationId: conversationId || undefined,
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => null);
          const detail = errBody?.error || errBody?.details?.join(", ") || `Server error (${res.status})`;
          throw new Error(detail);
        }

        const data = await res.json();
        setNlpResult(data);

        // Layer 2: Handle consent requirement
        if (data.requiresConsent) {
          setShowConsentModal(true);
          setHasConsent(false);
          // Still show Olivia's message explaining the consent requirement
          if (data.olivia_message) {
            setChatLog((prev) => [...prev, { speaker: "olivia", text: data.olivia_message }]);
            setLastOliviaReply(data.olivia_message);
          }
          return; // Don't continue processing
        }

        // Layer 1: Store conversationId for session continuity
        if (data.conversationId && data.conversationId !== conversationId) {
          setConversationId(data.conversationId);
          sessionStorage.setItem("olivia-conversation-id", data.conversationId);
        }

        // Add Olivia's reply to chat log and send to avatar for speech
        if (data.olivia_message) {
          setChatLog((prev) => [...prev, { speaker: "olivia", text: data.olivia_message }]);
          setLastOliviaReply(data.olivia_message);
        }

        // If parsed successfully, auto-create the entry
        if (data.success && data.extracted_event) {
          const evt = data.extracted_event;
          const createRes = await fetch("/api/calendar/entries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: evt.title,
              description: evt.description,
              location: evt.location,
              virtualUrl: evt.virtual_url,
              startDatetime: evt.start_datetime,
              endDatetime: evt.end_datetime,
              allDay: evt.all_day,
              entryType: evt.entry_type || "event",
              category: evt.category,
              priority: evt.priority,
              isVip: evt.is_vip || false,
              tags: evt.tags,
              ecosystemOrgName: evt.ecosystem_org_name,
              investmentStage: evt.investment_stage,
              attendees: evt.attendees || [],
            }),
          });

          if (createRes.ok) {
            fetchData();
          }
        }
      } catch (err) {
        const message = err instanceof Error && err.message !== "Failed to fetch"
          ? `Olivia couldn't process that: ${err.message}`
          : "Sorry, I couldn't reach Olivia. Please check your connection and try again.";
        setChatLog((prev) => [...prev, { speaker: "olivia", text: message }]);
        setNlpResult({
          olivia_message: message,
          success: false,
        });
      } finally {
        setNlpParsing(false);
        setNlpText("");
      }
    },
    [fetchData, conversationId]
  );

  const handleTextSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (nlpText.trim()) {
        handleNlpParse(nlpText.trim());
      }
    },
    [nlpText, handleNlpParse]
  );

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      handleNlpParse(text, true);
    },
    [handleNlpParse]
  );

  // Listen for calendar shortcut events dispatched from the command palette
  useEffect(() => {
    function onCalendarShortcut(e: Event) {
      const detail = (e as CustomEvent<{ nlpText: string }>).detail;
      if (detail?.nlpText) {
        handleNlpParse(detail.nlpText);
      }
    }
    document.addEventListener("calendar-shortcut", onCalendarShortcut);
    return () => {
      document.removeEventListener("calendar-shortcut", onCalendarShortcut);
    };
  }, [handleNlpParse]);

  // Listen for modal "View in Notepad" clicks
  useEffect(() => {
    function onFocusNote(e: Event) {
      const detail = (e as CustomEvent<{ noteId: string }>).detail;
      if (detail?.noteId) {
        setFocusNoteId(detail.noteId);
        setNotesOpen(true);
        // Scroll to the notes tab after a tick
        setTimeout(() => {
          notesTabRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }
    document.addEventListener("calendar-focus-note", onFocusNote);
    return () => document.removeEventListener("calendar-focus-note", onFocusNote);
  }, []);

  // Close history dropdown when clicking outside
  useEffect(() => {
    if (!showHistoryDropdown) return;

    function handleClickOutside(e: MouseEvent) {
      if (historyDropdownRef.current && !historyDropdownRef.current.contains(e.target as Node)) {
        setShowHistoryDropdown(false);
      }
    }

    // Add listener on next tick to avoid immediate close from the opening click
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showHistoryDropdown]);

  // ── Conversation management handlers ──

  // Fetch conversation history for dropdown
  const fetchConversationHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/olivia/history");
      if (res.ok) {
        const data = await res.json();
        setConversationHistory(data.conversations || []);
      }
    } catch {
      // Silent fail
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Load a specific conversation
  const loadConversation = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/olivia/history/${convId}`);
      if (res.ok) {
        const data = await res.json();
        // Set conversation ID to enable continuing
        setConversationId(convId);
        sessionStorage.setItem("olivia-conversation-id", convId);
        // Populate chat log
        const messages = data.messages || [];
        const newChatLog = messages
          .filter((m: { role: string }) => m.role === "user" || m.role === "assistant")
          .map((m: { role: string; content: string }) => ({
            speaker: m.role === "assistant" ? "olivia" : "user",
            text: m.content,
          }));
        setChatLog(newChatLog);
      }
    } catch {
      // Silent fail
    }
    setShowHistoryDropdown(false);
  }, []);

  // Download transcript as markdown
  const handleDownloadTranscript = useCallback(() => {
    if (chatLog.length === 0) return;

    const content = chatLog.map(msg =>
      `**${msg.speaker === "olivia" ? "Olivia" : "You"}:** ${msg.text}`
    ).join("\n\n");

    const markdown = `# Olivia Conversation\n_${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}_\n\n${content}\n\n---\n_London Tech Map_`;

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `olivia-conversation-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [chatLog]);

  // Read conversation aloud (TTS)
  const handleReadAloud = useCallback(() => {
    if (typeof window === "undefined") return;

    if (isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
      return;
    }

    if (chatLog.length === 0) return;

    // Full conversation with speaker attribution
    const text = chatLog.map(msg =>
      `${msg.speaker === "olivia" ? "Olivia says" : "You said"}: ${msg.text}`
    ).join(". ");

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    utterance.lang = "en-GB";

    // Helper to set voice and speak
    const setVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const british = voices.find(v => v.lang.startsWith("en-GB"));
      if (british) utterance.voice = british;
      window.speechSynthesis.speak(utterance);
      setIsReading(true);
    };

    utterance.onend = () => setIsReading(false);
    utterance.onerror = () => setIsReading(false);

    // Handle voice loading race condition - voices may not be loaded on first call
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      // Voices not loaded yet - wait for voiceschanged event
      const handleVoicesChanged = () => {
        window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
        setVoiceAndSpeak();
      };
      window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
    } else {
      setVoiceAndSpeak();
    }
  }, [chatLog, isReading]);

  // Email transcript
  const handleEmailTranscript = useCallback(async () => {
    if (!emailAddress.trim()) {
      setEmailError("Please enter an email address");
      setTimeout(() => setEmailError(null), 3000);
      return;
    }
    if (!conversationId) {
      setEmailError("No conversation to send. Start a conversation first.");
      setTimeout(() => setEmailError(null), 3000);
      return;
    }
    setEmailSending(true);
    setEmailError(null);
    try {
      const res = await fetch(`/api/olivia/conversations/${conversationId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail: emailAddress.trim() }),
      });

      if (res.ok) {
        setShowEmailModal(false);
        setEmailAddress("");
        // Show success feedback
        setEmailSuccess(true);
        setTimeout(() => setEmailSuccess(false), 3000);
      } else {
        // Parse and show error
        const data = await res.json().catch(() => ({ error: "Failed to send email" }));
        setEmailError(data.error || "Failed to send email");
        setTimeout(() => setEmailError(null), 5000);
      }
    } catch (err) {
      setEmailError("Network error. Please check your connection.");
      setTimeout(() => setEmailError(null), 5000);
    } finally {
      setEmailSending(false);
    }
  }, [emailAddress, conversationId]);

  if (loading) return <CalendarSkeleton />;

  if (error) {
    return (
      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-12 text-center">
        <p className="text-sm text-[var(--muted)]">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ═══ OCC — Olivia Command Center — collapsible rising theater ═══ */}
      <div>
        {/* Outer gold ring */}
        <div
          style={{
            position: "relative",
            borderRadius: 18,
            padding: 2,
            background: "linear-gradient(145deg, rgba(196,169,106,0.30), rgba(196,169,106,0.12) 30%, rgba(196,169,106,0.06) 50%, rgba(196,169,106,0.12) 70%, rgba(196,169,106,0.25))",
            boxShadow: [
              "0 1px 2px rgba(196,169,106,0.10)",
              "0 4px 12px rgba(0,0,0,0.35)",
              "0 12px 36px rgba(0,0,0,0.30)",
              "0 24px 60px rgba(0,0,0,0.20)",
              "inset 0 1px 0 rgba(196,169,106,0.15)",
              "inset 0 -1px 0 rgba(0,0,0,0.12)",
            ].join(", "),
          }}
        >
          {/* Dark channel */}
          <div
            style={{
              borderRadius: 16,
              padding: 2,
              background: "rgba(6,8,16,0.95)",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.5), inset 0 -1px 1px rgba(196,169,106,0.04)",
            }}
          >
            {/* Inner gold ring */}
            <div
              style={{
                borderRadius: 14,
                padding: 2,
                background: "linear-gradient(145deg, rgba(196,169,106,0.40), rgba(196,169,106,0.12) 30%, rgba(196,169,106,0.06) 50%, rgba(196,169,106,0.12) 70%, rgba(196,169,106,0.35))",
                boxShadow: [
                  "inset 0 1px 0 rgba(196,169,106,0.20)",
                  "inset 0 -1px 0 rgba(0,0,0,0.15)",
                  "0 1px 3px rgba(0,0,0,0.25)",
                ].join(", "),
              }}
            >
              {/* Inner surface */}
              <div
                style={{
                  borderRadius: 12,
                  background: "linear-gradient(180deg, rgba(15,18,30,0.97) 0%, rgba(10,14,26,0.99) 100%)",
                  boxShadow: "inset 0 1px 0 rgba(196,169,106,0.06), inset 0 -1px 0 rgba(0,0,0,0.2)",
                  overflow: "hidden",
                }}
              >
                {/* Tab bar — always visible */}
                <button
                  onClick={() => setOccOpen(!occOpen)}
                  className="w-full flex items-center justify-between px-3 sm:px-5 transition-colors hover:bg-white/[0.03]"
                  style={{ height: 48 }}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Command center icon */}
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c4a96a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                      <line x1="8" x2="16" y1="21" y2="21"/>
                      <line x1="12" x2="12" y1="17" y2="21"/>
                    </svg>
                    <span className="text-xs font-semibold tracking-wide" style={{ color: "#c4a96a" }}>
                      OCC&nbsp;&mdash;&nbsp;Olivia Command Center
                    </span>
                    {/* Live pulse when open */}
                    {occOpen && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                    )}
                  </div>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`text-[var(--muted)] transition-transform duration-200 ${occOpen ? "rotate-180" : ""}`}
                  >
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </button>

                {/* Rising theater content */}
                <div
                  ref={occContentRef}
                  style={{
                    display: "grid",
                    gridTemplateRows: occOpen ? "1fr" : "0fr",
                    opacity: occOpen ? 1 : 0,
                    transform: occOpen ? "translateY(0)" : "translateY(40px)",
                    transition: "grid-template-rows 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s ease 0.1s, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                >
                  <div style={{ overflow: "hidden" }}>
                    <div className="px-3 sm:px-4 pb-4 pt-2">
                      <OliviaDisplayScreen onVoiceTranscript={handleVoiceTranscript} lastReply={lastOliviaReply} />

                      {/* ── Conversation toolbar ── */}
                      <div
                        className="mt-4 flex flex-wrap items-center gap-1.5 sm:gap-2 px-0 sm:px-1"
                        style={{ marginBottom: 8 }}
                      >
                        {/* Load History Dropdown */}
                        <div className="relative" ref={historyDropdownRef}>
                          <button
                            onClick={() => {
                              if (!showHistoryDropdown) fetchConversationHistory();
                              setShowHistoryDropdown(!showHistoryDropdown);
                            }}
                            className="flex items-center gap-1 sm:gap-1.5 rounded-md px-2 sm:px-2.5 py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-medium transition-colors"
                            style={{
                              background: showHistoryDropdown ? "rgba(196,169,106,0.15)" : "rgba(196,169,106,0.08)",
                              border: "1px solid rgba(196,169,106,0.25)",
                              color: "#c4a96a",
                            }}
                          >
                            <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/>
                            </svg>
                            <span className="hidden sm:inline">Load</span>
                          </button>
                          {showHistoryDropdown && (
                            <div
                              className="absolute left-0 top-full mt-1 z-50 w-56 rounded-lg shadow-xl overflow-hidden"
                              style={{
                                background: "rgba(10,14,26,0.98)",
                                border: "1px solid rgba(196,169,106,0.25)",
                              }}
                            >
                              <div className="px-3 py-2 border-b" style={{ borderColor: "rgba(196,169,106,0.15)" }}>
                                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#c4a96a" }}>
                                  Prior Conversations
                                </span>
                              </div>
                              <div className="max-h-48 overflow-y-auto">
                                {historyLoading ? (
                                  <div className="px-3 py-4 text-center">
                                    <span className="text-[10px] text-[var(--muted)]">Loading...</span>
                                  </div>
                                ) : conversationHistory.length === 0 ? (
                                  <div className="px-3 py-4 text-center">
                                    <span className="text-[10px] text-[var(--muted)]">No prior conversations</span>
                                  </div>
                                ) : (
                                  conversationHistory.map((conv) => (
                                    <button
                                      key={conv.id}
                                      onClick={() => loadConversation(conv.id)}
                                      className="w-full px-3 py-2 text-left hover:bg-white/5 transition-colors"
                                    >
                                      <p className="text-[11px] text-white truncate">{conv.title}</p>
                                      <p className="text-[9px] text-[var(--muted)]">
                                        {new Date(conv.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {conv.messageCount} messages
                                      </p>
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Download */}
                        <button
                          onClick={handleDownloadTranscript}
                          disabled={chatLog.length === 0}
                          className="flex items-center gap-1 sm:gap-1.5 rounded-md px-2 sm:px-2.5 py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-medium transition-colors disabled:opacity-40"
                          style={{
                            background: "rgba(196,169,106,0.08)",
                            border: "1px solid rgba(196,169,106,0.25)",
                            color: "#c4a96a",
                          }}
                        >
                          <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                          <span className="hidden sm:inline">Download</span>
                        </button>

                        {/* Email */}
                        <button
                          onClick={() => setShowEmailModal(true)}
                          disabled={chatLog.length === 0 || !conversationId}
                          className="flex items-center gap-1 sm:gap-1.5 rounded-md px-2 sm:px-2.5 py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-medium transition-colors disabled:opacity-40"
                          style={{
                            background: "rgba(196,169,106,0.08)",
                            border: "1px solid rgba(196,169,106,0.25)",
                            color: "#c4a96a",
                          }}
                        >
                          <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                          </svg>
                          <span className="hidden sm:inline">Email</span>
                        </button>

                        {/* Read Aloud */}
                        <button
                          onClick={handleReadAloud}
                          disabled={chatLog.length === 0}
                          className="flex items-center gap-1 sm:gap-1.5 rounded-md px-2 sm:px-2.5 py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-medium transition-colors disabled:opacity-40"
                          style={{
                            background: isReading ? "rgba(196,169,106,0.25)" : "rgba(196,169,106,0.08)",
                            border: `1px solid ${isReading ? "rgba(196,169,106,0.5)" : "rgba(196,169,106,0.25)"}`,
                            color: "#c4a96a",
                          }}
                        >
                          <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            {isReading ? (
                              <><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></>
                            ) : (
                              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                            )}
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                          </svg>
                          <span className="hidden sm:inline">{isReading ? "Stop" : "Read"}</span>
                        </button>
                      </div>

                      {/* ── Olivia conversation panel — full width inside OCC ── */}
                      <div
                        className="mt-6 rounded-lg border flex flex-col h-[140px] sm:h-[192px]"
                        style={{
                          background: "rgba(6, 10, 20, 0.80)",
                          borderColor: "rgba(196, 169, 106, 0.10)",
                        }}
                      >
                        {/* Chat transcript — scrollable */}
                        <div
                          ref={chatLogRef}
                          className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
                          style={{ minHeight: 0 }}
                        >
                          {chatLog.length === 0 && (
                            <p className="text-xs text-[var(--muted)]/50 italic pt-2">
                              Tell Olivia what to schedule&hellip; &ldquo;Meeting with Seedcamp Thursday 2pm at Level39&rdquo;
                            </p>
                          )}
                          {chatLog.map((msg, i) => (
                            <div key={i} className="flex gap-2 items-start">
                              <span
                                className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide mt-0.5"
                                style={{
                                  color: msg.speaker === "olivia" ? "#c4a96a" : "#7dd3fc",
                                  minWidth: 44,
                                }}
                              >
                                {msg.speaker === "olivia" ? "Olivia" : "You"}
                              </span>
                              <p className={`text-xs leading-relaxed ${
                                msg.speaker === "olivia"
                                  ? "text-[var(--foreground)]"
                                  : "text-[var(--muted)]"
                              }`}>
                                {msg.text}
                              </p>
                            </div>
                          ))}
                          {nlpParsing && (
                            <div className="flex gap-2 items-start">
                              <span
                                className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide mt-0.5"
                                style={{ color: "#c4a96a", minWidth: 44 }}
                              >
                                Olivia
                              </span>
                              <p className="text-xs text-[var(--muted)] animate-pulse">Thinking&hellip;</p>
                            </div>
                          )}
                        </div>

                        {/* Input row — pinned to bottom */}
                        <form onSubmit={handleTextSubmit} className="flex items-center gap-2 px-3 py-2 border-t" style={{ borderColor: "rgba(196,169,106,0.10)" }}>
                          <input
                            type="text"
                            value={nlpText}
                            onChange={(e) => setNlpText(e.target.value)}
                            placeholder="Type a message to Olivia..."
                            className="flex-1 rounded-md bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/50 focus:outline-none focus:ring-1 focus:ring-[#c4a96a]"
                            style={{
                              border: "2px solid rgba(196, 169, 106, 0.5)",
                              boxShadow: "0 0 8px rgba(196, 169, 106, 0.15), inset 0 1px 0 rgba(196, 169, 106, 0.05)",
                            }}
                            disabled={nlpParsing}
                          />
                          <button
                            type="submit"
                            disabled={nlpParsing || !nlpText.trim()}
                            className="rounded-md bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
                          >
                            {nlpParsing ? "Sending..." : "Send"}
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              </div>{/* end inner surface */}
            </div>{/* end inner gold ring */}
          </div>{/* end dark channel */}
        </div>{/* end outer gold ring */}
      </div>

      {/* ═══ My Calendar — collapsible tab matching OCC/Notes pattern ═══ */}
      <div>
        {/* Outer gold ring */}
        <div
          style={{
            position: "relative",
            borderRadius: 18,
            padding: 2,
            background: "linear-gradient(145deg, rgba(196,169,106,0.30), rgba(196,169,106,0.12) 30%, rgba(196,169,106,0.06) 50%, rgba(196,169,106,0.12) 70%, rgba(196,169,106,0.25))",
            boxShadow: [
              "0 1px 2px rgba(196,169,106,0.10)",
              "0 4px 12px rgba(0,0,0,0.35)",
              "0 12px 36px rgba(0,0,0,0.30)",
              "0 24px 60px rgba(0,0,0,0.20)",
              "inset 0 1px 0 rgba(196,169,106,0.15)",
              "inset 0 -1px 0 rgba(0,0,0,0.12)",
            ].join(", "),
          }}
        >
          {/* Dark channel */}
          <div
            style={{
              borderRadius: 16,
              padding: 2,
              background: "rgba(6,8,16,0.95)",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.5), inset 0 -1px 1px rgba(196,169,106,0.04)",
            }}
          >
            {/* Inner gold ring */}
            <div
              style={{
                borderRadius: 14,
                padding: 2,
                background: "linear-gradient(145deg, rgba(196,169,106,0.40), rgba(196,169,106,0.12) 30%, rgba(196,169,106,0.06) 50%, rgba(196,169,106,0.12) 70%, rgba(196,169,106,0.35))",
                boxShadow: [
                  "inset 0 1px 0 rgba(196,169,106,0.20)",
                  "inset 0 -1px 0 rgba(0,0,0,0.15)",
                  "0 1px 3px rgba(0,0,0,0.25)",
                ].join(", "),
              }}
            >
              {/* Inner surface */}
              <div
                style={{
                  borderRadius: 12,
                  background: "linear-gradient(180deg, rgba(15,18,30,0.97) 0%, rgba(10,14,26,0.99) 100%)",
                  boxShadow: "inset 0 1px 0 rgba(196,169,106,0.06), inset 0 -1px 0 rgba(0,0,0,0.2)",
                  overflow: "hidden",
                }}
              >
                {/* Tab bar — always visible */}
                <button
                  onClick={() => setCalendarOpen(!calendarOpen)}
                  className="w-full relative flex items-center justify-center px-3 sm:px-5 transition-colors hover:bg-white/[0.03]"
                  style={{ height: 48 }}
                >
                  <div className="flex items-center gap-2.5">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c4a96a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
                    </svg>
                    <span className="text-xs font-semibold tracking-wide" style={{ color: "#c4a96a" }}>
                      My Calendar
                    </span>
                  </div>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`absolute right-5 text-[var(--muted)] transition-transform duration-200 ${calendarOpen ? "rotate-180" : ""}`}
                  >
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </button>

                {/* Calendar content — shown when tab is open */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateRows: calendarOpen ? "1fr" : "0fr",
                    opacity: calendarOpen ? 1 : 0,
                    transform: calendarOpen ? "translateY(0)" : "translateY(40px)",
                    transition: "grid-template-rows 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s ease 0.1s, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                >
                  <div style={{ overflow: "hidden" }}>
                    <div className="px-2 sm:px-4 pb-4 pt-2">
                      <CalendarView
                        personalEntries={personalEntries}
                        ecosystemEvents={ecosystemEvents}
                        defaultView="timeGridWeek"
                        onRefresh={fetchData}
                        showSync={showSync}
                        onToggleSync={() => setShowSync(!showSync)}
                        todayHighlight={
                          <div className="mb-5">
                            {/* Header row */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="flex items-center justify-center rounded-md"
                                  style={{
                                    width: 28,
                                    height: 28,
                                    background: "rgba(196,169,106,0.10)",
                                    border: "1px solid rgba(196,169,106,0.20)",
                                    boxShadow: "0 0 10px rgba(196,169,106,0.08)",
                                  }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c4a96a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                    <line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
                                  </svg>
                                </div>
                                <div>
                                  <h3 className="text-sm font-semibold" style={{ color: "#c4a96a" }}>
                                    Today&apos;s Schedule
                                  </h3>
                                  <p className="text-[10px]" style={{ color: "rgba(196,169,106,0.50)" }}>
                                    {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowAgenda(!showAgenda)}
                                className="rounded-full px-3 py-1 text-[10px] font-medium transition-all"
                                style={{
                                  color: showAgenda ? "#c4a96a" : "var(--muted)",
                                  background: showAgenda ? "rgba(196,169,106,0.10)" : "transparent",
                                  border: `1px solid ${showAgenda ? "rgba(196,169,106,0.25)" : "rgba(255,255,255,0.06)"}`,
                                }}
                              >
                                {showAgenda ? "Hide" : "Show"}
                              </button>
                            </div>

                            {/* Illuminated event cards */}
                            {showAgenda && (
                              <div
                                className="rounded-lg px-3 py-3"
                                style={{
                                  background: "linear-gradient(180deg, rgba(196,169,106,0.04) 0%, rgba(196,169,106,0.01) 100%)",
                                  border: "1px solid rgba(196,169,106,0.12)",
                                  boxShadow: "0 0 20px rgba(196,169,106,0.04), inset 0 1px 0 rgba(196,169,106,0.06)",
                                }}
                              >
                                <AgendaRail
                                  entries={personalEntries.map((e) => ({
                                    id: e.id,
                                    title: e.title,
                                    startDatetime: e.startDatetime,
                                    endDatetime: e.endDatetime,
                                    category: e.category,
                                    priority: e.priority,
                                    location: e.location,
                                    allDay: e.allDay,
                                    isArchived: e.isArchived,
                                  }))}
                                  onEntryClick={(id) => {
                                    const found = personalEntries.find((e) => e.id === id);
                                    if (found) setAgendaModalEntry(found);
                                  }}
                                  horizontal
                                />
                              </div>
                            )}

                            {/* Subtle divider */}
                            <div
                              className="mt-4"
                              style={{
                                height: 1,
                                background: "linear-gradient(90deg, transparent 0%, rgba(196,169,106,0.15) 20%, rgba(196,169,106,0.15) 80%, transparent 100%)",
                              }}
                            />
                          </div>
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>{/* end inner surface */}
            </div>{/* end inner gold ring */}
          </div>{/* end dark channel */}
        </div>{/* end outer gold ring */}
      </div>

      {/* ═══ Notes tab bar + nested notepad — 4D executive desk frame ═══ */}
      <div ref={notesTabRef}>
        {/* Outer gold ring */}
        <div
          style={{
            position: "relative",
            borderRadius: 18,
            padding: 2,
            background: "linear-gradient(145deg, rgba(196,169,106,0.30), rgba(196,169,106,0.12) 30%, rgba(196,169,106,0.06) 50%, rgba(196,169,106,0.12) 70%, rgba(196,169,106,0.25))",
            boxShadow: [
              "0 1px 2px rgba(196,169,106,0.10)",
              "0 4px 12px rgba(0,0,0,0.35)",
              "0 12px 36px rgba(0,0,0,0.30)",
              "0 24px 60px rgba(0,0,0,0.20)",
              "inset 0 1px 0 rgba(196,169,106,0.15)",
              "inset 0 -1px 0 rgba(0,0,0,0.12)",
            ].join(", "),
          }}
        >
          {/* Dark channel */}
          <div
            style={{
              borderRadius: 16,
              padding: 2,
              background: "rgba(6,8,16,0.95)",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.5), inset 0 -1px 1px rgba(196,169,106,0.04)",
            }}
          >
            {/* Inner gold ring */}
            <div
              style={{
                borderRadius: 14,
                padding: 2,
                background: "linear-gradient(145deg, rgba(196,169,106,0.40), rgba(196,169,106,0.12) 30%, rgba(196,169,106,0.06) 50%, rgba(196,169,106,0.12) 70%, rgba(196,169,106,0.35))",
                boxShadow: [
                  "inset 0 1px 0 rgba(196,169,106,0.20)",
                  "inset 0 -1px 0 rgba(0,0,0,0.15)",
                  "0 1px 3px rgba(0,0,0,0.25)",
                ].join(", "),
              }}
            >
              {/* Inner surface */}
              <div
                style={{
                  borderRadius: 12,
                  background: "linear-gradient(180deg, rgba(15,18,30,0.97) 0%, rgba(10,14,26,0.99) 100%)",
                  boxShadow: "inset 0 1px 0 rgba(196,169,106,0.06), inset 0 -1px 0 rgba(0,0,0,0.2)",
                  overflow: "hidden",
                }}
              >
                {/* Horizontal tab bar — always visible */}
                <button
                  onClick={() => setNotesOpen(!notesOpen)}
                  className="w-full flex items-center justify-between px-3 sm:px-5 transition-colors hover:bg-white/[0.03]"
                  style={{ height: 48 }}
                >
                  <div className="flex items-center gap-2.5">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c4a96a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/>
                    </svg>
                    <span className="text-xs font-semibold tracking-wide" style={{ color: "#c4a96a" }}>
                      Notes
                    </span>
                  </div>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`text-[var(--muted)] transition-transform duration-200 ${notesOpen ? "rotate-180" : ""}`}
                  >
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </button>

                {/* Notepad content — shown when tab is open */}
                {notesOpen && (
                  <CalendarNotepad
                    calendarEntries={personalEntries.map((e) => ({
                      id: e.id,
                      title: e.title,
                      startDatetime: e.startDatetime,
                    }))}
                    focusNoteId={focusNoteId}
                  />
                )}
              </div>{/* end inner surface */}
            </div>{/* end inner gold ring */}
          </div>{/* end dark channel */}
        </div>{/* end outer gold ring */}
      </div>

      {/* Agenda card modal — opens when clicking a Today card */}
      {agendaModalEntry && (
        <CalendarEntryModal
          key={`agenda-${agendaModalEntry.id}`}
          entry={agendaModalEntry}
          onClose={() => setAgendaModalEntry(null)}
          onSave={() => {
            setAgendaModalEntry(null);
            fetchData();
          }}
        />
      )}

      {/* Email Success Toast */}
      {emailSuccess && (
        <div
          className="fixed bottom-6 right-6 z-[110] flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg animate-in slide-in-from-bottom-4"
          style={{
            background: "linear-gradient(180deg, rgba(15,18,30,0.98) 0%, rgba(10,14,26,0.99) 100%)",
            border: "1px solid rgba(74,222,128,0.3)",
            boxShadow: "0 0 20px rgba(74,222,128,0.15)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span className="text-sm font-medium" style={{ color: "#4ADE80" }}>
            Transcript sent successfully
          </span>
        </div>
      )}

      {/* Email Error Toast */}
      {emailError && !showEmailModal && (
        <div
          className="fixed bottom-6 right-6 z-[110] flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg animate-in slide-in-from-bottom-4"
          style={{
            background: "linear-gradient(180deg, rgba(15,18,30,0.98) 0%, rgba(10,14,26,0.99) 100%)",
            border: "1px solid rgba(239,68,68,0.3)",
            boxShadow: "0 0 20px rgba(239,68,68,0.15)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <span className="text-sm font-medium" style={{ color: "#ef4444" }}>
            {emailError}
          </span>
        </div>
      )}

      {/* Email Transcript Modal */}
      {showEmailModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setShowEmailModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl p-6"
            style={{
              background: "linear-gradient(180deg, rgba(15,18,30,0.98) 0%, rgba(10,14,26,0.99) 100%)",
              border: "1px solid rgba(196,169,106,0.25)",
              boxShadow: "0 0 40px rgba(196,169,106,0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold mb-4" style={{ color: "#c4a96a" }}>
              Email Conversation Transcript
            </h3>
            <input
              type="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: emailError ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(196,169,106,0.25)",
                color: "white",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && emailAddress.trim()) handleEmailTranscript();
              }}
            />
            {/* Error message inside modal */}
            {emailError && (
              <p className="text-xs mt-2 mb-2" style={{ color: "#ef4444" }}>
                {emailError}
              </p>
            )}
            {!emailError && <div className="mb-4" />}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--muted)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleEmailTranscript}
                disabled={!emailAddress.trim() || emailSending}
                className="px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
                style={{
                  background: "rgba(196,169,106,0.2)",
                  border: "1px solid rgba(196,169,106,0.4)",
                  color: "#c4a96a",
                }}
              >
                {emailSending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Focus Mode overlay */}
      {showFocusMode && (
        <FocusMode
          entries={personalEntries.map((e) => ({
            id: e.id,
            title: e.title,
            startDatetime: e.startDatetime,
            endDatetime: e.endDatetime,
            category: e.category,
            priority: e.priority,
            location: e.location,
            allDay: e.allDay,
            description: e.description,
          }))}
          onClose={() => setShowFocusMode(false)}
        />
      )}

      {/* Layer 2: GDPR Consent Modal */}
      <OliviaConsentModal
        isOpen={showConsentModal}
        onConsent={(granted) => {
          setHasConsent(granted);
          setShowConsentModal(false);
          if (granted) {
            // Clear the chat log and show a welcome message
            setChatLog([
              {
                speaker: "olivia",
                text: "Thank you for trusting me with your data. How can I help you today?",
              },
            ]);
          } else {
            setChatLog((prev) => [
              ...prev,
              {
                speaker: "olivia",
                text: "I understand. You can still use the calendar manually. If you change your mind, just start a conversation with me.",
              },
            ]);
          }
        }}
        onClose={() => setShowConsentModal(false)}
      />
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <div className="h-8 w-20 animate-pulse rounded-md bg-[var(--card-bg)]" />
          <div className="h-8 w-16 animate-pulse rounded-md bg-[var(--card-bg)]" />
          <div className="h-8 w-20 animate-pulse rounded-md bg-[var(--card-bg)]" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-16 animate-pulse rounded-full bg-[var(--card-bg)]" />
          <div className="h-8 w-16 animate-pulse rounded-full bg-[var(--card-bg)]" />
          <div className="h-8 w-16 animate-pulse rounded-full bg-[var(--card-bg)]" />
        </div>
      </div>
      <div className="h-[650px] animate-pulse rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)]" />
    </div>
  );
}
