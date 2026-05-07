'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// ── Types ────────────────────────────────────────────────────────────

interface TranscriptMessage {
  id: string;
  role: string; // 'cristiano' | 'user'
  content: string;
  createdAt: string;
  exhibitRef: number | null;
}

interface TranscriptSession {
  id: string;
  companyName: string;
  buyerType: string;
  status: string;
  overallScore: number | null;
  rubricScores: Record<string, number> | null;
  duration: number | null;
  startedAt: string;
  completedAt: string | null;
  messages: TranscriptMessage[];
}

interface WarRoomTranscriptProps {
  sessionId: string;
  companyName: string;
  onClose: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatTimestamp(iso: string, sessionStart: string): string {
  const t = new Date(iso).getTime() - new Date(sessionStart).getTime();
  const totalSec = Math.max(0, Math.floor(t / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-jade-upside';
  if (score >= 60) return 'text-cyan-interactive';
  if (score >= 40) return 'text-status-warning';
  return 'text-coral-downside';
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-jade-upside/15';
  if (score >= 60) return 'bg-cyan-interactive/15';
  if (score >= 40) return 'bg-status-warning/15';
  return 'bg-coral-downside/15';
}

const RUBRIC_LABELS: Record<string, string> = {
  evidence: 'Evidence Quality',
  valuation: 'Valuation Defence',
  risk: 'Risk Handling',
  objection: 'Rebuttal Quality',
  concision: 'Concision',
  resilience: 'Composure',
};

// ── Build markdown transcript ────────────────────────────────────────

function buildMarkdownTranscript(session: TranscriptSession): string {
  const lines: string[] = [];
  lines.push(`# War Room Transcript`);
  lines.push(`**Company:** ${session.companyName}`);
  lines.push(`**Buyer Type:** ${session.buyerType}`);
  lines.push(`**Date:** ${new Date(session.startedAt).toLocaleString('en-GB')}`);
  if (session.duration) lines.push(`**Duration:** ${formatDuration(session.duration)}`);
  if (session.overallScore !== null) lines.push(`**Overall Score:** ${session.overallScore}/100`);
  lines.push('');

  if (session.rubricScores) {
    lines.push('## Rubric Scores');
    for (const [key, val] of Object.entries(session.rubricScores)) {
      lines.push(`- **${RUBRIC_LABELS[key] || key}:** ${val}/100`);
    }
    lines.push('');
  }

  lines.push('## Transcript');
  lines.push('');
  for (const msg of session.messages) {
    const ts = formatTimestamp(msg.createdAt, session.startedAt);
    const role = msg.role === 'cristiano' ? 'COUNTERPARTY' : 'PRINCIPAL';
    const exhibit = msg.exhibitRef ? ` [Exhibit ${msg.exhibitRef}]` : '';
    lines.push(`**[${ts}] ${role}${exhibit}**`);
    lines.push(msg.content);
    lines.push('');
  }

  return lines.join('\n');
}

// ── Component ────────────────────────────────────────────────────────

export default function WarRoomTranscript({
  sessionId,
  companyName,
  onClose,
}: WarRoomTranscriptProps) {
  const [session, setSession] = useState<TranscriptSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TTS state
  const [isReading, setIsReading] = useState(false);
  const [readingIndex, setReadingIndex] = useState(-1);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const readAbortRef = useRef(false);

  // Share action status
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const shareTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mobile "More" menu for secondary actions
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Notepad state
  const [showNotepad, setShowNotepad] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  // Scroll ref for auto-scroll during read-back
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    return () => {
      if (shareTimeoutRef.current) clearTimeout(shareTimeoutRef.current);
    };
  }, []);

  // ── Fetch session ──
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/valuation/deal-room/session?id=${sessionId}`);
        if (!res.ok) {
          setError('Failed to load session');
          return;
        }
        const data = await res.json();
        setSession(data.session);
        // Pre-fill notepad title
        setNoteTitle(`War Room: ${data.session.companyName} (${new Date(data.session.startedAt).toLocaleDateString('en-GB')})`);
      } catch {
        setError('Failed to load session');
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  // ── Olivia read-back ──
  const handleReadBack = useCallback(async () => {
    if (!session || session.messages.length === 0) return;

    // Stop if already reading
    if (isReading) {
      readAbortRef.current = true;
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current = null;
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsReading(false);
      setReadingIndex(-1);
      return;
    }

    setIsReading(true);
    readAbortRef.current = false;

    for (let i = 0; i < session.messages.length; i++) {
      if (readAbortRef.current) break;
      const msg = session.messages[i];
      setReadingIndex(i);

      // Scroll message into view
      const el = messageRefs.current.get(i);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      const role = msg.role === 'cristiano' ? 'Counterparty says: ' : 'Principal says: ';
      const textToRead = role + msg.content;

      // Try ElevenLabs first
      let played = false;
      try {
        const response = await fetch('/api/olivia/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textToRead }),
        });
        if (response.headers.get('Content-Type')?.includes('audio/')) {
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          ttsAudioRef.current = audio;

          await new Promise<void>((resolve) => {
            audio.onended = () => {
              URL.revokeObjectURL(audioUrl);
              ttsAudioRef.current = null;
              resolve();
            };
            audio.onerror = () => {
              URL.revokeObjectURL(audioUrl);
              ttsAudioRef.current = null;
              resolve();
            };
            audio.play().catch(() => resolve());
          });
          played = true;
        }
      } catch {
        // Fall through to browser TTS
      }

      // Fallback: browser speech synthesis
      if (!played && !readAbortRef.current && typeof window !== 'undefined' && window.speechSynthesis) {
        await new Promise<void>((resolve) => {
          const utterance = new SpeechSynthesisUtterance(textToRead);
          utterance.rate = 1.0;
          utterance.lang = 'en-GB';
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          window.speechSynthesis.speak(utterance);
        });
      }
    }

    setIsReading(false);
    setReadingIndex(-1);
  }, [session, isReading]);

  // ── Download as markdown ──
  const handleDownload = useCallback(() => {
    if (!session) return;
    const md = buildMarkdownTranscript(session);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `war-room-${session.companyName.replace(/\s+/g, '-').toLowerCase()}-${new Date(session.startedAt).toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [session]);

  // ── Copy to clipboard ──
  const handleCopy = useCallback(async () => {
    if (!session) return;
    const md = buildMarkdownTranscript(session);
    try {
      await navigator.clipboard.writeText(md);
      setShareStatus('Copied to clipboard');
    } catch {
      // execCommand fallback
      const textarea = document.createElement('textarea');
      textarea.value = md;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setShareStatus('Copied to clipboard');
    }
    if (shareTimeoutRef.current) clearTimeout(shareTimeoutRef.current);
    shareTimeoutRef.current = setTimeout(() => setShareStatus(null), 2000);
  }, [session]);

  // ── Share via Web Share API ──
  const handleShare = useCallback(async () => {
    if (!session) return;
    const md = buildMarkdownTranscript(session);
    const title = `War Room Transcript: ${session.companyName}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text: md });
        return;
      } catch {
        // User cancelled or unsupported — fall through to copy
      }
    }
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(md);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = md;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setShareStatus('Copied to clipboard');
    if (shareTimeoutRef.current) clearTimeout(shareTimeoutRef.current);
    shareTimeoutRef.current = setTimeout(() => setShareStatus(null), 2000);
  }, [session]);

  // ── Email via Olivia ──
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSending, setEmailSending] = useState(false);

  const handleSendEmail = useCallback(async () => {
    if (!session || !emailTo.includes('@')) return;
    setEmailSending(true);
    try {
      const md = buildMarkdownTranscript(session);
      const res = await fetch('/api/olivia/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo.trim(),
          subject: `War Room Transcript: ${session.companyName}`,
          message: md,
        }),
      });
      if (res.ok) {
        setShareStatus('Email sent');
        setShowEmailModal(false);
        setEmailTo('');
      } else {
        setShareStatus('Failed to send email');
      }
    } catch {
      setShareStatus('Failed to send email');
    } finally {
      setEmailSending(false);
      if (shareTimeoutRef.current) clearTimeout(shareTimeoutRef.current);
      shareTimeoutRef.current = setTimeout(() => setShareStatus(null), 2000);
    }
  }, [session, emailTo]);

  // ── Save notepad ──
  const handleSaveNote = useCallback(async () => {
    if (!session) return;
    setNoteSaving(true);
    try {
      // 1. Save to calendar_notes table
      const res = await fetch('/api/calendar/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: noteTitle || `War Room: ${session.companyName}`,
          content: noteContent || null,
        }),
      });
      if (!res.ok) throw new Error('save failed');

      // 2. Save key facts to Olivia memory (best-effort)
      const memoryFacts = [];
      if (noteContent.trim()) {
        memoryFacts.push({
          category: 'professional' as const,
          factKey: `war_room_notes_${session.id.slice(0, 8)}`,
          factValue: `War Room session for ${session.companyName} (${session.buyerType}). User notes: ${noteContent.slice(0, 500)}`,
          confidence: 0.85,
          source: 'calendar' as const,
        });
      }
      if (session.overallScore !== null) {
        memoryFacts.push({
          category: 'professional' as const,
          factKey: `war_room_score_${session.companyName.replace(/\s+/g, '_').toLowerCase()}`,
          factValue: `War Room score for ${session.companyName}: ${session.overallScore}/100 (${session.buyerType})`,
          confidence: 0.95,
          source: 'calendar' as const,
        });
      }
      if (memoryFacts.length > 0) {
        void fetch('/api/olivia/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memories: memoryFacts }),
        }).catch(() => { /* best-effort */ });
      }

      setNoteSaved(true);
      setTimeout(() => {
        setNoteSaved(false);
        setShowNotepad(false);
      }, 1500);
    } catch {
      setShareStatus('Failed to save note');
      if (shareTimeoutRef.current) clearTimeout(shareTimeoutRef.current);
      shareTimeoutRef.current = setTimeout(() => setShareStatus(null), 2000);
    } finally {
      setNoteSaving(false);
    }
  }, [session, noteTitle, noteContent]);

  // ── Loading / Error ──
  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--color-onyx)]/95">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-[var(--color-aurum-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-text-secondary">Loading transcript...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--color-onyx)]/95">
        <div className="text-center">
          <p className="text-xs text-coral-downside mb-3">{error || 'Session not found'}</p>
          <button onClick={onClose} className="text-xs text-text-secondary hover:text-text-primary">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[var(--color-onyx)]" role="dialog" aria-label="War Room Transcript" aria-modal="true">
      {/* ── Header ── */}
      <header className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-white/10 bg-white/[0.02] shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider shrink-0">
            Transcript
          </h2>
          <span className="text-[11px] text-text-secondary truncate min-w-0">
            {session.companyName} &middot; <span className="capitalize">{session.buyerType.replace(/_/g, ' ')}</span>
          </span>
          {session.duration && (
            <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono tabular-nums text-text-secondary">
              {formatDuration(session.duration)}
            </span>
          )}
          {session.overallScore !== null && (
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold tabular-nums font-mono ${getScoreBgColor(session.overallScore)} ${getScoreColor(session.overallScore)}`}>
              {session.overallScore}/100
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Olivia Read-Back */}
          <button
            onClick={handleReadBack}
            disabled={session.messages.length === 0}
            className={`flex items-center gap-1.5 p-2.5 sm:px-2.5 sm:py-1.5 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-30 ${
              isReading
                ? 'bg-[var(--color-aurum-primary)]/15 text-[var(--color-aurum-primary)] border border-[var(--color-aurum-primary)]/30'
                : 'bg-white/[0.04] text-text-secondary border border-white/10 hover:bg-white/[0.08] hover:text-text-primary'
            }`}
            title={isReading ? 'Stop reading' : 'Olivia reads the transcript aloud'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {isReading ? (
                <>
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </>
              ) : (
                <>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </>
              )}
            </svg>
            <span className="hidden sm:inline">{isReading ? 'Stop' : 'Read Aloud'}</span>
          </button>

          {/* Notepad */}
          <button
            onClick={() => setShowNotepad(!showNotepad)}
            className={`flex items-center gap-1.5 p-2.5 sm:px-2.5 sm:py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
              showNotepad
                ? 'bg-[var(--color-aurum-primary)]/15 text-[var(--color-aurum-primary)] border border-[var(--color-aurum-primary)]/30'
                : 'bg-white/[0.04] text-text-secondary border border-white/10 hover:bg-white/[0.08] hover:text-text-primary'
            }`}
            title="Session notes"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span className="hidden sm:inline">Notes</span>
          </button>

          {/* Desktop: show all action buttons inline */}
          <div className="hidden sm:contents">
            {/* Download */}
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white/[0.04] text-text-secondary border border-white/10 hover:bg-white/[0.08] hover:text-text-primary transition-colors"
              title="Download as markdown"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" x2="12" y1="15" y2="3" />
              </svg>
              <span>Download</span>
            </button>

            {/* Copy */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white/[0.04] text-text-secondary border border-white/10 hover:bg-white/[0.08] hover:text-text-primary transition-colors"
              title="Copy transcript"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>Copy</span>
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white/[0.04] text-text-secondary border border-white/10 hover:bg-white/[0.08] hover:text-text-primary transition-colors"
              title="Share transcript"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
                <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
              </svg>
              <span>Share</span>
            </button>

            {/* Email */}
            <button
              onClick={() => setShowEmailModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white/[0.04] text-text-secondary border border-white/10 hover:bg-white/[0.08] hover:text-text-primary transition-colors"
              title="Email transcript"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <span>Email</span>
            </button>
          </div>

          {/* Mobile: "More" dropdown for secondary actions */}
          <div className="relative sm:hidden">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="flex items-center gap-1.5 p-2.5 rounded-lg text-[11px] font-semibold bg-white/[0.04] text-text-secondary border border-white/10 hover:bg-white/[0.08] hover:text-text-primary transition-colors"
              title="More actions"
              aria-expanded={showMoreMenu}
              aria-haspopup="true"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </button>
            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-[70]" onClick={() => setShowMoreMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-[80] w-40 rounded-lg border border-white/10 bg-[var(--color-onyx)] shadow-xl py-1">
                  <button onClick={() => { handleDownload(); setShowMoreMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-text-secondary hover:bg-white/[0.06] hover:text-text-primary transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                    Download
                  </button>
                  <button onClick={() => { void handleCopy(); setShowMoreMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-text-secondary hover:bg-white/[0.06] hover:text-text-primary transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                    Copy
                  </button>
                  <button onClick={() => { void handleShare(); setShowMoreMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-text-secondary hover:bg-white/[0.06] hover:text-text-primary transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" x2="15.42" y1="13.51" y2="17.49" /><line x1="15.41" x2="8.59" y1="6.51" y2="10.49" /></svg>
                    Share
                  </button>
                  <button onClick={() => { setShowEmailModal(true); setShowMoreMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-text-secondary hover:bg-white/[0.06] hover:text-text-primary transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                    Email
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 p-2.5 sm:px-2.5 sm:py-1.5 rounded-lg text-[11px] font-semibold bg-white/[0.04] text-text-primary border border-white/10 hover:bg-white/[0.08] transition-colors ml-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            <span className="hidden sm:inline">Close</span>
          </button>
        </div>
      </header>

      {/* ── Status toast ── */}
      {shareStatus && (
        <div className="fixed top-16 right-4 z-[80] px-3 py-1.5 rounded-lg bg-jade-upside/15 text-jade-upside text-[11px] font-semibold border border-jade-upside/20 motion-safe:animate-pulse">
          {shareStatus}
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Transcript column */}
        <div className={`flex-1 overflow-y-auto p-6 ${showNotepad ? 'border-r border-white/[0.06]' : ''}`}>
          {/* Rubric scores summary */}
          {session.rubricScores && (
            <div className="mb-6 flex flex-wrap gap-2">
              {Object.entries(session.rubricScores).map(([key, val]) => (
                <div
                  key={key}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded ${getScoreBgColor(val as number)}`}
                >
                  <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                    {RUBRIC_LABELS[key] || key}
                  </span>
                  <span className={`text-[11px] font-bold tabular-nums font-mono ${getScoreColor(val as number)}`}>
                    {val as number}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Messages */}
          {session.messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-text-secondary">No messages recorded in this session.</p>
            </div>
          ) : (
            <div className="space-y-3 max-w-3xl">
              {session.messages.map((msg, idx) => {
                const isCristiano = msg.role === 'cristiano';
                const isHighlighted = readingIndex === idx;
                return (
                  <div
                    key={msg.id}
                    ref={(el) => {
                      if (el) messageRefs.current.set(idx, el);
                    }}
                    className={`flex gap-3 p-3 rounded-lg transition-all duration-200 ${
                      isHighlighted
                        ? 'bg-[var(--color-aurum-primary)]/10 ring-1 ring-[var(--color-aurum-primary)]/30'
                        : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    {/* Timestamp */}
                    <span className="shrink-0 text-[11px] font-mono tabular-nums text-text-tertiary mt-0.5 w-10">
                      {formatTimestamp(msg.createdAt, session.startedAt)}
                    </span>

                    {/* Role badge */}
                    <span
                      className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                        isCristiano
                          ? 'bg-coral-downside/10 text-coral-downside border border-coral-downside/20'
                          : 'bg-cyan-interactive/10 text-cyan-interactive border border-cyan-interactive/20'
                      }`}
                    >
                      {isCristiano ? 'CP' : 'PRIN'}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                      {msg.exhibitRef && (
                        <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-[var(--color-aurum-primary)]/10 text-[var(--color-aurum-primary)] text-[11px] font-semibold">
                          Exhibit {msg.exhibitRef}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Notepad sidebar — full overlay on mobile, side panel on desktop */}
        {showNotepad && (
          <div className="fixed inset-0 sm:static sm:inset-auto w-full sm:w-80 shrink-0 flex flex-col overflow-hidden bg-[var(--color-onyx)] sm:bg-white/[0.01] z-10 sm:z-auto">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <h3 className="text-[11px] font-semibold text-text-primary uppercase tracking-wider">
                Session Notes
              </h3>
              <p className="text-[11px] text-text-tertiary mt-0.5">
                Saved to your calendar notes. Olivia will remember key points.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Note title..."
                className="w-full bg-transparent text-xs font-semibold text-text-primary placeholder:text-text-tertiary outline-none"
              />
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Key takeaways, positions, concessions, next steps..."
                rows={12}
                className="w-full bg-transparent text-xs text-text-primary placeholder:text-text-tertiary outline-none resize-none leading-relaxed"
              />
            </div>

            <div className="sticky bottom-0 px-4 py-3 border-t border-white/[0.06] flex items-center gap-2 bg-[var(--color-onyx)] sm:bg-white/[0.01]">
              <button
                onClick={handleSaveNote}
                disabled={noteSaving || (!noteContent.trim() && !noteTitle.trim())}
                className="flex-1 rounded-lg px-3 py-1.5 text-[11px] font-semibold bg-[var(--color-aurum-primary)]/15 text-[var(--color-aurum-primary)] border border-[var(--color-aurum-primary)]/30 hover:bg-[var(--color-aurum-primary)]/25 transition-colors disabled:opacity-30"
              >
                {noteSaved ? 'Saved!' : noteSaving ? 'Saving...' : 'Save Note'}
              </button>
              <button
                onClick={() => setShowNotepad(false)}
                className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-text-secondary hover:text-text-primary transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Email Modal ── */}
      {showEmailModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70"
          onClick={() => setShowEmailModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Email transcript"
        >
          <div
            className="w-full max-w-[calc(100%-2rem)] sm:max-w-xs rounded-xl border border-[var(--color-aurum-primary)]/20 bg-[var(--color-onyx)]/[0.98] p-4 sm:p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === 'Escape') setShowEmailModal(false); }}
          >
            <h3 className="text-sm font-semibold text-text-primary mb-3">Email Transcript</h3>
            <p className="text-[11px] text-text-secondary mb-3">
              Olivia will email the full transcript to this address.
            </p>
            <input
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-[var(--color-aurum-primary)]/40 focus:outline-none mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowEmailModal(false)}
                className="flex-1 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={emailSending || !emailTo.includes('@')}
                className="flex-1 rounded-md bg-[var(--color-aurum-primary)]/20 px-3 py-1.5 text-xs font-semibold text-[var(--color-aurum-primary)] hover:bg-[var(--color-aurum-primary)]/30 transition-colors disabled:opacity-40"
              >
                {emailSending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
