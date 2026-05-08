"use client";

import { useState } from "react";
import { SaveToPackageModal } from "./SaveToPackageModal";

interface AddToPackageButtonProps {
  documentId: string;
  documentTitle: string;
}

export function AddToPackageButton({ documentId, documentTitle }: AddToPackageButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-xs text-[var(--muted)] hover:text-indigo-300 hover:border-indigo-500/50 transition-colors"
        title="Add to Package"
      >
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
        Add to Package
      </button>
      {open && (
        <SaveToPackageModal
          documentId={documentId}
          documentTitle={documentTitle}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
