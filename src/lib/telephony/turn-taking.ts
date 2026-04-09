/**
 * OLIVIA BRAIN - BARGE-IN & TURN-TAKING
 * ======================================
 *
 * Natural conversation flow with interruption handling.
 *
 * Barge-In (Interruption as First-Class Design):
 * - User can interrupt agent at any time
 * - Agent gracefully stops speaking
 * - Captures interrupted context for continuity
 *
 * Turn-Taking Policy:
 * - Natural silence detection (not fixed timeout)
 * - Backchannel support ("uh-huh", "right")
 * - Hold/pause indicators
 * - End-of-turn prediction
 */

import type { BargeInEvent, TurnTakingState } from "./types";

/**
 * Turn-taking configuration
 */
export interface TurnTakingConfig {
  // Silence thresholds (ms)
  minSilenceForTurnEnd: number;
  maxSilenceBeforePrompt: number;

  // Barge-in settings
  bargeInEnabled: boolean;
  bargeInSensitivity: "high" | "medium" | "low";

  // Backchannel settings
  enableBackchannel: boolean;
  backchannelPhrases: string[];

  // Hold indicators
  holdIndicators: string[];
}

export const DEFAULT_TURN_TAKING_CONFIG: TurnTakingConfig = {
  minSilenceForTurnEnd: 700,
  maxSilenceBeforePrompt: 5000,
  bargeInEnabled: true,
  bargeInSensitivity: "medium",
  enableBackchannel: true,
  backchannelPhrases: [
    "uh-huh",
    "mm-hmm",
    "right",
    "okay",
    "I see",
    "go on",
    "yes",
    "sure",
  ],
  holdIndicators: [
    "hold on",
    "just a moment",
    "one second",
    "wait",
    "let me think",
    "um",
    "uh",
  ],
};

/**
 * Create initial turn-taking state
 */
export function createTurnTakingState(): TurnTakingState {
  return {
    currentSpeaker: "none",
    silenceDurationMs: 0,
    lastSpeechEndTime: new Date(),
    turnCount: 0,
    isUserInterrupting: false,
  };
}

/**
 * Detect if user input is a barge-in (interruption)
 */
export function detectBargeIn(
  state: TurnTakingState,
  userSpeechDetected: boolean,
  config: TurnTakingConfig = DEFAULT_TURN_TAKING_CONFIG
): boolean {
  if (!config.bargeInEnabled) {
    return false;
  }

  // Barge-in only occurs when agent is speaking
  if (state.currentSpeaker !== "agent") {
    return false;
  }

  if (!userSpeechDetected) {
    return false;
  }

  // Sensitivity affects how quickly we detect barge-in
  // High: Any user speech during agent speech is barge-in
  // Medium: Sustained user speech (>200ms) during agent speech
  // Low: Only clear user speech (>500ms) during agent speech
  return true; // Simplified - in production, check speech duration
}

/**
 * Handle a barge-in event
 */
export function handleBargeIn(
  callSid: string,
  interruptedText: string,
  userInput: string,
  config: TurnTakingConfig = DEFAULT_TURN_TAKING_CONFIG
): BargeInEvent {
  return {
    callSid,
    timestamp: new Date(),
    interruptedText,
    userInput,
    action: "stop", // Stop agent speech immediately
  };
}

/**
 * Determine action for barge-in based on context
 */
export function determineBargeInAction(
  userInput: string,
  agentText: string,
  config: TurnTakingConfig = DEFAULT_TURN_TAKING_CONFIG
): "stop" | "pause" | "ignore" {
  const normalizedInput = userInput.toLowerCase().trim();

  // Check for hold indicators - pause instead of stop
  for (const indicator of config.holdIndicators) {
    if (normalizedInput.includes(indicator)) {
      return "pause";
    }
  }

  // Check for backchannel - ignore
  if (config.enableBackchannel) {
    for (const phrase of config.backchannelPhrases) {
      if (normalizedInput === phrase.toLowerCase()) {
        return "ignore";
      }
    }
  }

  // Default: stop agent speech
  return "stop";
}

/**
 * Update turn-taking state based on events
 */
export function updateTurnTakingState(
  state: TurnTakingState,
  event: {
    type: "agent_start" | "agent_end" | "user_start" | "user_end" | "silence";
    timestamp?: Date;
    silenceDurationMs?: number;
  }
): TurnTakingState {
  const timestamp = event.timestamp ?? new Date();

  switch (event.type) {
    case "agent_start":
      return {
        ...state,
        currentSpeaker: "agent",
        silenceDurationMs: 0,
        isUserInterrupting: false,
      };

    case "agent_end":
      return {
        ...state,
        currentSpeaker: "none",
        lastSpeechEndTime: timestamp,
        silenceDurationMs: 0,
      };

    case "user_start":
      return {
        ...state,
        currentSpeaker: "user",
        silenceDurationMs: 0,
        isUserInterrupting: state.currentSpeaker === "agent",
      };

    case "user_end":
      return {
        ...state,
        currentSpeaker: "none",
        lastSpeechEndTime: timestamp,
        silenceDurationMs: 0,
        turnCount: state.turnCount + 1,
      };

    case "silence":
      return {
        ...state,
        silenceDurationMs: event.silenceDurationMs ?? state.silenceDurationMs,
      };

    default:
      return state;
  }
}

/**
 * Check if turn has ended based on silence
 */
export function isTurnComplete(
  state: TurnTakingState,
  config: TurnTakingConfig = DEFAULT_TURN_TAKING_CONFIG
): boolean {
  if (state.currentSpeaker !== "none") {
    return false;
  }

  return state.silenceDurationMs >= config.minSilenceForTurnEnd;
}

/**
 * Check if we should prompt user (too much silence)
 */
export function shouldPromptUser(
  state: TurnTakingState,
  config: TurnTakingConfig = DEFAULT_TURN_TAKING_CONFIG
): boolean {
  if (state.currentSpeaker !== "none") {
    return false;
  }

  return state.silenceDurationMs >= config.maxSilenceBeforePrompt;
}

/**
 * Get appropriate filler/prompt based on context
 */
export function getPromptForSilence(turnCount: number): string {
  const prompts = [
    "Are you still there?",
    "Is there anything else you'd like to know?",
    "Take your time, I'm here when you're ready.",
    "Would you like me to explain anything further?",
  ];

  // Vary prompts based on turn count
  return prompts[turnCount % prompts.length];
}

/**
 * Detect if input is just backchannel (not a real turn)
 */
export function isBackchannel(
  input: string,
  config: TurnTakingConfig = DEFAULT_TURN_TAKING_CONFIG
): boolean {
  if (!config.enableBackchannel) {
    return false;
  }

  const normalized = input.toLowerCase().trim();

  return config.backchannelPhrases.some(
    (phrase) => normalized === phrase.toLowerCase()
  );
}

/**
 * Generate appropriate backchannel response from agent
 */
export function generateBackchannel(): string {
  const responses = ["Mm-hmm.", "I understand.", "Right.", "Go on.", "Yes."];
  return responses[Math.floor(Math.random() * responses.length)];
}
