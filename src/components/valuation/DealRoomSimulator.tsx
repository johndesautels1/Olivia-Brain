'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { BuyerType, ValuationBand } from '@/lib/valuation/types';
import { formatCurrency } from '@/lib/valuation/dashboard-types';
import GlossaryTooltip from './GlossaryTooltip';

// ── Types ────────────────────────────────────────────────────────────

export type ChatMessage = {
  role: 'cristiano' | 'user';
  content: string;
  timestamp: number;
};

type SessionScore = {
  overallScore: number;
  questionsAsked: number;
  weakPoints: string[];
  strongPoints: string[];
};

export type DealRoomSimulatorProps = {
  companyName: string;
  buyerType: BuyerType;
  enterpriseValue: ValuationBand;
  valuationRunId: string | null;
  onMessagesChange?: (messages: ChatMessage[]) => void;
};

// ── Cristiano opening challenges by buyer type ──────────────────────

const OPENING_CHALLENGES: Record<BuyerType, string> = {
  angel:
    'I\'m considering an angel cheque here. Walk me through why your valuation isn\'t just a founder fantasy. What hard evidence do you have that this is worth more than the IP alone?',
  vc:
    'Our fund sees 200 deals a quarter. Convince me in 90 seconds why your revenue multiple is justified when your nearest comp trades at half this. What am I missing?',
  private_equity:
    'Let\'s cut to it. Your EBITDA doesn\'t support this number. The DCF relies on growth assumptions I\'d call aggressive. Defend your discount rate or I walk.',
  strategic_partner:
    'We have our own R&D pipeline. Tell me why acquiring you is better than building this in-house for a third of the price. What\'s the synergy I can\'t replicate?',
  acquirer:
    'My board wants a 30% discount to your ask. Your customer concentration is a red flag, and your founder dependency makes this a key-person risk. Change my mind.',
};

// ── Component ───────────────────────────────────────────────────────

