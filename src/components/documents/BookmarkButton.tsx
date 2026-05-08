"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

interface BookmarkButtonProps {
  documentId: string;
  size?: "sm" | "md";
}

export function BookmarkButton({ documentId, size = "md" }: BookmarkButtonProps) {
  const { isSignedIn } = useUser();
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSignedIn) return;
    fetch(`/api/documents/bookmark?documentId=${documentId}`)
      .then((res) => res.json())
      .then((data) => setBookmarked(data.bookmarked))
      .catch(() => {});
  }, [documentId, isSignedIn]);

  if (!isSignedIn) return null;

  const toggle = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/documents/bookmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });
      const data = await res.json();
      if (res.ok) {
        setBookmarked(data.bookmarked);
      } else if (data.error?.includes("profile")) {
        setError("profile");
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const btnPadding = size === "sm" ? "p-1.5" : "p-2";

  return (
    <div className="relative inline-block">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggle();
        }}
        disabled={loading}
        className={`${btnPadding} rounded-md border transition-colors ${
          bookmarked
            ? "border-amber-500/50 bg-amber-900/30 text-amber-300 hover:bg-amber-900/50"
            : "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--muted)] hover:text-amber-300 hover:border-amber-500/30"
        } ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
        title={bookmarked ? "Remove bookmark" : "Bookmark this document"}
        aria-label={bookmarked ? "Remove bookmark" : "Bookmark this document"}
      >
        <svg
          className={iconSize}
          viewBox="0 0 24 24"
          fill={bookmarked ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
        </svg>
      </button>
      {error === "profile" && (
        <div className="absolute top-full mt-1 right-0 whitespace-nowrap rounded bg-red-950 border border-red-800/40 px-2 py-1 text-[11px] text-red-400 z-10">
          <a href="/profile" className="underline hover:text-red-300">Create a profile</a> first
        </div>
      )}
    </div>
  );
}
