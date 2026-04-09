/**
 * OLIVIA BRAIN - EMOTION/GESTURE STATE POLICY
 * ============================================
 *
 * Defines rules for emotional expression and gesture selection.
 * Maps conversation context to appropriate avatar states.
 *
 * Policy Goals:
 * - Natural, contextually appropriate expressions
 * - Persona-consistent behavior (Cristiano is always authoritative)
 * - Smooth transitions between states
 * - Avoid uncanny valley through restraint
 */

import type { EmotionState, GestureState } from "./types";
import { getAvatarIdentity, isEmotionAllowed, isGestureAllowed } from "./identity";

export interface ConversationContext {
  intent: string;
  sentiment?: "positive" | "neutral" | "negative";
  isQuestion?: boolean;
  isConclusion?: boolean;
  isGreeting?: boolean;
  isEmphasis?: boolean;
  topicType?: "financial" | "emotional" | "technical" | "general";
}

export interface StateRecommendation {
  emotion: EmotionState;
  gesture: GestureState;
  transitionDuration: number; // ms
  holdDuration?: number; // ms - how long to maintain before returning to default
}

/**
 * Maps conversation context to recommended avatar states.
 * Returns persona-appropriate states based on identity constraints.
 */
export function recommendState(
  personaId: string,
  context: ConversationContext
): StateRecommendation {
  const identity = getAvatarIdentity(personaId);
  if (!identity) {
    return {
      emotion: "neutral",
      gesture: "idle",
      transitionDuration: 300,
    };
  }

  // Start with defaults
  let emotion: EmotionState = identity.defaultEmotion;
  let gesture: GestureState = identity.defaultGesture;
  let transitionDuration = 300;
  let holdDuration: number | undefined;

  // Context-based recommendations
  if (context.isGreeting) {
    emotion = "welcoming";
    gesture = "speaking";
    holdDuration = 2000;
  } else if (context.isConclusion) {
    emotion = "confident";
    gesture = "presenting";
    holdDuration = 3000;
  } else if (context.isQuestion) {
    emotion = "thoughtful";
    gesture = "listening";
  } else if (context.isEmphasis) {
    emotion = "emphatic";
    gesture = "emphasizing";
    transitionDuration = 200;
    holdDuration = 1500;
  }

  // Sentiment adjustments
  if (context.sentiment === "positive") {
    emotion = "happy";
  } else if (context.sentiment === "negative") {
    emotion = "concerned";
  }

  // Topic adjustments
  if (context.topicType === "financial" || context.topicType === "technical") {
    emotion = "confident";
    gesture = "presenting";
  }

  // Cristiano overrides - always authoritative
  if (personaId === "cristiano") {
    emotion = "confident";
    gesture = context.isConclusion ? "presenting" : "speaking";
    transitionDuration = 500; // Slower, more deliberate
  }

  // Emelia overrides - voice only, minimal states
  if (personaId === "emelia") {
    emotion = "neutral";
    gesture = "idle";
  }

  // Enforce persona constraints
  if (!isEmotionAllowed(personaId, emotion)) {
    emotion = identity.defaultEmotion;
  }
  if (!isGestureAllowed(personaId, gesture)) {
    gesture = identity.defaultGesture;
  }

  return {
    emotion,
    gesture,
    transitionDuration,
    holdDuration,
  };
}

/**
 * Intent-to-state mapping for quick lookups
 */
const INTENT_STATE_MAP: Record<string, Partial<StateRecommendation>> = {
  planning: { emotion: "thoughtful", gesture: "thinking" },
  research: { emotion: "thoughtful", gesture: "speaking" },
  operations: { emotion: "confident", gesture: "presenting" },
  questionnaire: { emotion: "welcoming", gesture: "listening" },
  math: { emotion: "confident", gesture: "presenting" },
  judge: { emotion: "confident", gesture: "presenting" },
  general: { emotion: "neutral", gesture: "speaking" },
};

export function getStateForIntent(
  personaId: string,
  intent: string
): StateRecommendation {
  const baseState = INTENT_STATE_MAP[intent] ?? INTENT_STATE_MAP.general;

  return recommendState(personaId, {
    intent,
    sentiment: "neutral",
  });
}

/**
 * Validates a state transition is appropriate
 */
export function isValidTransition(
  fromEmotion: EmotionState,
  toEmotion: EmotionState
): boolean {
  // Most transitions are valid, but some are jarring
  const jarringTransitions: Array<[EmotionState, EmotionState]> = [
    ["happy", "concerned"],
    ["concerned", "happy"],
    ["emphatic", "neutral"],
  ];

  return !jarringTransitions.some(
    ([from, to]) => from === fromEmotion && to === toEmotion
  );
}

/**
 * Suggests an intermediate state for smoother transitions
 */
export function getTransitionState(
  fromEmotion: EmotionState,
  toEmotion: EmotionState
): EmotionState | null {
  if (isValidTransition(fromEmotion, toEmotion)) {
    return null; // Direct transition is fine
  }

  // Use neutral as intermediate for jarring transitions
  return "neutral";
}

export const EMOTION_DESCRIPTIONS: Record<EmotionState, string> = {
  neutral: "Calm, attentive baseline expression",
  happy: "Warm smile, engaged and positive",
  confident: "Assured expression, slight smile, direct gaze",
  thoughtful: "Slight head tilt, considering expression",
  concerned: "Empathetic expression, showing care",
  emphatic: "Animated expression for emphasis",
  welcoming: "Open, inviting expression with warm smile",
};

export const GESTURE_DESCRIPTIONS: Record<GestureState, string> = {
  idle: "Relaxed, attentive posture",
  speaking: "Natural speaking gestures, moderate movement",
  listening: "Attentive posture, minimal movement, occasional nods",
  nodding: "Affirmative head movement",
  thinking: "Hand to chin, contemplative posture",
  presenting: "Open palms, confident presentation stance",
  emphasizing: "Deliberate hand gestures for key points",
};
