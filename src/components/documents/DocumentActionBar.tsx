"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useDocumentQuickView } from "./DocumentQuickViewProvider";
import { SaveToPackageModal } from "./SaveToPackageModal";
import { useSaveToMyDocuments } from "./useSaveToMyDocuments";
import { getDocumentStorageUrl, resolveDocumentContent } from "@/lib/documents/content";

/* ── Types ── */
interface DocumentActionBarProps {
  document: {
    id: string;
    title: string;
    slug: string;
    storagePathOrBody?: string;
    summary?: string;
    contentSourceType?: string;
    /** When true and ownerUserId is null, the row is a public template
     *  the user can fork into their My Documents library via
     *  "Save to My Documents". */
    isTemplate?: boolean;
    /** When set and equal to the current user, the row is already a
     *  private copy — no save action shown. */
    ownerUserId?: string | null;
  };
  variant: "full" | "compact" | "icon-only";
  onEdit?: () => void;
  onDeleted?: () => void;
  onPackageAdded?: () => void;
  onSavedToMyDocuments?: () => void;
  showGenerate?: boolean;
  onGenerate?: () => void;
  getText?: () => string;
}

/* ── SVG icon paths (Heroicons outline) ── */
const ICONS = {
  eye: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  pencil: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z M19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10",
  bookmark: "M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z",
  speaker: "M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z",
  download: "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3",
  clipboard: "M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184",
  link: "M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244",
  mail: "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75",
  package: "M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z",
  trash: "M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0",
  sparkle: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z",
  dots: "M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z",
  stop: "M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z",
  // Inbox-arrow-down. Used by "Save to My Documents" — fork a public
  // template into the user's private library.
  inbox: "M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z",
};

function Icon({ d, className = "h-3.5 w-3.5" }: { d: string; className?: string }) {
  const paths = d.split(" M").map((p, i) => (i === 0 ? p : "M" + p));
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      {paths.map((p, i) => (
        <path key={i} strokeLinecap="round" strokeLinejoin="round" d={p} />
      ))}
    </svg>
  );
}

