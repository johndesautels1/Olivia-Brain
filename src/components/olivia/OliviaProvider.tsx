"use client";

// src/components/olivia/OliviaProvider.tsx
// Central state management for Olivia — shared between bubble, panel, and /olivia page
//
// ─── PORT NOTE (Olivia Brain, session 2) ─────────────────────────────────
// Copied from D:\London-Tech-Map\src\components\olivia\OliviaProvider.tsx.
// LTM original is read-only and untouched.
//
// The fetch URLs below (/api/olivia/chat, /api/olivia/voice,
// /api/olivia/history/[convId], /api/olivia/conversations/[id]/email) are
// not yet implemented in Olivia Brain — they are scheduled for Phase 2 of
// MERGE_PLAN.md (Backend Consolidation, Weeks 3-5). The session-2 smoke
// test only exercises the LiveAvatar plumbing and does NOT invoke
// sendMessage / loadConversation / speakText / emailConversation, so the
// missing routes do not block the proof-of-life test. Routes will be
// stood up in subsequent sessions.
// ──────────────────────────────────────────────────────────────────────────

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  useTransition,
} from "react";
import { usePathname } from "next/navigation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OliviaMessageUI {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
  createdAt: string;
  isLoading?: boolean;
}

export type OliviaMode = "chat" | "voice" | "video";

/** Document context for the Preparation Studio — injected so Olivia
 *  knows which document/question the user is currently working on. */
export interface OliviaDocumentContext {
  documentId: string;
  documentTitle: string;
  documentType: string;
  currentQuestion: string;
  currentBlockIndex: number;
  totalBlocks: number;
  /** Block type (paragraph, metrics, table, etc.) */
  blockType?: string;
  /** User's current answer for this block (for refinement) */
  existingAnswer?: string;
  /** All DNA paragraph values keyed by ID (p1-p10) */
  dnaParagraphs?: Record<string, string>;
  /** Collection-to-DNA mapping */
  dnaMap?: Record<string, string[]>;
  /** Current document's collection slug */
  collectionSlug?: string;
}

/** Pipeline context — injected from CristianoShell so Olivia knows
 *  the user's current step and which documents need attention. */
export interface OliviaPipelineContext {
  pipelineStep: string;
  pipelineStepLabel: string;
  companyName?: string;
  /** Collection readiness: slug → percentage (0-100) */
  collectionReadiness?: Record<string, number>;
  /** Overall readiness across all collections */
  overallReadiness?: number;
  /** User's subscription plan tier */
  planTier?: "free" | "developer" | "executive" | "enterprise";
  /** Which Cristiano pass is active/completed */
  cristianoPass?: "none" | "pass1-pending" | "pass1-complete" | "pass2-pending" | "pass2-complete";
  /** Pass 1 top entity matches (so Olivia can guide Studio Round 2) */
  pass1TopEntities?: Array<{
    entityName: string;
    entityType: string;
    matchScore: number;
    topVectors: string[];
    keyInsight: string;
  }>;
  /** Valuation results — Enterprise tier (so Olivia knows the numbers) */
  valuationSummary?: {
    enterpriseValue: number;
    confidenceScore: number;
    primaryMethod: string;
    range: { low: number; high: number };
  };
  /** Business plan completion status */
  businessPlanStatus?: "not-started" | "in-progress" | "complete";
  /** Pitch deck completion status */
  pitchDeckStatus?: "not-started" | "in-progress" | "complete";
  /** Selected pitch deck template name */
  selectedPitchDeckTemplate?: string;
}

interface OliviaContextValue {
  // State
  isOpen: boolean;
  quickChatMode: boolean;
  mode: OliviaMode;
  conversationId: string | null;
  messages: OliviaMessageUI[];
  isLoading: boolean;
  isSpeaking: boolean;
  pageContext: string;
  error: string | null;
  /** Document context set by the Preparation Studio (null when not in studio) */
  documentContext: OliviaDocumentContext | null;
  /** Pipeline context set by CristianoShell (null when not in analysis) */
  pipelineContext: OliviaPipelineContext | null;

  // Actions
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  openFullModal: () => void;
  setMode: (mode: OliviaMode) => void;
  sendMessage: (text: string) => Promise<void>;
  startNewConversation: () => void;
  loadConversation: (convId: string) => Promise<void>;
  speakText: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  clearError: () => void;
  /** Set document context from the Preparation Studio */
  setDocumentContext: (ctx: OliviaDocumentContext | null) => void;
  /** Set pipeline context from CristianoShell */
  setPipelineContext: (ctx: OliviaPipelineContext | null) => void;

