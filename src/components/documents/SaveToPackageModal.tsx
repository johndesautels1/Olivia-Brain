"use client";

import { useState, useEffect, useCallback } from "react";

interface PackageOption {
  id: string;
  name: string;
  outreachGoal: string;
  packageStatus: string;
}

const OUTREACH_GOALS = [
  { value: "fundraising", label: "Fundraising" },
  { value: "strategic_partnership", label: "Strategic Partnership" },
  { value: "white_label", label: "White Label" },
  { value: "pilot", label: "Pilot" },
  { value: "reseller", label: "Reseller" },
  { value: "acquisition", label: "Acquisition" },
  { value: "enterprise_sales", label: "Enterprise Sales" },
];

interface SaveToPackageModalProps {
  documentId: string;
  documentTitle: string;
  onClose: () => void;
}

export function SaveToPackageModal({ documentId, documentTitle, onClose }: SaveToPackageModalProps) {
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"select" | "create">("select");
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [newName, setNewName] = useState("");
  const [newGoal, setNewGoal] = useState("fundraising");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ success: boolean; packageName: string; packageId: string } | null>(null);
  const [error, setError] = useState("");

  // Fetch user's packages
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/packages");
        if (res.ok) {
          const data = await res.json();
          setPackages(data);
          if (data.length === 0) setMode("create");
        }
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSaveToExisting = useCallback(async () => {
    if (!selectedPackageId) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/packages/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: selectedPackageId, documentId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to add document" }));
        setError(data.error || "Failed to add document to package");
        return;
      }
      const pkg = packages.find((p) => p.id === selectedPackageId);
      setResult({ success: true, packageName: pkg?.name ?? "Package", packageId: selectedPackageId });
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }, [selectedPackageId, documentId, packages]);

  const handleCreateAndSave = useCallback(async () => {
    if (!newName.trim()) {
      setError("Package name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      // Create the package
      const createRes = await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), outreachGoal: newGoal }),
      });
      if (!createRes.ok) {
        setError("Failed to create package");
        return;
      }
      const newPkg = await createRes.json();

      // Add document to it
      const addRes = await fetch("/api/packages/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: newPkg.id, documentId }),
      });
      if (!addRes.ok) {
        setError("Package created but failed to add document");
        return;
      }
      setResult({ success: true, packageName: newPkg.name, packageId: newPkg.id });
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }, [newName, newGoal, documentId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-to-package-title"
    >
      {/* Backdrop — mouse-only dismiss; keyboard users dismiss via Esc (above) or close X */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />

      {/* Modal */}
      <div
        className="relative mx-4 w-full max-w-md rounded-xl p-6 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.97) 0%, rgba(10, 14, 26, 0.99) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gold top accent */}
        <div
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{ background: "linear-gradient(90deg, transparent 5%, rgba(196,169,106,0.4) 30%, rgba(196,169,106,0.6) 50%, rgba(196,169,106,0.4) 70%, transparent 95%)" }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 p-1 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          aria-label="Close"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        {/* ── Success state ── */}
        {result ? (
          <div className="text-center py-4">
            <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h3 id="save-to-package-title" className="text-sm font-semibold text-[var(--foreground)]">Added to Package</h3>
            <p className="mt-1 text-xs text-[var(--muted)]">
              &ldquo;{documentTitle}&rdquo; has been added to <span className="text-[var(--foreground)] font-medium">{result.packageName}</span>
            </p>
            <div className="mt-5 flex gap-2 justify-center">
              <a
                href={`/packages`}
                className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
              >
                View Package
              </a>
              <button
                onClick={onClose}
                className="rounded-md border border-[var(--card-border)] px-4 py-2 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── Header ── */}
            <h2 id="save-to-package-title" className="text-sm font-semibold text-[var(--foreground)] pr-6">Save to Package</h2>
            <p className="mt-1 text-xs text-[var(--muted)] line-clamp-1">{documentTitle}</p>

            {loading ? (
              <div className="mt-6 flex justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              </div>
            ) : (
              <>
                {/* ── Mode tabs ── */}
                {packages.length > 0 && (
                  <div className="mt-4 flex gap-1 rounded-lg p-1" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <button
                      onClick={() => { setMode("select"); setError(""); }}
                      className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        mode === "select"
                          ? "bg-indigo-600 text-white"
                          : "text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      Existing Package
                    </button>
                    <button
                      onClick={() => { setMode("create"); setError(""); }}
                      className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        mode === "create"
                          ? "bg-indigo-600 text-white"
                          : "text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      New Package
                    </button>
                  </div>
                )}

                {/* ── Select existing ── */}
                {mode === "select" && packages.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <select
                      value={selectedPackageId}
                      onChange={(e) => setSelectedPackageId(e.target.value)}
                      className="w-full rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select a package…</option>
                      {packages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name} ({pkg.outreachGoal.replace(/_/g, " ")})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleSaveToExisting}
                      disabled={!selectedPackageId || saving}
                      className="w-full rounded-md bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {saving ? "Saving…" : "Add to Package"}
                    </button>
                  </div>
                )}

                {/* ── Create new ── */}
                {mode === "create" && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">Package Name</label>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Seed Round — Acme Corp"
                        className="w-full rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">Outreach Goal</label>
                      <select
                        value={newGoal}
                        onChange={(e) => setNewGoal(e.target.value)}
                        className="w-full rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {OUTREACH_GOALS.map((g) => (
                          <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handleCreateAndSave}
                      disabled={!newName.trim() || saving}
                      className="w-full rounded-md bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {saving ? "Creating…" : "Create Package & Add Document"}
                    </button>
                  </div>
                )}

                {/* ── Error ── */}
                {error && (
                  <p className="mt-3 text-xs text-red-400">{error}</p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
