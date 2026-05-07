// Track V Session V9 will replace this stub with the LTM port.
export { NegotiationAnchorCardPlaceholder as default } from "./_v9-placeholders";

/**
 * `ChallengeResponse` is shared between `NegotiationAnchorCard` (V9) and
 * `ValuationWorkbench` (V8). Surface the contract here so V8 type-checks
 * before the V9 port lands.
 */
export interface ChallengeResponse {
  challenge: string;
  response: string;
}
