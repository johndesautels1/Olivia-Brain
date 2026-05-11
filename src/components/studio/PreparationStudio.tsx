"use client";

/**
 * PreparationStudio — Main orchestrator for the Preparation Studio.
 *
 * Composes the full-screen layout:
 * - StudioTopBar (64px, sticky, glassmorphic)
 * - Center stage area: Olivia avatar/chat + StudioQuestionCard
 * - StudioBottomBar (56px, sticky, glassmorphic)
 *
 * Manages:
 * - Question sequencer via mapBlocksToQuestions()
 * - Active question index (which question is shown)
 * - Navigation (prev/next/jump via keyboard J/K or bottom bar)
 * - Answer capture → block update → auto-save (1.5s debounce)
 * - Gold border pulse on successful save
 * - Question display with slide+fade transitions (200ms ease-out)
 * - Stage-and-spotlight dimming (Olivia speaks → card dims; user types → avatar dims)
 *
 * Design spec:
 * - Background: #0a0e1a (deep navy-black)
 * - Card surface: rgba(15, 18, 25, 0.8) with backdrop-blur(16px)
 * - Question transition: 200ms ease-out slide + fade
 * - Auto-save pulse: 300ms gold border glow
 * - Mobile: vertical stack, 44px min touch targets
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { type WorkspaceBlock } from "@/components/documents/DocumentWorkspace";
import { useOlivia } from "@/components/olivia/OliviaProvider";
import { StudioTopBar } from "./StudioTopBar";
import { StudioBottomBar } from "./StudioBottomBar";
import { StudioOliviaAvatar } from "./StudioOliviaAvatar";
import { StudioOliviaChat } from "./StudioOliviaChat";
import { StudioQuestionCard } from "./StudioQuestionCard";
import { StudioFormattingToolbar } from "./StudioFormattingToolbar";
import { PitchPolishModal } from "./PitchPolishModal";
import { SuggestionChips } from "./SuggestionChips";
import { WhyThisPanel } from "./WhyThisPanel";
import { DeepResearchPanel, type ResearchResult, type ResearchCitation } from "./DeepResearchPanel";
import { ResearchHistory } from "./ResearchHistory";
import { EntityBriefCard } from "./EntityBriefCard";
import { EntityPerspectiveModal } from "./EntityPerspectiveModal";
import { MicroReward } from "./MicroReward";
import { SkipNudgeModal } from "./SkipNudgeModal";
import { CompletionCeremony } from "./CompletionCeremony";
import { DocumentTransition } from "./DocumentTransition";
import { PreSubmitCheck } from "./PreSubmitCheck";
import { CristianoReEvaluation } from "./CristianoReEvaluation";
import { AnswerRibbon } from "./AnswerRibbon";
import { StoryReview } from "./StoryReview";
import { useStudioKeyboardShortcuts } from "./StudioKeyboardShortcuts";
import type { EntityTarget } from "./StudioTopBar";
import { getEntityMode, type EntityType, type EntityMode } from "@/lib/studio/entityModes";
import {
  type EditorSelection,
  type SlashCommandContext,
  applyInlineFormat,
  insertTextAtPosition,
} from "./StudioAnswerEditor";
import { type VoiceTranscriptResult } from "./StudioVoiceInput";
import { useVoiceCommands } from "./StudioVoiceCommands";
import { mapBlocksToQuestions, applyAnswerToBlocks, computeCompletionFromQuestions } from "@/lib/studio/questionMapper";
import type { FieldValue, Suggestion, SessionMetrics } from "@/lib/studio/types";
import { DEFAULT_STUDIO_CONFIG, DEFAULT_SESSION_METRICS } from "@/lib/studio/types";

interface PreparationStudioProps {
  documentId: string;
  title: string;
  slug: string;
  collectionSlug: string;
  collectionName: string;
  collectionDocCount: number;
  documentType: string;
  audienceType: string;
  purposeType: string;
  confidentiality: string;
  summary: string | null;
  blocks: WorkspaceBlock[];
  completionPct: number;
  tierColor: string;
  dnaParagraphs: Record<string, string>;
  dnaMap: Record<string, string[]>;
  onSave: (blocks: WorkspaceBlock[]) => Promise<void>;
  onBack: () => void;
  /** Optional entity target for entity adaptation mode */
  entityTarget?: EntityTarget | null;
  /** Optional Cristiano briefing data for the entity */
  entityBrief?: {
    rationale: string;
    strength: string;
    concern: string;
  } | null;
}

// ── 5-color tier from percentage ──────────────────────────────────────

function getTierColor(pct: number): string {
  if (pct <= 20) return "#ef4444";
  if (pct <= 40) return "#f97316";
  if (pct <= 60) return "#eab308";
  if (pct <= 80) return "#3b82f6";
  return "#22c55e";
}

// ── Main Component ────────────────────────────────────────────────────

