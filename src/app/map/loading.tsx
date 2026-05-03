export default function MapLoading() {
  return (
    <div className="h-[calc(100vh-8rem)] w-full flex items-center justify-center bg-[var(--background)]">
      <div className="text-center">
        <div className="mb-3 h-10 w-10 animate-spin rounded-full border-[3px] border-indigo-500/30 border-t-indigo-400 mx-auto" />
        <p className="text-sm text-[var(--muted)]">Loading London tech ecosystem...</p>
      </div>
    </div>
  );
}
