/**
 * OLIVIA BRAIN - AVATAR VENDOR HEALTH REPORT
 * ===========================================
 *
 * Track O5c follow-up. Single source of truth for "is this vendor
 * actually wired in this environment?" — backs the
 * `/api/admin/avatar-vendors/status` endpoint and the wiring-status
 * panel on `/admin/avatar-eval`.
 *
 * Deliberately separate from the existing `getAvatarServiceStatus()`
 * in `index.ts`: that one feeds the realtime selector and is typed
 * to the 5 vendors that can be constructed server-side via REST. The
 * harness needs a flatter, additive list that includes `liveavatar`
 * (which the production avatar uses but the realtime selector can't
 * construct — its lifecycle lives in `OliviaVideoAvatar`).
 */

import { isSimliConfigured } from "./simli";
import { isSadTalkerConfigured } from "./sadtalker";
import { isHeyGenConfigured } from "./heygen";
import { isDIDConfigured } from "./did";
import { isTavusConfigured } from "./tavus";
import { isLiveAvatarConfigured } from "./liveavatar";

export interface VendorHealthReport {
  vendor: string;
  configured: boolean;
  /** Human-readable hint for what's missing when `configured = false`. */
  notes?: string;
}

const TAVUS_KEY_NOTE = "Set TAVUS_API_KEY in Vercel (Production + Preview, Sensitive)";
const SIMLI_KEY_NOTE = "Set SIMLI_API_KEY in Vercel (Production + Preview, Sensitive)";
const HEYGEN_KEY_NOTE = "Set HEYGEN_API_KEY in Vercel (Production + Preview, Sensitive)";
const DID_KEY_NOTE = "Set DID_API_KEY in Vercel (Production + Preview, Sensitive)";
const SADTALKER_KEY_NOTE = "Set REPLICATE_API_TOKEN in Vercel (Production + Preview, Sensitive)";
const LIVEAVATAR_KEY_NOTE = "Set both LIVEAVATAR_API_KEY and LIVEAVATAR_OLIVIA_AVATAR_ID in Vercel";

export function getAllVendorHealth(): VendorHealthReport[] {
  return [
    {
      vendor: "tavus",
      configured: isTavusConfigured(),
      notes: isTavusConfigured() ? undefined : TAVUS_KEY_NOTE,
    },
    {
      vendor: "simli",
      configured: isSimliConfigured(),
      notes: isSimliConfigured() ? undefined : SIMLI_KEY_NOTE,
    },
    {
      vendor: "heygen",
      configured: isHeyGenConfigured(),
      notes: isHeyGenConfigured() ? undefined : HEYGEN_KEY_NOTE,
    },
    {
      vendor: "did",
      configured: isDIDConfigured(),
      notes: isDIDConfigured() ? undefined : DID_KEY_NOTE,
    },
    {
      vendor: "sadtalker",
      configured: isSadTalkerConfigured(),
      notes: isSadTalkerConfigured() ? undefined : SADTALKER_KEY_NOTE,
    },
    {
      vendor: "liveavatar",
      configured: isLiveAvatarConfigured(),
      notes: isLiveAvatarConfigured() ? undefined : LIVEAVATAR_KEY_NOTE,
    },
  ];
}
