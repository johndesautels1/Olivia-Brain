'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { BuyerType, ValuationBand, AcquisitionMirrorResult } from '@/lib/valuation/types';
import type { ChallengeResponse } from '@/components/valuation/NegotiationAnchorCard';
import type { DocumentExhibit } from '@/components/valuation/WarRoomDocumentBridge';
import WarRoomBriefing from '@/components/valuation/WarRoomBriefing';
import WarRoomSession from '@/components/valuation/WarRoomSession';
import type { ChatMessage } from '@/components/valuation/DealRoomSimulator';
import {
  RUBRIC_INITIAL,
  computeRubricFromMessages,
  computeDefensibility,
} from './war-room-utils';
import type { RubricScore, EvidenceDoc, ConcessionStep } from './war-room-utils';

// ── Props ────────────────────────────────────────────────────────────

export interface WarRoomProps {
  companyName: string;
  buyerType: BuyerType;
  enterpriseValue: ValuationBand;
  valuationRunId: string | null;
  /** Optional — when present, the briefing mounts the Deal Protection panel for this subject (P6). */
  valuationSubjectId?: string;
  acquisitionMirror: AcquisitionMirrorResult | null;
  negotiationAnchors: {
    walkAway: number;
    walkAwayRationale: string;
    target: number;
    targetRationale: string;
    anchor: number;
    anchorRationale: string;
    challengeResponses: ChallengeResponse[];
  };
  evidenceChain: EvidenceDoc[];
  onExit: () => void;
}

// ── Component ───────────────────────────────────────────────────────

