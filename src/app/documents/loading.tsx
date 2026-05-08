export default function DocumentsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <div className="h-8 w-48 rounded bg-[var(--card-border)] animate-pulse" />
        <div className="mt-2 h-4 w-64 rounded bg-[var(--card-border)] animate-pulse" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
            <div className="h-5 w-40 rounded bg-[var(--card-border)] animate-pulse" />
            <div className="mt-2 h-3 w-24 rounded bg-[var(--card-border)] animate-pulse" />
            <div className="mt-4 h-12 w-full rounded bg-[var(--card-border)] animate-pulse" />
            <div className="mt-3 flex gap-2">
              <div className="h-5 w-16 rounded bg-[var(--card-border)] animate-pulse" />
              <div className="h-5 w-16 rounded bg-[var(--card-border)] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