export function PreparationStudio({
  documentId,
  title,
  slug,
  collectionSlug,
  collectionName,
  collectionDocCount,
  documentType,
  audienceType,
  purposeType,
  confidentiality,
  summary,
  blocks: propBlocks,
  completionPct: initialCompletionPct,
  tierColor: initialTierColor,
  dnaParagraphs,
  dnaMap,
  onSave,
  onBack,
  entityTarget: propEntityTarget,
  entityBrief,
}: PreparationStudioProps) {
  // ── Local block state (working copy for immediate UI updates) ──────
  const [localBlocks, setLocalBlocks] = useState<WorkspaceBlock[]>(propBlocks);

  // ── Entity adaptation state ──────────────────────────────────────────
  const [entityTarget, setEntityTarget] = useState<EntityTarget | null>(propEntityTarget ?? null);
  const [showEntityPerspective, setShowEntityPerspective] = useState(false);
  const entityMode: EntityMode = useMemo(
    () => getEntityMode(entityTarget?.entityType ?? null),
    [entityTarget]
  );

  // Sync from parent when props change (e.g. after save creates new copy)
  const prevPropsRef = useRef(propBlocks);
  useEffect(() => {
    if (prevPropsRef.current !== propBlocks) {
      setLocalBlocks(propBlocks);
      prevPropsRef.current = propBlocks;
    }
  }, [propBlocks]);

  // ── Question sequencer ────────────────────────────────────────────
  const questions = useMemo(
    () => mapBlocksToQuestions(localBlocks, entityMode),
    [localBlocks, entityMode]
  );

  const totalQuestions = questions.length;

  // ── Active question navigation ────────────────────────────────────
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [transitionDirection, setTransitionDirection] = useState<"next" | "prev">("next");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);

  // ── Editor selection & Pitch Polish state ───────────────────────────
  const [editorSelection, setEditorSelection] = useState<EditorSelection | null>(null);
  const [showPitchPolish, setShowPitchPolish] = useState(false);
  const [pitchPolishText, setPitchPolishText] = useState("");

  // ── Deep Research state ──────────────────────────────────────────
  const [showResearch, setShowResearch] = useState(false);
  const [researchHistory, setResearchHistory] = useState<ResearchResult[]>([]);

  // ── Session metrics (streak, timer, completed count) ────────────────
  const [sessionMetrics, setSessionMetrics] = useState<SessionMetrics>(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("studio-session-start");
      if (stored) {
        return { ...DEFAULT_SESSION_METRICS, sessionStartedAt: Number(stored) };
      }
      const now = Date.now();
      sessionStorage.setItem("studio-session-start", String(now));
      return { ...DEFAULT_SESSION_METRICS, sessionStartedAt: now };
    }
    return { ...DEFAULT_SESSION_METRICS, sessionStartedAt: Date.now() };
  });

  // Session timer — ticks every second
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionMetrics((prev) => ({
        ...prev,
        totalElapsedSeconds: Math.floor((Date.now() - prev.sessionStartedAt) / 1000),
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Completed count for MicroReward (derived from questions)
  const completedCount = useMemo(
    () => questions.filter((q) => q.status === "complete").length,
    [questions]
  );

  // ── Skip nudge state ──────────────────────────────────────────────
  const [showSkipNudge, setShowSkipNudge] = useState(false);
  const [skipNudgeQuestion, setSkipNudgeQuestion] = useState<{
    questionText: string;
    impactScore: number;
  } | null>(null);

  // ── Completion ceremony state ─────────────────────────────────────
  const [showCompletionCeremony, setShowCompletionCeremony] = useState(false);

  // ── Document transition state ─────────────────────────────────────
  const [showDocTransition, setShowDocTransition] = useState(false);

  // ── Submit flow state (PreSubmitCheck → CristianoReEvaluation) ────
  const [showPreSubmitCheck, setShowPreSubmitCheck] = useState(false);
  const [showCristianoReEval, setShowCristianoReEval] = useState(false);

  // ── Session resume — restore position + welcome-back greeting ──────
  // Persists the active question index to localStorage on each change,
  // so returning users resume exactly where they left off.
  // NOTE: Currently uses localStorage for client-side resume. A future
  // enhancement should sync this to Supabase (e.g. a studio_sessions
  // table) so resume works across devices. The existing /api/documents/
  // workspace endpoint already saves block_json; this only needs to add
  // the active question index + timestamp to the document record.

  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [resumeInfo, setResumeInfo] = useState<{
    questionIndex: number;
    completedPct: number;
  } | null>(null);

  // On mount: check for a saved session position
  useEffect(() => {
    try {
      const storageKey = `studio-resume-${documentId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as {
          questionIndex: number;
          completedPct: number;
          timestamp: number;
        };
        // Only resume if the saved index is valid and session is < 7 days old
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (
          parsed.questionIndex > 0 &&
          parsed.questionIndex < totalQuestions &&
          Date.now() - parsed.timestamp < sevenDays
        ) {
          setActiveQuestionIndex(parsed.questionIndex);
          setResumeInfo({
            questionIndex: parsed.questionIndex,
            completedPct: parsed.completedPct,
          });
          setShowResumeBanner(true);
          // Auto-dismiss after 6 seconds
          setTimeout(() => setShowResumeBanner(false), 6000);
        }
      }
    } catch {
      // localStorage unavailable or corrupted — ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  // NOTE: Session position persist effect is below (after completionPct is declared)

  const handleDismissResume = useCallback(() => {
    setShowResumeBanner(false);
  }, []);

  const handleResumeRestart = useCallback(() => {
    setShowResumeBanner(false);
    setActiveQuestionIndex(0);
  }, []);

  // ── Auto-save state ───────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingBlocksRef = useRef<WorkspaceBlock[] | null>(null);

  // ── Derived completion data ───────────────────────────────────────
  const completionPct = useMemo(
    () => computeCompletionFromQuestions(questions),
    [questions]
  );
  const tierColor = useMemo(() => getTierColor(completionPct), [completionPct]);
  const prevCompletionRef = useRef(completionPct);

  // Persist active question index on each change (placed after completionPct declaration)
  useEffect(() => {
    try {
      const storageKey = `studio-resume-${documentId}`;
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          questionIndex: activeQuestionIndex,
          completedPct: completionPct,
          timestamp: Date.now(),
        })
      );
    } catch {
      // localStorage unavailable — ignore
    }
  }, [documentId, activeQuestionIndex, completionPct]);

  // Question statuses and labels for the dot scrubber
  const questionStatuses = useMemo(
    () => questions.map((q) => q.status),
    [questions]
  );

  const questionLabels = useMemo(
    () => questions.map((q) => q.questionText),
    [questions]
  );

  // Active question
  const activeQuestion = questions[activeQuestionIndex] || questions[0];

  // Olivia context — connect to the global OliviaProvider
  const { isSpeaking, messages, setDocumentContext } = useOlivia();

  // Track latest Olivia reply for avatar lip sync
  const lastReply = useMemo(() => {
    const assistantMsgs = messages.filter((m) => m.role === "assistant" && !m.isLoading);
    return assistantMsgs.length > 0 ? assistantMsgs[assistantMsgs.length - 1].content : undefined;
  }, [messages]);

  // ── Navigation handlers ───────────────────────────────────────────

  const navigateTo = useCallback(
    (index: number, direction: "next" | "prev") => {
      if (index < 0 || index >= totalQuestions || index === activeQuestionIndex) return;

      setTransitionDirection(direction);
      setIsTransitioning(true);

      // After fade-out, switch question and fade-in
      setTimeout(() => {
        setActiveQuestionIndex(index);
        setIsTransitioning(false);
      }, 100);
    },
    [totalQuestions, activeQuestionIndex]
  );

  const handlePrev = useCallback(() => {
    navigateTo(activeQuestionIndex - 1, "prev");
  }, [activeQuestionIndex, navigateTo]);

  const handleNext = useCallback(() => {
    navigateTo(activeQuestionIndex + 1, "next");
  }, [activeQuestionIndex, navigateTo]);

  const handleJumpTo = useCallback(
    (index: number) => {
      const direction = index > activeQuestionIndex ? "next" : "prev";
      navigateTo(index, direction);
    },
    [activeQuestionIndex, navigateTo]
  );

  const handleSkip = useCallback(() => {
    // Check if this is a high-impact question — show skip nudge
    if (activeQuestion && activeQuestion.impactScore >= 70 && activeQuestion.status === "empty") {
      setSkipNudgeQuestion({
        questionText: activeQuestion.questionText,
        impactScore: activeQuestion.impactScore,
      });
      setShowSkipNudge(true);
      return;
    }

    // Reset streak on skip
    setSessionMetrics((prev) => ({
      ...prev,
      currentStreak: 0,
      skippedThisSession: prev.skippedThisSession + 1,
    }));
    handleNext();
  }, [handleNext, activeQuestion]);

  // Skip nudge handlers
  const handleSkipNudgeGoBack = useCallback(() => {
    setShowSkipNudge(false);
    setSkipNudgeQuestion(null);
  }, []);

  const handleSkipNudgeSkipAnyway = useCallback(() => {
    setShowSkipNudge(false);
    setSkipNudgeQuestion(null);
    setSessionMetrics((prev) => ({
      ...prev,
      currentStreak: 0,
      skippedThisSession: prev.skippedThisSession + 1,
    }));
    handleNext();
  }, [handleNext]);

  const handleSkipNudgeResearch = useCallback(() => {
    setShowSkipNudge(false);
    setSkipNudgeQuestion(null);
    setShowResearch(true);
  }, []);

  // ── Submit flow handlers ──────────────────────────────────────────
  // Submit → PreSubmitCheck → (optional fix) → CristianoReEvaluation

  const handleSubmitClick = useCallback(() => {
    setShowPreSubmitCheck(true);
  }, []);

  const handlePreSubmitProceed = useCallback(() => {
    setShowPreSubmitCheck(false);
    setShowCristianoReEval(true);
  }, []);

  const handlePreSubmitClose = useCallback(() => {
    setShowPreSubmitCheck(false);
  }, []);

  const handleReEvalClose = useCallback(() => {
    setShowCristianoReEval(false);
  }, []);

  const handleReEvalBackToStudio = useCallback(() => {
    setShowCristianoReEval(false);
  }, []);

  // ── Auto-save logic (1.5s debounce) ───────────────────────────────

  const performSave = useCallback(async () => {
    const blocksToSave = pendingBlocksRef.current;
    if (!blocksToSave) return;

    setIsSaving(true);
    try {
      await onSave(blocksToSave);
      pendingBlocksRef.current = null;

      // Gold border pulse
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 300);
    } catch (err) {
      console.error("[Studio] Auto-save failed:", err);
    } finally {
      setIsSaving(false);
    }
  }, [onSave]);

  const debouncedSave = useCallback(
    (updatedBlocks: WorkspaceBlock[]) => {
      pendingBlocksRef.current = updatedBlocks;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        performSave();
      }, DEFAULT_STUDIO_CONFIG.autoSaveDelayMs);
    },
    [performSave]
  );

  // Cleanup save timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // ── Answer handler ────────────────────────────────────────────────
  // Writes the answer into the block, recomputes status, triggers auto-save

  const handleAnswer = useCallback(
    (questionIndex: number, value: FieldValue) => {
      const question = questions[questionIndex];
      if (!question) return;

      // Track if this transitions from non-complete to complete
      const wasComplete = question.status === "complete";

      // Apply answer to blocks (immutable update)
      const updatedBlocks = applyAnswerToBlocks(localBlocks, question, value);

      // Update local state immediately for responsive UI
      setLocalBlocks(updatedBlocks);

      // Schedule debounced save
      debouncedSave(updatedBlocks);

      // Update session metrics if a question just became complete
      const hasValue = typeof value === "string" ? value.trim().length > 0 : Boolean(value);
      if (!wasComplete && hasValue) {
        setSessionMetrics((prev) => {
          const newStreak = prev.currentStreak + 1;
          return {
            ...prev,
            currentStreak: newStreak,
            bestStreak: Math.max(prev.bestStreak, newStreak),
            completedThisSession: prev.completedThisSession + 1,
          };
        });
      }
    },
    [questions, localBlocks, debouncedSave]
  );

  // Trigger completion ceremony when document reaches 100%
  useEffect(() => {
    if (completionPct >= 100 && prevCompletionRef.current < 100) {
      setShowCompletionCeremony(true);
    }
    prevCompletionRef.current = completionPct;
  }, [completionPct]);

  // ── Editor selection handler ─────────────────────────────────────

  const handleSelectionChange = useCallback(
    (selection: EditorSelection | null) => {
      setEditorSelection(selection);
    },
    []
  );

  // ── Slash command handler (insert/AI commands from editor) ──────────

  const handleSlashCommand = useCallback(
    (command: string, context: SlashCommandContext) => {
      switch (command) {
        case "ask-olivia": {
          // Scroll to Olivia chat and focus its input
          const chatInput = document.querySelector(
            "[data-studio-olivia-input]"
          ) as HTMLInputElement | null;
          if (chatInput) {
            chatInput.scrollIntoView({ behavior: "smooth", block: "center" });
            chatInput.focus();
          }
          break;
        }
        case "pull-from-dna": {
          // Find relevant DNA content for the current question and insert it
          const q = activeQuestion;
          if (q && dnaParagraphs) {
            const relevantKey = Object.keys(dnaParagraphs).find(
              (k) =>
                k.toLowerCase().includes(q.blockType.toLowerCase()) ||
                k.toLowerCase().includes((q.field.key || "").toLowerCase())
            );
            const dnaContent = relevantKey
              ? dnaParagraphs[relevantKey]
              : Object.values(dnaParagraphs)[0];
            if (dnaContent) {
              const result = insertTextAtPosition(
                context.fullText,
                context.cursorPosition,
                dnaContent
              );
              handleAnswer(q.questionIndex, result.newValue);
            }
          }
          break;
        }
        case "pitch-polish": {
          const textToPolish = context.selectedText || context.fullText;
          if (textToPolish) {
            setPitchPolishText(textToPolish);
            setShowPitchPolish(true);
          }
          break;
        }
        case "insert-metric": {
          // Token dropdown is in the toolbar; no-op at slash level
          break;
        }
      }
    },
    [activeQuestion, dnaParagraphs, handleAnswer]
  );

  // ── Toolbar format handler ─────────────────────────────────────────

  const handleToolbarFormat = useCallback(
    (format: "bold" | "italic" | "underline" | "list") => {
      if (!activeQuestion) return;
      const currentVal =
        typeof activeQuestion.currentValue === "string"
          ? activeQuestion.currentValue
          : "";
      const result = applyInlineFormat(currentVal, editorSelection, format);
      handleAnswer(activeQuestion.questionIndex, result.newValue);
    },
    [activeQuestion, editorSelection, handleAnswer]
  );

  // ── Toolbar insert token handler ───────────────────────────────────

  const handleInsertToken = useCallback(
    (tokenValue: string) => {
      if (!activeQuestion) return;
      const currentVal =
        typeof activeQuestion.currentValue === "string"
          ? activeQuestion.currentValue
          : "";
      const pos = editorSelection?.end ?? currentVal.length;
      const result = insertTextAtPosition(currentVal, pos, tokenValue);
      handleAnswer(activeQuestion.questionIndex, result.newValue);
    },
    [activeQuestion, editorSelection, handleAnswer]
  );

  // ── Pitch Polish handlers ──────────────────────────────────────────

  const handlePitchPolish = useCallback(() => {
    if (editorSelection?.text) {
      setPitchPolishText(editorSelection.text);
      setShowPitchPolish(true);
    }
  }, [editorSelection]);

  const handlePitchPolishAccept = useCallback(
    (rewrittenText: string) => {
      if (!activeQuestion) return;
      const currentVal =
        typeof activeQuestion.currentValue === "string"
          ? activeQuestion.currentValue
          : "";

      if (editorSelection && editorSelection.text) {
        // Replace the selected text with the rewritten text
        const newVal =
          currentVal.substring(0, editorSelection.start) +
          rewrittenText +
          currentVal.substring(editorSelection.end);
        handleAnswer(activeQuestion.questionIndex, newVal);
      } else {
        // Replace entire value
        handleAnswer(activeQuestion.questionIndex, rewrittenText);
      }

      setShowPitchPolish(false);
      setPitchPolishText("");
    },
    [activeQuestion, editorSelection, handleAnswer]
  );

  // ── Suggestion accept/reject handlers (Bayesian prior update) ──────

  const handleSuggestionAccept = useCallback(
    (suggestion: Suggestion, _index: number) => {
      if (!activeQuestion) return;
      // Insert the accepted suggestion value as the answer
      handleAnswer(activeQuestion.questionIndex, suggestion.value);
    },
    [activeQuestion, handleAnswer]
  );

  const handleSuggestionReject = useCallback(
    (_suggestion: Suggestion, _index: number) => {
      // Rejecting a suggestion decreases its prior weight.
      // Currently visual-only: the SuggestionChip dims to 0.3 opacity.
      // When real priors arrive from agents, this handler will call an
      // API to persist the weight adjustment so future suggestions
      // reflect the rejection.
    },
    []
  );

  // ── Deep Research handlers ──────────────────────────────────────────

  const handleOpenResearch = useCallback(() => {
    setShowResearch(true);
  }, []);

  const handleCloseResearch = useCallback(() => {
    setShowResearch(false);
  }, []);

  const handleResearchComplete = useCallback(
    (result: ResearchResult) => {
      setResearchHistory((prev) => [result, ...prev]);
    },
    []
  );

  const handleInsertCitation = useCallback(
    (citation: ResearchCitation) => {
      if (!activeQuestion) return;

      const currentVal =
        typeof activeQuestion.currentValue === "string"
          ? activeQuestion.currentValue
          : "";

      // Append citation text with source attribution
      const citationText = `${citation.text} [${citation.source}]`;
      const newVal = currentVal
        ? `${currentVal}\n\n${citationText}`
        : citationText;

      handleAnswer(activeQuestion.questionIndex, newVal);
    },
    [activeQuestion, handleAnswer]
  );

  // ── Entity adaptation handlers ──────────────────────────────────────

  const handleEntityChipClick = useCallback(() => {
    // For now, cycle through entity types as a simple mode picker.
    // A full modal picker will be added in a future conversation.
    const types: (EntityType | null)[] = ["vc", "accelerator", "acquirer", "angel", "corporate", null];
    const currentIdx = types.indexOf(entityTarget?.entityType ?? null);
    const nextIdx = (currentIdx + 1) % types.length;
    const nextType = types[nextIdx];

    if (nextType === null) {
      setEntityTarget(null);
    } else {
      setEntityTarget({
        name: entityTarget?.name ?? "Target Entity",
        entityType: nextType,
        matchScore: entityTarget?.matchScore ?? null,
        logoUrl: entityTarget?.logoUrl,
      });
    }
  }, [entityTarget]);

  const handleOpenPerspective = useCallback(() => {
    setShowEntityPerspective(true);
  }, []);

  const handleClosePerspective = useCallback(() => {
    setShowEntityPerspective(false);
  }, []);

  // Build a summary of current answers for the perspective modal
  const documentSummary = useMemo(() => {
    return questions
      .filter((q) => q.status === "complete" && typeof q.currentValue === "string")
      .map((q) => `${q.questionText}: ${q.currentValue}`)
      .slice(0, 10)
      .join("\n");
  }, [questions]);

  // ── Voice commands hook ──────────────────────────────────────────────

  const [isDictating, setIsDictating] = useState(false);

  const handleReadback = useCallback(() => {
    // TTS readback is handled by StudioTTSPlayer inside StudioQuestionCard.
    // This callback is a no-op placeholder for the voice commands hook;
    // the user triggers readback via the player controls in the card.
  }, []);

  const handleAskOlivia = useCallback(
    (query: string) => {
      // Programmatically send a message to Olivia chat
      const chatInput = document.querySelector(
        "[data-studio-olivia-input]"
      ) as HTMLInputElement | null;
      if (chatInput) {
        // Set value and dispatch input event so React picks it up
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        )?.set;
        nativeInputValueSetter?.call(chatInput, query);
        chatInput.dispatchEvent(new Event("input", { bubbles: true }));
        chatInput.scrollIntoView({ behavior: "smooth", block: "center" });
        chatInput.focus();
      }
    },
    []
  );

  const { parseCommand } = useVoiceCommands({
    onNext: handleNext,
    onPrev: handlePrev,
    onSkip: handleSkip,
    onJumpTo: handleJumpTo,
    onResearch: handleOpenResearch,
    onReadback: handleReadback,
    onPitchPolish: handlePitchPolish,
    onAskOlivia: handleAskOlivia,
    totalQuestions,
  });

  // ── Voice transcript handler ──────────────────────────────────────

  const handleVoiceTranscript = useCallback(
    (result: VoiceTranscriptResult) => {
      // First, check if the transcript is a voice command
      const command = parseCommand(result.text);
      if (command) {
        // Command was recognized and executed — do not insert as text
        return;
      }

      // Not a command — append/replace the answer with the dictated text
      if (!activeQuestion) return;

      const currentVal =
        typeof activeQuestion.currentValue === "string"
          ? activeQuestion.currentValue
          : "";

      // Append dictated text (with a space separator if there's existing content)
      const newVal = currentVal
        ? `${currentVal} ${result.text}`
        : result.text;

      handleAnswer(activeQuestion.questionIndex, newVal);
    },
    [parseCommand, activeQuestion, handleAnswer]
  );

  const handleDictationStateChange = useCallback(
    (isRecording: boolean) => {
      setIsDictating(isRecording);
    },
    []
  );

  // ── Blended confidence for WhyThisPanel ────────────────────────────

  const blendedConfidence = useMemo(() => {
    if (!activeQuestion) return 0;
    const sug = activeQuestion.suggestions;
    const pri = activeQuestion.priors;
    if (sug.length === 0 && pri.length === 0) return 0;

    let totalWeight = 0;
    let totalScore = 0;

    for (const s of sug) {
      totalWeight += 1;
      totalScore += s.confidence;
    }
    for (const p of pri) {
      totalWeight += 1;
      totalScore += p.weight;
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }, [activeQuestion]);

  // ── Smart-jump suggestion ────────────────────────────────────────────
  // Finds the highest-impact unanswered question (not the current one)
  // and offers a "jump to it" prompt after the user completes a question.

  const [smartJumpDismissed, setSmartJumpDismissed] = useState(false);

  const smartJumpTarget = useMemo(() => {
    // Only suggest after at least 3 questions answered and not dismissed
    const answeredCount = questions.filter((q) => q.status === "complete").length;
    if (answeredCount < 3 || smartJumpDismissed) return null;

    // Find unanswered questions with high impact, excluding current
    const candidates = questions.filter(
      (q) =>
        q.status === "empty" &&
        q.impactScore >= 70 &&
        q.questionIndex !== activeQuestionIndex
    );

    if (candidates.length === 0) return null;

    // Return the highest-impact one
    return candidates.reduce((best, q) =>
      q.impactScore > best.impactScore ? q : best
    );
  }, [questions, activeQuestionIndex, smartJumpDismissed]);

  const handleSmartJump = useCallback(() => {
    if (smartJumpTarget) {
      handleJumpTo(smartJumpTarget.questionIndex);
      setSmartJumpDismissed(true);
    }
  }, [smartJumpTarget, handleJumpTo]);

  const handleSmartJumpDismiss = useCallback(() => {
    setSmartJumpDismissed(true);
  }, []);

  // Reset dismiss when active question changes
  useEffect(() => {
    setSmartJumpDismissed(false);
  }, [activeQuestionIndex]);

  // ── Inject document context into OliviaProvider ───────────────────

  useEffect(() => {
    setDocumentContext({
      documentId,
      documentTitle: title,
      documentType,
      currentQuestion: activeQuestion?.questionText || "",
      currentBlockIndex: activeQuestion?.blockIndex ?? 0,
      totalBlocks: totalQuestions,
      blockType: activeQuestion?.blockType,
      existingAnswer:
        typeof activeQuestion?.currentValue === "string"
          ? activeQuestion.currentValue
          : activeQuestion?.currentValue
            ? JSON.stringify(activeQuestion.currentValue)
            : undefined,
      dnaParagraphs,
      dnaMap,
      collectionSlug,
    });

    return () => setDocumentContext(null);
  }, [documentId, title, documentType, activeQuestion, totalQuestions, setDocumentContext, dnaParagraphs, dnaMap, collectionSlug]);

  // ── User typing detection for spotlight dimming ────────────────────

  useEffect(() => {
    let typingTimeout: ReturnType<typeof setTimeout>;

    function handleTypingStart() {
      setIsUserTyping(true);
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => setIsUserTyping(false), 2000);
    }

    document.addEventListener("input", handleTypingStart);
    return () => {
      document.removeEventListener("input", handleTypingStart);
      clearTimeout(typingTimeout);
    };
  }, []);

  // ── Stage-and-spotlight dimming styles ─────────────────────────────

  const oliviaDimStyle: React.CSSProperties = {
    opacity: isUserTyping ? 0.4 : 1,
    transition: "opacity 400ms ease",
  };

  const questionDimStyle: React.CSSProperties = {
    opacity: isSpeaking ? 0.6 : 1,
    transition: "opacity 400ms ease",
  };

  // ── Story Review state ──────────────────────────────────────────────

  const [showStoryReview, setShowStoryReview] = useState(false);

  const handleOpenStoryReview = useCallback(() => {
    setShowStoryReview(true);
  }, []);

  const handleCloseStoryReview = useCallback(() => {
    setShowStoryReview(false);
  }, []);

  // ── Answer previews + block types for bottom bar film strip ────────

  const answerPreviews = useMemo(
    () =>
      questions.map((q) => {
        if (!q.currentValue) return "No answer yet";
        if (typeof q.currentValue === "string") {
          const trimmed = q.currentValue.trim();
          if (!trimmed) return "No answer yet";
          return trimmed.length > 60 ? trimmed.slice(0, 60) + "..." : trimmed;
        }
        if (Array.isArray(q.currentValue)) {
          const items = q.currentValue.filter((v) => typeof v === "string" && v.trim());
          return items.length > 0 ? items.slice(0, 2).join(", ") + (items.length > 2 ? "..." : "") : "No answer yet";
        }
        return "No answer yet";
      }),
    [questions]
  );

  const questionBlockTypes = useMemo(
    () => questions.map((q) => q.blockType),
    [questions]
  );

  // ── Focus Olivia chat handler (for Cmd+K shortcut) ────────────────

  const handleFocusOlivia = useCallback(() => {
    const chatInput = document.querySelector(
      "[data-studio-olivia-input]"
    ) as HTMLInputElement | null;
    if (chatInput) {
      chatInput.scrollIntoView({ behavior: "smooth", block: "center" });
      chatInput.focus();
    }
  }, []);

  // ── Escape handler — close any open modal/panel ────────────────────

  const handleEscape = useCallback(() => {
    if (showStoryReview) { setShowStoryReview(false); return; }
    if (showResearch) { setShowResearch(false); return; }
    if (showPitchPolish) { setShowPitchPolish(false); setPitchPolishText(""); return; }
    if (showEntityPerspective) { setShowEntityPerspective(false); return; }
    if (showSkipNudge) { setShowSkipNudge(false); return; }
    if (showPreSubmitCheck) { setShowPreSubmitCheck(false); return; }
    if (showCristianoReEval) { setShowCristianoReEval(false); return; }
    if (showCompletionCeremony) { setShowCompletionCeremony(false); return; }
  }, [showStoryReview, showResearch, showPitchPolish, showEntityPerspective, showSkipNudge, showPreSubmitCheck, showCristianoReEval, showCompletionCeremony]);

  // ── Keyboard shortcuts (centralized hook) ─────────────────────────

  const isComplete = completionPct >= 100;

  useStudioKeyboardShortcuts({
    onNext: handleNext,
    onPrev: handlePrev,
    onSubmit: handleSubmitClick,
    onResearch: handleOpenResearch,
    onAskOlivia: handleFocusOlivia,
    onEscape: handleEscape,
    isComplete,
  });

  // ── Transition styles ─────────────────────────────────────────────

  const cardTransitionStyle: React.CSSProperties = {
    opacity: isTransitioning ? 0 : 1,
    transform: isTransitioning
      ? transitionDirection === "next"
        ? "translateY(12px)"
        : "translateY(-12px)"
      : "translateY(0)",
    transition: "opacity 200ms ease-out, transform 200ms ease-out",
  };

  // Gold border pulse on auto-save
  const cardBorderStyle = justSaved
    ? "1px solid rgba(196, 169, 106, 0.4)"
    : "1px solid rgba(255, 255, 255, 0.06)";

  const cardShadowStyle = justSaved
    ? "0 8px 32px rgba(0, 0, 0, 0.3), 0 0 16px rgba(196, 169, 106, 0.15)"
    : "0 8px 32px rgba(0, 0, 0, 0.3)";

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#0a0e1a" }}>
      {/* ── Top Bar ──────────────────────────────────────────────────── */}
      <StudioTopBar
        title={title}
        documentType={documentType}
        collectionName={collectionName}
        collectionDocCount={collectionDocCount}
        completionPct={completionPct}
        tierColor={tierColor}
        onBack={onBack}
        entityTarget={entityTarget}
        onEntityClick={handleEntityChipClick}
      />

      {/* ── Answer Ribbon (left rail) ──────────────────────────────── */}
      <AnswerRibbon
        questions={questions}
        activeIndex={activeQuestionIndex}
        onJumpTo={handleJumpTo}
      />

      {/* ── Session Resume Banner ──────────────────────────────────── */}
      {showResumeBanner && resumeInfo && (
        <div
          className="w-full flex items-center justify-center px-4 py-2.5"
          style={{
            background: "rgba(196, 169, 106, 0.06)",
            borderBottom: "1px solid rgba(196, 169, 106, 0.08)",
          }}
        >
          <div className="flex items-center gap-3 max-w-4xl w-full">
            {/* Olivia avatar indicator */}
            <div
              className="rounded-full shrink-0 flex items-center justify-center"
              style={{
                width: "24px",
                height: "24px",
                background: "rgba(196, 169, 106, 0.12)",
                border: "1px solid rgba(196, 169, 106, 0.2)",
              }}
            >
              <span style={{ fontSize: "10px", color: "#C4A96A" }}>O</span>
            </div>
            <span style={{ fontSize: "13px", color: "#C4A96A", flex: 1 }}>
              Welcome back! Resuming at Q{resumeInfo.questionIndex + 1} ({resumeInfo.completedPct}% complete).
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleResumeRestart}
                className="rounded-lg px-2.5 py-1 text-xs transition-all cursor-pointer"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "#9AA7B2",
                }}
              >
                Start over
              </button>
              <button
                onClick={handleDismissResume}
                className="rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer"
                style={{
                  background: "rgba(196, 169, 106, 0.1)",
                  border: "1px solid rgba(196, 169, 106, 0.15)",
                  color: "#C4A96A",
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Center Stage ─────────────────────────────────────────────── */}
      <main
        className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6 sm:py-8 overflow-y-auto"
        style={{
          minHeight: "calc(100vh - 120px)",
        }}
      >
        {/* ── Olivia Avatar + Chat Section (dims when user is typing) ── */}
        <div className="mb-6 flex flex-col items-center gap-3" style={oliviaDimStyle}>
          {/* Responsive circular HeyGen avatar — 120px mobile, 240px desktop */}
          <StudioOliviaAvatar
            lastReply={lastReply}
            isSpeaking={isSpeaking}
            size="responsive"
          />

          {/* Compact chat — last 3 messages + input */}
          <StudioOliviaChat
            documentId={documentId}
            documentTitle={title}
            documentType={documentType}
            currentQuestion={activeQuestion?.questionText || ""}
            currentBlockIndex={activeQuestion?.blockIndex ?? 0}
            totalBlocks={totalQuestions}
          />
        </div>

        {/* Center stage card — glassmorphic, max-w-4xl (dims when Olivia speaks) */}
        <div
          className="w-full max-w-4xl rounded-2xl p-6 sm:p-8 relative"
          style={{
            ...cardTransitionStyle,
            ...questionDimStyle,
            background: "rgba(15, 18, 25, 0.8)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: cardBorderStyle,
            boxShadow: cardShadowStyle,
            transition: "opacity 200ms ease-out, transform 200ms ease-out, border 300ms ease, box-shadow 300ms ease",
          }}
        >
          {/* Micro-reward particles (absolutely positioned inside card) */}
          <MicroReward
            completedCount={completedCount}
            visible={!isTransitioning}
          />

          {activeQuestion ? (
            <StudioQuestionCard
              question={activeQuestion}
              totalQuestions={totalQuestions}
              onAnswer={handleAnswer}
              onSkip={handleSkip}
              onNext={handleNext}
              isLast={activeQuestionIndex >= totalQuestions - 1}
              isSaving={isSaving}
              onSelectionChange={handleSelectionChange}
              onSlashCommand={handleSlashCommand}
              onVoiceTranscript={handleVoiceTranscript}
              onDictationStateChange={handleDictationStateChange}
              showTTSPlayer
              onResearch={handleOpenResearch}
            />
          ) : (
            <div className="text-center py-8">
              <p style={{ fontSize: "14px", color: "#9AA7B2" }}>
                No editable questions found in this document.
              </p>
            </div>
          )}
        </div>

        {/* Suggestion Chips (Bayesian) */}
        {activeQuestion && activeQuestion.suggestions.length > 0 && (
          <div className="w-full max-w-4xl mt-3">
            <SuggestionChips
              suggestions={activeQuestion.suggestions}
              onAccept={handleSuggestionAccept}
              onReject={handleSuggestionReject}
              dnaParagraphs={dnaParagraphs}
            />
          </div>
        )}

        {/* Smart-jump suggestion banner */}
        {smartJumpTarget && (
          <div
            className="w-full max-w-4xl mt-3 flex items-center justify-between rounded-xl px-4 py-2.5"
            style={{
              background: "rgba(196, 169, 106, 0.06)",
              border: "1px solid rgba(196, 169, 106, 0.1)",
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#C4A96A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="8 12 12 16 16 12" />
                <line x1="12" y1="8" x2="12" y2="16" />
              </svg>
              <span
                className="truncate"
                style={{ fontSize: "12px", color: "#C4A96A" }}
              >
                High-impact unanswered: Q{smartJumpTarget.questionIndex + 1} &mdash;{" "}
                {smartJumpTarget.questionText.length > 50
                  ? smartJumpTarget.questionText.slice(0, 50) + "..."
                  : smartJumpTarget.questionText}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <button
                onClick={handleSmartJump}
                className="rounded-lg px-3 py-1 text-xs font-medium transition-all cursor-pointer"
                style={{
                  background: "rgba(196, 169, 106, 0.12)",
                  border: "1px solid rgba(196, 169, 106, 0.2)",
                  color: "#C4A96A",
                }}
              >
                Jump
              </button>
              <button
                onClick={handleSmartJumpDismiss}
                className="rounded-lg px-2 py-1 text-xs transition-all cursor-pointer"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255, 255, 255, 0.2)",
                }}
                aria-label="Dismiss suggestion"
              >
                &times;
              </button>
            </div>
          </div>
        )}

        {/* "Why this?" Evidence Chain */}
        {activeQuestion && (
          <div className="w-full max-w-4xl mt-2">
            <WhyThisPanel
              questionText={activeQuestion.questionText}
              priors={activeQuestion.priors}
              dnaParagraphs={dnaParagraphs}
              blendedConfidence={blendedConfidence}
            />
          </div>
        )}

        {/* Formatting Toolbar */}
        <div className="w-full max-w-4xl mt-3">
          <StudioFormattingToolbar
            onFormat={handleToolbarFormat}
            onInsertToken={handleInsertToken}
            onPitchPolish={handlePitchPolish}
            hasSelection={Boolean(editorSelection?.text)}
            dnaParagraphs={dnaParagraphs}
          />
        </div>

        {/* Entity Brief Card (shown when entity target is active) */}
        {entityTarget && entityBrief && (
          <div className="w-full max-w-4xl mt-3">
            <EntityBriefCard
              entityName={entityTarget.name}
              entityType={entityTarget.entityType}
              matchScore={entityTarget.matchScore}
              rationale={entityBrief.rationale}
              strength={entityBrief.strength}
              concern={entityBrief.concern}
              logoUrl={entityTarget.logoUrl}
              onPerspectiveClick={handleOpenPerspective}
            />
          </div>
        )}

        {/* Research History */}
        {researchHistory.length > 0 && (
          <div className="w-full max-w-4xl mt-3">
            <ResearchHistory
              results={researchHistory}
              onInsertCitation={handleInsertCitation}
            />
          </div>
        )}
      </main>

      {/* ── Bottom Bar ───────────────────────────────────────────────── */}
      <StudioBottomBar
        totalBlocks={totalQuestions}
        activeBlockIndex={activeQuestionIndex}
        blockStatuses={questionStatuses}
        completionPct={completionPct}
        tierColor={tierColor}
        onPrev={handlePrev}
        onNext={handleNext}
        onJumpTo={handleJumpTo}
        questionLabels={questionLabels}
        answerPreviews={answerPreviews}
        blockTypes={questionBlockTypes}
        currentStreak={sessionMetrics.currentStreak}
        sessionElapsedSeconds={sessionMetrics.totalElapsedSeconds}
        onSubmit={handleSubmitClick}
        onStoryReview={handleOpenStoryReview}
      />

      {/* ── Pitch Polish Modal ─────────────────────────────────────── */}
      <PitchPolishModal
        isOpen={showPitchPolish}
        selectedText={pitchPolishText}
        documentType={documentType}
        onAccept={handlePitchPolishAccept}
        onClose={() => {
          setShowPitchPolish(false);
          setPitchPolishText("");
        }}
      />

      {/* ── Deep Research Panel ─────────────────────────────────────── */}
      <DeepResearchPanel
        isOpen={showResearch}
        onClose={handleCloseResearch}
        questionText={activeQuestion?.questionText || ""}
        documentType={documentType}
        onInsertCitation={handleInsertCitation}
        onResearchComplete={handleResearchComplete}
      />

      {/* ── Entity Perspective Modal ──────────────────────────────── */}
      {entityTarget && (
        <EntityPerspectiveModal
          isOpen={showEntityPerspective}
          onClose={handleClosePerspective}
          entityName={entityTarget.name}
          entityType={entityTarget.entityType}
          matchScore={entityTarget.matchScore}
          documentSummary={documentSummary}
          documentType={documentType}
        />
      )}

      {/* ── Skip Nudge Modal ────────────────────────────────────── */}
      <SkipNudgeModal
        isOpen={showSkipNudge}
        questionText={skipNudgeQuestion?.questionText || ""}
        impactScore={skipNudgeQuestion?.impactScore || 0}
        onGoBack={handleSkipNudgeGoBack}
        onSkipAnyway={handleSkipNudgeSkipAnyway}
        onResearch={handleSkipNudgeResearch}
      />

      {/* ── Completion Ceremony ─────────────────────────────────── */}
      <CompletionCeremony
        isOpen={showCompletionCeremony}
        documentTitle={title}
        completionPct={completionPct}
        tierColor={tierColor}
        totalQuestions={totalQuestions}
        sessionSeconds={sessionMetrics.totalElapsedSeconds}
        onReviewAnswers={() => {
          setShowCompletionCeremony(false);
          handleJumpTo(0);
        }}
        onNextDocument={() => {
          setShowCompletionCeremony(false);
          setShowDocTransition(true);
        }}
        onClose={() => setShowCompletionCeremony(false)}
      />

      {/* ── Pre-Submit Check ──────────────────────────────────── */}
      <PreSubmitCheck
        isOpen={showPreSubmitCheck}
        questions={questions.map((q) => ({
          questionIndex: q.questionIndex,
          questionText: q.questionText,
          impactScore: q.impactScore,
          status: q.status,
          blockType: q.blockType,
        }))}
        onJumpTo={handleJumpTo}
        onProceed={handlePreSubmitProceed}
        onClose={handlePreSubmitClose}
      />

      {/* ── Cristiano Re-evaluation ───────────────────────────── */}
      <CristianoReEvaluation
        isOpen={showCristianoReEval}
        documentTitle={title}
        documentType={documentType}
        onClose={handleReEvalClose}
        onBackToStudio={handleReEvalBackToStudio}
      />

      {/* ── Document Transition ─────────────────────────────────── */}
      <DocumentTransition
        isOpen={showDocTransition}
        completedDocTitle={title}
        completedDocPct={completionPct}
        completedTierColor={tierColor}
        nextDocTitle="Next Document"
        nextDocQuestionCount={0}
        currentDocIndex={1}
        totalDocsInPackage={collectionDocCount}
        onContinue={() => {
          setShowDocTransition(false);
          // Navigation to next doc will be wired in Conversation 10
        }}
        onTakeBreak={() => {
          setShowDocTransition(false);
          onBack();
        }}
      />

      {/* ── Story Review ("Story So Far" narrative) ──────────────── */}
      <StoryReview
        isOpen={showStoryReview}
        onClose={handleCloseStoryReview}
        questions={questions}
        documentTitle={title}
        completionPct={completionPct}
        onJumpTo={handleJumpTo}
      />
    </div>
  );
}
