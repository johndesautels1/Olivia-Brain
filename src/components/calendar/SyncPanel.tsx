"use client";

import { useState, useCallback, useEffect } from "react";

interface SyncAccount {
  id: string;
  provider: string;
  providerEmail: string | null;
  syncDirection: string;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  consecutiveErrors: number;
  isActive: boolean;
  createdAt: string;
}

interface SyncConflict {
  id: string;
  conflictType: string;
  localDataJson: Record<string, unknown> | null;
  remoteDataJson: Record<string, unknown> | null;
  resolution: string;
  createdAt: string;
}

interface SyncPanelProps {
  onRefresh: () => void;
}

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google Calendar",
  outlook: "Outlook Calendar",
  calendly: "Calendly",
  ical_url: "iCal URL",
};

const PROVIDER_COLORS: Record<string, string> = {
  google: "text-blue-400 border-blue-500/30 bg-blue-950/30",
  outlook: "text-sky-400 border-sky-500/30 bg-sky-950/30",
  calendly: "text-indigo-400 border-indigo-500/30 bg-indigo-950/30",
  ical_url: "text-slate-400 border-slate-500/30 bg-slate-800/30",
};

export function SyncPanel({ onRefresh }: SyncPanelProps) {
  const [accounts, setAccounts] = useState<SyncAccount[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/sync");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConflicts = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/sync/conflicts");
      if (res.ok) {
        const data = await res.json();
        setConflicts(data.conflicts || []);
      }
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
    fetchConflicts();
  }, [fetchAccounts, fetchConflicts]);

  const handleConnect = useCallback(async (provider: string) => {
    try {
      const res = await fetch(`/api/calendar/sync?action=connect&provider=${provider}`);
      if (res.ok) {
        const data = await res.json();
        if (data.authUrl) {
          window.location.href = data.authUrl;
        } else if (data.connected) {
          // Webhook-based provider (e.g. Calendly) — no redirect needed
          await fetchAccounts();
        }
      }
    } catch {
      // Silent fail
    }
  }, [fetchAccounts]);

  const handleSync = useCallback(
    async (accountId: string) => {
      setSyncing(accountId);
      try {
        const res = await fetch("/api/calendar/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "sync", accountId }),
        });

        if (res.ok) {
          await fetchAccounts();
          onRefresh();
        }
      } catch {
        // Silent fail
      } finally {
        setSyncing(null);
      }
    },
    [fetchAccounts, onRefresh]
  );

  const handleDisconnect = useCallback(
    async (accountId: string) => {
      try {
        await fetch("/api/calendar/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "disconnect", accountId }),
        });
        await fetchAccounts();
        onRefresh();
      } catch {
        // Silent fail
      }
    },
    [fetchAccounts, onRefresh]
  );

  const handleResolveConflict = useCallback(
    async (conflictId: string, resolution: string) => {
      try {
        await fetch("/api/calendar/sync/conflicts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conflictId, resolution }),
        });
        setConflicts((prev) => prev.filter((c) => c.id !== conflictId));
        onRefresh();
      } catch {
        // Silent fail
      }
    },
    [onRefresh]
  );

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg bg-[var(--card-bg)]"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Single-line connect row: label + provider buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-[var(--foreground)] whitespace-nowrap">
          Connect:
        </span>
        <button
          onClick={() => handleConnect("google")}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] hover:border-blue-500/40 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Google
        </button>
        <button
          onClick={() => handleConnect("outlook")}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] hover:border-sky-500/40 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M24 7.387v10.478c0 .23-.08.424-.238.583a.794.794 0 0 1-.584.238h-9.482V6.566h9.482c.23 0 .424.08.584.238.158.158.238.352.238.583z" fill="#0364B8"/><path d="M16.08 6.566v11.12l-2.384 1.387L7.696 22V6.566h8.384z" fill="#0078D4"/><path d="M7.696 6.566H2.822a.794.794 0 0 0-.584.238.794.794 0 0 0-.238.583v10.478c0 .23.08.424.238.583.158.158.352.238.584.238h4.874V6.566z" fill="#28A8EA"/><path d="M13.696 5.544H2V18.13h3.696V8.566h8V5.544z" fill="#0078D4" opacity=".5"/><path d="M10 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 6.4a2.4 2.4 0 1 1 0-4.8 2.4 2.4 0 0 1 0 4.8z" fill="#fff"/></svg>
          Outlook
        </button>
        <button
          onClick={() => handleConnect("calendly")}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] hover:border-indigo-500/40 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#6366f1" strokeWidth="2"/><path d="M12 7v5l3 3" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Calendly
        </button>
      </div>

      {/* Connected accounts — compact single-line per account */}
      {accounts.length > 0 && (
        <div className="space-y-1.5">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2"
            >
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                  PROVIDER_COLORS[acc.provider] || PROVIDER_COLORS.ical_url
                }`}
              >
                {PROVIDER_LABELS[acc.provider] || acc.provider}
              </span>
              {acc.providerEmail && (
                <span className="text-[10px] text-[var(--muted)] truncate">
                  {acc.providerEmail}
                </span>
              )}
              {acc.lastSyncAt && (
                <span className="text-[10px] text-[var(--muted)] whitespace-nowrap">
                  {new Date(acc.lastSyncAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
              {acc.consecutiveErrors > 2 && (
                <span className="text-[10px] text-red-400 whitespace-nowrap">
                  {acc.consecutiveErrors} errors
                </span>
              )}
              {acc.lastSyncError && (
                <span className="text-[10px] text-red-400 truncate max-w-[120px]" title={acc.lastSyncError}>
                  {acc.lastSyncError}
                </span>
              )}
              <div className="ml-auto flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleSync(acc.id)}
                  disabled={syncing === acc.id}
                  className="rounded px-2 py-1 text-[10px] font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {syncing === acc.id ? "Syncing..." : "Sync"}
                </button>
                <button
                  onClick={() => handleDisconnect(acc.id)}
                  className="rounded px-2 py-1 text-[10px] font-medium text-red-400 hover:text-red-300 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sync conflicts */}
      {conflicts.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-amber-400 mb-2">
            Sync Conflicts ({conflicts.length})
          </h3>
          <div className="space-y-2">
            {conflicts.map((conflict) => (
              <div
                key={conflict.id}
                className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3"
              >
                <p className="text-[10px] text-amber-400 font-medium mb-1">
                  {conflict.conflictType.replace(/_/g, " ")}
                </p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <p className="text-[9px] text-[var(--muted)] mb-0.5">
                      Local
                    </p>
                    <p className="text-[10px] text-[var(--foreground)]">
                      {(conflict.localDataJson as Record<string, string>)
                        ?.title || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-[var(--muted)] mb-0.5">
                      Remote
                    </p>
                    <p className="text-[10px] text-[var(--foreground)]">
                      {(conflict.remoteDataJson as Record<string, string>)
                        ?.title || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() =>
                      handleResolveConflict(conflict.id, "local_wins")
                    }
                    className="rounded px-2 py-1 text-[10px] font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
                  >
                    Keep Local
                  </button>
                  <button
                    onClick={() =>
                      handleResolveConflict(conflict.id, "remote_wins")
                    }
                    className="rounded px-2 py-1 text-[10px] font-medium border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                  >
                    Use Remote
                  </button>
                  <button
                    onClick={() =>
                      handleResolveConflict(conflict.id, "dismissed")
                    }
                    className="rounded px-2 py-1 text-[10px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
