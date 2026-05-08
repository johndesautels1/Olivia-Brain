"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface PackageDeleteButtonProps {
  packageId: string;
  packageName: string;
}

export function PackageDeleteButton({ packageId, packageName }: PackageDeleteButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/packages/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId, status: "archived" }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch {
      // Silently fail
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }, [packageId, router]);

  if (confirming) {
    return (
      <div
        className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-[var(--card-bg)]/95 backdrop-blur-sm border border-red-500/30 p-4"
        onClick={(e) => e.preventDefault()}
      >
        <p className="text-xs font-medium text-[var(--foreground)] text-center">
          Delete &ldquo;{packageName}&rdquo;?
        </p>
        <p className="text-[11px] text-[var(--muted)] text-center">
          This will archive the package. It can be restored later.
        </p>
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirming(false); }}
            className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-[11px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(); }}
            disabled={deleting}
            className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[11px] font-medium text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            {deleting ? "Archiving..." : "Yes, Delete"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirming(true); }}
      className="absolute top-2 right-2 z-[5] flex h-6 w-6 items-center justify-center rounded border border-red-500/20 bg-red-500/[0.05] text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/15 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
      title="Delete package"
      aria-label={`Delete ${packageName}`}
    >
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
      </svg>
    </button>
  );
}