/* ── Component ── */
export function DocumentActionBar({
  document: doc,
  variant,
  onEdit,
  onDeleted,
  onPackageAdded,
  onSavedToMyDocuments,
  showGenerate,
  onGenerate,
  getText,
}: DocumentActionBarProps) {
  const { user } = useUser();
  const router = useRouter();
  const quickView = useDocumentQuickView();

  // Bookmark state
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const bookmarkFetched = useRef(false);

  // Read aloud state
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Package modal
  const [showPackageModal, setShowPackageModal] = useState(false);

  // Save-to-My-Documents (fork a public template into the user's
  // library). Visibility + fetch live in the shared hook so this
  // surface and SaveToMyDocumentsButton on the detail page can never
  // drift on the eligibility rule.
  const saveToMyDocs = useSaveToMyDocuments({
    documentId: doc.id,
    isTemplate: doc.isTemplate,
    ownerUserId: doc.ownerUserId,
    contentSourceType: doc.contentSourceType,
  });

  // Dropdown for icon-only variant
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Toast feedback
  const [toast, setToast] = useState<string | null>(null);
  // React 19 + TypeScript 6 require an initial value for `useRef`. LTM
  // source uses the React 18-permissive `useRef<T>()` signature; OB
  // tightens to `useRef<T | undefined>(undefined)` for the same shape.
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const confirmTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Cleanup timeouts on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      if (confirmTimeout.current) clearTimeout(confirmTimeout.current);
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 2000);
  }, []);

  // Lazy-fetch bookmark state — only when the user interacts (hover/open dropdown)
  // Avoids 100+ parallel API calls on the documents listing page
  const fetchBookmarkIfNeeded = useCallback(() => {
    if (!user || bookmarkFetched.current) return;
    bookmarkFetched.current = true;
    fetch(`/api/documents/bookmark?documentId=${doc.id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setBookmarked(data.bookmarked); })
      .catch(() => {});
  }, [user, doc.id]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  /* ── Action handlers ── */

  const handleView = () => {
    quickView.openQuickView(doc.id);
    setDropdownOpen(false);
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    } else {
      router.push(`/documents/${doc.id}/edit`);
    }
    setDropdownOpen(false);
  };

  const handleBookmark = async () => {
    if (!user || bookmarkLoading) return;
    fetchBookmarkIfNeeded();
    setBookmarkLoading(true);
    try {
      const res = await fetch("/api/documents/bookmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: doc.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setBookmarked(data.bookmarked);
        showToast(data.bookmarked ? "Bookmarked" : "Bookmark removed");
      }
    } catch {
      showToast("Failed to bookmark");
    } finally {
      setBookmarkLoading(false);
    }
  };

  const handleReadAloud = async () => {
    if (speaking) {
      // Stop any active playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current = null;
      }
      if (speechRef.current && typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        speechRef.current = null;
      }
      setSpeaking(false);
      return;
    }
    const content = getText ? getText() : doc.storagePathOrBody || doc.summary || "";
    if (!content.trim()) {
      showToast("No content to read");
      return;
    }
    setSpeaking(true);
    setDropdownOpen(false);

    try {
      const res = await fetch("/api/emilia/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });

      if (res.ok) {
        const contentType = res.headers.get("Content-Type") || "";
        if (contentType.includes("audio/mpeg") || contentType.includes("audio/")) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => { setSpeaking(false); audioRef.current = null; URL.revokeObjectURL(url); };
          audio.onerror = () => { setSpeaking(false); audioRef.current = null; URL.revokeObjectURL(url); };
          await audio.play();
          return;
        }
        const data = await res.json();
        if (data.fallback) {
          const utt = new SpeechSynthesisUtterance(data.text || content);
          utt.rate = 0.95;
          utt.pitch = 1.05;
          utt.lang = "en-GB";
          const voices = window.speechSynthesis.getVoices();
          const preferred = voices.find((v) => v.lang.startsWith("en-GB") && v.name.toLowerCase().includes("female"));
          if (preferred) utt.voice = preferred;
          speechRef.current = utt;
          utt.onend = () => { setSpeaking(false); speechRef.current = null; };
          utt.onerror = () => { setSpeaking(false); speechRef.current = null; };
          window.speechSynthesis.speak(utt);
          return;
        }
      }
      // Fallback
      const utt = new SpeechSynthesisUtterance(content);
      utt.rate = 0.95;
      utt.pitch = 1.05;
      utt.lang = "en-GB";
      speechRef.current = utt;
      utt.onend = () => { setSpeaking(false); speechRef.current = null; };
      utt.onerror = () => { setSpeaking(false); speechRef.current = null; };
      window.speechSynthesis.speak(utt);
    } catch {
      const utt = new SpeechSynthesisUtterance(content);
      utt.rate = 0.95;
      utt.pitch = 1.05;
      utt.lang = "en-GB";
      speechRef.current = utt;
      utt.onend = () => { setSpeaking(false); speechRef.current = null; };
      utt.onerror = () => { setSpeaking(false); speechRef.current = null; };
      window.speechSynthesis.speak(utt);
    }
  };

  const handleDownload = async () => {
    const resolvedContent = resolveDocumentContent({
      storagePathOrBody: doc.storagePathOrBody,
      contentSourceType: doc.contentSourceType,
    });

    if (resolvedContent.kind === "stored_file" && resolvedContent.storagePath) {
      try {
        const fileUrl = getDocumentStorageUrl(resolvedContent.storagePath);
        if (fileUrl) {
          const a = Object.assign(document.createElement("a"), {
            href: fileUrl,
            download: doc.title,
            target: "_blank",
          });
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          showToast("Downloaded");
          setDropdownOpen(false);
          return;
        }
      } catch {
        // Fall through to markdown download
      }
    }

    const content = getText ? getText() : doc.storagePathOrBody || doc.summary || "";
    const blob = new Blob([`# ${doc.title}\n\n${content}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `${doc.slug || doc.title.toLowerCase().replace(/\s+/g, "-")}.md`,
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Downloaded");
    setDropdownOpen(false);
  };

  const handleCopy = async () => {
    const content = getText ? getText() : doc.storagePathOrBody || doc.summary || "";
    try {
      await navigator.clipboard.writeText(content);
      showToast("Copied to clipboard");
    } catch {
      showToast("Failed to copy");
    }
    setDropdownOpen(false);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/documents/${doc.slug || doc.id}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copied");
    } catch {
      showToast("Failed to copy link");
    }
    setDropdownOpen(false);
  };

  const handleEmail = () => {
    const content = getText ? getText() : doc.storagePathOrBody || doc.summary || "";
    const subject = encodeURIComponent(doc.title);
    const body = encodeURIComponent(content.slice(0, 2000));
    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
    setDropdownOpen(false);
  };

  const handleAddToPackage = () => {
    setShowPackageModal(true);
    setDropdownOpen(false);
  };

  const handleSaveToMyDocuments = async () => {
    if (saveToMyDocs.saving) return;
    if (!saveToMyDocs.canSave) {
      showToast("Sign in to save");
      return;
    }
    setDropdownOpen(false);
    const result = await saveToMyDocs.save();
    if (!result.ok) {
      showToast(result.error);
      return;
    }
    showToast(
      result.alreadyOwned ? "Already in My Documents" : "Saved to My Documents",
    );
    onSavedToMyDocuments?.();
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      if (confirmTimeout.current) clearTimeout(confirmTimeout.current);
      confirmTimeout.current = setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Document archived");
        onDeleted?.();
      } else {
        showToast("Failed to delete");
      }
    } catch {
      showToast("Failed to delete");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleGenerate = () => {
    onGenerate?.();
    setDropdownOpen(false);
  };

  /* ── Action definitions ── */
  type ActionDef = {
    key: string;
    label: string;
    icon: string;
    onClick: () => void;
    active?: boolean;
    danger?: boolean;
    loading?: boolean;
    hidden?: boolean;
    authRequired?: boolean;
  };

  // The hook owns the eligibility predicate ("is this a forkable
  // public template the signed-in user doesn't already own?"). Hiding
  // the action when canSave is false keeps the dropdown free of
  // entries that would just toast a rejection.
  const actions: ActionDef[] = [
    { key: "view", label: "View", icon: ICONS.eye, onClick: handleView },
    { key: "edit", label: "Edit", icon: ICONS.pencil, onClick: handleEdit, authRequired: true },
    { key: "save-to-library", label: saveToMyDocs.saving ? "Saving…" : "Save to My Documents", icon: ICONS.inbox, onClick: handleSaveToMyDocuments, loading: saveToMyDocs.saving, authRequired: true, hidden: !saveToMyDocs.canSave },
    { key: "bookmark", label: bookmarked ? "Bookmarked" : "Bookmark", icon: ICONS.bookmark, onClick: handleBookmark, active: bookmarked, loading: bookmarkLoading, authRequired: true },
    { key: "read", label: speaking ? "Stop" : "Read Aloud", icon: speaking ? ICONS.stop : ICONS.speaker, onClick: handleReadAloud, active: speaking },
    { key: "download", label: "Download", icon: ICONS.download, onClick: handleDownload },
    { key: "copy", label: "Copy", icon: ICONS.clipboard, onClick: handleCopy },
    { key: "share", label: "Share Link", icon: ICONS.link, onClick: handleShare },
    { key: "email", label: "Email", icon: ICONS.mail, onClick: handleEmail },
    { key: "package", label: "Add to Package", icon: ICONS.package, onClick: handleAddToPackage, authRequired: true },
    { key: "delete", label: confirmDelete ? "Confirm Delete" : "Delete", icon: ICONS.trash, onClick: handleDelete, danger: true, loading: deleting, authRequired: true },
    { key: "generate", label: "Generate AI", icon: ICONS.sparkle, onClick: handleGenerate, hidden: !showGenerate },
  ];

  const visibleActions = actions.filter((a) => {
    if (a.hidden) return false;
    return true;
  });

  /* ── Render helpers ── */

  const btnBase = "inline-flex items-center justify-center rounded-md transition-colors focus:outline-none";

  function renderFullButton(action: ActionDef) {
    const colorCls = action.danger
      ? confirmDelete && action.key === "delete"
        ? "border-red-500/40 bg-red-500/10 text-red-400"
        : "border-[var(--card-border)] text-[var(--muted)] hover:border-red-500/30 hover:text-red-400"
      : action.active
      ? "border-brand-600/40 bg-brand-600/15 text-brand-400"
      : action.key === "generate"
      ? "border-purple-500/20 bg-purple-500/[0.06] text-purple-400 hover:bg-purple-500/15"
      : "border-[var(--card-border)] text-[var(--muted)] hover:border-brand-500/30 hover:text-[var(--foreground)]";

    return (
      <button
        key={action.key}
        onClick={(e) => { e.stopPropagation(); action.onClick(); }}
        disabled={action.loading}
        title={action.label}
        className={`${btnBase} gap-1.5 border px-2.5 py-1.5 text-[11px] font-medium ${colorCls} disabled:opacity-50`}
      >
        <Icon d={action.icon} className="h-3.5 w-3.5" />
        {action.label}
      </button>
    );
  }

  function renderCompactButton(action: ActionDef) {
    const colorCls = action.danger
      ? confirmDelete && action.key === "delete"
        ? "border-red-500/40 bg-red-500/10 text-red-400"
        : "text-[var(--muted)] hover:text-red-400"
      : action.active
      ? "text-brand-400"
      : action.key === "generate"
      ? "text-purple-400 hover:text-purple-300"
      : "text-[var(--muted)] hover:text-[var(--foreground)]";

    return (
      <button
        key={action.key}
        onClick={(e) => { e.stopPropagation(); action.onClick(); }}
        disabled={action.loading}
        title={action.label}
        className={`${btnBase} p-1 ${colorCls} disabled:opacity-50`}
      >
        <Icon d={action.icon} className="h-3.5 w-3.5" />
      </button>
    );
  }

  function renderDropdownItem(action: ActionDef) {
    const colorCls = action.danger
      ? confirmDelete && action.key === "delete"
        ? "text-red-400 bg-red-500/10"
        : "text-[var(--muted)] hover:text-red-400 hover:bg-red-500/5"
      : action.active
      ? "text-brand-400 bg-brand-600/10"
      : action.key === "generate"
      ? "text-purple-400 hover:bg-purple-500/10"
      : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[rgba(255,255,255,0.04)]";

    return (
      <button
        key={action.key}
        onClick={(e) => { e.stopPropagation(); action.onClick(); }}
        disabled={action.loading}
        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${colorCls} disabled:opacity-50`}
      >
        <Icon d={action.icon} className="h-3.5 w-3.5 shrink-0" />
        {action.label}
      </button>
    );
  }

  /* ── Layout renders ── */

  const toastEl = toast && (
    <div className="fixed bottom-4 right-4 z-[100] rounded-lg border border-brand-600/30 bg-[var(--card-bg)] px-3 py-2 text-xs text-brand-400 shadow-lg animate-in fade-in slide-in-from-bottom-2">
      {toast}
    </div>
  );

  const packageModal = showPackageModal && (
    <SaveToPackageModal
      documentId={doc.id}
      documentTitle={doc.title}
      onClose={() => {
        setShowPackageModal(false);
        onPackageAdded?.();
      }}
    />
  );

  // For full/compact variants (detail page — single document), eagerly fetch bookmark
  useEffect(() => {
    if (variant !== "icon-only") fetchBookmarkIfNeeded();
  }, [variant, fetchBookmarkIfNeeded]);

  if (variant === "full") {
    return (
      <>
        <div className="flex flex-wrap items-center gap-1.5">
          {visibleActions.map(renderFullButton)}
        </div>
        {packageModal}
        {toastEl}
      </>
    );
  }

  if (variant === "compact") {
    return (
      <>
        <div className="flex items-center gap-0.5">
          {visibleActions.map(renderCompactButton)}
        </div>
        {packageModal}
        {toastEl}
      </>
    );
  }

  // icon-only: dropdown menu
  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={(e) => { e.stopPropagation(); fetchBookmarkIfNeeded(); setDropdownOpen((p) => !p); }}
          className={`${btnBase} p-1 text-slate-300 hover:text-[var(--foreground)]`}
          title="Actions"
        >
          <Icon d={ICONS.dots} className="h-4 w-4" />
        </button>
        {dropdownOpen && (
          <div className="absolute right-0 bottom-full z-50 mb-1 min-w-[180px] rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] py-1 shadow-xl">
            {visibleActions.map(renderDropdownItem)}
          </div>
        )}
      </div>
      {packageModal}
      {toastEl}
    </>
  );
}
