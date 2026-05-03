"use client";

import { useCallback, useState, useEffect, createContext, useContext, useRef } from "react";
import { createPortal } from "react-dom";

// ═══════════════════════════════════════════════════════════════
// Shared iframe overlay context — allows any component to open
// an external URL in the in-page overlay via openExternalUrl()
// ═══════════════════════════════════════════════════════════════

interface ExternalOverlayContextType {
  openUrl: (url: string) => void;
}

const ExternalOverlayContext = createContext<ExternalOverlayContextType>({
  openUrl: () => {},
});

export function useExternalOverlay() {
  return useContext(ExternalOverlayContext);
}

// Loading states for iframe
type LoadingState = "loading" | "loaded" | "blocked";

// ── Overlay provider: wrap in layout to enable app-wide ──
export function ExternalOverlayProvider({ children }: { children: React.ReactNode }) {
  const [url, setUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>("loading");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const openUrl = useCallback((u: string) => {
    setLoadingState("loading");
    setUrl(u.startsWith("http") ? u : `https://${u}`);
  }, []);

  const close = useCallback(() => {
    setUrl(null);
    setLoadingState("loading");
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const openInNewTab = useCallback(() => {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, [url]);

  // Close on Escape key
  useEffect(() => {
    if (!url) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [url, close]);

  // Set timeout to detect blocked iframes (X-Frame-Options, CSP)
  // Most blocked iframes won't trigger onLoad or will show blank
  useEffect(() => {
    if (!url) return;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // After 3 seconds, if still loading, assume it's blocked
    timeoutRef.current = setTimeout(() => {
      if (loadingState === "loading") {
        setLoadingState("blocked");
      }
    }, 3000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [url, loadingState]);

  return (
    <ExternalOverlayContext.Provider value={{ openUrl }}>
      {children}
      {mounted && url && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="External content"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Backdrop */}
          <div
            onClick={close}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
          />

          {/* Frame container */}
          <div
            style={{
              position: "relative",
              width: "min(85vw, 1200px)",
              height: "min(80vh, 860px)",
              borderRadius: "12px",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow:
                "0 4px 12px rgba(0,0,0,0.4), 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {/* Close button — red X, top-right */}
            <button
              onClick={close}
              aria-label="Close"
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                zIndex: 10,
                width: 28,
                height: 28,
                borderRadius: "6px",
                border: "none",
                background: "#dc2626",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: 700,
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "#ef4444"; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "#dc2626"; }}
            >
              ✕
            </button>

            {/* URL bar with Open in New Tab button */}
            <div
              style={{
                height: 36,
                background: "rgba(15,18,30,0.95)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                paddingLeft: 14,
                paddingRight: 44,
                gap: 8,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span
                style={{
                  flex: 1,
                  color: "rgba(255,255,255,0.55)",
                  fontSize: "0.7rem",
                  fontFamily: "monospace",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {url}
              </span>
              {/* Open in New Tab button - always visible */}
              <button
                onClick={openInNewTab}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 8px",
                  fontSize: "0.65rem",
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.7)",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 4,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.15)";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                New Tab
              </button>
            </div>

            {/* Loading spinner overlay */}
            {loadingState === "loading" && (
              <div
                style={{
                  position: "absolute",
                  top: 36,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(15, 18, 30, 0.95)",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    border: "3px solid rgba(255,255,255,0.1)",
                    borderTopColor: "#60A5FA",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem" }}>
                  Loading external site...
                </span>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {/* Blocked/failed message overlay */}
            {loadingState === "blocked" && (
              <div
                style={{
                  position: "absolute",
                  top: 36,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(15, 18, 30, 0.98)",
                  gap: 16,
                  padding: 24,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "rgba(251, 146, 60, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FB923C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ color: "white", fontSize: "1.1rem", fontWeight: 600, marginBottom: 8 }}>
                    This site cannot be displayed here
                  </h3>
                  <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", maxWidth: 320, lineHeight: 1.5 }}>
                    The website has security settings that prevent it from being shown in an embedded frame.
                  </p>
                </div>
                <button
                  onClick={openInNewTab}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 20px",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    color: "white",
                    background: "#3B82F6",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#2563EB"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#3B82F6"; }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Open in New Tab
                </button>
              </div>
            )}

            {/* Iframe - hidden when blocked */}
            <iframe
              ref={iframeRef}
              src={url}
              title="External content"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              onLoad={() => {
                // iframe loaded - could be successful or blocked (blank)
                // We rely on the timeout to detect blocked state
                if (loadingState === "loading") {
                  setLoadingState("loaded");
                }
              }}
              onError={() => {
                // Explicit error - show blocked state
                setLoadingState("blocked");
              }}
              style={{
                width: "100%",
                height: "calc(100% - 36px)",
                border: "none",
                background: "#ffffff",
                display: loadingState === "blocked" ? "none" : "block",
              }}
            />
          </div>
        </div>,
        document.body
      )}
    </ExternalOverlayContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════
// ExternalLinkFrame — drop-in <a> replacement that opens the
// in-page iframe overlay instead of a new tab/popup
// ═══════════════════════════════════════════════════════════════

interface ExternalLinkFrameProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function ExternalLinkFrame({ href, children, className }: ExternalLinkFrameProps) {
  const { openUrl } = useExternalOverlay();
  // Safety: cascade data sometimes passes objects where strings are expected
  const safeHref = typeof href === "string" ? href : String(href ?? "#");

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      openUrl(safeHref);
    },
    [safeHref, openUrl]
  );

  return (
    <a href={safeHref} onClick={handleClick} className={className} rel="noopener noreferrer">
      {children}
    </a>
  );
}
