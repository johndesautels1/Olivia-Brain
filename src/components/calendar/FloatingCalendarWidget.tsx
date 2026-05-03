"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useMapAppointments } from "@/components/map/MapAppointmentsContext";
import { useDraggable } from "@/components/tools/useDraggable";
import { dismissKeyboard, isMobile } from "@/lib/mobile-keyboard";

interface UpcomingEntry {
  id: string;
  title: string;
  startDatetime: string;
  endDatetime: string;
  category: string;
  allDay: boolean;
  location?: string;
}

const BUBBLE_SIZE = 48;
const STORAGE_KEY = "cal-widget-pos";

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function loadPosition(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (typeof p.x === "number" && typeof p.y === "number") return p;
    }
  } catch { /* ignore */ }
  return null;
}

function savePosition(pos: { x: number; y: number }) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)); } catch { /* ignore */ }
}

function getDefaultPosition() {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  return {
    x: window.innerWidth - BUBBLE_SIZE - 16,
    y: window.innerHeight - BUBBLE_SIZE - 80, // above mobile nav
  };
}

const CATEGORY_DOTS: Record<string, string> = {
  vc_meeting: "#6366f1",
  angel_meeting: "#8b5cf6",
  board_meeting: "#3b82f6",
  advisory_call: "#0ea5e9",
  founder_meeting: "#22c55e",
  team_standup: "#06b6d4",
  conference_attend: "#3b82f6",
  pitch_event: "#f59e0b",
  networking_event: "#f43f5e",
  focus_time: "#0284c7",
  deep_work: "#0369a1",
  deal_prep: "#8B5CF6",
  funding_deadline: "#ef4444",
  legal_deadline: "#dc2626",
  personal_event: "#94a3b8",
};

