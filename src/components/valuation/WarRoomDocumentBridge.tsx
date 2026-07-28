'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useOliviaOptional } from '@/components/olivia/OliviaProvider';

// ── Types ────────────────────────────────────────────────────────────

export interface DocumentExhibit {
  exhibitNumber: number;
  documentId: string;
  title: string;
  documentType: string;
  contentPreview: string;
  pageOrSlide: number | null;
  tabledAt: number; // timestamp
  tabledBy: 'user' | 'olivia' | 'voice';
}

export interface WarRoomDocument {
  id: string;
  title: string;
  documentType: string;
  slug?: string;
  summary?: string;
  collectionSlug?: string;
  originalFilename?: string;
  contentPreview?: string;
}

interface EvidenceChainItem {
  chunkId: string;
  documentId: string;
  documentType: string;
  documentTitle: string;
  originalFilename: string | null;
  pageOrSlide: number | null;
  chunkIndex: number;
  contentPreview: string;
}

// ── Props ────────────────────────────────────────────────────────────

export interface WarRoomDocumentBridgeProps {
  /** Evidence chain from the valuation run */
  evidenceChain: EvidenceChainItem[];
  /** Company name for Olivia context */
  companyName: string;
  /** Callback when an exhibit is tabled — parent can display it */
  onExhibitTabled: (exhibit: DocumentExhibit) => void;
  /** Callback when exhibit viewer should close */
  onExhibitDismissed: () => void;
  /** Currently active exhibit (controlled by parent) */
  activeExhibit: DocumentExhibit | null;
}

// ── Voice command patterns ───────────────────────────────────────────

const VOICE_FETCH_PATTERNS = [
  /(?:olivia|alexa|hey)\s*,?\s*(?:please\s+)?(?:fetch|show|pull up|bring up|open|display|get|find)\s+(?:the\s+)?(.+)/i,
  /(?:show|pull up|bring up|open|display|fetch|get)\s+(?:the\s+)?(?:document|exhibit|file|report|deck|model|financials?)\s*(?:called|named|titled)?\s*(.+)/i,
  /(?:exhibit|doc(?:ument)?)\s+(\d+)/i,
  /(?:let'?s?\s+)?(?:look at|review|go (?:over|through))\s+(?:the\s+)?(.+)/i,
];

function parseVoiceCommand(transcript: string): { type: 'fetch'; query: string } | null {
  const trimmed = transcript.trim();
  for (const pattern of VOICE_FETCH_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return { type: 'fetch', query: match[1].trim() };
    }
  }
  return null;
}

// ── Fuzzy document matching ──────────────────────────────────────────

function matchDocument(
  query: string,
  documents: EvidenceChainItem[],
): EvidenceChainItem | null {
  const q = query.toLowerCase().replace(/[^a-z0-9\s]/g, '');

  // Check for exhibit number reference
  const exhibitMatch = q.match(/^(?:exhibit\s+)?(\d+)$/);
  if (exhibitMatch) {
    return null; // Exhibit numbers handled separately by parent
  }

  // Keyword match on document title and type
  let bestMatch: EvidenceChainItem | null = null;
  let bestScore = 0;

  for (const doc of documents) {
    const title = (doc.documentTitle || doc.originalFilename || '').toLowerCase();
    const type = doc.documentType.toLowerCase();
    const content = (doc.contentPreview || '').toLowerCase();
    const queryWords = q.split(/\s+/);

    let score = 0;
    for (const word of queryWords) {
      if (word.length < 2) continue;
      if (title.includes(word)) score += 3;
      if (type.includes(word)) score += 2;
      if (content.includes(word)) score += 1;
    }

    // Exact title substring match is highest priority
    if (title.includes(q)) score += 10;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = doc;
    }
  }

  return bestScore >= 2 ? bestMatch : null;
}

// ── Document type labels ─────────────────────────────────────────────

const DOC_TYPE_LABELS: Record<string, string> = {
  deck: 'Pitch Deck',
  financial_model: 'Financial Model',
  cap_table: 'Cap Table',
  kpi_export: 'KPI Export',
  contract: 'Contract',
  data_room: 'Data Room',
  manual_override: 'Manual Entry',
  other: 'Document',
};

