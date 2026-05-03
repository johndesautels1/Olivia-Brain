"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

// ── Types ──

interface NoteEntry {
  id: string;
  title: string;
  content: string | null;
  drawingData: DrawingStroke[] | null;
  calendarEntryId: string | null;
  calendarEntry: { id: string; title: string; startDatetime: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface DrawingStroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

interface CalendarEntryOption {
  id: string;
  title: string;
  startDatetime: string;
}

interface CalendarNotepadProps {
  calendarEntries: CalendarEntryOption[];
  focusNoteId?: string | null;
}

// ── Drawing Colors ──

const DRAW_COLORS = [
  "#c4a96a", // gold (brand)
  "#ffffff", // white
  "#ef4444", // red
  "#22c55e", // green
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#8b5cf6", // violet
];

const DRAW_WIDTHS = [2, 4, 8];

export function CalendarNotepad({ calendarEntries, focusNoteId }: CalendarNotepadProps) {
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [mode, setMode] = useState<"text" | "draw">("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [linkEntryId, setLinkEntryId] = useState<string>("");
  const [showLinkPicker, setShowLinkPicker] = useState(false);

  // SMS state
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsPhone, setSmsPhone] = useState("");
  const [smsSending, setSmsSending] = useState(false);
  const [smsStatus, setSmsStatus] = useState<"idle" | "success" | "error">("idle");
  const [smsError, setSmsError] = useState("");

  // Email state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "success" | "error">("idle");
  const [emailError, setEmailError] = useState("");

  // WhatsApp state
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppPhone, setWhatsAppPhone] = useState("");
  const [whatsAppSending, setWhatsAppSending] = useState(false);
  const [whatsAppStatus, setWhatsAppStatus] = useState<"idle" | "success" | "error">("idle");
  const [whatsAppError, setWhatsAppError] = useState("");

  // Voice call state
  const [showCallModal, setShowCallModal] = useState(false);
  const [callPhone, setCallPhone] = useState("");
  const [callMessage, setCallMessage] = useState("");
  const [callMaking, setCallMaking] = useState(false);
  const [callStatus, setCallStatus] = useState<"idle" | "success" | "error">("idle");
  const [callError, setCallError] = useState("");

  // Drawing state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState("#c4a96a");
  const [drawWidth, setDrawWidth] = useState(2);
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const currentStroke = useRef<DrawingStroke | null>(null);

  // Modal close timeout ref for cleanup
  const modalCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (modalCloseTimeoutRef.current) {
        clearTimeout(modalCloseTimeoutRef.current);
      }
    };
  }, []);

  // ── Fetch notes ──
  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/notes");
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // ── Canvas setup ──
  const redrawCanvas = useCallback((strokeList: DrawingStroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokeList) {
      if (stroke.points.length < 2) continue;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    if (mode === "draw") redrawCanvas(strokes);
  }, [mode, strokes, redrawCanvas]);

  // Resize canvas to match container
  useEffect(() => {
    if (mode !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 300;
    redrawCanvas(strokes);
  }, [mode, redrawCanvas, strokes]);

  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      if (!touch) return null;
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const pt = getCanvasPoint(e);
    if (!pt) return;
    currentStroke.current = { points: [pt], color: drawColor, width: drawWidth };
    setIsDrawing(true);
  };

  const moveDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !currentStroke.current) return;
    const pt = getCanvasPoint(e);
    if (!pt) return;
    currentStroke.current.points.push(pt);
    // Live preview
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pts = currentStroke.current.points;
    if (pts.length < 2) return;
    ctx.strokeStyle = currentStroke.current.color;
    ctx.lineWidth = currentStroke.current.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke();
  };

  const endDraw = () => {
    const stroke = currentStroke.current;
    currentStroke.current = null;
    setIsDrawing(false);
    if (stroke && stroke.points.length > 1) {
      setStrokes((prev) => [...prev, stroke]);
    }
  };

  const clearCanvas = () => {
    setStrokes([]);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const undoStroke = () => {
    setStrokes((prev) => {
      const next = prev.slice(0, -1);
      redrawCanvas(next);
      return next;
    });
  };

  // ── Load a note into editor ──
  const loadNote = useCallback((note: NoteEntry) => {
    setActiveNoteId(note.id);
    setTitle(note.title);
    setContent(note.content || "");
    setLinkEntryId(note.calendarEntryId || "");
    const drawData = note.drawingData as DrawingStroke[] | null;
    if (drawData && drawData.length > 0) {
      setStrokes(drawData);
      setMode("draw");
    } else {
      setStrokes([]);
      setMode("text");
    }
  }, []);

  // Auto-load a specific note when focusNoteId changes (from modal click)
  useEffect(() => {
    if (!focusNoteId || notes.length === 0) return;
    const target = notes.find((n) => n.id === focusNoteId);
    if (target && target.id !== activeNoteId) loadNote(target);
  }, [focusNoteId, notes, loadNote, activeNoteId]);

  // ── New note ──
  const newNote = () => {
    setActiveNoteId(null);
    setTitle("");
    setContent("");
    setStrokes([]);
    setLinkEntryId("");
    setMode("text");
  };

  // ── Save ──
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim() || "Untitled Note",
        content: content || null,
        drawingData: strokes.length > 0 ? strokes : null,
        calendarEntryId: linkEntryId || null,
      };

      let res: Response;
      if (activeNoteId) {
        res = await fetch(`/api/calendar/notes?id=${activeNoteId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/calendar/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (res.ok) {
        const saved = await res.json();
        setActiveNoteId(saved.id);
        await fetchNotes();
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }, [title, content, strokes, linkEntryId, activeNoteId, fetchNotes]);

  // ── Delete ──
  const handleDelete = useCallback(async () => {
    if (!activeNoteId) return;
    try {
      const res = await fetch(`/api/calendar/notes?id=${activeNoteId}`, { method: "DELETE" });
      if (res.ok) {
        newNote();
        await fetchNotes();
      }
    } catch {
      // silent
    }
  }, [activeNoteId, fetchNotes]);

  // ── Download as text/PNG ──
  const handleDownload = useCallback(() => {
    if (mode === "draw" && canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${title || "note"}-drawing.png`;
      a.click();
    } else {
      const blob = new Blob([`# ${title}\n\n${content}`], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title || "note"}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [mode, title, content]);

  // ── Share (Web Share API) ──
  const handleShare = useCallback(async () => {
    if (!navigator.share) {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(`${title}\n\n${content}`);
      return;
    }
    try {
      if (mode === "draw" && canvasRef.current) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvasRef.current!.toBlob(resolve, "image/png")
        );
        if (blob) {
          const file = new File([blob], `${title || "note"}.png`, { type: "image/png" });
          await navigator.share({ title, files: [file] });
        }
      } else {
        await navigator.share({ title, text: content });
      }
    } catch {
      // User cancelled or unsupported
    }
  }, [mode, title, content]);

  // ── Email ──
  const handleEmail = useCallback(() => {
    const subject = encodeURIComponent(title || "Calendar Note");
    const body = encodeURIComponent(content || "");
    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
  }, [title, content]);

  // ── Send SMS via Twilio ──
  const handleSendSms = useCallback(async () => {
    if (!smsPhone.trim() || !content) return;

    const message = title ? `${title}\n\n${content}` : content;

    setSmsSending(true);
    setSmsStatus("idle");
    setSmsError("");

    try {
      const response = await fetch("/api/olivia/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: smsPhone.trim(), message }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send SMS");
      }

      setSmsStatus("success");
      if (modalCloseTimeoutRef.current) clearTimeout(modalCloseTimeoutRef.current);
      modalCloseTimeoutRef.current = setTimeout(() => {
        setShowSmsModal(false);
        setSmsPhone("");
        setSmsStatus("idle");
      }, 1500);
    } catch (err) {
      setSmsStatus("error");
      setSmsError(err instanceof Error ? err.message : "Failed to send SMS");
    } finally {
      setSmsSending(false);
    }
  }, [smsPhone, title, content]);

  // ── Send Email via Resend ��─
  const handleSendEmail = useCallback(async () => {
    if (!emailTo.trim() || !content) return;

    const message = title ? `${title}\n\n${content}` : content;

    setEmailSending(true);
    setEmailStatus("idle");
    setEmailError("");

    try {
      const response = await fetch("/api/olivia/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailTo.trim(),
          subject: title || "Note from Olivia",
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      setEmailStatus("success");
      if (modalCloseTimeoutRef.current) clearTimeout(modalCloseTimeoutRef.current);
      modalCloseTimeoutRef.current = setTimeout(() => {
        setShowEmailModal(false);
        setEmailTo("");
        setEmailStatus("idle");
      }, 1500);
    } catch (err) {
      setEmailStatus("error");
      setEmailError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setEmailSending(false);
    }
  }, [emailTo, title, content]);

  // ── Send WhatsApp via Twilio ──
  const handleSendWhatsApp = useCallback(async () => {
    if (!whatsAppPhone.trim() || !content) return;

    const message = title ? `📝 ${title}\n\n${content}` : content;

    setWhatsAppSending(true);
    setWhatsAppStatus("idle");
    setWhatsAppError("");

    try {
      const response = await fetch("/api/olivia/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: whatsAppPhone.trim(), message }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send WhatsApp");
      }

      setWhatsAppStatus("success");
      if (modalCloseTimeoutRef.current) clearTimeout(modalCloseTimeoutRef.current);
      modalCloseTimeoutRef.current = setTimeout(() => {
        setShowWhatsAppModal(false);
        setWhatsAppPhone("");
        setWhatsAppStatus("idle");
      }, 1500);
    } catch (err) {
      setWhatsAppStatus("error");
      setWhatsAppError(err instanceof Error ? err.message : "Failed to send WhatsApp");
    } finally {
      setWhatsAppSending(false);
    }
  }, [whatsAppPhone, title, content]);

  // ── Make Voice Call via Twilio + ElevenLabs ──
  const handleMakeCall = useCallback(async () => {
    if (!callPhone.trim() || (!content && !callMessage.trim())) return;

    // Use custom message or note content
    let message = callMessage.trim();
    if (!message) {
      message = title ? `${title}. ${content}` : content;
    }

    setCallMaking(true);
    setCallStatus("idle");
    setCallError("");

    try {
      const response = await fetch("/api/olivia/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: callPhone.trim(), message }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate call");
      }

      setCallStatus("success");
      if (modalCloseTimeoutRef.current) clearTimeout(modalCloseTimeoutRef.current);
      modalCloseTimeoutRef.current = setTimeout(() => {
        setShowCallModal(false);
        setCallPhone("");
        setCallMessage("");
        setCallStatus("idle");
      }, 2000);
    } catch (err) {
      setCallStatus("error");
      setCallError(err instanceof Error ? err.message : "Failed to make call");
    } finally {
      setCallMaking(false);
    }
  }, [callPhone, callMessage, title, content]);

  // ── Read aloud (Olivia voice via ElevenLabs, fallback to browser TTS) ──
  const [isReading, setIsReading] = useState(false);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleRead = useCallback(async () => {
    if (mode === "draw" || !content) return;

    // Stop if already reading
    if (isReading) {
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current = null;
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsReading(false);
      return;
    }

    const textToRead = title ? `${title}. ${content}` : content;
    setIsReading(true);

    // Try Olivia's voice (ElevenLabs) first
    try {
      const response = await fetch("/api/olivia/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToRead }),
      });

      if (response.headers.get("Content-Type")?.includes("audio/")) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        ttsAudioRef.current = audio;

        audio.onended = () => {
          setIsReading(false);
          URL.revokeObjectURL(audioUrl);
          ttsAudioRef.current = null;
        };
        audio.onerror = () => {
          setIsReading(false);
          URL.revokeObjectURL(audioUrl);
          ttsAudioRef.current = null;
        };

        await audio.play();
        return;
      }
    } catch {
      // Olivia voice failed, fall through to browser TTS
    }

    // Fallback: Browser speech synthesis
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = "en-GB";

      // Wait for voices to load if needed
      let voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        await new Promise<void>((resolve) => {
          window.speechSynthesis.onvoiceschanged = () => resolve();
          setTimeout(resolve, 500); // Timeout fallback
        });
        voices = window.speechSynthesis.getVoices();
      }

      const preferred = voices.find((v) => v.lang.startsWith("en-GB"));
      if (preferred) utterance.voice = preferred;

      utterance.onend = () => setIsReading(false);
      utterance.onerror = () => setIsReading(false);

      window.speechSynthesis.speak(utterance);
    } else {
      setIsReading(false);
    }
  }, [mode, content, title, isReading]);

  return (
    <div>
      {/* Inline header — + New button only */}
      <div
        className="flex items-center justify-end px-4 py-2"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <button
          onClick={newNote}
          className="rounded-md px-2 py-1 text-[10px] font-medium text-[var(--muted)] hover:text-white hover:bg-white/5 transition-colors"
          title="New note"
        >
          + New
        </button>
      </div>

      <div className="flex">
        {/* Sidebar — note list */}
        <div
          className="w-44 shrink-0 overflow-y-auto"
          style={{
            maxHeight: 400,
            borderRight: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {loading ? (
            <div className="p-3 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-white/5" />
              ))}
            </div>
          ) : notes.length === 0 ? (
            <p className="p-3 text-[10px] text-[var(--muted)] text-center">No notes yet</p>
          ) : (
            <div className="p-1">
              {notes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => loadNote(note)}
                  className={`w-full text-left rounded-md px-2 py-1.5 text-[11px] transition-colors ${
                    activeNoteId === note.id
                      ? "bg-white/10 text-white"
                      : "text-[var(--muted)] hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <p className="truncate font-medium">{note.title}</p>
                  <p className="truncate text-[9px] opacity-60">
                    {new Date(note.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    {note.calendarEntry && (
                      <> &middot; {note.calendarEntry.title}</>
                    )}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Editor area */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="px-3 pt-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
              className="w-full bg-transparent text-sm font-semibold text-white placeholder:text-[var(--muted)]/50 outline-none"
            />
          </div>

          {/* Mode tabs + toolbar */}
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMode("text")}
                className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors ${
                  mode === "text"
                    ? "bg-white/10 text-white"
                    : "text-[var(--muted)] hover:text-white"
                }`}
              >
                Text
              </button>
              <button
                onClick={() => setMode("draw")}
                className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors ${
                  mode === "draw"
                    ? "bg-white/10 text-white"
                    : "text-[var(--muted)] hover:text-white"
                }`}
              >
                Draw
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1">
              {/* Link to entry */}
              <button
                onClick={() => setShowLinkPicker(!showLinkPicker)}
                className={`rounded-md p-1.5 text-[var(--muted)] hover:text-white transition-colors ${
                  linkEntryId ? "text-[#c4a96a]" : ""
                }`}
                title="Link to calendar entry"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </button>
              {/* Save */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-md p-1.5 text-[var(--muted)] hover:text-white transition-colors disabled:opacity-40"
                title="Save"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                </svg>
              </button>
              {/* Download */}
              <button
                onClick={handleDownload}
                className="rounded-md p-1.5 text-[var(--muted)] hover:text-white transition-colors"
                title="Download"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
                </svg>
              </button>
              {/* Share */}
              <button
                onClick={handleShare}
                className="rounded-md p-1.5 text-[var(--muted)] hover:text-white transition-colors"
                title="Share / Copy"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>
                </svg>
              </button>
              {/* Email (Olivia) */}
              <button
                onClick={() => setShowEmailModal(true)}
                disabled={mode === "draw" || !content}
                className="rounded-md p-1.5 text-[var(--muted)] hover:text-white transition-colors disabled:opacity-30"
                title="Send via Email"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
              </button>
              {/* Read aloud */}
              <button
                onClick={handleRead}
                disabled={mode === "draw" || !content}
                className={`rounded-md p-1.5 transition-colors disabled:opacity-30 ${
                  isReading ? "text-[#c4a96a]" : "text-[var(--muted)] hover:text-white"
                }`}
                title={isReading ? "Stop reading" : "Read aloud"}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {isReading ? (
                    <>
                      <rect x="6" y="4" width="4" height="16" rx="1"/>
                      <rect x="14" y="4" width="4" height="16" rx="1"/>
                    </>
                  ) : (
                    <>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                    </>
                  )}
                </svg>
              </button>
              {/* Text/SMS */}
              <button
                onClick={() => setShowSmsModal(true)}
                disabled={mode === "draw" || !content}
                className="rounded-md p-1.5 text-[var(--muted)] hover:text-white transition-colors disabled:opacity-30"
                title="Send via SMS"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </button>
              {/* WhatsApp */}
              <button
                onClick={() => setShowWhatsAppModal(true)}
                disabled={mode === "draw" || !content}
                className="rounded-md p-1.5 text-[var(--muted)] hover:text-[#25D366] transition-colors disabled:opacity-30"
                title="Send via WhatsApp"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </button>
              {/* Voice Call */}
              <button
                onClick={() => setShowCallModal(true)}
                disabled={mode === "draw" || !content}
                className="rounded-md p-1.5 text-[var(--muted)] hover:text-emerald-400 transition-colors disabled:opacity-30"
                title="Call with Olivia's voice"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  <path d="M14.05 2a9 9 0 0 1 8 7.94"/>
                  <path d="M14.05 6A5 5 0 0 1 18 10"/>
                </svg>
              </button>
              {/* Delete */}
              {activeNoteId && (
                <button
                  onClick={handleDelete}
                  className="rounded-md p-1.5 text-[var(--muted)] hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Link picker dropdown */}
          {showLinkPicker && (
            <div
              className="mx-3 mt-1 mb-2 rounded-md border p-2"
              style={{
                background: "rgba(10, 14, 26, 0.98)",
                borderColor: "rgba(196, 169, 106, 0.2)",
              }}
            >
              <label className="block text-[10px] font-medium text-[var(--muted)] mb-1">
                Link to calendar entry
              </label>
              <select
                value={linkEntryId}
                onChange={(e) => {
                  setLinkEntryId(e.target.value);
                  setShowLinkPicker(false);
                }}
                className="w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-2 py-1.5 text-xs text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
              >
                <option value="">None (standalone note)</option>
                {calendarEntries.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.title} — {new Date(entry.startDatetime).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Text editor */}
          {mode === "text" && (
            <div className="px-3 py-2">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start typing your note..."
                rows={10}
                className="w-full bg-transparent text-xs text-[var(--foreground)] placeholder:text-[var(--muted)]/40 outline-none resize-none leading-relaxed"
              />
            </div>
          )}

          {/* Drawing canvas */}
          {mode === "draw" && (
            <div className="px-3 py-2">
              {/* Drawing toolbar */}
              <div className="flex items-center gap-2 mb-2">
                {/* Colors */}
                <div className="flex items-center gap-1">
                  {DRAW_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setDrawColor(c)}
                      className="rounded-full transition-transform"
                      style={{
                        width: 16,
                        height: 16,
                        background: c,
                        border: drawColor === c ? "2px solid #fff" : "2px solid transparent",
                        transform: drawColor === c ? "scale(1.2)" : "scale(1)",
                      }}
                    />
                  ))}
                </div>
                <div className="w-px h-4 bg-white/10" />
                {/* Widths */}
                <div className="flex items-center gap-1">
                  {DRAW_WIDTHS.map((w) => (
                    <button
                      key={w}
                      onClick={() => setDrawWidth(w)}
                      className={`rounded-md px-2 py-0.5 text-[9px] font-medium transition-colors ${
                        drawWidth === w ? "bg-white/10 text-white" : "text-[var(--muted)] hover:text-white"
                      }`}
                    >
                      {w}px
                    </button>
                  ))}
                </div>
                <div className="w-px h-4 bg-white/10" />
                {/* Undo / Clear */}
                <button
                  onClick={undoStroke}
                  disabled={strokes.length === 0}
                  className="rounded-md px-2 py-0.5 text-[9px] font-medium text-[var(--muted)] hover:text-white transition-colors disabled:opacity-30"
                >
                  Undo
                </button>
                <button
                  onClick={clearCanvas}
                  disabled={strokes.length === 0}
                  className="rounded-md px-2 py-0.5 text-[9px] font-medium text-[var(--muted)] hover:text-red-400 transition-colors disabled:opacity-30"
                >
                  Clear
                </button>
              </div>

              <div
                className="rounded-lg border overflow-hidden"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  background: "rgba(0,0,0,0.3)",
                }}
              >
                <canvas
                  ref={canvasRef}
                  className="w-full cursor-crosshair"
                  style={{ touchAction: "none", height: 300 }}
                  onMouseDown={startDraw}
                  onMouseMove={moveDraw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={moveDraw}
                  onTouchEnd={endDraw}
                />
              </div>
            </div>
          )}

          {/* Linked entry badge */}
          {linkEntryId && (
            <div className="px-3 pb-2">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium"
                style={{ background: "rgba(196,169,106,0.12)", color: "#c4a96a" }}
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                Linked to: {calendarEntries.find((e) => e.id === linkEntryId)?.title || "Entry"}
                <button
                  onClick={() => setLinkEntryId("")}
                  className="ml-1 hover:text-white transition-colors"
                >
                  x
                </button>
              </span>
            </div>
          )}

          {/* Status bar */}
          <div
            className="flex items-center justify-between px-3 py-1.5 text-[9px] text-[var(--muted)]"
            style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
          >
            <span>
              {activeNoteId ? "Editing" : "New note"}
              {saving && " — Saving..."}
            </span>
            <span>
              {mode === "text" ? `${content.length} chars` : `${strokes.length} strokes`}
            </span>
          </div>
        </div>
      </div>

      {/* SMS Modal */}
      {showSmsModal && (
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => { setShowSmsModal(false); setSmsStatus("idle"); }}
        >
          <div
            className="w-full max-w-xs rounded-xl border p-5"
            style={{
              background: "rgba(10, 14, 26, 0.98)",
              borderColor: "rgba(196, 169, 106, 0.2)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Send via SMS</h3>
            <p className="text-xs text-[var(--muted)] mb-3">
              Send this note to a UK mobile
            </p>
            <div className="mb-3">
              <PhoneInput
                defaultCountry="gb"
                value={smsPhone}
                onChange={(phone) => setSmsPhone(phone)}
                placeholder="7XXX XXXXXX"
                className="notepad-sms-phone-input"
              />
            </div>
            <style>{`
              .notepad-sms-phone-input.react-international-phone-input-container {
                background: var(--card-bg);
                border: 1px solid var(--card-border);
                border-radius: 6px;
                height: 38px;
              }
              .notepad-sms-phone-input .react-international-phone-input {
                background: transparent;
                color: var(--foreground);
                font-size: 0.875rem;
                border: none;
                height: 36px;
                padding: 0 10px;
                width: 100%;
              }
              .notepad-sms-phone-input .react-international-phone-input::placeholder {
                color: rgba(var(--muted-rgb, 148, 163, 184), 0.5);
              }
              .notepad-sms-phone-input .react-international-phone-country-selector-button {
                background: transparent;
                border: none;
                border-right: 1px solid var(--card-border);
                padding: 0 8px;
                height: 36px;
                min-width: 52px;
              }
              .notepad-sms-phone-input .react-international-phone-country-selector-button:hover {
                background: rgba(255,255,255,0.05);
              }
            `}</style>
            {smsStatus === "success" && (
              <p className="text-xs text-green-400 mb-3">SMS sent successfully!</p>
            )}
            {smsStatus === "error" && (
              <p className="text-xs text-red-400 mb-3">{smsError || "Failed to send SMS. Try again."}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowSmsModal(false); setSmsStatus("idle"); }}
                className="flex-1 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendSms}
                disabled={smsSending || smsPhone.length < 10}
                className="flex-1 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {smsSending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => { setShowEmailModal(false); setEmailStatus("idle"); }}
        >
          <div
            className="w-full max-w-xs rounded-xl border p-5"
            style={{
              background: "rgba(10, 14, 26, 0.98)",
              borderColor: "rgba(196, 169, 106, 0.2)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Send via Email</h3>
            <p className="text-xs text-[var(--muted)] mb-3">
              Olivia will send this note to this email
            </p>
            <div className="mb-3">
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="recipient@example.com"
                className="w-full rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/50 focus:border-brand-500 focus:outline-none"
              />
            </div>
            {emailStatus === "success" && (
              <p className="text-xs text-green-400 mb-3">Email sent successfully!</p>
            )}
            {emailStatus === "error" && (
              <p className="text-xs text-red-400 mb-3">{emailError || "Failed to send email. Try again."}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowEmailModal(false); setEmailStatus("idle"); }}
                className="flex-1 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendEmail}
                disabled={emailSending || !emailTo.includes("@")}
                className="flex-1 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {emailSending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => { setShowWhatsAppModal(false); setWhatsAppStatus("idle"); }}
        >
          <div
            className="w-full max-w-xs rounded-xl border p-5"
            style={{
              background: "rgba(10, 14, 26, 0.98)",
              borderColor: "rgba(37, 211, 102, 0.2)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Send via WhatsApp</h3>
            </div>
            <p className="text-xs text-[var(--muted)] mb-3">
              Send this note via WhatsApp
            </p>
            <div className="mb-3">
              <PhoneInput
                defaultCountry="gb"
                value={whatsAppPhone}
                onChange={(phone) => setWhatsAppPhone(phone)}
                placeholder="7XXX XXXXXX"
                className="notepad-whatsapp-phone-input"
              />
            </div>
            <style>{`
              .notepad-whatsapp-phone-input.react-international-phone-input-container {
                background: var(--card-bg);
                border: 1px solid rgba(37, 211, 102, 0.3);
                border-radius: 6px;
                height: 38px;
              }
              .notepad-whatsapp-phone-input .react-international-phone-input {
                background: transparent;
                color: var(--foreground);
                font-size: 0.875rem;
                border: none;
                height: 36px;
                padding: 0 10px;
                width: 100%;
              }
              .notepad-whatsapp-phone-input .react-international-phone-input::placeholder {
                color: rgba(var(--muted-rgb, 148, 163, 184), 0.5);
              }
              .notepad-whatsapp-phone-input .react-international-phone-country-selector-button {
                background: transparent;
                border: none;
                border-right: 1px solid rgba(37, 211, 102, 0.3);
                padding: 0 8px;
                height: 36px;
                min-width: 52px;
              }
              .notepad-whatsapp-phone-input .react-international-phone-country-selector-button:hover {
                background: rgba(37, 211, 102, 0.1);
              }
            `}</style>
            {whatsAppStatus === "success" && (
              <p className="text-xs text-green-400 mb-3">WhatsApp sent successfully!</p>
            )}
            {whatsAppStatus === "error" && (
              <p className="text-xs text-red-400 mb-3">{whatsAppError || "Failed to send WhatsApp. Try again."}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowWhatsAppModal(false); setWhatsAppStatus("idle"); }}
                className="flex-1 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendWhatsApp}
                disabled={whatsAppSending || whatsAppPhone.length < 10}
                className="flex-1 rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50"
                style={{ background: "#25D366" }}
              >
                {whatsAppSending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Call Modal */}
      {showCallModal && (
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => { setShowCallModal(false); setCallStatus("idle"); }}
        >
          <div
            className="w-full max-w-sm rounded-xl border p-5"
            style={{
              background: "rgba(10, 14, 26, 0.98)",
              borderColor: "rgba(16, 185, 129, 0.2)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                <path d="M14.05 2a9 9 0 0 1 8 7.94"/>
                <path d="M14.05 6A5 5 0 0 1 18 10"/>
              </svg>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Call with Olivia&apos;s Voice</h3>
            </div>
            <p className="text-xs text-[var(--muted)] mb-3">
              Olivia will call and read this note with her custom voice
            </p>
            <div className="mb-3">
              <label className="block text-[10px] font-medium text-[var(--muted)] mb-1 uppercase tracking-wider">
                Phone Number
              </label>
              <PhoneInput
                defaultCountry="gb"
                value={callPhone}
                onChange={(phone) => setCallPhone(phone)}
                placeholder="7XXX XXXXXX"
                className="notepad-call-phone-input"
              />
            </div>
            <style>{`
              .notepad-call-phone-input.react-international-phone-input-container {
                background: var(--card-bg);
                border: 1px solid rgba(16, 185, 129, 0.3);
                border-radius: 6px;
                height: 38px;
              }
              .notepad-call-phone-input .react-international-phone-input {
                background: transparent;
                color: var(--foreground);
                font-size: 0.875rem;
                border: none;
                height: 36px;
                padding: 0 10px;
                width: 100%;
              }
              .notepad-call-phone-input .react-international-phone-input::placeholder {
                color: rgba(var(--muted-rgb, 148, 163, 184), 0.5);
              }
              .notepad-call-phone-input .react-international-phone-country-selector-button {
                background: transparent;
                border: none;
                border-right: 1px solid rgba(16, 185, 129, 0.3);
                padding: 0 8px;
                height: 36px;
                min-width: 52px;
              }
              .notepad-call-phone-input .react-international-phone-country-selector-button:hover {
                background: rgba(16, 185, 129, 0.1);
              }
            `}</style>
            <div className="mb-3">
              <label className="block text-[10px] font-medium text-[var(--muted)] mb-1 uppercase tracking-wider">
                Custom Message (optional)
              </label>
              <textarea
                value={callMessage}
                onChange={(e) => setCallMessage(e.target.value)}
                placeholder="Leave blank to read the note content..."
                rows={3}
                className="w-full rounded-md border border-emerald-500/30 bg-[var(--card-bg)] px-3 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)]/50 focus:border-emerald-500 focus:outline-none resize-none"
              />
            </div>
            {callStatus === "success" && (
              <p className="text-xs text-green-400 mb-3">Call initiated! Recipient will receive the call shortly.</p>
            )}
            {callStatus === "error" && (
              <p className="text-xs text-red-400 mb-3">{callError || "Failed to make call. Try again."}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowCallModal(false); setCallStatus("idle"); }}
                className="flex-1 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMakeCall}
                disabled={callMaking || callPhone.length < 10}
                className="flex-1 rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50"
                style={{ background: "#10b981" }}
              >
                {callMaking ? "Calling..." : "Call Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