  // Conversation management actions
  downloadConversation: () => void;
  shareConversation: () => Promise<void>;
  emailConversation: (recipientEmail: string) => Promise<{ success: boolean; error?: string }>;
}

const OliviaContext = createContext<OliviaContextValue | null>(null);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOlivia() {
  const ctx = useContext(OliviaContext);
  if (!ctx) {
    throw new Error("useOlivia must be used within an OliviaProvider");
  }
  return ctx;
}

/** Safe version — returns null if called outside OliviaProvider (e.g. CristianoShell) */
export function useOliviaOptional() {
  return useContext(OliviaContext);
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const STORAGE_KEY = "olivia-conversation-id";

export function OliviaProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // State
  const [isOpen, setIsOpen] = useState(false);
  const [quickChatMode, setQuickChatMode] = useState(true);
  const [mode, setMode] = useState<OliviaMode>("chat");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<OliviaMessageUI[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [documentContext, setDocumentContext] = useState<OliviaDocumentContext | null>(null);
  const [pipelineContext, setPipelineContext] = useState<OliviaPipelineContext | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const ttsQueueRef = useRef<string[]>([]);
  const isProcessingTTSRef = useRef(false);

  // Restore conversation ID from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setConversationId(stored);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  // Persist conversation ID
  useEffect(() => {
    try {
      if (conversationId) {
        localStorage.setItem(STORAGE_KEY, conversationId);
      }
    } catch {
      // localStorage not available
    }
  }, [conversationId]);

  // Panel controls — wrapped in startTransition so React yields to the browser
  // for paint before mounting the heavy OliviaChatPanel tree (fixes INP > 200ms)
  const [, startPanelTransition] = useTransition();
  const togglePanel = useCallback(() => startPanelTransition(() => setIsOpen((prev) => !prev)), [startPanelTransition]);
  const openPanel = useCallback(() => startPanelTransition(() => setIsOpen(true)), [startPanelTransition]);
  const closePanel = useCallback(() => startPanelTransition(() => { setIsOpen(false); setQuickChatMode(true); }), [startPanelTransition]);
  const openFullModal = useCallback(() => setQuickChatMode(false), []);

  // Clear error
  const clearError = useCallback(() => setError(null), []);

  // Start new conversation
  const startNewConversation = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setError(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  // Voice — internal implementation (plays a single TTS segment, returns a Promise that resolves when done)
  const speakTextSingle = useCallback(async (text: string): Promise<void> => {
    // Stop any current playback before starting new one
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (speechRef.current && typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      speechRef.current = null;
    }

    setIsSpeaking(true);

    try {
      const response = await fetch("/api/olivia/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (response.headers.get("Content-Type")?.includes("audio/")) {
        // ElevenLabs audio response
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        await new Promise<void>((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            audioRef.current = null;
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            audioRef.current = null;
            resolve();
          };
          audio.play().catch(() => resolve());
        });
      } else {
        // Fallback — browser Speech API
        const data = await response.json();
        if (data.fallback && typeof window !== "undefined" && window.speechSynthesis) {
          const utterance = new SpeechSynthesisUtterance(data.text || text);
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.lang = "en-GB";

          // Prefer female British voice
          const voices = window.speechSynthesis.getVoices();
          const preferred = voices.find(
            (v) =>
              v.lang.startsWith("en-GB") &&
              v.name.toLowerCase().includes("female")
          );
          if (preferred) utterance.voice = preferred;

          speechRef.current = utterance;

          await new Promise<void>((resolve) => {
            utterance.onend = () => {
              speechRef.current = null;
              resolve();
            };
            utterance.onerror = () => {
              speechRef.current = null;
              resolve();
            };
            window.speechSynthesis.speak(utterance);
          });
        }
      }
    } catch {
      // TTS failed — continue silently
    } finally {
      setIsSpeaking(false);
    }
  }, []);

  // TTS queue processor — ensures only one TTS plays at a time (prevents overlapping/talking over herself)
  const processTTSQueue = useCallback(async () => {
    if (isProcessingTTSRef.current) return; // Already processing
    isProcessingTTSRef.current = true;

    while (ttsQueueRef.current.length > 0) {
      const text = ttsQueueRef.current.shift()!;
      await speakTextSingle(text);
    }

    isProcessingTTSRef.current = false;
  }, [speakTextSingle]);

  // Queued speak — adds to queue and kicks off processing (prevents talking over herself)
  const speakTextInternal = useCallback((text: string) => {
    ttsQueueRef.current.push(text);
    processTTSQueue();
  }, [processTTSQueue]);

  // Send message
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      setError(null);
      setIsLoading(true);

      // Optimistic add user message
      const tempId = `temp-${Date.now()}`;
      const userMsg: OliviaMessageUI = {
        id: tempId,
        role: "user",
        content: text.trim(),
        createdAt: new Date().toISOString(),
      };

      // Add loading indicator for assistant
      const loadingMsg: OliviaMessageUI = {
        id: `loading-${Date.now()}`,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);

      try {
        const response = await fetch("/api/olivia/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            conversationId,
            pageContext: pathname,
            ...(pipelineContext ? { pipelineContext } : {}),
            ...(documentContext ? { documentContext } : {}),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to send message");
        }

        // Update conversation ID if new
        if (data.conversationId && data.conversationId !== conversationId) {
          setConversationId(data.conversationId);
        }

        // Replace loading message with actual response
        const assistantMsg: OliviaMessageUI = {
          id: data.messageId || `msg-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => {
          const withoutLoading = prev.filter((m) => !m.isLoading);
          return [...withoutLoading, assistantMsg];
        });

        // Auto-speak in voice mode
        if (mode === "voice" && data.reply) {
          speakTextInternal(data.reply);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong";
        setError(message);

        // Remove loading message
        setMessages((prev) => prev.filter((m) => !m.isLoading));
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId, documentContext, isLoading, mode, pathname, pipelineContext, speakTextInternal]
  );

  // Load existing conversation
  const loadConversation = useCallback(async (convId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/olivia/history/${convId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load conversation");
      }

      const loaded: OliviaMessageUI[] = (data.messages || [])
        .filter((m: { role: string }) => m.role === "user" || m.role === "assistant")
        .map((m: { id: string; role: string; content: string; createdAt: string }) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          createdAt: m.createdAt,
        }));

      setConversationId(convId);
      setMessages(loaded);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load conversation";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Public speak/stop
  const speakText = useCallback(
    async (text: string) => {
      await speakTextInternal(text);
    },
    [speakTextInternal]
  );

  const stopSpeaking = useCallback(() => {
    // Clear the TTS queue so nothing else plays after stopping
    ttsQueueRef.current = [];
    isProcessingTTSRef.current = false;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    speechRef.current = null;
    setIsSpeaking(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Conversation Management: Download, Share, Email
  // ---------------------------------------------------------------------------

  // Download conversation as markdown file
  const downloadConversation = useCallback(() => {
    if (messages.length === 0) return;

    const date = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    let markdown = `# Olivia Conversation\n\n`;
    markdown += `**Date:** ${date}\n\n`;
    markdown += `---\n\n`;

    messages.forEach((msg) => {
      if (msg.isLoading) return;
      const speaker = msg.role === "assistant" ? "**Olivia:**" : "**You:**";
      markdown += `${speaker}\n\n${msg.content}\n\n---\n\n`;
    });

    markdown += `\n*Exported from Olivia Brain — Olivia AI Assistant*`;

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `olivia-conversation-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [messages]);

  // Share conversation - copy link to clipboard
  const shareConversation = useCallback(async () => {
    if (!conversationId) {
      // No conversation saved yet - create a shareable URL with current page
      const url = `${window.location.origin}/olivia`;
      await navigator.clipboard.writeText(url);
      return;
    }

    // Create shareable URL with conversation ID
    const shareUrl = `${window.location.origin}/olivia?conversation=${conversationId}`;
    await navigator.clipboard.writeText(shareUrl);
  }, [conversationId]);

  // Email conversation transcript
  const emailConversation = useCallback(
    async (recipientEmail: string): Promise<{ success: boolean; error?: string }> => {
      if (!conversationId) {
        return { success: false, error: "No conversation to email. Start chatting first." };
      }

      if (!recipientEmail || !recipientEmail.includes("@")) {
        return { success: false, error: "Please enter a valid email address." };
      }

      try {
        const response = await fetch(`/api/olivia/conversations/${conversationId}/email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipientEmail }),
        });

        const data = await response.json();

        if (!response.ok) {
          return { success: false, error: data.error || "Failed to send email" };
        }

        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to send email",
        };
      }
    },
    [conversationId]
  );

  const value: OliviaContextValue = {
    isOpen,
    quickChatMode,
    mode,
    conversationId,
    messages,
    isLoading,
    isSpeaking,
    pageContext: pathname,
    error,
    documentContext,
    pipelineContext,
    togglePanel,
    openPanel,
    closePanel,
    openFullModal,
    setMode,
    sendMessage,
    startNewConversation,
    loadConversation,
    speakText,
    stopSpeaking,
    clearError,
    setDocumentContext,
    setPipelineContext,
    downloadConversation,
    shareConversation,
    emailConversation,
  };

  return (
    <OliviaContext.Provider value={value}>{children}</OliviaContext.Provider>
  );
}
