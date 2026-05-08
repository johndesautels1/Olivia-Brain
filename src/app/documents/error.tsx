"use client";

export default function DocumentsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 text-center">
      <h2 className="text-xl font-bold text-[var(--foreground)]">Something went wrong</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Failed to load the document library. This may be a temporary issue.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-md bg-brand-600 px-6 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