function getDocTypeLabel(type: string): string {
  return DOC_TYPE_LABELS[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const DOC_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  deck: { bg: 'bg-cyan-interactive/10', text: 'text-cyan-interactive', border: 'border-cyan-interactive/20' },
  financial_model: { bg: 'bg-jade-upside/10', text: 'text-jade-upside', border: 'border-jade-upside/20' },
  cap_table: { bg: 'bg-status-warning/10', text: 'text-status-warning', border: 'border-status-warning/20' },
  kpi_export: { bg: 'bg-[var(--color-aurum-primary)]/10', text: 'text-[var(--color-aurum-primary)]', border: 'border-[var(--color-aurum-primary)]/20' },
  contract: { bg: 'bg-[var(--color-sterling-reference)]/10', text: 'text-[var(--color-sterling-reference)]', border: 'border-[var(--color-sterling-reference)]/20' },
  data_room: { bg: 'bg-purple-400/10', text: 'text-purple-400', border: 'border-purple-400/20' },
};

function getDocColors(type: string) {
  return DOC_TYPE_COLORS[type] || { bg: 'bg-white/5', text: 'text-text-secondary', border: 'border-white/10' };
}

// ── Component ───────────────────────────────────────────────────────

export default function WarRoomDocumentBridge({
  evidenceChain,
  companyName,
  onExhibitTabled,
  onExhibitDismissed,
  activeExhibit,
}: WarRoomDocumentBridgeProps) {
  const olivia = useOliviaOptional();
  const [isExpanded, setIsExpanded] = useState(false);
  const [exhibits, setExhibits] = useState<DocumentExhibit[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'processing' | 'found' | 'not-found'>('idle');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const voiceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextExhibitNum = useRef(1);

  // ── Deduplicate evidence chain by documentId ──
  const uniqueDocs = (() => {
    const seen = new Set<string>();
    return evidenceChain.filter(doc => {
      if (seen.has(doc.documentId)) return false;
      seen.add(doc.documentId);
      return true;
    });
  })();

  // ── Table a document as an exhibit ──
  const tableDocument = useCallback((doc: EvidenceChainItem, source: 'user' | 'olivia' | 'voice') => {
    // Check if already tabled
    const existing = exhibits.find(e => e.documentId === doc.documentId);
    if (existing) {
      onExhibitTabled(existing);
      return existing;
    }

    const exhibit: DocumentExhibit = {
      exhibitNumber: nextExhibitNum.current++,
      documentId: doc.documentId,
      title: doc.documentTitle || doc.originalFilename || 'Untitled',
      documentType: doc.documentType,
      contentPreview: doc.contentPreview || '',
      pageOrSlide: doc.pageOrSlide,
      tabledAt: Date.now(),
      tabledBy: source,
    };
    setExhibits(prev => [...prev, exhibit]);
    onExhibitTabled(exhibit);

    // Olivia speaks confirmation
    if (olivia?.speakText) {
      void olivia.speakText(
        `Exhibit ${exhibit.exhibitNumber}: ${exhibit.title}. Now on screen.`
      );
    }

    return exhibit;
  }, [exhibits, onExhibitTabled, olivia]);

  // ── Find exhibit by number ──
  const findExhibitByNumber = useCallback((num: number): DocumentExhibit | null => {
    return exhibits.find(e => e.exhibitNumber === num) || null;
  }, [exhibits]);

  // ── Voice recognition setup ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognitionAPI = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-GB';

    recognition.onresult = (event: {
      resultIndex: number;
      results: ArrayLike<{ isFinal: boolean; [index: number]: { transcript: string } }>;
    }) => {
      // G-08: reset inactivity timeout on every speech result
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
      voiceTimeoutRef.current = setTimeout(() => {
        recognitionRef.current?.stop();
        setIsListening(false);
        setVoiceStatus('idle');
        setVoiceTranscript('');
      }, 60_000);

      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (interimTranscript) {
        setVoiceTranscript(interimTranscript);
      }

      if (finalTranscript) {
        setVoiceTranscript(finalTranscript);
        setVoiceStatus('processing');

        // Parse voice command
        const command = parseVoiceCommand(finalTranscript);
        if (command?.type === 'fetch') {
          // Check for exhibit number reference
          const exhibitNumMatch = command.query.match(/^(\d+)$/);
          if (exhibitNumMatch) {
            const num = parseInt(exhibitNumMatch[1], 10);
            const exhibit = findExhibitByNumber(num);
            if (exhibit) {
              onExhibitTabled(exhibit);
              setVoiceStatus('found');
              if (olivia?.speakText) {
                void olivia.speakText(`Showing Exhibit ${num}: ${exhibit.title}.`);
              }
            } else {
              setVoiceStatus('not-found');
              if (olivia?.speakText) {
                void olivia.speakText(`Exhibit ${num} hasn't been tabled yet.`);
              }
            }
          } else {
            // Fuzzy match against evidence chain
            const match = matchDocument(command.query, evidenceChain);
            if (match) {
              tableDocument(match, 'voice');
              setVoiceStatus('found');
            } else {
              setVoiceStatus('not-found');
              if (olivia?.speakText) {
                void olivia.speakText(`I couldn't find a document matching "${command.query}". Try being more specific.`);
              }
            }
          }

          // Reset status after 3s
          setTimeout(() => {
            setVoiceStatus(isListening ? 'listening' : 'idle');
            setVoiceTranscript('');
          }, 3000);
        }
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setVoiceStatus('idle');
    };

    recognition.onend = () => {
      // Restart if still supposed to be listening
      if (isListening && recognitionRef.current) {
        try { recognitionRef.current.start(); } catch { /* already started */ }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [evidenceChain, isListening, findExhibitByNumber, tableDocument, onExhibitTabled, olivia]);

  // ── Toggle voice listening ──
  const toggleVoice = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setVoiceStatus('idle');
      setVoiceTranscript('');
      // G-08: clear inactivity timeout on manual stop
      if (voiceTimeoutRef.current) { clearTimeout(voiceTimeoutRef.current); voiceTimeoutRef.current = null; }
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        setVoiceStatus('listening');
        // G-08: start 60s inactivity timeout
        voiceTimeoutRef.current = setTimeout(() => {
          recognitionRef.current?.stop();
          setIsListening(false);
          setVoiceStatus('idle');
          setVoiceTranscript('');
        }, 60_000);
        if (olivia?.speakText) {
          void olivia.speakText('Listening for 60 seconds. Say "Olivia, fetch" followed by the document name.');
        }
      } catch {
        // Already started or not available
      }
    }
  }, [isListening, olivia]);

  // ── Stop listening when component unmounts ──
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
    };
  }, []);

  // Pause recognition while Olivia is speaking to prevent echo
  useEffect(() => {
    if (!recognitionRef.current || !isListening) return;
    if (olivia?.isSpeaking) {
      recognitionRef.current.stop();
    } else {
      try { recognitionRef.current.start(); } catch { /* already running */ }
    }
  }, [olivia?.isSpeaking, isListening]);

  return (
    <div className="flex flex-col">
      {/* ── Exhibit Viewer (when a document is active — desktop only, mobile uses overlay) ── */}
      {activeExhibit && (
        <div className="hidden lg:block border-b border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded bg-[var(--color-aurum-primary)]/20 text-[var(--color-aurum-primary)] text-[11px] font-bold">
                {activeExhibit.exhibitNumber}
              </span>
              <div>
                <p className="text-xs font-semibold text-text-primary">{activeExhibit.title}</p>
                <p className="text-[11px] text-text-secondary">
                  {getDocTypeLabel(activeExhibit.documentType)}
                  {activeExhibit.pageOrSlide !== null && ` · p.${activeExhibit.pageOrSlide}`}
                </p>
              </div>
            </div>
            <button
              onClick={onExhibitDismissed}
              className="p-2.5 rounded hover:bg-white/10 transition-colors text-text-secondary hover:text-text-primary"
              aria-label="Dismiss exhibit"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Document content preview */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] p-4 max-h-60 overflow-y-auto">
            <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
              {activeExhibit.contentPreview || 'Document content is available in the Evidence Room.'}
            </p>
          </div>

          {/* Tabled by badge */}
          <div className="mt-2 flex items-center gap-2 text-[11px] text-text-tertiary">
            <span>
              Tabled by {activeExhibit.tabledBy === 'voice' ? 'voice command' : activeExhibit.tabledBy === 'olivia' ? 'Olivia' : 'user'}
            </span>
            <span>&middot;</span>
            <span>
              {new Date(activeExhibit.tabledAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      )}

      {/* ── Mobile Compact Bar (mic icon + source count only) ── */}
      <div className="flex lg:hidden items-center gap-2 px-3 py-1.5 border-b border-white/[0.06] bg-white/[0.01]">
        <button
          onClick={toggleVoice}
          className={`p-1.5 rounded-lg transition-all ${
            isListening
              ? 'bg-coral-downside/20 text-coral-downside animate-pulse'
              : 'bg-white/[0.04] text-text-secondary'
          }`}
          aria-label={isListening ? 'Stop listening' : 'Start voice commands'}
          aria-pressed={isListening}
        >
          {isListening ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          )}
        </button>
        {voiceStatus !== 'idle' && (
          <span className="text-[11px] truncate min-w-0 flex-1" aria-live="polite">
            {voiceStatus === 'listening' && <span className="text-text-secondary italic">{voiceTranscript || 'Listening...'}</span>}
            {voiceStatus === 'processing' && <span className="text-status-warning">Searching...</span>}
            {voiceStatus === 'found' && <span className="text-jade-upside">Found</span>}
            {voiceStatus === 'not-found' && <span className="text-coral-downside">Not found</span>}
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors"
        >
          {uniqueDocs.length} src · {exhibits.length} tabled
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
        </button>
      </div>

      {/* ── Desktop Voice Control Bar (full version) ── */}
      <div className="hidden lg:flex items-center gap-2 px-4 py-2 border-b border-white/[0.06] bg-white/[0.01]">
        {/* Microphone toggle */}
        <button
          onClick={toggleVoice}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
            isListening
              ? 'bg-coral-downside/20 text-coral-downside border border-coral-downside/30 animate-pulse'
              : 'bg-white/[0.04] text-text-secondary border border-white/10 hover:bg-white/[0.08] hover:text-text-primary'
          }`}
          title={isListening ? 'Stop listening' : 'Start voice commands — say "Olivia, fetch [document]"'}
          aria-label={isListening ? 'Stop listening' : 'Start voice commands'}
          aria-pressed={isListening}
        >
          {isListening ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          )}
          {isListening ? 'Listening...' : 'Voice'}
        </button>

        {/* Voice status */}
        {voiceStatus !== 'idle' && (
          <div className="flex items-center gap-1.5 text-[11px] min-w-0 flex-1" aria-live="polite">
            {voiceStatus === 'listening' && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-coral-downside animate-pulse shrink-0" />
                <span className="text-text-secondary italic truncate">
                  {voiceTranscript || '"Olivia, fetch the pitch deck..."'}
                </span>
              </>
            )}
            {voiceStatus === 'processing' && (
              <span className="text-status-warning">Searching documents...</span>
            )}
            {voiceStatus === 'found' && (
              <span className="text-jade-upside">Document found and tabled</span>
            )}
            {voiceStatus === 'not-found' && (
              <span className="text-coral-downside">No matching document found</span>
            )}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Exhibit count + toggle tray */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-semibold text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          {uniqueDocs.length} sources · {exhibits.length} tabled
          <svg
            width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* ── Document Tray (expandable) ── */}
      {isExpanded && (
        <div className="border-b border-white/[0.06] bg-white/[0.01] max-h-32 lg:max-h-48 overflow-y-auto">
          {/* Tabled exhibits first */}
          {exhibits.length > 0 && (
            <div className="px-4 pt-2 pb-1">
              <p className="text-[11px] font-semibold text-[var(--color-aurum-primary)] uppercase tracking-wider mb-1.5">
                Tabled Exhibits
              </p>
              <div className="flex flex-wrap gap-1.5">
                {exhibits.map(exhibit => (
                  <button
                    key={exhibit.documentId}
                    onClick={() => onExhibitTabled(exhibit)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] transition-colors ${
                      activeExhibit?.documentId === exhibit.documentId
                        ? 'bg-[var(--color-aurum-primary)]/15 border-[var(--color-aurum-primary)]/30 text-[var(--color-aurum-primary)]'
                        : 'bg-white/[0.02] border-white/[0.06] text-text-secondary hover:bg-white/[0.04] hover:text-text-primary'
                    }`}
                  >
                    <span className="font-bold">#{exhibit.exhibitNumber}</span>
                    <span className="max-w-[120px] truncate" title={exhibit.title}>{exhibit.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Available source documents */}
          <div className="px-4 py-2">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">
              Available Sources
            </p>
            <div className="space-y-1">
              {uniqueDocs.map(doc => {
                const alreadyTabled = exhibits.some(e => e.documentId === doc.documentId);
                const colors = getDocColors(doc.documentType);
                return (
                  <div
                    key={doc.chunkId}
                    className="flex items-center gap-2 group"
                  >
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold uppercase ${colors.bg} ${colors.text} ${colors.border} border`}>
                      {doc.documentType.slice(0, 4)}
                    </span>
                    <span className="text-[11px] text-text-primary flex-1 truncate">
                      {doc.documentTitle || doc.originalFilename || 'Untitled'}
                    </span>
                    {doc.pageOrSlide !== null && (
                      <span className="text-[11px] text-text-tertiary font-mono">p.{doc.pageOrSlide}</span>
                    )}
                    {alreadyTabled ? (
                      <span className="text-[11px] text-[var(--color-aurum-primary)] font-semibold">TABLED</span>
                    ) : (
                      <button
                        onClick={() => tableDocument(doc, 'user')}
                        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 [@media(hover:none)]:opacity-100 px-2 py-1 rounded text-[11px] font-semibold bg-cyan-interactive/10 text-cyan-interactive border border-cyan-interactive/20 hover:bg-cyan-interactive/20 transition-all"
                      >
                        Table
                      </button>
                    )}
                  </div>
                );
              })}

              {uniqueDocs.length === 0 && (
                <p className="text-[11px] text-text-tertiary italic py-2">
                  No source documents linked to this valuation run.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