export function FloatingCalendarWidget({ hideBubble = false }: { hideBubble?: boolean } = {}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<UpcomingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickTime, setQuickTime] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);
  const [showClockPicker, setShowClockPicker] = useState(false);
  const [clockHour, setClockHour] = useState(9);
  const [clockMinute, setClockMinute] = useState(0);
  const [clockSelectingMinutes, setClockSelectingMinutes] = useState(false);
  const isCalendarPage = pathname?.startsWith("/calendar");
  const isMapPage = pathname === "/map";

  // Map appointments integration - GoogleMap3DView handles actual loading
  const { showAppointments, setShowAppointments, loading: appointmentsLoading, appointments } = useMapAppointments();
  const [showAppointmentsPopup, setShowAppointmentsPopup] = useState(false);
  // Optimistic local state for immediate checkbox feedback (INP optimization)
  const [localChecked, setLocalChecked] = useState(showAppointments);

  // ── Drag state ──
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragState = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
    moved: boolean;
  }>({ dragging: false, startX: 0, startY: 0, startPosX: 0, startPosY: 0, moved: false });

  // Initialize position on mount
  useEffect(() => {
    const saved = loadPosition();
    if (saved) {
      setPos({
        x: clamp(saved.x, 0, window.innerWidth - BUBBLE_SIZE),
        y: clamp(saved.y, 0, window.innerHeight - BUBBLE_SIZE),
      });
    } else {
      setPos(getDefaultPosition());
    }
  }, []);

  // Keep in viewport on resize
  useEffect(() => {
    function handleResize() {
      setPos((prev) => {
        if (!prev) return prev;
        return {
          x: clamp(prev.x, 0, window.innerWidth - BUBBLE_SIZE),
          y: clamp(prev.y, 0, window.innerHeight - BUBBLE_SIZE),
        };
      });
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── Drag handlers ──
  const handleMove = useCallback((clientX: number, clientY: number) => {
    const d = dragState.current;
    if (!d.dragging) return;
    const dx = clientX - d.startX;
    const dy = clientY - d.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) d.moved = true;
    const newX = clamp(d.startPosX + dx, 0, window.innerWidth - BUBBLE_SIZE);
    const newY = clamp(d.startPosY + dy, 0, window.innerHeight - BUBBLE_SIZE);
    setPos({ x: newX, y: newY });
  }, []);

  const handleEnd = useCallback(() => {
    const d = dragState.current;
    d.dragging = false;
    document.body.style.userSelect = "";
    setPos((p) => { if (p) savePosition(p); return p; });
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const d = dragState.current;
    d.dragging = true;
    d.moved = false;
    d.startX = e.clientX;
    d.startY = e.clientY;
    d.startPosX = pos?.x ?? 0;
    d.startPosY = pos?.y ?? 0;
    document.body.style.userSelect = "none";
    e.preventDefault();
  }, [pos]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const d = dragState.current;
    d.dragging = true;
    d.moved = false;
    d.startX = touch.clientX;
    d.startY = touch.clientY;
    d.startPosX = pos?.x ?? 0;
    d.startPosY = pos?.y ?? 0;
  }, [pos]);

  useEffect(() => {
    const onMM = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMU = () => handleEnd();
    window.addEventListener("mousemove", onMM);
    window.addEventListener("mouseup", onMU);
    return () => { window.removeEventListener("mousemove", onMM); window.removeEventListener("mouseup", onMU); };
  }, [handleMove, handleEnd]);

  useEffect(() => {
    const onTM = (e: TouchEvent) => {
      if (!dragState.current.dragging) return;
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
      if (dragState.current.moved) e.preventDefault();
    };
    const onTE = () => handleEnd();
    window.addEventListener("touchmove", onTM, { passive: false });
    window.addEventListener("touchend", onTE);
    return () => { window.removeEventListener("touchmove", onTM); window.removeEventListener("touchend", onTE); };
  }, [handleMove, handleEnd]);

  const handleClick = useCallback(() => {
    if (!dragState.current.moved) {
      // On map page, clicking widget shows appointments popup instead of calendar
      if (isMapPage) {
        setShowAppointmentsPopup((prev) => !prev);
      } else {
        setOpen((prev) => !prev);
      }
    }
  }, [isMapPage]);

  // ── Data fetching ──
  const fetchToday = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
      const res = await fetch(`/api/calendar/entries?start=${start}&end=${end}`);
      if (res.ok) {
        const data = await res.json();
        const all = (data.entries || []) as UpcomingEntry[];
        const sorted = all
          .filter((e) => new Date(e.endDatetime) >= now || e.allDay)
          .sort((a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime());
        setEntries(sorted.slice(0, 5));
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !isCalendarPage) fetchToday();
  }, [open, isCalendarPage, fetchToday]);

  // ── Quick add ──
  const handleQuickAdd = useCallback(async () => {
    if (!quickTitle.trim()) return;
    setQuickSaving(true);
    try {
      const now = new Date();
      let startDatetime: Date;
      if (quickTime) {
        const [h, m] = quickTime.split(":").map(Number);
        startDatetime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
      } else {
        // Default to next whole hour
        startDatetime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0);
      }
      const endDatetime = new Date(startDatetime.getTime() + 60 * 60 * 1000); // 1 hour

      const res = await fetch("/api/calendar/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quickTitle.trim(),
          startDatetime: startDatetime.toISOString(),
          endDatetime: endDatetime.toISOString(),
          category: "personal_event",
          entryType: "event",
          priority: "medium",
        }),
      });

      if (res.ok) {
        setQuickTitle("");
        setQuickTime("");
        setShowQuickAdd(false);
        dismissKeyboard();
        await fetchToday();
      }
    } catch {
      // Silent fail
    } finally {
      setQuickSaving(false);
    }
  }, [quickTitle, quickTime, fetchToday]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  // Sync local checkbox state with context (when context changes externally)
  useEffect(() => {
    setLocalChecked(showAppointments);
  }, [showAppointments]);

  // Listen for external toggle from MyToolsDock
  useEffect(() => {
    const handler = () => {
      if (isMapPage) {
        setShowAppointmentsPopup((prev) => !prev);
      } else {
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("my-tools-calendar-toggle", handler);
    return () => window.removeEventListener("my-tools-calendar-toggle", handler);
  }, [isMapPage]);

  // Draggable hook for the expanded calendar panel
  const { pos: calPanelPos, elRef: calPanelRef, onMouseDown: calPanelMouseDown, onTouchStart: calPanelTouchStart } = useDraggable({
    storageKey: "cal-panel-pos",
    width: 288,
    height: 360,
  });

  // Handle appointments toggle - optimistic UI for INP < 200ms
  const handleAppointmentsToggle = useCallback(() => {
    const newValue = !localChecked;
    // Immediately update local state for visual feedback
    setLocalChecked(newValue);
    // Defer context update to next frame so browser can paint first
    requestAnimationFrame(() => {
      setShowAppointments(newValue);
    });
  }, [localChecked, setShowAppointments]);

  // Hide on /calendar — after all hooks
  if (isCalendarPage) return null;
  if (!pos) return null;

  return (
    <>
      {/* Draggable floating button — hidden when My Tools dock is active */}
      {!hideBubble && (
        <button
          onClick={handleClick}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          className="fixed z-[46] flex items-center justify-center rounded-full shadow-lg"
          style={{
            left: pos.x,
            top: pos.y,
            width: BUBBLE_SIZE,
            height: BUBBLE_SIZE,
            background: "linear-gradient(135deg, rgba(30,35,60,0.95), rgba(15,19,32,0.98))",
            border: "1px solid rgba(196,169,106,0.3)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4), 0 0 0 1px rgba(196,169,106,0.1)",
            cursor: "grab",
            touchAction: "none",
          }}
          title="Today's calendar (drag to move)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c4a96a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {entries.length > 0 && !open && (
            <span
              className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ background: "#c4a96a" }}
            >
              {entries.length}
            </span>
          )}
        </button>
      )}

      {/* Mobile: solid backdrop hides page */}
      {open && <div className="fixed inset-0 z-[49] bg-[#0a0e1a] md:hidden" onClick={() => setOpen(false)} />}

      {/* Expanded panel — draggable */}
      {open && calPanelPos && (
        <div
          ref={calPanelRef}
          className="fixed z-[50] w-72 rounded-xl shadow-2xl"
          style={{
            left: `${calPanelPos.x}px`,
            top: `${calPanelPos.y}px`,
            background: "linear-gradient(180deg, rgba(18,22,38,0.98), rgba(10,14,26,0.99))",
            border: "1px solid rgba(196,169,106,0.2)",
            backdropFilter: "blur(16px)",
          }}
        >
          {/* Drag handle header */}
          <div
            className="flex items-center justify-between px-4 py-3 cursor-grab active:cursor-grabbing"
            style={{ borderBottom: "1px solid rgba(196,169,106,0.12)", touchAction: "none" }}
            onMouseDown={calPanelMouseDown}
            onTouchStart={calPanelTouchStart}
          >
            <h3 className="text-xs font-semibold text-white tracking-wide">
              Today&apos;s Schedule
            </h3>
            <div className="flex items-center gap-2">
              <Link
                href="/calendar"
                className="text-[10px] font-medium transition-colors"
                style={{ color: "#c4a96a" }}
                onClick={() => setOpen(false)}
              >
                Open Calendar
              </Link>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close calendar"
                className="flex items-center justify-center h-5 w-5 rounded transition-colors hover:bg-white/10"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body — event list */}
          <div className="max-h-48 overflow-y-auto px-3 py-2">
            {loading ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 animate-pulse rounded bg-white/5" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <p className="py-3 text-center text-xs text-slate-300">
                No upcoming events today
              </p>
            ) : (
              <div className="space-y-1">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5"
                  >
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: CATEGORY_DOTS[entry.category] || "#c4a96a" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium text-white">
                        {entry.title}
                      </p>
                      <p className="text-[10px] text-slate-300">
                        {entry.allDay ? "All day" : `${formatTime(entry.startDatetime)} – ${formatTime(entry.endDatetime)}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Add section */}
          <div
            className="px-3 py-2"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            {showQuickAdd ? (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Event title..."
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleQuickAdd(); }}
                  autoFocus={!isMobile()}
                  className="w-full rounded-md px-2.5 py-1.5 text-xs text-white placeholder-gray-500 outline-none"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.10)",
                  }}
                />
                <div className="flex items-center gap-2">
                  {/* Custom time button — opens clock picker */}
                  <button
                    onClick={() => { dismissKeyboard(); setTimeout(() => setShowClockPicker(true), 150); }}
                    className="flex-1 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-white"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(196,169,106,0.2)",
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c4a96a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                    {quickTime || "Set time"}
                  </button>
                  <button
                    onClick={handleQuickAdd}
                    disabled={!quickTitle.trim() || quickSaving}
                    className="rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-40"
                    style={{ background: "rgba(196,169,106,0.3)", border: "1px solid rgba(196,169,106,0.3)" }}
                  >
                    {quickSaving ? "..." : "Add"}
                  </button>
                  <button
                    onClick={() => { setShowQuickAdd(false); setQuickTitle(""); setQuickTime(""); }}
                    className="rounded-md px-2 py-1.5 text-xs text-slate-300 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* ── Custom Clock Picker ── */}
                {showClockPicker && (
                  <div className="fixed top-0 left-0 w-full z-[60] flex items-center justify-center p-4 sm:p-0" style={{ height: "100dvh" }} onClick={() => setShowClockPicker(false)}>
                    {/* Mobile: solid backdrop */}
                    <div className="absolute top-0 left-0 w-full h-full bg-[#0a0e1a]/95 sm:bg-black/50 sm:backdrop-blur-sm" />
                    <div
                      className="relative flex flex-col items-center rounded-2xl p-4 landscape:p-3"
                      style={{
                        width: "min(300px, 90vw)",
                        background: "linear-gradient(180deg, rgba(18,22,38,0.99) 0%, rgba(10,14,26,0.99) 50%, rgba(6,9,18,0.99) 100%)",
                        border: "1.5px solid rgba(196,169,106,0.25)",
                        boxShadow: "0 24px 64px rgba(0,0,0,0.7), 0 0 32px rgba(196,169,106,0.06), inset 0 1px 0 rgba(196,169,106,0.12), inset 0 -1px 0 rgba(0,0,0,0.3)",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Time display */}
                      <div className="flex items-center gap-1 mb-3 landscape:mb-2">
                        <button
                          onClick={() => setClockSelectingMinutes(false)}
                          className="text-2xl landscape:text-xl font-light tracking-wider px-2 py-1 rounded-lg transition-colors"
                          style={{
                            color: !clockSelectingMinutes ? "#c4a96a" : "rgba(255,255,255,0.5)",
                            background: !clockSelectingMinutes ? "rgba(196,169,106,0.1)" : "transparent",
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          {String(clockHour).padStart(2, "0")}
                        </button>
                        <span className="text-2xl landscape:text-xl font-light" style={{ color: "rgba(196,169,106,0.4)" }}>:</span>
                        <button
                          onClick={() => setClockSelectingMinutes(true)}
                          className="text-2xl landscape:text-xl font-light tracking-wider px-2 py-1 rounded-lg transition-colors"
                          style={{
                            color: clockSelectingMinutes ? "#c4a96a" : "rgba(255,255,255,0.5)",
                            background: clockSelectingMinutes ? "rgba(196,169,106,0.1)" : "transparent",
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          {String(clockMinute).padStart(2, "0")}
                        </button>
                      </div>

                      {/* Clock face */}
                      <div
                        className="relative landscape:w-36 landscape:h-36"
                        style={{
                          width: "min(200px, 55vw)",
                          height: "min(200px, 55vw)",
                        }}
                      >
                        <svg viewBox="0 0 200 200" className="w-full h-full" style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }}>
                          <defs>
                            {/* Bezel gradient — brushed gold effect */}
                            <linearGradient id="bezelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="rgba(196,169,106,0.5)" />
                              <stop offset="30%" stopColor="rgba(196,169,106,0.15)" />
                              <stop offset="50%" stopColor="rgba(196,169,106,0.45)" />
                              <stop offset="70%" stopColor="rgba(196,169,106,0.12)" />
                              <stop offset="100%" stopColor="rgba(196,169,106,0.4)" />
                            </linearGradient>
                            {/* Face gradient — deep sunburst */}
                            <radialGradient id="clockFace" cx="50%" cy="38%" r="58%">
                              <stop offset="0%" stopColor="rgba(30,35,55,1)" />
                              <stop offset="60%" stopColor="rgba(15,19,32,1)" />
                              <stop offset="100%" stopColor="rgba(5,8,16,1)" />
                            </radialGradient>
                            {/* Subtle light reflection */}
                            <radialGradient id="clockHighlight" cx="50%" cy="25%" r="40%">
                              <stop offset="0%" stopColor="rgba(255,255,255,0.04)" />
                              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                            </radialGradient>
                            {/* Inner shadow */}
                            <radialGradient id="innerShadow" cx="50%" cy="50%" r="50%">
                              <stop offset="80%" stopColor="rgba(0,0,0,0)" />
                              <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
                            </radialGradient>
                          </defs>
                          {/* Outer bezel — layered for depth */}
                          <circle cx="100" cy="100" r="99" fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="2" />
                          <circle cx="100" cy="100" r="97" fill="none" stroke="url(#bezelGrad)" strokeWidth="3" />
                          <circle cx="100" cy="100" r="94.5" fill="none" stroke="rgba(196,169,106,0.1)" strokeWidth="0.5" />
                          {/* Dial face */}
                          <circle cx="100" cy="100" r="93" fill="url(#clockFace)" />
                          {/* Light reflection overlay */}
                          <circle cx="100" cy="100" r="93" fill="url(#clockHighlight)" />
                          {/* Inner ring shadow for depth */}
                          <circle cx="100" cy="100" r="93" fill="url(#innerShadow)" />
                          {/* Chapter ring — subtle inner track */}
                          <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(196,169,106,0.06)" strokeWidth="8" />
                          <circle cx="100" cy="100" r="86" fill="none" stroke="rgba(196,169,106,0.03)" strokeWidth="0.5" />
                          {/* Tick marks */}
                          {Array.from({ length: 60 }).map((_, i) => {
                            const angle = (i * 6 - 90) * (Math.PI / 180);
                            const isMajor = i % 5 === 0;
                            const r1 = isMajor ? 80 : 85;
                            const r2 = 89;
                            return (
                              <line
                                key={i}
                                x1={100 + r1 * Math.cos(angle)}
                                y1={100 + r1 * Math.sin(angle)}
                                x2={100 + r2 * Math.cos(angle)}
                                y2={100 + r2 * Math.sin(angle)}
                                stroke={isMajor ? "rgba(196,169,106,0.7)" : "rgba(196,169,106,0.18)"}
                                strokeWidth={isMajor ? 1.8 : 0.5}
                                strokeLinecap="round"
                              />
                            );
                          })}
                          {/* Numbers */}
                          {(clockSelectingMinutes
                            ? [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
                            : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
                          ).map((num, i) => {
                            const angle = ((clockSelectingMinutes ? i * 30 : i * 30 + 30) - 90) * (Math.PI / 180);
                            const r = 68;
                            const isSelected = clockSelectingMinutes
                              ? clockMinute === num
                              : clockHour % 12 === num % 12;
                            return (
                              <g key={num}>
                                {isSelected && (
                                  <circle
                                    cx={100 + r * Math.cos(angle)}
                                    cy={100 + r * Math.sin(angle)}
                                    r="14"
                                    fill="rgba(196,169,106,0.2)"
                                    stroke="rgba(196,169,106,0.4)"
                                    strokeWidth="1"
                                  />
                                )}
                                <text
                                  x={100 + r * Math.cos(angle)}
                                  y={100 + r * Math.sin(angle)}
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  fill={isSelected ? "#c4a96a" : "rgba(255,255,255,0.6)"}
                                  fontSize="11"
                                  fontWeight={isSelected ? "600" : "300"}
                                  fontFamily="'Inter', sans-serif"
                                  className="cursor-pointer select-none"
                                  onClick={() => {
                                    if (clockSelectingMinutes) {
                                      setClockMinute(num);
                                    } else {
                                      setClockHour(num === 12 ? (clockHour >= 12 ? 12 : 0) : (clockHour >= 12 ? num + 12 : num));
                                      setClockSelectingMinutes(true);
                                    }
                                  }}
                                >
                                  {clockSelectingMinutes ? String(num).padStart(2, "0") : num}
                                </text>
                              </g>
                            );
                          })}
                          {/* Hand */}
                          {(() => {
                            const val = clockSelectingMinutes ? clockMinute : (clockHour % 12 || 12);
                            const angle = ((clockSelectingMinutes ? val * 6 : val * 30) - 90) * (Math.PI / 180);
                            const handLen = clockSelectingMinutes ? 60 : 50;
                            const tipX = 100 + handLen * Math.cos(angle);
                            const tipY = 100 + handLen * Math.sin(angle);
                            return (
                              <>
                                {/* Hand shadow for depth */}
                                <line
                                  x1="101" y1="101"
                                  x2={tipX + 1} y2={tipY + 1}
                                  stroke="rgba(0,0,0,0.3)" strokeWidth="2.5" strokeLinecap="round"
                                />
                                {/* Main hand */}
                                <line
                                  x1="100" y1="100" x2={tipX} y2={tipY}
                                  stroke="#c4a96a" strokeWidth="1.5" strokeLinecap="round"
                                />
                                {/* Tip dot */}
                                <circle cx={tipX} cy={tipY} r="2" fill="#c4a96a" opacity="0.6" />
                                {/* Center cap — layered for dimension */}
                                <circle cx="100" cy="100" r="5" fill="rgba(10,14,26,0.9)" stroke="rgba(196,169,106,0.4)" strokeWidth="1" />
                                <circle cx="100" cy="100" r="2.5" fill="#c4a96a" />
                                <circle cx="99" cy="99" r="1" fill="rgba(255,255,255,0.2)" />
                              </>
                            );
                          })()}
                        </svg>
                      </div>

                      {/* AM/PM toggle */}
                      <div className="flex items-center gap-2 mt-2 landscape:mt-1">
                        <button
                          onClick={() => { if (clockHour >= 12) setClockHour(clockHour - 12); }}
                          className="px-3 py-1 rounded-md text-[10px] font-semibold tracking-wider transition-colors"
                          style={{
                            background: clockHour < 12 ? "rgba(196,169,106,0.2)" : "transparent",
                            border: `1px solid ${clockHour < 12 ? "rgba(196,169,106,0.4)" : "rgba(255,255,255,0.1)"}`,
                            color: clockHour < 12 ? "#c4a96a" : "rgba(255,255,255,0.4)",
                          }}
                        >
                          AM
                        </button>
                        <button
                          onClick={() => { if (clockHour < 12) setClockHour(clockHour + 12); }}
                          className="px-3 py-1 rounded-md text-[10px] font-semibold tracking-wider transition-colors"
                          style={{
                            background: clockHour >= 12 ? "rgba(196,169,106,0.2)" : "transparent",
                            border: `1px solid ${clockHour >= 12 ? "rgba(196,169,106,0.4)" : "rgba(255,255,255,0.1)"}`,
                            color: clockHour >= 12 ? "#c4a96a" : "rgba(255,255,255,0.4)",
                          }}
                        >
                          PM
                        </button>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-center gap-3 mt-3 landscape:mt-2 w-full">
                        <button
                          onClick={() => { setQuickTime(""); setShowClockPicker(false); }}
                          className="px-4 py-1.5 rounded-md text-[11px] font-medium transition-colors"
                          style={{ color: "rgba(255,255,255,0.5)" }}
                        >
                          Clear
                        </button>
                        <button
                          onClick={() => setShowClockPicker(false)}
                          className="px-4 py-1.5 rounded-md text-[11px] font-medium transition-colors"
                          style={{ color: "rgba(255,255,255,0.5)" }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            setQuickTime(`${String(clockHour).padStart(2, "0")}:${String(clockMinute).padStart(2, "0")}`);
                            setShowClockPicker(false);
                          }}
                          className="px-5 py-1.5 rounded-md text-[11px] font-semibold transition-colors"
                          style={{
                            background: "rgba(196,169,106,0.2)",
                            border: "1px solid rgba(196,169,106,0.4)",
                            color: "#c4a96a",
                          }}
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowQuickAdd(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-white/5"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Quick Add Event
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══ Map Page: Appointments Popup (triggered by clicking calendar widget) ═══ */}
      {isMapPage && showAppointmentsPopup && (
        <div
          className="fixed z-[46] w-64 rounded-xl shadow-2xl"
          style={{
            left: clamp(pos.x - 200, 8, window.innerWidth - 280),
            top: pos.y - 260,
            background: "linear-gradient(180deg, rgba(12,16,28,0.98), rgba(8,12,22,0.99))",
            border: "2px solid rgba(196,169,106,0.4)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(196,169,106,0.1), inset 0 1px 0 rgba(196,169,106,0.1)",
          }}
        >
          {/* Header with week date range */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid rgba(196,169,106,0.2)" }}
          >
            <h3 className="text-[11px] font-bold tracking-wide" style={{ color: "#c4a96a" }}>
              Appointments W/O {(() => {
                const now = new Date();
                const weekEnd = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
                const formatShort = (d: Date) => `${d.getMonth() + 1}-${d.getDate()}`;
                return `${formatShort(now)} to ${formatShort(weekEnd)}`;
              })()}
            </h3>
            <button
              onClick={() => setShowAppointmentsPopup(false)}
              className="text-slate-300 hover:text-white transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Toggle row */}
          <div className="px-4 py-3">
            <label className="flex items-center gap-3 cursor-pointer group">
              {/* Custom checkbox - uses localChecked for immediate visual feedback */}
              <div
                className="relative flex h-5 w-5 items-center justify-center rounded transition-all"
                style={{
                  background: localChecked ? "rgba(196,169,106,0.9)" : "rgba(255,255,255,0.08)",
                  border: `2px solid ${localChecked ? "#c4a96a" : "rgba(196,169,106,0.4)"}`,
                  boxShadow: localChecked ? "0 0 8px rgba(196,169,106,0.4)" : "none",
                }}
                onClick={handleAppointmentsToggle}
              >
                {localChecked && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <span className="text-xs font-semibold text-white group-hover:text-[#c4a96a] transition-colors">
                  Show on Map
                </span>
                <p className="text-[10px] text-slate-300 mt-0.5">
                  Display appointments at their locations
                </p>
              </div>
            </label>
          </div>

          {/* Appointments list with proper scroll */}
          {showAppointments && (
            <div
              className="px-3 pb-3"
              style={{ borderTop: "1px solid rgba(196,169,106,0.1)" }}
            >
              {appointmentsLoading ? (
                <div className="flex items-center gap-2 py-3">
                  <div className="h-3 w-3 rounded-full border border-[#c4a96a] border-t-transparent animate-spin" />
                  <span className="text-[10px] text-slate-300">Loading...</span>
                </div>
              ) : appointments.length === 0 ? (
                <p className="text-[10px] text-slate-300 py-3 text-center">
                  No appointments with locations
                </p>
              ) : (
                <div
                  className="space-y-1.5 pt-2 overflow-y-auto scrollbar-thin scrollbar-thumb-[#c4a96a]/30 scrollbar-track-transparent"
                  style={{ maxHeight: "140px" }}
                >
                  {appointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-start gap-2 rounded-md px-2 py-1.5"
                      style={{ background: "rgba(196,169,106,0.06)", border: "1px solid rgba(196,169,106,0.12)" }}
                    >
                      <div
                        className="mt-1 h-2 w-2 rounded-full flex-shrink-0"
                        style={{ background: "#c4a96a", boxShadow: "0 0 4px rgba(196,169,106,0.5)" }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold text-white truncate">{apt.entityName}</p>
                        <p className="text-[9px] text-slate-300">{apt.date} · {apt.time}</p>
                        <p className="text-[8px] text-slate-300 truncate">{apt.location}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
