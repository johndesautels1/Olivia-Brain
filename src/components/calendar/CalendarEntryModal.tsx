"use client";

import { useState, useCallback, useRef, useEffect, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import "react-datepicker/dist/react-datepicker.css";
import type { CalendarEntryWithDetails } from "@/lib/queries/calendar";

const LazyDatePicker = lazy(() => import("react-datepicker"));

// ── Attendee Types ──
interface AttendeeInput {
  name: string;
  email: string;
  phone: string;
  socialUrl: string;
  role: "required" | "optional" | "organizer" | "speaker";
  isOrganizer: boolean;
}

const EMPTY_ATTENDEE: AttendeeInput = {
  name: "",
  email: "",
  phone: "",
  socialUrl: "",
  role: "required",
  isOrganizer: false,
};

// ── Google Places Autocomplete ──
const LONDON_BOUNDS = {
  south: 51.28,
  west: -0.51,
  north: 51.69,
  east: 0.34,
};

interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

const ROLE_OPTIONS = [
  { value: "required", label: "Required" },
  { value: "optional", label: "Optional" },
  { value: "organizer", label: "Organizer" },
  { value: "speaker", label: "Speaker" },
];

const CATEGORY_OPTIONS: { value: string; label: string; group: string }[] = [
  // Meetings
  { value: "vc_meeting", label: "VC Meeting", group: "Meetings" },
  { value: "angel_meeting", label: "Angel Meeting", group: "Meetings" },
  { value: "board_meeting", label: "Board Meeting", group: "Meetings" },
  { value: "advisory_call", label: "Advisory Call", group: "Meetings" },
  { value: "investor_update", label: "Investor Update", group: "Meetings" },
  { value: "founder_meeting", label: "Founder Meeting", group: "Meetings" },
  { value: "team_standup", label: "Team Standup", group: "Meetings" },
  { value: "one_on_one", label: "One-on-One", group: "Meetings" },
  // Events
  { value: "conference_attend", label: "Conference", group: "Events" },
  { value: "meetup_attend", label: "Meetup", group: "Events" },
  { value: "pitch_event", label: "Pitch Event", group: "Events" },
  { value: "demo_day_attend", label: "Demo Day", group: "Events" },
  { value: "hackathon_attend", label: "Hackathon", group: "Events" },
  { value: "workshop_attend", label: "Workshop", group: "Events" },
  { value: "networking_event", label: "Networking", group: "Events" },
  { value: "gala_awards", label: "Gala / Awards", group: "Events" },
  // Work
  { value: "focus_time", label: "Focus Time", group: "Work Blocks" },
  { value: "deep_work", label: "Deep Work", group: "Work Blocks" },
  { value: "deal_prep", label: "Deal Prep", group: "Work Blocks" },
  { value: "admin_block", label: "Admin Block", group: "Work Blocks" },
  { value: "email_block", label: "Email Block", group: "Work Blocks" },
  // Milestones
  { value: "funding_deadline", label: "Funding Deadline", group: "Milestones" },
  { value: "product_launch", label: "Product Launch", group: "Milestones" },
  { value: "hiring_milestone", label: "Hiring Milestone", group: "Milestones" },
  { value: "legal_deadline", label: "Legal Deadline", group: "Milestones" },
  // Rituals
  { value: "weekly_review", label: "Weekly Review", group: "Rituals" },
  { value: "monthly_retrospective", label: "Monthly Retro", group: "Rituals" },
  { value: "quarterly_planning", label: "Quarterly Planning", group: "Rituals" },
  { value: "annual_planning", label: "Annual Planning", group: "Rituals" },
  // Personal
  { value: "personal_event", label: "Personal", group: "Personal" },
  { value: "travel", label: "Travel", group: "Personal" },
  { value: "lunch_meeting", label: "Lunch Meeting", group: "Personal" },
  { value: "coffee_chat", label: "Coffee Chat", group: "Personal" },
  // Ecosystem
  { value: "ecosystem_event", label: "Ecosystem Event", group: "Ecosystem" },
  { value: "community_event", label: "Community Event", group: "Ecosystem" },
];

const ENTRY_TYPE_OPTIONS = [
  { value: "meeting", label: "Meeting" },
  { value: "event", label: "Event" },
  { value: "time_block", label: "Time Block" },
  { value: "deadline", label: "Deadline" },
  { value: "recurring", label: "Recurring" },
  { value: "personal", label: "Personal" },
];

const PRIORITY_OPTIONS = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

interface CalendarEntryModalProps {
  entry: CalendarEntryWithDetails | null;
  defaultStart?: Date;
  defaultEnd?: Date;
  onClose: () => void;
  onSave: () => void;
  rescheduledFromId?: string;
  rescheduledFromDate?: string;
  onClone?: () => void;
  cloneFrom?: CalendarEntryWithDetails | null;
  reschedulingFrom?: CalendarEntryWithDetails | null;
  onRemove?: () => void;
}

export function CalendarEntryModal({
  entry,
  defaultStart,
  defaultEnd,
  onClose,
  onSave,
  rescheduledFromId,
  rescheduledFromDate,
  onClone,
  cloneFrom,
  reschedulingFrom,
  onRemove,
}: CalendarEntryModalProps) {
  const isEditing = !!entry;
  const source = entry || cloneFrom || reschedulingFrom;

  const [title, setTitle] = useState(source?.title || "");
  const [description, setDescription] = useState(source?.description || "");
  const [location, setLocation] = useState(source?.location || "");
  const [virtualUrl, setVirtualUrl] = useState(source?.virtualUrl || "");
  const [startDate, setStartDate] = useState<Date>(
    entry
      ? new Date(entry.startDatetime)
      : source?.startDatetime
        ? new Date(source.startDatetime)
        : defaultStart
          ? new Date(defaultStart)
          : new Date()
  );
  const [endDate, setEndDate] = useState<Date>(
    entry
      ? new Date(entry.endDatetime)
      : source?.endDatetime
        ? new Date(source.endDatetime)
        : defaultEnd
          ? new Date(defaultEnd)
          : new Date(Date.now() + 3600000)
  );
  const [allDay, setAllDay] = useState(source?.allDay || false);
  const [category, setCategory] = useState(source?.category || "personal_event");
  const [entryType, setEntryType] = useState(source?.entryType || "meeting");
  const [priority, setPriority] = useState(source?.priority || "medium");
  const [isVip, setIsVip] = useState(source?.isVip || false);
  const [attendees, setAttendees] = useState<AttendeeInput[]>(
    source?.attendees?.map((a) => ({
      name: a.name,
      email: a.email || "",
      phone: a.phone || "",
      socialUrl: a.socialUrl || "",
      role: (a.role as AttendeeInput["role"]) || "required",
      isOrganizer: a.isOrganizer,
    })) || []
  );
  const [showAttendees, setShowAttendees] = useState(
    (source?.attendees?.length || 0) > 0
  );
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [isReading, setIsReading] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsPhone, setSmsPhone] = useState("");
  const [smsSending, setSmsSending] = useState(false);
  const [smsStatus, setSmsStatus] = useState<"idle" | "success" | "error">("idle");
  const [smsError, setSmsError] = useState("");

  // Email modal state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "success" | "error">("idle");
  const [emailError, setEmailError] = useState("");

  // WhatsApp modal state
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppPhone, setWhatsAppPhone] = useState("");
  const [whatsAppSending, setWhatsAppSending] = useState(false);
  const [whatsAppStatus, setWhatsAppStatus] = useState<"idle" | "success" | "error">("idle");
  const [whatsAppError, setWhatsAppError] = useState("");

  // Voice call modal state
  const [showCallModal, setShowCallModal] = useState(false);
  const [callPhone, setCallPhone] = useState("");
  const [callMessage, setCallMessage] = useState("");
  const [callMaking, setCallMaking] = useState(false);
  const [callStatus, setCallStatus] = useState<"idle" | "success" | "error">("idle");
  const [callError, setCallError] = useState("");

  // ── Mobile detection + body scroll lock + desktop-only autofocus ──
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Lock body scroll while modal is open
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus title only on non-touch (desktop) devices to avoid mobile keyboard
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (!isTouch && titleRef.current) titleRef.current.focus();
    return () => { document.body.style.overflow = orig; };
  }, []);

  // ── Download event as markdown ──
  const handleDownload = useCallback(() => {
    const dateStr = startDate.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const timeStr = allDay
      ? "All day"
      : `${startDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} - ${endDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;

    let markdown = `# ${title || "Untitled Event"}\n\n`;
    markdown += `**Date:** ${dateStr}\n`;
    markdown += `**Time:** ${timeStr}\n`;
    if (location) markdown += `**Location:** ${location}\n`;
    if (virtualUrl) markdown += `**Virtual Link:** ${virtualUrl}\n`;
    markdown += `**Category:** ${category}\n`;
    markdown += `**Priority:** ${priority}\n`;
    if (description) markdown += `\n## Notes\n\n${description}\n`;
    if (attendees.length > 0) {
      markdown += `\n## Attendees\n\n`;
      attendees.forEach((a) => {
        markdown += `- ${a.name}${a.email ? ` (${a.email})` : ""}${a.role !== "required" ? ` [${a.role}]` : ""}\n`;
      });
    }
    markdown += `\n---\n*Exported from London Tech Map Calendar*`;

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "event").replace(/[^a-z0-9]/gi, "-").toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [title, startDate, endDate, allDay, location, virtualUrl, category, priority, description, attendees]);

  // ── Share event (Web Share API) ──
  const handleShare = useCallback(async () => {
    const dateStr = startDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    const timeStr = allDay ? "All day" : startDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    let text = `📅 ${dateStr} at ${timeStr}`;
    if (location) text += `\n📍 ${location}`;
    if (virtualUrl) text += `\n🔗 ${virtualUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: title || "Calendar Event",
          text: text,
          url: virtualUrl || undefined,
        });
      } catch (err) {
        // User cancelled or share failed - ignore
        if ((err as Error).name !== "AbortError") {
          console.error("Share failed:", err);
        }
      }
    } else {
      // Fallback for browsers without Web Share API - open Twitter
      const tweetText = encodeURIComponent(`${title || "Event"}\n${text}`);
      window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, "_blank");
    }
  }, [title, startDate, allDay, location, virtualUrl]);

  // ── Email event details ──
  const handleEmail = useCallback(() => {
    const dateStr = startDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const timeStr = allDay ? "All day" : `${startDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} - ${endDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;

    let body = `${title || "Event"}\n\nDate: ${dateStr}\nTime: ${timeStr}`;
    if (location) body += `\nLocation: ${location}`;
    if (virtualUrl) body += `\nVirtual Link: ${virtualUrl}`;
    if (description) body += `\n\nNotes:\n${description}`;

    const subject = encodeURIComponent(title || "Calendar Event");
    const encodedBody = encodeURIComponent(body);
    window.open(`mailto:?subject=${subject}&body=${encodedBody}`, "_self");
  }, [title, startDate, endDate, allDay, location, virtualUrl, description]);

  // ── Read event aloud (Olivia voice via ElevenLabs, fallback to browser TTS) ──
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleRead = useCallback(async () => {
    // Stop if already reading
    if (isReading) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsReading(false);
      return;
    }

    const dateStr = startDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    const timeStr = allDay ? "all day" : `at ${startDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
    let text = `${title || "Event"}. ${dateStr}, ${timeStr}.`;
    if (location) text += ` Location: ${location}.`;
    if (description) text += ` Notes: ${description}`;

    setIsReading(true);

    // Try Olivia's voice (ElevenLabs) first
    try {
      const response = await fetch("/api/olivia/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (response.headers.get("Content-Type")?.includes("audio/")) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          setIsReading(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };
        audio.onerror = () => {
          setIsReading(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };

        await audio.play();
        return;
      }
    } catch {
      // Olivia voice failed, fall through to browser TTS
    }

    // Fallback: Browser speech synthesis
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
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
  }, [title, startDate, allDay, location, description, isReading]);

  // ── Send SMS via Twilio ──
  const handleSendSms = useCallback(async () => {
    if (!smsPhone.trim()) return;

    const dateStr = startDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    const timeStr = allDay ? "All day" : startDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    let message = `${title || "Event"}\n${dateStr} at ${timeStr}`;
    if (location) message += `\n${location}`;
    if (virtualUrl) message += `\n${virtualUrl}`;

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
      setTimeout(() => {
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
  }, [smsPhone, title, startDate, allDay, location, virtualUrl]);

  // ── Send Email via Resend ──
  const handleSendEmail = useCallback(async () => {
    if (!emailTo.trim()) return;

    const dateStr = startDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const timeStr = allDay ? "All day" : `${startDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} - ${endDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
    let message = `${title || "Event"}\n\nDate: ${dateStr}\nTime: ${timeStr}`;
    if (location) message += `\nLocation: ${location}`;
    if (virtualUrl) message += `\nVirtual Link: ${virtualUrl}`;
    if (description) message += `\n\nNotes:\n${description}`;

    setEmailSending(true);
    setEmailStatus("idle");
    setEmailError("");

    try {
      const response = await fetch("/api/olivia/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailTo.trim(),
          subject: title || "Calendar Event",
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      setEmailStatus("success");
      setTimeout(() => {
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
  }, [emailTo, title, startDate, endDate, allDay, location, virtualUrl, description]);

  // ── Send WhatsApp via Twilio ──
  const handleSendWhatsApp = useCallback(async () => {
    if (!whatsAppPhone.trim()) return;

    const dateStr = startDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    const timeStr = allDay ? "All day" : startDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    let message = `📅 ${title || "Event"}\n${dateStr} at ${timeStr}`;
    if (location) message += `\n📍 ${location}`;
    if (virtualUrl) message += `\n🔗 ${virtualUrl}`;

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
      setTimeout(() => {
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
  }, [whatsAppPhone, title, startDate, allDay, location, virtualUrl]);

  // ── Make Voice Call via Twilio + ElevenLabs ──
  const handleMakeCall = useCallback(async () => {
    if (!callPhone.trim()) return;

    // Build the message for Olivia to speak
    const dateStr = startDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    const timeStr = allDay ? "all day" : `at ${startDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;

    let message = callMessage.trim();
    if (!message) {
      // Default message based on event details
      message = `Hello, this is Olivia calling about "${title || "your event"}". It's scheduled for ${dateStr}, ${timeStr}.`;
      if (location) message += ` The location is ${location}.`;
      message += " Please reply to confirm your attendance. Thank you!";
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
      setTimeout(() => {
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
  }, [callPhone, callMessage, title, startDate, allDay, location]);

  // ── Linked Notes State ──
  const [linkedNotes, setLinkedNotes] = useState<{ id: string; title: string; updatedAt: string }[]>([]);
  const [showLinkedNotes, setShowLinkedNotes] = useState(false);

  // ── Recurrence State ──
  const existingRRule = source?.rrule || "";
  const [repeatEnabled, setRepeatEnabled] = useState(!!existingRRule);
  const [repeatFreq, setRepeatFreq] = useState<string>(() => {
    if (existingRRule.includes("FREQ=DAILY")) return "daily";
    if (existingRRule.includes("FREQ=MONTHLY")) return "monthly";
    if (existingRRule.includes("FREQ=YEARLY")) return "yearly";
    return "weekly";
  });
  const [repeatInterval, setRepeatInterval] = useState<number>(() => {
    const m = existingRRule.match(/INTERVAL=(\d+)/);
    return m ? parseInt(m[1], 10) : 1;
  });
  const [repeatDays, setRepeatDays] = useState<string[]>(() => {
    const m = existingRRule.match(/BYDAY=([A-Z,]+)/);
    return m ? m[1].split(",") : [];
  });
  const [repeatEndType, setRepeatEndType] = useState<"never" | "count" | "until">(() => {
    if (existingRRule.includes("COUNT=")) return "count";
    if (existingRRule.includes("UNTIL=")) return "until";
    return "never";
  });
  const [repeatCount, setRepeatCount] = useState<number>(() => {
    const m = existingRRule.match(/COUNT=(\d+)/);
    return m ? parseInt(m[1], 10) : 10;
  });
  const [repeatUntil, setRepeatUntil] = useState<string>(() => {
    const m = existingRRule.match(/UNTIL=(\d{4})(\d{2})(\d{2})/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
  });

  function buildRRuleString(): string | undefined {
    if (!repeatEnabled) return undefined;
    const freqMap: Record<string, string> = {
      daily: "DAILY", weekly: "WEEKLY", biweekly: "WEEKLY", monthly: "MONTHLY", yearly: "YEARLY",
    };
    const parts = [`FREQ=${freqMap[repeatFreq] || "WEEKLY"}`];
    const interval = repeatFreq === "biweekly" ? 2 : repeatInterval;
    if (interval > 1) parts.push(`INTERVAL=${interval}`);
    if ((repeatFreq === "weekly" || repeatFreq === "biweekly") && repeatDays.length > 0) {
      parts.push(`BYDAY=${repeatDays.join(",")}`);
    }
    if (repeatEndType === "count" && repeatCount > 0) {
      parts.push(`COUNT=${repeatCount}`);
    } else if (repeatEndType === "until" && repeatUntil) {
      parts.push(`UNTIL=${repeatUntil.replace(/-/g, "")}T235959Z`);
    }
    return parts.join(";");
  }

  // ── Google Places Autocomplete State ──
  const [placesReady, setPlacesReady] = useState(false);
  const [locationPredictions, setLocationPredictions] = useState<PlacePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const locationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationContainerRef = useRef<HTMLDivElement>(null);

  // Fetch linked notes when editing an entry
  useEffect(() => {
    if (!entry?.id) return;
    fetch(`/api/calendar/notes?entryId=${entry.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.notes) setLinkedNotes(data.notes);
      })
      .catch(() => {});
  }, [entry?.id]);

  // Load Google Places on mount (with retry on failure) v3
  useEffect(() => {
    if (typeof google !== "undefined" && google.maps?.places) {
      setPlacesReady(true);
      return;
    }
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!key) {
      console.warn("[Calendar] NEXT_PUBLIC_GOOGLE_MAPS_KEY not set — address autocomplete disabled");
      return;
    }
    setOptions({ key, v: "weekly" });
    let retries = 0;
    const load = () => {
      importLibrary("places")
        .then(() => setPlacesReady(true))
        .catch((err) => {
          console.warn("[Calendar] Places library load failed, retrying…", err);
          if (retries < 2) { retries++; setTimeout(load, 1500); }
        });
    };
    load();
  }, []);

  // Click outside to close predictions
  useEffect(() => {
    if (!showPredictions) return;
    const handler = (e: MouseEvent) => {
      if (locationContainerRef.current && !locationContainerRef.current.contains(e.target as Node)) {
        setShowPredictions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPredictions]);

  const getAutocomplete = useCallback(() => {
    if (!autocompleteRef.current && placesReady && typeof google !== "undefined" && google.maps?.places) {
      autocompleteRef.current = new google.maps.places.AutocompleteService();
    }
    return autocompleteRef.current;
  }, [placesReady]);

  const fetchLocationPredictions = useCallback((input: string) => {
    if (input.length < 2) { setLocationPredictions([]); setShowPredictions(false); return; }
    const svc = getAutocomplete();
    if (!svc) return;
    svc.getPlacePredictions(
      {
        input,
        componentRestrictions: { country: "gb" },
        locationBias: new google.maps.LatLngBounds(
          { lat: LONDON_BOUNDS.south, lng: LONDON_BOUNDS.west },
          { lat: LONDON_BOUNDS.north, lng: LONDON_BOUNDS.east },
        ),
      },
      (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          setLocationPredictions(
            results.slice(0, 5).map((r) => ({
              placeId: r.place_id,
              description: r.description,
              mainText: r.structured_formatting.main_text,
              secondaryText: r.structured_formatting.secondary_text || "",
            })),
          );
          setShowPredictions(true);
        } else {
          setLocationPredictions([]);
          setShowPredictions(false);
        }
      },
    );
  }, [getAutocomplete]);

  const handleLocationChange = useCallback((value: string) => {
    setLocation(value);
    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    locationDebounceRef.current = setTimeout(() => fetchLocationPredictions(value), 300);
  }, [fetchLocationPredictions]);

  const handleLocationSelect = useCallback((prediction: PlacePrediction) => {
    setLocation(prediction.description);
    setLocationPredictions([]);
    setShowPredictions(false);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim()) {
        setError("Title is required");
        return;
      }
      setSaving(true);
      setError("");

      try {
        const validAttendees = attendees
          .filter((a) => a.name.trim())
          .map((a) => ({
            name: a.name.trim(),
            email: a.email.trim() || undefined,
            phone: a.phone.trim() || undefined,
            socialUrl: a.socialUrl.trim() || undefined,
            role: a.role,
            isOrganizer: a.isOrganizer,
          }));

        const rruleStr = buildRRuleString();
        const body = {
          title: title.trim(),
          description: description.trim() || null,
          location: location.trim() || null,
          virtualUrl: virtualUrl.trim() || null,
          startDatetime: startDate.toISOString(),
          endDatetime: endDate.toISOString(),
          allDay,
          category,
          entryType,
          priority,
          isVip,
          rrule: rruleStr || undefined,
          attendees: validAttendees.length > 0 ? validAttendees : undefined,
          ...(rescheduledFromId && !isEditing && {
            rescheduledFromId,
            rescheduledFromDate: rescheduledFromDate || null,
          }),
        };

        const url = isEditing
          ? `/api/calendar/entries?id=${entry.id}`
          : "/api/calendar/entries";
        const method = isEditing ? "PUT" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to save");
        }

        onSave();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setSaving(false);
      }
    },
    [title, description, location, virtualUrl, startDate, endDate, allDay, category, entryType, priority, isVip, attendees, isEditing, entry, onSave, rescheduledFromId, rescheduledFromDate, repeatEnabled, repeatFreq, repeatInterval, repeatDays, repeatEndType, repeatCount, repeatUntil]
  );

  const handleDeleteConfirmed = useCallback(async () => {
    if (!entry) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/calendar/entries?id=${entry.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
  }, [entry, onSave]);

  // Group categories for the select
  const groupedCategories = CATEGORY_OPTIONS.reduce(
    (acc, opt) => {
      if (!acc[opt.group]) acc[opt.group] = [];
      acc[opt.group].push(opt);
      return acc;
    },
    {} as Record<string, typeof CATEGORY_OPTIONS>
  );

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center lg:items-start lg:pt-[8vh] lg:p-4 overflow-hidden"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full h-full max-h-full lg:h-auto lg:max-w-lg lg:max-h-[84vh] overflow-y-auto overscroll-contain lg:rounded-xl border border-transparent lg:border-[rgba(196,169,106,0.15)] p-6"
        style={{
          background: "rgba(10, 14, 26, 0.98)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close X — always visible, pinned top-right */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 rounded-md p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>

        <div className="flex items-start justify-between mb-5 pr-8">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            {isEditing ? "Edit Entry" : cloneFrom ? "Clone Entry" : "New Calendar Entry"}
          </h2>
          <div className="flex items-center flex-wrap gap-1">
            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-md p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              title="Download"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
              </svg>
            </button>
            {/* Share */}
            <button
              type="button"
              onClick={handleShare}
              className="rounded-md p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              title="Share"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>
              </svg>
            </button>
            {/* Email (Olivia) */}
            <button
              type="button"
              onClick={() => setShowEmailModal(true)}
              className="rounded-md p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              title="Send via Email"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
            </button>
            {/* Read aloud */}
            <button
              type="button"
              onClick={handleRead}
              className={`rounded-md p-1.5 transition-colors ${isReading ? "text-[#c4a96a]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
              title={isReading ? "Stop" : "Read aloud"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {isReading ? (
                  <><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></>
                ) : (
                  <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></>
                )}
              </svg>
            </button>
            {/* Text/SMS */}
            <button
              type="button"
              onClick={() => setShowSmsModal(true)}
              className="rounded-md p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              title="Send SMS"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </button>
            {/* WhatsApp */}
            <button
              type="button"
              onClick={() => setShowWhatsAppModal(true)}
              className="rounded-md p-1.5 text-[var(--muted)] hover:text-[#25D366] transition-colors"
              title="Send via WhatsApp"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </button>
            {/* Voice Call */}
            <button
              type="button"
              onClick={() => setShowCallModal(true)}
              className="rounded-md p-1.5 text-[var(--muted)] hover:text-emerald-400 transition-colors"
              title="Call with Olivia's voice"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                <path d="M14.05 2a9 9 0 0 1 8 7.94"/>
                <path d="M14.05 6A5 5 0 0 1 18 10"/>
              </svg>
            </button>
            {/* Trashcan delete button — visible when editing OR when onRemove provided */}
            {(isEditing || onRemove) && !confirmDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={saving}
                className="rounded-md p-1.5 text-red-400/70 hover:text-red-400 hover:bg-red-950/40 transition-colors disabled:opacity-50"
                title="Delete event"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>
                </svg>
              </button>
            )}
            {(isEditing || onRemove) && confirmDelete && (
              <span className="flex items-center gap-1.5 mr-1">
                <span className="text-[10px] text-red-400">Delete this event?</span>
                <button
                  type="button"
                  onClick={isEditing ? handleDeleteConfirmed : onRemove}
                  disabled={saving}
                  className="rounded-md px-2.5 py-1 text-[10px] font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {saving ? "Deleting..." : "Yes"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-md px-2 py-1 text-[10px] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  No
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Rescheduled-from badge */}
        {(rescheduledFromDate || entry?.rescheduledFromDate) && (
          <div
            className="mb-4 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-semibold"
            style={{
              background: "rgba(234, 179, 8, 0.1)",
              border: "1px solid rgba(234, 179, 8, 0.25)",
              color: "#fbbf24",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            Rescheduled from{" "}
            {new Date(rescheduledFromDate || entry?.rescheduledFromDate || "").toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </div>
        )}

        {/* Dark theme overrides for react-international-phone */}
        <style>{`
          .attendee-phone-input.react-international-phone-input-container {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 4px;
            height: 26px;
          }
          .attendee-phone-input .react-international-phone-input {
            background: transparent;
            color: var(--foreground);
            font-size: 0.75rem;
            border: none;
            height: 24px;
            padding: 0 6px;
          }
          .attendee-phone-input .react-international-phone-input::placeholder {
            color: rgba(var(--muted-rgb, 148, 163, 184), 0.5);
          }
          .attendee-phone-input .react-international-phone-input:focus {
            box-shadow: none;
          }
          .attendee-phone-input .react-international-phone-country-selector-button {
            background: transparent;
            border: none;
            border-right: 1px solid var(--card-border);
            padding: 0 4px;
            height: 24px;
            min-width: 36px;
          }
          .attendee-phone-input .react-international-phone-country-selector-button:hover {
            background: rgba(255,255,255,0.05);
          }
          .react-international-phone-country-selector-dropdown {
            background: rgba(10, 14, 26, 0.98) !important;
            border: 1px solid rgba(196, 169, 106, 0.2) !important;
            border-radius: 8px !important;
            box-shadow: 0 8px 24px rgba(0,0,0,0.4) !important;
            z-index: 10000 !important;
            max-height: 200px;
          }
          .react-international-phone-country-selector-dropdown__list-item {
            background: transparent !important;
            color: var(--foreground) !important;
            font-size: 0.7rem !important;
            padding: 4px 8px !important;
          }
          .react-international-phone-country-selector-dropdown__list-item:hover {
            background: rgba(255,255,255,0.06) !important;
          }
          .react-international-phone-country-selector-dropdown__list-item--focused {
            background: rgba(196, 169, 106, 0.1) !important;
          }
          .react-international-phone-country-selector-dropdown__list-item-dial-code {
            color: var(--muted) !important;
          }
          .react-international-phone-country-selector-dropdown__search {
            background: rgba(10, 14, 26, 0.95) !important;
            color: var(--foreground) !important;
            border-bottom: 1px solid rgba(196, 169, 106, 0.15) !important;
            font-size: 0.7rem !important;
            padding: 6px 8px !important;
          }
          .react-international-phone-country-selector-dropdown__search::placeholder {
            color: var(--muted) !important;
          }
        `}</style>

        {error && (
          <div className="mb-4 rounded-md border border-red-500/30 bg-red-950/50 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting with Seedcamp..."
              ref={titleRef}
              className="w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/50 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Category + Type + Priority row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-2 py-2 text-xs text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
              >
                {Object.entries(groupedCategories).map(([group, opts]) => (
                  <optgroup key={group} label={group}>
                    {opts.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">Type</label>
              <select
                value={entryType}
                onChange={(e) => setEntryType(e.target.value)}
                className="w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-2 py-2 text-xs text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
              >
                {ENTRY_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-2 py-2 text-xs text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Critical / VIP indicator toggles */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPriority(priority === "critical" ? "medium" : "critical")}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                background: priority === "critical" ? "rgba(239, 68, 68, 0.15)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${priority === "critical" ? "rgba(239, 68, 68, 0.4)" : "rgba(255,255,255,0.08)"}`,
                color: priority === "critical" ? "#f87171" : "var(--muted)",
              }}
            >
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: priority === "critical" ? "#ef4444" : "rgba(255,255,255,0.1)",
                color: priority === "critical" ? "#fff" : "var(--muted)",
                fontSize: 10,
                fontWeight: 800,
                lineHeight: 1,
              }}>!</span>
              Critical
            </button>
            <button
              type="button"
              onClick={() => setIsVip(!isVip)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                background: isVip ? "rgba(196, 169, 106, 0.15)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${isVip ? "rgba(196, 169, 106, 0.4)" : "rgba(255,255,255,0.08)"}`,
                color: isVip ? "#c4a96a" : "var(--muted)",
              }}
            >
              <span style={{ fontSize: 13, lineHeight: 1 }}>{isVip ? "★" : "☆"}</span>
              VIP
            </button>
          </div>

          {/* Date/time row */}
          <Suspense fallback={
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">Start</label>
                <input type="datetime-local" readOnly className="w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-2 py-2 text-xs text-[var(--foreground)] focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">End</label>
                <input type="datetime-local" readOnly className="w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-2 py-2 text-xs text-[var(--foreground)] focus:border-brand-500 focus:outline-none" />
              </div>
            </div>
          }>
          <div className="grid grid-cols-2 gap-3 ltm-datepicker">
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">Start</label>
              <LazyDatePicker
                selected={startDate}
                onChange={(date: Date | null) => {
                  if (date) {
                    setStartDate(date);
                    if (date >= endDate) setEndDate(new Date(date.getTime() + 3600000));
                  }
                }}
                showTimeSelect
                timeIntervals={15}
                timeCaption="Time"
                dateFormat="dd MMM yyyy  h:mm aa"
                className="w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-2 py-2 text-xs text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
                calendarClassName="ltm-calendar"
                popperPlacement="bottom-start"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">End</label>
              <LazyDatePicker
                selected={endDate}
                onChange={(date: Date | null) => {
                  if (date) setEndDate(date);
                }}
                showTimeSelect
                timeIntervals={15}
                timeCaption="Time"
                dateFormat="dd MMM yyyy  h:mm aa"
                minDate={startDate}
                className="w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-2 py-2 text-xs text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
                calendarClassName="ltm-calendar"
                popperPlacement="bottom-start"
              />
            </div>
          </div>
          </Suspense>

          {/* All day toggle */}
          <label className="flex items-center gap-2 text-xs text-[var(--muted)] cursor-pointer">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="rounded border-[var(--card-border)]"
            />
            All day event
          </label>

          {/* Repeat toggle + recurrence picker */}
          <div>
            <label className="flex items-center gap-2 text-xs text-[var(--muted)] cursor-pointer">
              <input
                type="checkbox"
                checked={repeatEnabled}
                onChange={(e) => setRepeatEnabled(e.target.checked)}
                className="rounded border-[var(--card-border)]"
              />
              Repeat
            </label>

            {repeatEnabled && (
              <div
                className="mt-2 rounded-lg border p-3 space-y-3"
                style={{
                  background: "rgba(10, 14, 26, 0.95)",
                  borderColor: "rgba(196, 169, 106, 0.15)",
                }}
              >
                {/* Frequency */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-medium text-[var(--muted)] mb-1">Frequency</label>
                    <select
                      value={repeatFreq}
                      onChange={(e) => setRepeatFreq(e.target.value)}
                      className="w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-2 py-1.5 text-xs text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  {repeatFreq !== "biweekly" && (
                    <div>
                      <label className="block text-[10px] font-medium text-[var(--muted)] mb-1">
                        Every N {repeatFreq === "daily" ? "days" : repeatFreq === "weekly" ? "weeks" : repeatFreq === "monthly" ? "months" : "years"}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={repeatInterval}
                        onChange={(e) => setRepeatInterval(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-2 py-1.5 text-xs text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Day-of-week picker (weekly/biweekly only) */}
                {(repeatFreq === "weekly" || repeatFreq === "biweekly") && (
                  <div>
                    <label className="block text-[10px] font-medium text-[var(--muted)] mb-1.5">Days</label>
                    <div className="flex gap-1">
                      {[
                        { key: "MO", label: "M" },
                        { key: "TU", label: "T" },
                        { key: "WE", label: "W" },
                        { key: "TH", label: "T" },
                        { key: "FR", label: "F" },
                        { key: "SA", label: "S" },
                        { key: "SU", label: "S" },
                      ].map((d) => (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() =>
                            setRepeatDays((prev) =>
                              prev.includes(d.key)
                                ? prev.filter((x) => x !== d.key)
                                : [...prev, d.key]
                            )
                          }
                          className="w-7 h-7 rounded-full text-[10px] font-bold transition-colors"
                          style={{
                            background: repeatDays.includes(d.key)
                              ? "rgba(196, 169, 106, 0.25)"
                              : "rgba(255,255,255,0.04)",
                            border: `1px solid ${repeatDays.includes(d.key) ? "rgba(196, 169, 106, 0.5)" : "rgba(255,255,255,0.08)"}`,
                            color: repeatDays.includes(d.key) ? "#c4a96a" : "var(--muted)",
                          }}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* End condition */}
                <div>
                  <label className="block text-[10px] font-medium text-[var(--muted)] mb-1.5">Ends</label>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-xs text-[var(--muted)] cursor-pointer">
                      <input
                        type="radio"
                        name="repeatEnd"
                        checked={repeatEndType === "never"}
                        onChange={() => setRepeatEndType("never")}
                        className="border-[var(--card-border)]"
                      />
                      Never
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[var(--muted)] cursor-pointer">
                      <input
                        type="radio"
                        name="repeatEnd"
                        checked={repeatEndType === "count"}
                        onChange={() => setRepeatEndType("count")}
                        className="border-[var(--card-border)]"
                      />
                      After
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={repeatCount}
                        onChange={(e) => setRepeatCount(Math.max(1, parseInt(e.target.value) || 1))}
                        disabled={repeatEndType !== "count"}
                        className="w-14 rounded border border-[var(--card-border)] bg-[var(--background)] px-1.5 py-0.5 text-xs text-[var(--foreground)] focus:border-brand-500 focus:outline-none disabled:opacity-40"
                      />
                      occurrences
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[var(--muted)] cursor-pointer">
                      <input
                        type="radio"
                        name="repeatEnd"
                        checked={repeatEndType === "until"}
                        onChange={() => setRepeatEndType("until")}
                        className="border-[var(--card-border)]"
                      />
                      On date
                      <input
                        type="date"
                        value={repeatUntil}
                        onChange={(e) => setRepeatUntil(e.target.value)}
                        disabled={repeatEndType !== "until"}
                        className="rounded border border-[var(--card-border)] bg-[var(--background)] px-1.5 py-0.5 text-xs text-[var(--foreground)] focus:border-brand-500 focus:outline-none disabled:opacity-40"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Location with autocomplete */}
          <div ref={locationContainerRef} className="relative">
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => handleLocationChange(e.target.value)}
              onFocus={() => { if (locationPredictions.length > 0) setShowPredictions(true); }}
              placeholder="Level39, One Canada Square, Canary Wharf..."
              className="w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/50 focus:border-brand-500 focus:outline-none"
              autoComplete="off"
            />
            {showPredictions && locationPredictions.length > 0 && (
              <ul
                className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-md border py-1"
                style={{
                  background: "rgba(10, 14, 26, 0.98)",
                  borderColor: "rgba(196, 169, 106, 0.2)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                }}
              >
                {locationPredictions.map((p) => (
                  <li key={p.placeId}>
                    <button
                      type="button"
                      onClick={() => handleLocationSelect(p)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                    >
                      <span className="text-[var(--foreground)] font-medium">{p.mainText}</span>
                      {p.secondaryText && (
                        <span className="text-[var(--muted)] ml-1">{p.secondaryText}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Virtual URL */}
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">Virtual Link</label>
            <input
              type="url"
              value={virtualUrl}
              onChange={(e) => setVirtualUrl(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/50 focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">Notes</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Add notes, agenda, or context..."
              className="w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/50 focus:border-brand-500 focus:outline-none resize-none"
            />
          </div>

          {/* Linked Notepad Notes */}
          {isEditing && (
            <div>
              <button
                type="button"
                onClick={() => setShowLinkedNotes(!showLinkedNotes)}
                className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/>
                </svg>
                Notepad Notes
                {linkedNotes.length > 0 && (
                  <span className="rounded-full bg-brand-600/20 text-brand-400 px-1.5 py-0.5 text-[10px] font-semibold">
                    {linkedNotes.length}
                  </span>
                )}
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`transition-transform ${showLinkedNotes ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>

              {showLinkedNotes && (
                <div className="mt-2 space-y-1.5">
                  {linkedNotes.length === 0 ? (
                    <p className="text-[10px] text-[var(--muted)] pl-5">No linked notes yet. Use the Notepad below the calendar to create and link notes.</p>
                  ) : (
                    linkedNotes.map((note) => (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => {
                          document.dispatchEvent(new CustomEvent("calendar-focus-note", { detail: { noteId: note.id } }));
                          onClose();
                        }}
                        className="w-full flex items-center justify-between rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-left hover:bg-white/5 transition-colors group"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-[var(--foreground)]">{note.title}</p>
                          <p className="text-[9px] text-[var(--muted)]">
                            Updated {new Date(note.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <span className="text-[9px] text-[var(--muted)] group-hover:text-[#c4a96a] transition-colors shrink-0 ml-2">
                          View in Notepad
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Attendees */}
          <div>
            <button
              type="button"
              onClick={() => setShowAttendees(!showAttendees)}
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Attendees
              {attendees.length > 0 && (
                <span className="rounded-full bg-brand-600/20 text-brand-400 px-1.5 py-0.5 text-[10px] font-semibold">
                  {attendees.length}
                </span>
              )}
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`transition-transform ${showAttendees ? "rotate-180" : ""}`}
              >
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>

            {showAttendees && (
              <div className="mt-2 space-y-2">
                {attendees.map((attendee, index) => (
                  <div
                    key={index}
                    className="rounded-md border border-[var(--card-border)] bg-[var(--background)] p-2 space-y-2"
                  >
                    {/* Row 1: Name, Email, Role, Delete */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={attendee.name}
                          onChange={(e) => {
                            const updated = [...attendees];
                            updated[index] = { ...updated[index], name: e.target.value };
                            setAttendees(updated);
                          }}
                          placeholder="Name"
                          className="w-full rounded border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)]/50 focus:border-brand-500 focus:outline-none"
                        />
                        <input
                          type="email"
                          value={attendee.email}
                          onChange={(e) => {
                            const updated = [...attendees];
                            updated[index] = { ...updated[index], email: e.target.value };
                            setAttendees(updated);
                          }}
                          placeholder="Email"
                          className="w-full rounded border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)]/50 focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                      <select
                        value={attendee.role}
                        onChange={(e) => {
                          const updated = [...attendees];
                          updated[index] = {
                            ...updated[index],
                            role: e.target.value as AttendeeInput["role"],
                            isOrganizer: e.target.value === "organizer",
                          };
                          setAttendees(updated);
                        }}
                        className="rounded border border-[var(--card-border)] bg-[var(--card-bg)] px-1 py-1 text-[10px] text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setAttendees(attendees.filter((_, i) => i !== index));
                        }}
                        className="rounded p-1 text-[var(--muted)] hover:text-red-400 transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                        </svg>
                      </button>
                    </div>
                    {/* Row 2: Phone/WhatsApp + Social (optional) */}
                    <div className="grid grid-cols-2 gap-2">
                      <PhoneInput
                        defaultCountry="gb"
                        value={attendee.phone}
                        onChange={(phone) => {
                          const updated = [...attendees];
                          updated[index] = { ...updated[index], phone };
                          setAttendees(updated);
                        }}
                        placeholder="Phone / WhatsApp"
                        className="attendee-phone-input"
                      />
                      <input
                        type="text"
                        value={attendee.socialUrl}
                        onChange={(e) => {
                          const updated = [...attendees];
                          updated[index] = { ...updated[index], socialUrl: e.target.value };
                          setAttendees(updated);
                        }}
                        placeholder="LinkedIn / X handle (optional)"
                        className="w-full rounded border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)]/50 focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setAttendees([...attendees, { ...EMPTY_ATTENDEE }])}
                  className="flex items-center gap-1 rounded-md border border-dashed border-[var(--card-border)] px-2 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] hover:border-brand-500/50 transition-colors w-full justify-center"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14"/><path d="M5 12h14"/>
                  </svg>
                  Add Attendee
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-1">
              {isEditing && !confirmDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={saving}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-950/50 hover:text-red-300 transition-colors disabled:opacity-50"
                >
                  Archive
                </button>
              )}
              {isEditing && confirmDelete && (
                <span className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleDeleteConfirmed}
                    disabled={saving}
                    className="rounded-md px-3 py-1.5 text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? "Archiving..." : "Confirm"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-md px-2 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                  >
                    Cancel
                  </button>
                </span>
              )}
              {isEditing && onClone && (
                <button
                  type="button"
                  onClick={onClone}
                  disabled={saving}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Clone
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-brand-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : isEditing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* SMS Modal — portalled to document.body so it escapes the scrollable entry modal on mobile */}
      {showSmsModal && createPortal(
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => { setShowSmsModal(false); setSmsStatus("idle"); }}
        >
          <div
            className="relative w-full max-w-xs rounded-xl border p-5"
            style={{
              background: "rgba(10, 14, 26, 0.98)",
              borderColor: "rgba(196, 169, 106, 0.2)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close X */}
            <button
              type="button"
              onClick={() => { setShowSmsModal(false); setSmsStatus("idle"); }}
              className="absolute top-3 right-3 rounded-md p-1 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              aria-label="Close SMS"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Send via SMS</h3>
            <p className="text-xs text-[var(--muted)] mb-3">
              Send event details to a UK mobile
            </p>
            <div className="mb-3">
              <PhoneInput
                defaultCountry="gb"
                value={smsPhone}
                onChange={(phone) => setSmsPhone(phone)}
                placeholder="7XXX XXXXXX"
                className="sms-phone-input"
              />
            </div>
            <style>{`
              .sms-phone-input.react-international-phone-input-container {
                background: var(--card-bg);
                border: 1px solid var(--card-border);
                border-radius: 6px;
                height: 38px;
              }
              .sms-phone-input .react-international-phone-input {
                background: transparent;
                color: var(--foreground);
                font-size: 0.875rem;
                border: none;
                height: 36px;
                padding: 0 10px;
                width: 100%;
              }
              .sms-phone-input .react-international-phone-input::placeholder {
                color: rgba(var(--muted-rgb, 148, 163, 184), 0.5);
              }
              .sms-phone-input .react-international-phone-country-selector-button {
                background: transparent;
                border: none;
                border-right: 1px solid var(--card-border);
                padding: 0 8px;
                height: 36px;
                min-width: 52px;
              }
              .sms-phone-input .react-international-phone-country-selector-button:hover {
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
        </div>,
        document.body
      )}

      {/* Email Modal — portalled to document.body so it escapes the scrollable entry modal on mobile */}
      {showEmailModal && createPortal(
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => { setShowEmailModal(false); setEmailStatus("idle"); }}
        >
          <div
            className="relative w-full max-w-xs rounded-xl border p-5"
            style={{
              background: "rgba(10, 14, 26, 0.98)",
              borderColor: "rgba(196, 169, 106, 0.2)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close X */}
            <button
              type="button"
              onClick={() => { setShowEmailModal(false); setEmailStatus("idle"); }}
              className="absolute top-3 right-3 rounded-md p-1 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              aria-label="Close email"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Send via Email</h3>
            <p className="text-xs text-[var(--muted)] mb-3">
              Olivia will send event details to this email
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
        </div>,
        document.body
      )}

      {/* WhatsApp Modal — portalled to document.body so it escapes the scrollable entry modal on mobile */}
      {showWhatsAppModal && createPortal(
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => { setShowWhatsAppModal(false); setWhatsAppStatus("idle"); }}
        >
          <div
            className="relative w-full max-w-xs rounded-xl border p-5"
            style={{
              background: "rgba(10, 14, 26, 0.98)",
              borderColor: "rgba(37, 211, 102, 0.2)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close X */}
            <button
              type="button"
              onClick={() => { setShowWhatsAppModal(false); setWhatsAppStatus("idle"); }}
              className="absolute top-3 right-3 rounded-md p-1 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              aria-label="Close WhatsApp"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>
            <div className="flex items-center gap-2 mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Send via WhatsApp</h3>
            </div>
            <p className="text-xs text-[var(--muted)] mb-3">
              Send event details via WhatsApp
            </p>
            <div className="mb-3">
              <PhoneInput
                defaultCountry="gb"
                value={whatsAppPhone}
                onChange={(phone) => setWhatsAppPhone(phone)}
                placeholder="7XXX XXXXXX"
                className="whatsapp-phone-input"
              />
            </div>
            <style>{`
              .whatsapp-phone-input.react-international-phone-input-container {
                background: var(--card-bg);
                border: 1px solid rgba(37, 211, 102, 0.3);
                border-radius: 6px;
                height: 38px;
              }
              .whatsapp-phone-input .react-international-phone-input {
                background: transparent;
                color: var(--foreground);
                font-size: 0.875rem;
                border: none;
                height: 36px;
                padding: 0 10px;
                width: 100%;
              }
              .whatsapp-phone-input .react-international-phone-input::placeholder {
                color: rgba(var(--muted-rgb, 148, 163, 184), 0.5);
              }
              .whatsapp-phone-input .react-international-phone-country-selector-button {
                background: transparent;
                border: none;
                border-right: 1px solid rgba(37, 211, 102, 0.3);
                padding: 0 8px;
                height: 36px;
                min-width: 52px;
              }
              .whatsapp-phone-input .react-international-phone-country-selector-button:hover {
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
        </div>,
        document.body
      )}

      {/* Voice Call Modal — portalled to document.body so it escapes the scrollable entry modal on mobile */}
      {showCallModal && createPortal(
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => { setShowCallModal(false); setCallStatus("idle"); }}
        >
          <div
            className="relative w-full max-w-sm rounded-xl border p-5"
            style={{
              background: "rgba(10, 14, 26, 0.98)",
              borderColor: "rgba(16, 185, 129, 0.2)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close X */}
            <button
              type="button"
              onClick={() => { setShowCallModal(false); setCallStatus("idle"); }}
              className="absolute top-3 right-3 rounded-md p-1 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              aria-label="Close call"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>
            <div className="flex items-center gap-2 mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                <path d="M14.05 2a9 9 0 0 1 8 7.94"/>
                <path d="M14.05 6A5 5 0 0 1 18 10"/>
              </svg>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Call with Olivia&apos;s Voice</h3>
            </div>
            <p className="text-xs text-[var(--muted)] mb-3">
              Olivia will call this number and speak your message with her custom voice
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
                className="call-phone-input"
              />
            </div>
            <style>{`
              .call-phone-input.react-international-phone-input-container {
                background: var(--card-bg);
                border: 1px solid rgba(16, 185, 129, 0.3);
                border-radius: 6px;
                height: 38px;
              }
              .call-phone-input .react-international-phone-input {
                background: transparent;
                color: var(--foreground);
                font-size: 0.875rem;
                border: none;
                height: 36px;
                padding: 0 10px;
                width: 100%;
              }
              .call-phone-input .react-international-phone-input::placeholder {
                color: rgba(var(--muted-rgb, 148, 163, 184), 0.5);
              }
              .call-phone-input .react-international-phone-country-selector-button {
                background: transparent;
                border: none;
                border-right: 1px solid rgba(16, 185, 129, 0.3);
                padding: 0 8px;
                height: 36px;
                min-width: 52px;
              }
              .call-phone-input .react-international-phone-country-selector-button:hover {
                background: rgba(16, 185, 129, 0.1);
              }
            `}</style>
            <div className="mb-3">
              <label className="block text-[10px] font-medium text-[var(--muted)] mb-1 uppercase tracking-wider">
                Message (optional)
              </label>
              <textarea
                value={callMessage}
                onChange={(e) => setCallMessage(e.target.value)}
                placeholder="Leave blank for default event reminder message..."
                rows={3}
                className="w-full rounded-md border border-emerald-500/30 bg-[var(--card-bg)] px-3 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)]/50 focus:border-emerald-500 focus:outline-none resize-none"
              />
              <p className="mt-1 text-[9px] text-[var(--muted)]">
                Max 2000 characters. Olivia will speak this message.
              </p>
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
        </div>,
        document.body
      )}
    </div>
  );
}