export default function WarRoom({
  companyName,
  buyerType,
  enterpriseValue,
  valuationRunId,
  valuationSubjectId,
  acquisitionMirror,
  negotiationAnchors,
  evidenceChain,
  onExit,
}: WarRoomProps) {
  // ── Pre-session vs In-session mode ──
  const [sessionActive, setSessionActive] = useState(false);
  const [expandedChallenge, setExpandedChallenge] = useState<number | null>(null);

  // ── Active exhibit state (document bridge) ──
  const [activeExhibit, setActiveExhibit] = useState<DocumentExhibit | null>(null);

  // ── Transcript viewer ──
  const [showTranscript, setShowTranscript] = useState(false);

  // ── Rubric scoring state ──
  const [rubric, setRubric] = useState<RubricScore[]>(RUBRIC_INITIAL);
  const [dealRoomMessages, setDealRoomMessages] = useState<ChatMessage[]>([]);

  // ── Session persistence ──
  const [sessionId, setSessionId] = useState<string | null>(null);
  const lastSavedMsgCount = useRef(0);

  // Create session when entering war room (only if no session exists yet)
  useEffect(() => {
    if (!sessionActive) return;
    if (sessionId) return; // G-01 fix: don't create duplicate sessions on Briefing round-trip
    lastSavedMsgCount.current = 0;
    void (async () => {
      try {
        const res = await fetch('/api/valuation/deal-room/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            companyName,
            buyerType,
            valuationRunId,
            negotiationAnchors,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { ok: boolean; sessionId: string };
          setSessionId(data.sessionId);
        }
      } catch {
        // Session persistence is best-effort
      }
    })();
  }, [sessionActive, sessionId, companyName, buyerType, valuationRunId]);

  // Auto-save new messages — batch, retry on failure (G-05 best-practice)
  const isSavingRef = useRef(false);
  useEffect(() => {
    if (!sessionId || dealRoomMessages.length === 0) return;
    if (dealRoomMessages.length <= lastSavedMsgCount.current) return;
    if (isSavingRef.current) return; // prevent concurrent saves

    const unsaved = dealRoomMessages
      .slice(lastSavedMsgCount.current)
      .filter(m => m.content.trim().length > 0)
      .map(m => ({ role: m.role, content: m.content.trim() }));

    if (unsaved.length === 0) {
      lastSavedMsgCount.current = dealRoomMessages.length;
      return;
    }

    isSavingRef.current = true;
    void (async () => {
      try {
        const res = await fetch('/api/valuation/deal-room/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add_messages',
            sessionId,
            messages: unsaved,
          }),
        });
        if (res.ok) {
          lastSavedMsgCount.current = dealRoomMessages.length;
        }
        // On failure: counter NOT advanced — retries on next effect cycle
      } catch {
        // Network error — counter stays, retry on next message change
      } finally {
        isSavingRef.current = false;
      }
    })();
  }, [sessionId, dealRoomMessages]);

  // ── Live timer ──
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number>(0);

  // G-03 fix: only set startTime when session is first created, not on every Briefing toggle
  useEffect(() => {
    if (!sessionActive) return;
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionActive]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  // Save session on exit — fires LLM rubric scorer, then persists authoritative scores
  const handleExit = useCallback(() => {
    if (sessionId) {
      const durationSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const now = new Date().toISOString();

      // G-06: fire LLM scorer for authoritative rubric, fall back to heuristic
      void (async () => {
        let finalRubric = rubric;

        // Only call LLM if there are user messages to evaluate
        const userMsgs = dealRoomMessages.filter(m => m.role === 'user');
        if (userMsgs.length > 0) {
          try {
            const scoreRes = await fetch('/api/valuation/deal-room/score-rubric', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messages: dealRoomMessages.map(m => ({ role: m.role, content: m.content })),
                companyName,
                buyerType,
              }),
            });
            if (scoreRes.ok) {
              const { scores } = (await scoreRes.json()) as {
                scores: Record<string, number>;
              };
              // Map LLM scores onto rubric dimensions
              finalRubric = rubric.map(r => ({
                ...r,
                score: typeof scores[r.dimension] === 'number' ? scores[r.dimension] : r.score,
              }));
              setRubric(finalRubric);
            }
          } catch {
            // LLM unavailable — heuristic scores used as fallback
          }
        }

        const rubricObj: Record<string, number> = {};
        finalRubric.forEach(r => { rubricObj[r.dimension] = r.score; });
        const overallScore = finalRubric.length > 0
          ? Math.round(finalRubric.reduce((s, r) => s + r.score, 0) / finalRubric.length)
          : 0;

        void fetch(`/api/valuation/deal-room/session?id=${sessionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'completed',
            rubricScores: rubricObj,
            overallScore,
            duration: durationSec,
            completedAt: now,
          }),
        }).catch(() => {});

        const rubricSummary = finalRubric.map(r => `${r.dimension}: ${r.score}`).join(', ');
        void fetch('/api/olivia/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memories: [
              {
                category: 'professional',
                factKey: `war_room_result_${companyName.replace(/\s+/g, '_').toLowerCase()}`,
                factValue: `War Room session for ${companyName} (${buyerType}): scored ${overallScore}/100 in ${Math.floor(durationSec / 60)}m. Rubric: ${rubricSummary}`,
                confidence: 0.95,
                source: 'calendar',
              },
            ],
          }),
        }).catch(() => {});
      })();
    }
    onExit();
  }, [sessionId, rubric, dealRoomMessages, onExit, companyName, buyerType]);

  // ── Rubric scoring — react to message changes from DealRoomSimulator ──
  useEffect(() => {
    if (dealRoomMessages.length === 0) {
      setRubric(RUBRIC_INITIAL);
      return;
    }
    const userTexts = dealRoomMessages
      .filter(m => m.role === 'user')
      .map(m => m.content.trim())
      .filter(t => t.length > 0);
    const cristianoCount = dealRoomMessages.filter(m => m.role === 'cristiano').length;
    setRubric(computeRubricFromMessages(userTexts, cristianoCount));
  }, [dealRoomMessages]);

  const overallScore = rubric.length > 0
    ? Math.round(rubric.reduce((sum, r) => sum + r.score, 0) / rubric.length)
    : 0;

  // ── Escape key ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (sessionActive) handleExit();
        else onExit();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleExit, sessionActive, onExit]);

  // ── Pre-computed data for briefing view ──
  const defensibility = computeDefensibility(
    evidenceChain,
    acquisitionMirror,
    negotiationAnchors.challengeResponses,
    negotiationAnchors,
  );

  const { walkAway, target, anchor } = negotiationAnchors;
  const anchorInverted = anchor > 0 && target > 0 && anchor < target;
  const openingAsk = anchor > target ? anchor : target * 1.25;
  const openingAskLabel = anchorInverted ? 'Method Ceiling' : 'Opening Ask';

  // Group evidence by type
  const evidenceByType = evidenceChain.reduce<Record<string, typeof evidenceChain>>((acc, doc) => {
    const type = doc.documentType || 'Other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {});

  // Status pill
  const statusReady = evidenceChain.length > 0 && negotiationAnchors.challengeResponses.length > 0;
  const statusLabel = statusReady ? 'Ready' : evidenceChain.length > 0 ? 'Partial' : 'Needs Evidence';
  const statusColor = statusReady
    ? 'bg-jade-upside/15 text-jade-upside border-jade-upside/20'
    : evidenceChain.length > 0
      ? 'bg-status-warning/15 text-status-warning border-status-warning/20'
      : 'bg-coral-downside/15 text-coral-downside border-coral-downside/20';

  // Concession ladder
  const concessionSteps: ConcessionStep[] = (() => {
    const ask = openingAsk;
    const tgt = target || 0;
    const wa = walkAway || 0;
    if (ask === 0 && tgt === 0) return [];
    const gap = ask - tgt;
    return [
      { stage: openingAskLabel, value: ask, note: anchorInverted ? 'Derived ceiling — anchor was below target' : 'Signals premium conviction' },
      ...(gap > 0 ? [
        { stage: 'First Concession', value: Math.round(ask - gap * 0.33), note: 'Offered only with strategic rationale' },
        { stage: 'Second Concession', value: Math.round(ask - gap * 0.67), note: 'Use if diligence confidence rises' },
      ] : []),
      { stage: 'Target Outcome', value: tgt, note: 'Fair-value objective' },
      { stage: 'Walk-Away Floor', value: wa, note: 'Below this, hold and build' },
    ];
  })();

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  if (!sessionActive) {
    return (
      <WarRoomBriefing
        companyName={companyName}
        buyerType={buyerType}
        enterpriseValue={enterpriseValue}
        statusLabel={statusLabel}
        statusColor={statusColor}
        evidenceChain={evidenceChain}
        evidenceByType={evidenceByType}
        walkAway={walkAway}
        target={target}
        openingAsk={openingAsk}
        openingAskLabel={openingAskLabel}
        anchorInverted={anchorInverted}
        walkAwayRationale={negotiationAnchors.walkAwayRationale}
        targetRationale={negotiationAnchors.targetRationale}
        anchorRationale={negotiationAnchors.anchorRationale}
        challengeResponses={negotiationAnchors.challengeResponses}
        defensibility={defensibility}
        concessionSteps={concessionSteps}
        acquisitionMirror={acquisitionMirror}
        expandedChallenge={expandedChallenge}
        setExpandedChallenge={setExpandedChallenge}
        valuationSubjectId={valuationSubjectId}
        onEnterSession={() => setSessionActive(true)}
        onExit={onExit}
      />
    );
  }

  return (
    <WarRoomSession
      companyName={companyName}
      buyerType={buyerType}
      enterpriseValue={enterpriseValue}
      valuationRunId={valuationRunId}
      acquisitionMirror={acquisitionMirror}
      negotiationAnchors={negotiationAnchors}
      evidenceChain={evidenceChain}
      rubric={rubric}
      overallScore={overallScore}
      minutes={minutes}
      seconds={seconds}
      sessionId={sessionId}
      showTranscript={showTranscript}
      setShowTranscript={setShowTranscript}
      activeExhibit={activeExhibit}
      setActiveExhibit={setActiveExhibit}
      onMessagesChange={setDealRoomMessages}
      handleExit={handleExit}
      onBackToBriefing={() => setSessionActive(false)}
    />
  );
}
