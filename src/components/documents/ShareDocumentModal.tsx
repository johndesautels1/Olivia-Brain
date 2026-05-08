"use client";

/**
 * ShareDocumentModal — à la carte single-document share UI.
 *
 * Opened from the dashboard "My Documents" tile via the Share icon. Two
 * tabs:
 *   - "New link"       create a fresh share token with optional recipient
 *                      email/name/message/expiry. On submit, displays the
 *                      shareable URL with copy-to-clipboard.
 *   - "Existing links" lists this document's shares with view counts and
 *                      a Revoke action per row.
 *
 * Plan-gating happens server-side in /api/documents/[id]/share. If the
 * caller's plan does not include sharing, POST returns 403 with an
 * upgrade message; the modal surfaces that as a friendly upgrade panel
 * instead of a dialog error.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface ShareRow {
  id: string;
  shareToken: string;
  recipientEmail: string | null;
  recipientName: string | null;
  message: string | null;
  expiresAt: string | null;
  isRevoked: boolean;
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
}

interface ShareDocumentModalProps {
  documentId: string;
  documentTitle: string;
  onClose: () => void;
}

type ModalTab = "new" | "existing";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso.slice(0, 16);
  }
}

export function ShareDocumentModal({
  documentId,
  documentTitle,
  onClose,
}: ShareDocumentModalProps) {
  const router = useRouter();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [tab, setTab] = useState<ModalTab>("new");

  // ── New-link form state ─────────────────────────────────────────────
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [message, setMessage] = useState("");
  const [expiresAt, setExpiresAt] = useState(""); // yyyy-mm-dd input
  const [submitting, setSubmitting] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [createdCopied, setCreatedCopied] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [planBlocked, setPlanBlocked] = useState<{
    message: string;
    upgradeUrl: string;
  } | null>(null);

  // ── Existing shares state ───────────────────────────────────────────
  const [shares, setShares] = useState<ShareRow[] | null>(null);
  const [loadingShares, setLoadingShares] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting && !revokingId) {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [submitting, revokingId, onClose]);

  const loadShares = useCallback(async () => {
    setLoadingShares(true);
    setListError(null);
    try {
      const res = await fetch(
        `/api/documents/${encodeURIComponent(documentId)}/share`,
      );
      if (!res.ok) {
        const body = await res
          .json()
          .catch(() => ({}) as Record<string, unknown>);
        const errMsg =
          typeof body?.error === "string"
            ? body.error
            : `Failed to load (HTTP ${res.status})`;
        setListError(errMsg);
        return;
      }
      const rows: ShareRow[] = await res.json();
      setShares(rows);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoadingShares(false);
    }
  }, [documentId]);

  // Load existing shares when the user switches to that tab. Cached for
  // the modal lifetime so a refresh requires the user to revoke or close.
  useEffect(() => {
    if (tab === "existing" && shares === null) {
      void loadShares();
    }
  }, [tab, shares, loadShares]);

  const handleCreate = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setFormError(null);
    setPlanBlocked(null);
    setCreatedUrl(null);
    setCreatedCopied(false);

    // Convert yyyy-mm-dd to end-of-day ISO so a "May 15" expiry stays
    // valid through the entire 15th in the user's local timezone.
    let expiresIso: string | undefined;
    if (expiresAt) {
      const parsed = new Date(`${expiresAt}T23:59:59`);
      if (isNaN(parsed.getTime())) {
        setFormError("Invalid expiry date.");
        setSubmitting(false);
        return;
      }
      expiresIso = parsed.toISOString();
    }

    try {
      const res = await fetch(
        `/api/documents/${encodeURIComponent(documentId)}/share`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientEmail: recipientEmail.trim() || undefined,
            recipientName: recipientName.trim() || undefined,
            message: message.trim() || undefined,
            expiresAt: expiresIso,
          }),
        },
      );

      const body = await res
        .json()
        .catch(() => ({}) as Record<string, unknown>);

      if (res.status === 403 && typeof body?.upgradeUrl === "string") {
        setPlanBlocked({
          message:
            typeof body?.error === "string"
              ? body.error
              : "Sharing isn't included on your plan.",
          upgradeUrl: body.upgradeUrl,
        });
        return;
      }
      if (!res.ok) {
        const errMsg =
          typeof body?.error === "string"
            ? body.error
            : `Failed (HTTP ${res.status})`;
        setFormError(errMsg);
        return;
      }

      const url =
        typeof body?.shareUrl === "string"
          ? body.shareUrl
          : `${window.location.origin}/documents/share/${
              typeof body?.shareToken === "string" ? body.shareToken : ""
            }`;
      setCreatedUrl(url);
      // Drop the cached existing-shares list so the next visit refetches.
      setShares(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }, [documentId, recipientEmail, recipientName, message, expiresAt, submitting]);

  const handleCopy = useCallback(async () => {
    if (!createdUrl) return;
    try {
      await navigator.clipboard.writeText(createdUrl);
      setCreatedCopied(true);
      window.setTimeout(() => setCreatedCopied(false), 1800);
    } catch {
      // Clipboard API can fail in some contexts (insecure origin, no
      // permission). Fall back to a manual selection prompt.
      window.prompt("Copy this link:", createdUrl);
    }
  }, [createdUrl]);

  const handleRevoke = useCallback(
    async (shareId: string) => {
      if (revokingId) return;
      setRevokingId(shareId);
      setListError(null);
      try {
        const res = await fetch(
          `/api/documents/${encodeURIComponent(documentId)}/share/${encodeURIComponent(shareId)}`,
          { method: "DELETE" },
        );
        if (!res.ok) {
          const body = await res
            .json()
            .catch(() => ({}) as Record<string, unknown>);
          const errMsg =
            typeof body?.error === "string"
              ? body.error
              : `Revoke failed (HTTP ${res.status})`;
          setListError(errMsg);
          return;
        }
        // Update the row in place rather than refetching the list.
        setShares((prev) =>
          prev
            ? prev.map((s) =>
                s.id === shareId ? { ...s, isRevoked: true } : s,
              )
            : prev,
        );
        router.refresh();
      } catch (err) {
        setListError(err instanceof Error ? err.message : "Network error");
      } finally {
        setRevokingId(null);
      }
    },
    [documentId, revokingId, router],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      aria-hidden={false}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-doc-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl p-6 shadow-2xl"
        style={{
          background: "rgba(15, 23, 42, 0.98)",
          border: "1px solid rgba(196, 169, 106, 0.35)",
        }}
      >
        <h3
          id="share-doc-title"
          className="text-base font-semibold text-[var(--foreground)]"
        >
          Share &ldquo;{documentTitle}&rdquo;
        </h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Anyone with the link can view this document. Revoke any time.
        </p>

        {/* Tab toggle */}
        <div
          role="tablist"
          aria-label="Share modal tabs"
          className="mt-4 flex gap-1 rounded-md border border-white/[0.08] bg-white/[0.02] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "new"}
            onClick={() => setTab("new")}
            className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === "new"
                ? "bg-aurum/[0.15] text-aurum"
                : "text-[#cbd5e1] hover:bg-white/[0.04]"
            }`}
          >
            New link
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "existing"}
            onClick={() => setTab("existing")}
            className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === "existing"
                ? "bg-aurum/[0.15] text-aurum"
                : "text-[#cbd5e1] hover:bg-white/[0.04]"
            }`}
          >
            Existing links
          </button>
        </div>

        {tab === "new" && (
          <>
            {planBlocked ? (
              <div className="mt-4 rounded-md border border-aurum/30 bg-aurum/[0.08] p-4">
                <p className="text-sm text-[var(--foreground)]">
                  {planBlocked.message}
                </p>
                <a
                  href={planBlocked.upgradeUrl}
                  className="mt-3 inline-block rounded-md bg-aurum px-3 py-1.5 text-xs font-semibold text-onyx hover:bg-aurum/90 transition-colors"
                >
                  See plans
                </a>
              </div>
            ) : createdUrl ? (
              <div className="mt-4">
                <p className="text-xs text-emerald-300">Share link ready.</p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    readOnly
                    value={createdUrl}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="min-w-0 flex-1 rounded-md border border-white/[0.12] bg-[#0f1422] px-3 py-2 font-mono text-xs text-[var(--foreground)] focus:border-aurum/60 focus:outline-none focus:ring-2 focus:ring-[#C4A96A]"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="shrink-0 rounded-md bg-aurum px-3 py-2 text-xs font-semibold text-onyx hover:bg-aurum/90 transition-colors"
                  >
                    {createdCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCreatedUrl(null);
                    setRecipientEmail("");
                    setRecipientName("");
                    setMessage("");
                    setExpiresAt("");
                  }}
                  className="mt-3 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors underline"
                >
                  Create another
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[#cbd5e1]">
                      Recipient email <span className="text-[#64748b]">(optional)</span>
                    </span>
                    <input
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="alice@example.com"
                      maxLength={320}
                      className="w-full rounded-md border border-white/[0.12] bg-[#0f1422] px-3 py-2 text-xs text-[var(--foreground)] placeholder-[#64748b] focus:border-aurum/60 focus:outline-none focus:ring-2 focus:ring-[#C4A96A]"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[#cbd5e1]">
                      Recipient name <span className="text-[#64748b]">(optional)</span>
                    </span>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Alice"
                      maxLength={200}
                      className="w-full rounded-md border border-white/[0.12] bg-[#0f1422] px-3 py-2 text-xs text-[var(--foreground)] placeholder-[#64748b] focus:border-aurum/60 focus:outline-none focus:ring-2 focus:ring-[#C4A96A]"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[#cbd5e1]">
                    Personal note <span className="text-[#64748b]">(optional, shown on the share page)</span>
                  </span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="A quick note for the reader…"
                    className="w-full resize-none rounded-md border border-white/[0.12] bg-[#0f1422] px-3 py-2 text-xs text-[var(--foreground)] placeholder-[#64748b] focus:border-aurum/60 focus:outline-none focus:ring-2 focus:ring-[#C4A96A]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[#cbd5e1]">
                    Expires <span className="text-[#64748b]">(optional)</span>
                  </span>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full rounded-md border border-white/[0.12] bg-[#0f1422] px-3 py-2 text-xs text-[var(--foreground)] focus:border-aurum/60 focus:outline-none focus:ring-2 focus:ring-[#C4A96A]"
                  />
                </label>

                {formError && (
                  <p role="alert" className="text-xs text-red-400">
                    {formError}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {tab === "existing" && (
          <div className="mt-4">
            {loadingShares ? (
              <p className="text-xs text-[var(--muted)]">Loading…</p>
            ) : listError ? (
              <p role="alert" className="text-xs text-red-400">
                {listError}
              </p>
            ) : !shares || shares.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">
                No shares yet. Create one in the &ldquo;New link&rdquo; tab.
              </p>
            ) : (
              <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {shares.map((s) => {
                  const isExpired =
                    s.expiresAt !== null && new Date(s.expiresAt) <= new Date();
                  const tone = s.isRevoked
                    ? "border-red-300/30 bg-red-500/[0.06] text-[#fecaca]"
                    : isExpired
                      ? "border-amber-300/30 bg-amber-500/[0.06] text-[#fde68a]"
                      : "border-emerald-300/30 bg-emerald-500/[0.06] text-[#a7f3d0]";
                  const status = s.isRevoked
                    ? "Revoked"
                    : isExpired
                      ? "Expired"
                      : "Active";
                  return (
                    <li
                      key={s.id}
                      className="rounded-md border border-white/[0.08] bg-white/[0.02] p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs text-[var(--foreground)]">
                            {s.recipientEmail
                              ? `To ${s.recipientName ? `${s.recipientName} <${s.recipientEmail}>` : s.recipientEmail}`
                              : "Public link (no recipient set)"}
                          </p>
                          <p className="mt-1 font-mono text-[10px] text-[#94a3b8] tabular-nums">
                            Created {fmtDate(s.createdAt)}
                            {" · "}
                            {s.viewCount} {s.viewCount === 1 ? "view" : "views"}
                            {s.lastViewedAt
                              ? ` · last ${fmtDateTime(s.lastViewedAt)}`
                              : ""}
                            {s.expiresAt ? ` · expires ${fmtDate(s.expiresAt)}` : ""}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] ${tone}`}
                        >
                          {status}
                        </span>
                      </div>
                      {!s.isRevoked && !isExpired && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => handleRevoke(s.id)}
                            disabled={revokingId === s.id}
                            className="text-[10px] uppercase tracking-[0.18em] text-red-300 hover:text-red-200 transition-colors disabled:opacity-50"
                          >
                            {revokingId === s.id ? "Revoking…" : "Revoke"}
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            disabled={submitting || !!revokingId}
            className="rounded-md px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A96A] disabled:opacity-50"
            style={{ border: "1px solid rgba(255,255,255,0.12)" }}
          >
            Close
          </button>
          {tab === "new" && !createdUrl && !planBlocked && (
            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting}
              className="rounded-md bg-aurum px-4 py-2 text-sm font-semibold text-onyx transition-colors hover:bg-aurum/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A96A] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Creating…" : "Create link"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
