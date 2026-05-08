"use client";

import { useCallback, useState } from "react";
import { useUser } from "@clerk/nextjs";

/**
 * Inputs that decide whether the "Save to My Documents" affordance is
 * shown for a given Document row, and what payload to send when the
 * user activates it.
 *
 * The same row data drives the visibility check (`canSave`) and the
 * fetch call, so consolidating both into one hook means the rule
 * "this is a forkable public template" is defined once and consumed
 * by both the card 3-dots dropdown and the detail-page button.
 */
export interface UseSaveToMyDocumentsInput {
  documentId: string;
  /** Tri-state on purpose:
   *   - `true`  — known template, forkable.
   *   - `false` — known non-template, hide the affordance.
   *   - `undefined` — unknown; assume forkable and let the API
   *     reject if the row turns out not to be one. */
  isTemplate?: boolean;
  /** When set, the row already has an owner (it's already a private
   *  copy). Hide the affordance. */
  ownerUserId?: string | null;
  /** External-link content (e.g. cascade research reports) is not
   *  forkable into the user's library — there's no body to copy. */
  contentSourceType?: string | null;
}

export type SaveToMyDocumentsResult =
  | {
      ok: true;
      alreadyOwned: boolean;
      document: { id: string; slug?: string | null; title?: string | null };
    }
  | { ok: false; error: string };

export interface UseSaveToMyDocumentsApi {
  /** Whether the affordance should render. False when the user isn't
   *  signed in, when the row already has an owner, when isTemplate is
   *  explicitly false, or when contentSourceType is external_link. */
  canSave: boolean;
  /** True while a fetch is in flight. */
  saving: boolean;
  /** Idempotent fork. Returns a discriminated result so the consumer
   *  decides whether to surface a toast vs. inline hint vs. silent
   *  refresh. Re-calling with an already-forked template returns
   *  `{ ok: true, alreadyOwned: true }`. */
  save: () => Promise<SaveToMyDocumentsResult>;
}

const SAVE_FROM_TEMPLATE_ENDPOINT =
  "/api/me/documents/save-from-template";

/**
 * Single source of truth for the "Save to My Documents" action.
 *
 * Used by:
 *   - `SaveToMyDocumentsButton` (document detail page header).
 *   - `DocumentActionBar` `save-to-library` action (card 3-dots
 *     dropdown + analysis surfaces that mount the action bar).
 *
 * The visibility predicate and the fetch live here together so the
 * two surfaces can never drift on the rule of "what counts as a
 * forkable template."
 */
export function useSaveToMyDocuments(
  input: UseSaveToMyDocumentsInput,
): UseSaveToMyDocumentsApi {
  const { isSignedIn } = useUser();
  const [saving, setSaving] = useState(false);

  const canSave =
    !!isSignedIn &&
    input.isTemplate !== false &&
    !input.ownerUserId &&
    input.contentSourceType !== "external_link";

  const save = useCallback(async (): Promise<SaveToMyDocumentsResult> => {
    if (!canSave) {
      return { ok: false, error: "Cannot save this document" };
    }
    if (saving) {
      return { ok: false, error: "Save already in flight" };
    }
    setSaving(true);
    try {
      const res = await fetch(SAVE_FROM_TEMPLATE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: input.documentId }),
      });
      const data = (await res
        .json()
        .catch(() => ({}) as Record<string, unknown>)) as Record<string, unknown>;
      if (!res.ok) {
        return {
          ok: false,
          error:
            typeof data?.error === "string"
              ? (data.error as string)
              : `Save failed (HTTP ${res.status})`,
        };
      }
      const docRaw = (data?.document ?? {}) as Record<string, unknown>;
      return {
        ok: true,
        alreadyOwned: !!data?.alreadyOwned,
        document: {
          id: typeof docRaw.id === "string" ? docRaw.id : input.documentId,
          slug: typeof docRaw.slug === "string" ? docRaw.slug : null,
          title: typeof docRaw.title === "string" ? docRaw.title : null,
        },
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Network error during save",
      };
    } finally {
      setSaving(false);
    }
  }, [canSave, saving, input.documentId]);

  return { canSave, saving, save };
}
