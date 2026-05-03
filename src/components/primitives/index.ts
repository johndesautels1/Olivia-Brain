/**
 * Primitives barrel — Studio Olivia design-system primitives.
 *
 * § 8.1 (Button, Input, Card, Modal, Toast — Radix-headless wrappers)
 * and § 8.2 (AvatarOrb, AgentStrip, ScoreChip, VerdictBlock,
 * TickerRail) per `docs/01_UI_DESIGN_SYSTEM.md`. Track C lands
 * primitives session-by-session; this barrel grows as they ship.
 *
 * # Session 14
 * - `AvatarOrb` (placeholder)
 *
 * # Session 15
 * - `AvatarOrb` (full impl — LiveAvatar wrapping + council mode + Cristiano transition)
 * - `Badge`
 * - `CompletionRing`
 * - `ConsensusDots`
 * - `DeckDetailModal`
 */

export { AvatarOrb } from "./AvatarOrb";
export type {
  AvatarOrbProps,
  AvatarOrbSize,
  AvatarOrbState,
  SubAgent,
  SubAgentKind,
} from "./AvatarOrb";

export { Badge } from "./Badge";
export type { BadgeProps } from "./Badge";

export { CompletionRing } from "./CompletionRing";
export type { CompletionRingProps } from "./CompletionRing";

export { ConsensusDots } from "./ConsensusDots";
export type { ConsensusDotsProps } from "./ConsensusDots";

export { DeckDetailModal } from "./DeckDetailModal";
export type { Deck, DeckDetailModalProps } from "./DeckDetailModal";