export default function DealRoomSimulator({
  companyName,
  buyerType,
  enterpriseValue,
  valuationRunId,
  onMessagesChange,
}: DealRoomSimulatorProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionScore, setSessionScore] = useState<SessionScore | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Notify parent of message changes for persistence and rubric scoring
  useEffect(() => {
    onMessagesChange?.(messages);
  }, [messages, onMessagesChange]);

  // Start session
  const handleStartSession = useCallback(() => {
    const opening: ChatMessage = {
      role: 'cristiano',
      content: OPENING_CHALLENGES[buyerType],
      timestamp: Date.now(),
    };
    setMessages([opening]);
    setSessionActive(true);
    setStartTime(Date.now());
    setSessionScore(null);
  }, [buyerType]);

  // Send user message
  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/valuation/deal-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valuationRunId,
          buyerType,
          companyName,
          enterpriseValue,
          messages: [...messages, userMsg].map((m) => ({
            role: m.role === 'cristiano' ? 'assistant' : 'user',
            content: m.content,
          })),
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { reply: string };
        const cristianoReply: ChatMessage = {
          role: 'cristiano',
          content: data.reply,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, cristianoReply]);
      } else {
        // Fallback challenges — keyword-matched to user's last message (G-09)
        const fallbacks: { keywords: string[]; text: string }[] = [
          { keywords: ['multiple', 'comp', 'peer', 'revenue', 'valuation', 'price', 'premium', 'market'], text: 'That\'s a start, but you haven\'t addressed the comp gap. Your nearest listed peer trades at 6x revenue — you\'re asking for 12x. Justify the premium.' },
          { keywords: ['growth', 'unit', 'economics', 'margin', 'trajectory', 'scale', 'conviction'], text: 'I appreciate the conviction, but conviction isn\'t evidence. Show me the unit economics that support this growth trajectory.' },
          { keywords: ['customer', 'client', 'concentration', 'churn', 'retention', 'contract', 'revenue'], text: 'Interesting. But what happens when your top 3 customers represent 55% of revenue and one of them is in a down-round? What\'s your concentration risk mitigation?' },
          { keywords: ['ip', 'moat', 'burn', 'runway', 'cash', 'funding', 'round', 'raise'], text: 'Fair point on the IP moat. But your burn rate at £180K/month gives you 14 months of runway. If this round doesn\'t close, what\'s your plan B?' },
          { keywords: ['team', 'founder', 'cto', 'hire', 'people', 'key-man', 'talent', 'leadership'], text: 'You\'re dodging the founder dependency question. If your CTO leaves tomorrow, what happens to the product roadmap? What retention mechanisms are in place?' },
        ];
        const lastUserMsg = (input || '').toLowerCase();
        let bestIdx = 0;
        let bestScore = -1;
        fallbacks.forEach((fb, i) => {
          const hits = fb.keywords.filter(k => lastUserMsg.includes(k)).length;
          if (hits > bestScore) { bestScore = hits; bestIdx = i; }
        });
        // If no keyword matched, rotate to avoid repeating last fallback
        if (bestScore <= 0) {
          const lastCristiano = messages.filter(m => m.role === 'cristiano').pop()?.content || '';
          bestIdx = fallbacks.findIndex(fb => fb.text !== lastCristiano);
          if (bestIdx < 0) bestIdx = messages.length % fallbacks.length;
        }
        const cristianoReply: ChatMessage = {
          role: 'cristiano',
          content: fallbacks[bestIdx].text,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, cristianoReply]);
      }
    } catch {
      // Offline fallback
      const cristianoReply: ChatMessage = {
        role: 'cristiano',
        content: 'Let\'s set the API aside for now. Back to the numbers — your gross margin tells a different story than your pitch deck. Reconcile that for me.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, cristianoReply]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, valuationRunId, buyerType, companyName, enterpriseValue]);

  // End session and score
  const handleEndSession = useCallback(() => {
    const userMsgCount = messages.filter((m) => m.role === 'user').length;
    const totalExchanges = messages.length;

    // Simple heuristic scoring (would be LLM-scored in production)
    const avgResponseLength =
      messages
        .filter((m) => m.role === 'user')
        .reduce((sum, m) => sum + m.content.length, 0) / Math.max(1, userMsgCount);

    const score = Math.min(
      100,
      Math.round(
        30 + // base
        Math.min(30, userMsgCount * 6) + // engagement
        Math.min(20, avgResponseLength / 15) + // depth of response
        Math.min(20, totalExchanges * 2), // sustained dialogue
      ),
    );

    // Derive weak/strong points from message content
    const allUserText = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content.toLowerCase())
      .join(' ');

    const dynamicStrong: string[] = [];
    const dynamicWeak: string[] = [];

    // Evidence usage
    if (/data|evidence|metric|report|source|audit/.test(allUserText)) {
      dynamicStrong.push('Referenced data and evidence to support arguments');
    } else {
      dynamicWeak.push('Arguments lacked supporting data or evidence');
    }

    // Valuation methodology
    if (/dcf|multiple|comparable|discount|wacc|method|reconcil/.test(allUserText)) {
      dynamicStrong.push('Demonstrated valuation methodology knowledge');
    } else {
      dynamicWeak.push('Did not reference specific valuation methodologies');
    }

    // Risk awareness
    if (/risk|mitigat|churn|runway|burn|retention|diversif/.test(allUserText)) {
      dynamicStrong.push('Addressed risks and mitigation strategies');
    } else {
      dynamicWeak.push('Risk factors were not adequately addressed');
    }

    // Sustained engagement
    if (userMsgCount >= 3) {
      dynamicStrong.push('Sustained defence through multiple rounds');
    } else {
      dynamicWeak.push('Session ended before building sustained dialogue');
    }

    // Response depth
    if (avgResponseLength > 150) {
      dynamicStrong.push('Provided detailed, substantive responses');
    } else if (avgResponseLength < 50) {
      dynamicWeak.push('Responses were too brief to be persuasive');
    }

    setSessionScore({
      overallScore: score,
      questionsAsked: messages.filter((m) => m.role === 'cristiano').length,
      weakPoints: dynamicWeak.length > 0 ? dynamicWeak.slice(0, 3) : ['No major weaknesses identified'],
      strongPoints: dynamicStrong.length > 0 ? dynamicStrong.slice(0, 3) : ['Engaged with the challenge'],
    });
    setSessionActive(false);
  }, [messages]);

  // Elapsed time — computed at render for the end-of-session score card
  // (parent WarRoom header shows the live timer via its own setInterval)
  const elapsed = startTime
    ? Math.floor((Date.now() - startTime) / 1000)
    : 0;

  return (
    <div className="glass-card p-4 sm:p-6 flex flex-col" style={{ minHeight: 'min(500px, 70vh)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            <GlossaryTooltip fieldKey="deal_room_sim">
              <span>Deal Room</span>
            </GlossaryTooltip>
          </h3>
          <p className="text-[11px] text-text-secondary">
            Cristiano stress-tests your valuation defence for {companyName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!sessionActive && !sessionScore && (
            <button
              onClick={handleStartSession}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 text-coral-downside border border-red-500/30 hover:bg-red-500/30 transition-colors focus-visible:ring-2 focus-visible:ring-aurum focus-visible:outline-none"
            >
              Start Session
            </button>
          )}
          {sessionActive && (
            <button
              onClick={handleEndSession}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-graphite text-text-primary hover:bg-graphite/80 transition-colors focus-visible:ring-2 focus-visible:ring-aurum focus-visible:outline-none"
            >
              End &amp; Score
            </button>
          )}
          {sessionScore && (
            <button
              onClick={handleStartSession}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-cyan-interactive/20 text-cyan-interactive border border-sky-500/30 hover:bg-cyan-interactive/30 transition-colors focus-visible:ring-2 focus-visible:ring-aurum focus-visible:outline-none"
            >
              New Session
            </button>
          )}
        </div>
      </div>

      {/* Valuation context bar */}
      <div className="mb-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-text-secondary">
        <span className="shrink-0">
          EV: {formatCurrency(enterpriseValue.low)} – {formatCurrency(enterpriseValue.high)}
        </span>
        <span className="shrink-0">Base: {formatCurrency(enterpriseValue.base)}</span>
        <span className="capitalize shrink-0">{buyerType.replace(/_/g, ' ')}</span>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-0 pr-1" aria-live="polite" aria-relevant="additions">
        {messages.length === 0 && !sessionScore && (
          <div className="text-center py-12">
            <p className="text-xs text-text-secondary">
              Click &ldquo;Start Session&rdquo; to begin. Cristiano will challenge your valuation
              from the perspective of a {buyerType.replace(/_/g, ' ')} investor.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                msg.role === 'cristiano'
                  ? 'bg-red-500/10 border border-red-500/20 text-text-primary'
                  : 'bg-cyan-interactive/10 border border-sky-500/20 text-text-primary'
              }`}
            >
              <span
                className={`text-[11px] font-semibold block mb-0.5 ${
                  msg.role === 'cristiano' ? 'text-coral-downside' : 'text-cyan-interactive'
                }`}
              >
                {msg.role === 'cristiano' ? 'Cristiano' : 'You'}
              </span>
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <span className="text-[11px] font-semibold text-coral-downside block mb-0.5">
                Cristiano
              </span>
              <span className="text-xs text-text-secondary animate-pulse">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      {sessionActive && (
        <div className="flex flex-col sm:flex-row gap-2">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Defend your valuation... (Shift+Enter for new line)"
            disabled={isLoading}
            className="flex-1 px-3 py-2 min-h-[44px] rounded-lg border border-white/10 bg-white/[0.03] text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-cyan-interactive/40 disabled:opacity-50 resize-none"
          />
          <button
            onClick={() => void handleSend()}
            disabled={isLoading || !input.trim()}
            className="w-full sm:w-auto px-4 py-2 min-h-[44px] rounded-lg text-xs font-semibold bg-cyan-interactive text-text-inverse hover:bg-cyan-interactive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
          >
            Send
          </button>
        </div>
      )}

      {/* Score card */}
      {sessionScore && (
        <div className="mt-4 p-4 rounded-lg border border-white/10 bg-white/[0.02]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-text-primary">Readiness Score</h4>
            <span
              className={`text-2xl font-bold tabular-nums ${
                sessionScore.overallScore >= 70
                  ? 'text-jade-upside'
                  : sessionScore.overallScore >= 50
                    ? 'text-status-warning'
                    : 'text-coral-downside'
              }`}
            >
              {sessionScore.overallScore}/100
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-coral-downside font-semibold mb-1 uppercase tracking-wider">
                Exposures
              </p>
              {sessionScore.weakPoints.map((wp, i) => (
                <p key={i} className="text-[11px] text-text-secondary mb-0.5">
                  &bull; {wp}
                </p>
              ))}
            </div>
            <div>
              <p className="text-[11px] text-jade-upside font-semibold mb-1 uppercase tracking-wider">
                Strengths
              </p>
              {sessionScore.strongPoints.map((sp, i) => (
                <p key={i} className="text-[11px] text-text-secondary mb-0.5">
                  &bull; {sp}
                </p>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-text-secondary mt-2">
            {sessionScore.questionsAsked} challenges posed over{' '}
            {Math.floor(elapsed / 60)}m {elapsed % 60}s
          </p>
        </div>
      )}
    </div>
  );
}
