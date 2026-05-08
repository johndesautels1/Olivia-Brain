"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSaveToMyDocuments } from "./useSaveToMyDocuments";

interface SaveToMyDocumentsButtonProps {
  /** Document id of the public template to fork. */
  documentId: string;
  /** Required for hint visibility — only show this on rows that are
   *  forkable templates without a specific owner. The detail page
   *  already gates the page render on the same condition; this is a
   *  defence-in-depth check. */
  isTemplate: boolean;
  ownerUserId: string | null;
  size?: "sm" | "md";
}

// "Save to My Documents" — forks a public template into the signed-in
// user's private library. Visibility + fetch live in the shared
// useSaveToMyDocuments hook so this surface and the
// DocumentActionBar can never drift on the eligibility rule.
export function SaveToMyDocumentsButton({
  documentId,
  isTemplate,
  ownerUserId,
  size = "md",
}: SaveToMyDocumentsButtonProps) {
  const router = useRouter();
  const { canSave, saving, save } = useSaveToMyDocuments({
    documentId,
    isTemplate,
    ownerUserId,
  });
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!canSave) return null;

  const iconSize = size === "sm" ? "h-4 w-4" : "h-3.5 w-3.5";
  const padding =
    size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-xs";

  const handleClick = async () => {
    setHint(null);
    setError(null);
    const result = await save();
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setHint(
      result.alreadyOwned ? "Already in My Documents" : "Saved to My Documents",
    );
    // Nudge the current page's server data; the dashboard tile in
    // another tab re-fetches on next visit.
    router.refresh();
  };

  return (
    <div className="relative inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={saving}
        title="Save a private working copy to your dashboard My Documents tile"
        aria-label="Save to My Documents"
        className={`flex items-center gap-1.5 rounded-md border transition-colors disabled:opacity-60 ${padding}`}
        style={{
          background: "rgba(196, 169, 106, 0.1)",
          borderColor: "rgba(196, 169, 106, 0.25)",
          color: "#C4A96A",
        }}
      >
        <svg
          className={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859" />
          <path d="M2.25 13.838V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
        </svg>
        {saving ? "Saving…" : "Save to My Documents"}
      </button>

      {(hint || error) && (
        <span
          role="status"
          className={`text-[11px] ${error ? "text-red-400" : "text-emerald-300"}`}
        >
          {error ?? hint}
        </span>
      )}
    </div>
  );
}
