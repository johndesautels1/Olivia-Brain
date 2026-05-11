"use client";

/**
 * StudioVoiceCommands — Voice command recognition for the Preparation Studio.
 *
 * Parses transcribed text for studio navigation and action commands.
 * Works as a post-processing layer on top of StudioVoiceInput transcripts.
 *
 * Supported commands:
 * - "next question" / "next"         → advance to next question
 * - "previous question" / "back"     → go to previous question
 * - "skip" / "skip this"             → skip current question
 * - "go to question [N]"             → jump to question N
 * - "research this" / "deep research"→ trigger deep research panel
 * - "read it back" / "read back"     → trigger TTS readback
 * - "pitch polish" / "polish this"   → trigger pitch polish modal
 * - "ask olivia [...]"               → send remainder to Olivia chat
 *
 * Usage:
 *   const { parseCommand } = useVoiceCommands({ onNext, onPrev, ... });
 *   // In voice transcript handler:
 *   const cmd = parseCommand(transcript);
 *   if (cmd) { /* command was handled * / }
 *   else { /* treat as dictation text * / }
 */

import { useCallback, useMemo } from "react";

// ── Command types ────────────────────────────────────────────────────

export type VoiceCommandType =
  | "next"
  | "previous"
  | "skip"
  | "jump"
  | "research"
  | "readback"
  | "pitch-polish"
  | "ask-olivia";

export interface VoiceCommandResult {
  type: VoiceCommandType;
  /** For "jump": the target question number (1-indexed) */
  targetQuestion?: number;
  /** For "ask-olivia": the query to send */
  oliviaQuery?: string;
  /** The raw matched phrase */
  matchedPhrase: string;
}

// ── Command patterns ─────────────────────────────────────────────────

interface CommandPattern {
  type: VoiceCommandType;
  patterns: RegExp[];
  /** If true, captures a group from the regex */
  hasCapture?: boolean;
}

const COMMAND_PATTERNS: CommandPattern[] = [
  {
    type: "next",
    patterns: [
      /^next\s*question$/i,
      /^next$/i,
      /^go\s*next$/i,
      /^move\s*on$/i,
    ],
  },
  {
    type: "previous",
    patterns: [
      /^previous\s*question$/i,
      /^previous$/i,
      /^go\s*back$/i,
      /^back$/i,
      /^last\s*question$/i,
    ],
  },
  {
    type: "skip",
    patterns: [
      /^skip$/i,
      /^skip\s*this$/i,
      /^skip\s*this\s*question$/i,
      /^skip\s*question$/i,
    ],
  },
  {
    type: "jump",
    patterns: [
      /^go\s*to\s*question\s*(\d+)$/i,
      /^jump\s*to\s*question\s*(\d+)$/i,
      /^question\s*(\d+)$/i,
      /^go\s*to\s*(\d+)$/i,
    ],
    hasCapture: true,
  },
  {
    type: "research",
    patterns: [
      /^research\s*this$/i,
      /^deep\s*research$/i,
      /^research$/i,
      /^look\s*this\s*up$/i,
      /^research\s*(?:the\s+)?(.+)$/i,
    ],
  },
  {
    type: "readback",
    patterns: [
      /^read\s*it\s*back$/i,
      /^read\s*back$/i,
      /^read\s*this$/i,
      /^play\s*back$/i,
      /^read\s*my\s*answer$/i,
    ],
  },
  {
    type: "pitch-polish",
    patterns: [
      /^pitch\s*polish$/i,
      /^polish\s*this$/i,
      /^rewrite\s*this$/i,
      /^investor\s*tone$/i,
      /^make\s*it\s*investor\s*ready$/i,
    ],
  },
  {
    type: "ask-olivia",
    patterns: [
      /^ask\s*olivia\s+(.+)$/i,
      /^olivia\s+(.+)$/i,
      /^hey\s*olivia\s+(.+)$/i,
    ],
    hasCapture: true,
  },
];

// ── Hook props ───────────────────────────────────────────────────────

interface UseVoiceCommandsProps {
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onJumpTo: (index: number) => void;
  onResearch?: () => void;
  onReadback?: () => void;
  onPitchPolish?: () => void;
  onAskOlivia?: (query: string) => void;
  totalQuestions: number;
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useVoiceCommands({
  onNext,
  onPrev,
  onSkip,
  onJumpTo,
  onResearch,
  onReadback,
  onPitchPolish,
  onAskOlivia,
  totalQuestions,
}: UseVoiceCommandsProps) {
  /**
   * Parse a transcript string and check if it matches a voice command.
   * Returns the command result if matched, or null if it's regular dictation.
   */
  const parseCommand = useCallback(
    (transcript: string): VoiceCommandResult | null => {
      const trimmed = transcript.trim();
      if (!trimmed) return null;

      for (const cmd of COMMAND_PATTERNS) {
        for (const pattern of cmd.patterns) {
          const match = trimmed.match(pattern);
          if (!match) continue;

          const result: VoiceCommandResult = {
            type: cmd.type,
            matchedPhrase: match[0],
          };

          // Execute the command
          switch (cmd.type) {
            case "next":
              onNext();
              return result;

            case "previous":
              onPrev();
              return result;

            case "skip":
              onSkip();
              return result;

            case "jump": {
              const num = parseInt(match[1], 10);
              if (num >= 1 && num <= totalQuestions) {
                result.targetQuestion = num;
                onJumpTo(num - 1); // Convert to 0-indexed
                return result;
              }
              return null; // Invalid question number
            }

            case "research":
              onResearch?.();
              return result;

            case "readback":
              onReadback?.();
              return result;

            case "pitch-polish":
              onPitchPolish?.();
              return result;

            case "ask-olivia": {
              const query = match[1]?.trim();
              if (query) {
                result.oliviaQuery = query;
                onAskOlivia?.(query);
                return result;
              }
              return null;
            }
          }
        }
      }

      // No command matched — this is regular dictation text
      return null;
    },
    [onNext, onPrev, onSkip, onJumpTo, onResearch, onReadback, onPitchPolish, onAskOlivia, totalQuestions]
  );

  /**
   * Check if a partial/interim transcript looks like it might be a command.
   * Used to show a "command detected" hint while user is still speaking.
   */
  const isLikelyCommand = useMemo(() => {
    const commandStarters = [
      /^next/i,
      /^previous/i,
      /^back/i,
      /^skip/i,
      /^go\s*to/i,
      /^jump/i,
      /^question\s*\d/i,
      /^research/i,
      /^read/i,
      /^pitch/i,
      /^polish/i,
      /^rewrite/i,
      /^ask\s*olivia/i,
      /^olivia/i,
      /^hey\s*olivia/i,
      /^move\s*on/i,
      /^look\s*this/i,
      /^make\s*it/i,
      /^investor/i,
    ];

    return (text: string): boolean => {
      const trimmed = text.trim();
      return commandStarters.some((p) => p.test(trimmed));
    };
  }, []);

  return { parseCommand, isLikelyCommand };
}
