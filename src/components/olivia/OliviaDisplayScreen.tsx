"use client";

/**
 * OliviaDisplayScreen — Corporate 16:9 video display shell
 *
 * Wraps OliviaVideoAvatar in a professional TV-style bezel with
 * transport controls. Controls are visual stubs ready for agentic
 * integration (calendar read/post/delete/sort, screen record, etc).
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { OliviaVideoAvatar, OliviaVideoAvatarRef, RecordingState } from "./OliviaVideoAvatar";
import { InsightsPanel } from "../calendar/InsightsPanel";
import { OliviaPanel } from "../calendar/OliviaPanel";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SpeechRecognitionType = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

// Error messages for common speech recognition errors
const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Microphone access denied. Please allow microphone permission.",
  "no-speech": "No speech detected. Please speak clearly into your microphone.",
  "audio-capture": "No microphone found. Please check your device.",
  "network": "Network error. Speech recognition requires internet connection.",
  "aborted": "Voice input was interrupted.",
  "service-not-allowed": "Speech service not available. Try Chrome or Edge browser.",
  default: "Voice input failed. Please try again.",
};

interface Props {
  /** Optional text for Olivia to speak when avatar is connected */
  lastReply?: string;
  /** Called with final transcript when user finishes speaking */
  onVoiceTranscript?: (text: string) => void;
}

export function OliviaDisplayScreen({ lastReply, onVoiceTranscript }: Props) {
  const [isReady, setIsReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isRequestingMic, setIsRequestingMic] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionType>(null);
  const onVoiceTranscriptRef = useRef(onVoiceTranscript);
  const recordingIntentRef = useRef(false);
  const avatarRef = useRef<OliviaVideoAvatarRef>(null);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show error with auto-dismiss
  const showVoiceError = useCallback((message: string) => {
    setVoiceError(message);
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    errorTimeoutRef.current = setTimeout(() => {
      setVoiceError(null);
    }, 6000);
  }, []);

  // Derived states for UI
  const isRecordingScreen = recordingState === "recording";
  const hasRecordingReady = recordingState === "ready";

  // Keep callback ref current without re-creating recognition
  useEffect(() => {
    onVoiceTranscriptRef.current = onVoiceTranscript;
  }, [onVoiceTranscript]);

  // Keep isSpeaking in a ref for stable access inside recognition callbacks
  const isSpeakingRef = useRef(false);
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  // Pause recognition while Olivia avatar is speaking (prevents echo/repeat/talking-over)
  useEffect(() => {
    if (!recognitionRef.current || !recordingIntentRef.current) return;

    if (isSpeaking) {
      try { recognitionRef.current.stop(); } catch { /* already stopped */ }
    } else {
      if (recordingIntentRef.current) {
        setTimeout(() => {
          if (!recordingIntentRef.current || isSpeakingRef.current) return;
          try { recognitionRef.current.start(); } catch { /* ignore */ }
        }, 300);
      }
    }
  }, [isSpeaking]);

  // Initialise Web Speech API once
  useEffect(() => {
    const w = window as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-GB";

    recognition.onresult = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      // Guard: ignore transcript while Olivia is speaking (prevents echo/repeat)
      if (isSpeakingRef.current) return;

      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript && onVoiceTranscriptRef.current) {
        onVoiceTranscriptRef.current(finalTranscript);
      }
    };

    recognition.onerror = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const errorType = event.error as string;

      // Recoverable errors - restart silently but inform user after multiple failures
      if (errorType === "no-speech") {
        // Show user feedback that no speech was detected
        showVoiceError(ERROR_MESSAGES["no-speech"]);
        return; // Let onend handle restart
      }

      if (errorType === "aborted") {
        // User stopped or browser interrupted - no error needed
        return;
      }

      if (errorType === "network") {
        showVoiceError(ERROR_MESSAGES["network"]);
        return; // Let onend try to restart
      }

      // Truly fatal errors (not-allowed, service-not-allowed, etc.) — stop for good
      console.warn("[Mic] Speech recognition error:", errorType);
      recordingIntentRef.current = false;
      setIsRecordingVoice(false);
      showVoiceError(ERROR_MESSAGES[errorType] || ERROR_MESSAGES.default);
    };

    recognition.onend = () => {
      // Don't auto-restart if Olivia is speaking (she paused us intentionally)
      if (isSpeakingRef.current) return;

      // Edge/Chrome fire onend even with continuous=true (after silence, network, etc.)
      // Auto-restart after a brief delay if user hasn't clicked stop
      if (recordingIntentRef.current) {
        setTimeout(() => {
          if (!recordingIntentRef.current || isSpeakingRef.current) return;
          try {
            recognition.start();
          } catch {
            recordingIntentRef.current = false;
            setIsRecordingVoice(false);
          }
        }, 100);
        return; // Keep mic lit during restart delay
      }
      setIsRecordingVoice(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [showVoiceError]);

  const handleReady = useCallback(() => setIsReady(true), []);
  const handleDisconnect = useCallback(() => {
    setIsReady(false);
    setIsRecordingVoice(false);
    // Recording state is managed by the avatar component via onRecordingStateChange
    // No need to reset here - the avatar will notify us when it cleans up
  }, []);
  const handleSpeakingChange = useCallback((s: boolean) => setIsSpeaking(s), []);

  // ── Transport control handlers ──────────────────────────────────
  const handlePlayPause = useCallback(() => {
    // When speaking, interrupt. Otherwise, replay last message.
    if (isSpeaking) {
      avatarRef.current?.interrupt();
    } else {
      avatarRef.current?.replayLast();
    }
  }, [isSpeaking]);

  const handleRewind = useCallback(() => {
    // Replay last Olivia response
    avatarRef.current?.replayLast();
  }, []);

  const handleFastForward = useCallback(() => {
    // Skip current speech by interrupting
    if (isSpeaking) {
      avatarRef.current?.interrupt();
    }
  }, [isSpeaking]);

  const handleRecordVoice = useCallback(async () => {
    if (!recognitionRef.current || !voiceSupported) {
      showVoiceError(ERROR_MESSAGES["service-not-allowed"]);
      return;
    }

    if (isRecordingVoice) {
      recordingIntentRef.current = false;
      try { recognitionRef.current.stop(); } catch { /* already stopped */ }
      setIsRecordingVoice(false);
      setVoiceError(null); // Clear any error when stopping
    } else {
      // Clear previous errors
      setVoiceError(null);

      // Request mic permission explicitly — browsers block SpeechRecognition
      // without a prior getUserMedia grant on deployed sites
      try {
        setIsRequestingMic(true);
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        setIsRequestingMic(false);
      } catch (err) {
        setIsRequestingMic(false);
        const error = err as Error;
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          showVoiceError(ERROR_MESSAGES["not-allowed"]);
        } else if (error.name === "NotFoundError") {
          showVoiceError(ERROR_MESSAGES["audio-capture"]);
        } else {
          showVoiceError(ERROR_MESSAGES.default);
        }
        return;
      }

      try {
        recordingIntentRef.current = true;
        recognitionRef.current.start();
        setIsRecordingVoice(true);
      } catch {
        recordingIntentRef.current = false;
        setIsRecordingVoice(false);
        showVoiceError(ERROR_MESSAGES.default);
      }
    }
  }, [isRecordingVoice, voiceSupported, showVoiceError]);

  // Handle recording state changes from avatar
  const handleRecordingStateChange = useCallback((state: RecordingState) => {
    setRecordingState(state);
  }, []);

  // Start/stop screen recording
  const handleRecordScreen = useCallback(async () => {
    if (!avatarRef.current) return;

    if (isRecordingScreen) {
      // Stop recording
      avatarRef.current.stopRecording();
    } else {
      // Check if recording is supported
      if (!avatarRef.current.isRecordingSupported()) {
        console.warn("[Recording] Not supported in this browser");
        return;
      }
      // Start recording
      const started = await avatarRef.current.startRecording();
      if (!started) {
        console.error("[Recording] Failed to start");
      }
    }
  }, [isRecordingScreen]);

  const handleShare = useCallback(async () => {
    // Share the calendar page using Web Share API or clipboard fallback
    const shareData = {
      title: "Olivia AI Assistant - London Tech Map",
      text: "Check out my calendar managed by Olivia AI",
      url: typeof window !== "undefined" ? window.location.href : "",
    };

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData);
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
        console.log("[Share] Link copied to clipboard");
      }
    } catch (err) {
      // User cancelled share or error occurred - silent fail
      if ((err as Error).name !== "AbortError") {
        console.warn("[Share] Failed to share:", err);
      }
    }
  }, []);

  // Download recording - allow multiple downloads without auto-clearing
  const handleDownload = useCallback(() => {
    if (!avatarRef.current) return;

    if (hasRecordingReady) {
      // Download the recording - don't auto-clear so user can download again
      avatarRef.current.downloadRecording();
      // User can manually start a new recording when ready, which will clear the old one
    }
  }, [hasRecordingReady]);

  return (
    <div className="mx-auto w-full max-w-full overflow-x-hidden">
      {/* Stack vertically on mobile, horizontal on md+ */}
      <div className="flex flex-col md:flex-row items-stretch gap-3 w-full max-w-full">
      {/* ── Left Side Screen (stacked below main on mobile, left side on md+) ──────────────────────────────────── */}
      <div
        className="relative flex flex-col flex-1 min-w-0 max-w-full overflow-hidden rounded-2xl order-2 md:order-1"
        style={{
          background: "linear-gradient(180deg, #1a1f2e 0%, #0f1219 100%)",
          border: "1px solid rgba(196, 169, 106, 0.25)",
          boxShadow:
            "0 0 0 1px rgba(196, 169, 106, 0.08), " +
            "0 4px 24px rgba(0, 0, 0, 0.5), " +
            "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
        }}
      >
        <div
          className="flex items-center justify-center px-3 py-2"
          style={{
            background: "rgba(15, 18, 25, 0.8)",
            borderBottom: "1px solid rgba(196, 169, 106, 0.1)",
          }}
        >
          <span className="text-[10px] font-semibold tracking-wide uppercase" style={{ color: "rgba(196, 169, 106, 0.7)" }}>
            Insights
          </span>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 w-full max-w-full" style={{ maxHeight: 450 }}>
          <InsightsPanel />
        </div>
      </div>

      {/* ── Main TV Bezel Frame (center - shown first on mobile) ─────────────────────── */}
      <div className="w-full md:shrink-0 md:w-[540px] order-1 md:order-2">
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: "linear-gradient(180deg, #1a1f2e 0%, #0f1219 100%)",
          border: "1px solid rgba(196, 169, 106, 0.25)",
          boxShadow:
            "0 0 0 1px rgba(196, 169, 106, 0.08), " +
            "0 4px 24px rgba(0, 0, 0, 0.5), " +
            "0 1px 3px rgba(196, 169, 106, 0.06), " +
            "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
        }}
      >
        {/* Top chrome bar */}
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{
            background: "rgba(15, 18, 25, 0.8)",
            borderBottom: "1px solid rgba(196, 169, 106, 0.1)",
          }}
        >
          <div className="flex items-center gap-2">
            {/* Olivia brand mark */}
            <div
              aria-hidden="true"
              className="h-2 w-2 rounded-full"
              style={{
                background: isSpeaking
                  ? "#C4A96A"
                  : isReady
                  ? "#4ADE80"
                  : "rgba(196, 169, 106, 0.3)",
                boxShadow: isSpeaking
                  ? "0 0 6px rgba(196, 169, 106, 0.5)"
                  : "none",
                transition: "all 0.3s ease",
              }}
            />
            <span
              className="text-[11px] font-semibold tracking-wide uppercase"
              style={{ color: "rgba(196, 169, 106, 0.7)" }}
            >
              Olivia
            </span>
          </div>
          <span
            role="status"
            aria-live="polite"
            className="text-[10px] font-medium"
            style={{ color: "var(--muted)" }}
          >
            {isSpeaking
              ? "Speaking..."
              : isReady
              ? "Connected"
              : "Standby"}
          </span>
        </div>

        {/* Video area — inner padding for bezel effect */}
        <div className="px-1.5 py-1.5">
          <div
            className="overflow-hidden rounded-lg"
            style={{
              border: "1px solid rgba(30, 41, 59, 0.8)",
            }}
          >
            <OliviaVideoAvatar
              ref={avatarRef}
              onReady={handleReady}
              onDisconnect={handleDisconnect}
              onSpeakingChange={handleSpeakingChange}
              onRecordingStateChange={handleRecordingStateChange}
              lastReply={lastReply}
            />
          </div>
        </div>

        {/* ── Transport Controls ────────────────────────────────── */}
        <div
          role="toolbar"
          aria-label="Olivia video controls"
          className="flex flex-wrap items-center justify-center gap-1 px-2 sm:px-4 py-2.5"
          style={{
            background: "rgba(15, 18, 25, 0.8)",
            borderTop: "1px solid rgba(196, 169, 106, 0.1)",
          }}
        >
          {/* Rewind */}
          <TransportButton
            onClick={handleRewind}
            label="Rewind"
            disabled={!isReady}
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 19 2 12 11 5 11 19" />
              <polygon points="22 19 13 12 22 5 22 19" />
            </svg>
          </TransportButton>

          {/* Play / Pause */}
          <TransportButton
            onClick={handlePlayPause}
            label={isSpeaking ? "Pause" : "Play"}
            primary
            disabled={!isReady}
          >
            {isSpeaking ? (
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </TransportButton>

          {/* Fast Forward */}
          <TransportButton
            onClick={handleFastForward}
            label="Fast Forward"
            disabled={!isReady}
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 19 22 12 13 5 13 19" />
              <polygon points="2 19 11 12 2 5 2 19" />
            </svg>
          </TransportButton>

          {/* Divider */}
          <div aria-hidden="true" className="mx-2 h-4 w-px" style={{ background: "rgba(196, 169, 106, 0.15)" }} />

          {/* Record Voice — always enabled so users can speak to Olivia */}
          <TransportButton
            onClick={handleRecordVoice}
            label="Record Voice"
            active={isRecordingVoice}
          >
            <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill={isRecordingVoice ? "#ef4444" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </TransportButton>

          {/* Record Screen */}
          <TransportButton
            onClick={handleRecordScreen}
            label="Record Screen"
            active={isRecordingScreen}
            disabled={!isReady}
          >
            <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="4" fill={isRecordingScreen ? "#ef4444" : "none"} />
            </svg>
          </TransportButton>

          {/* Divider */}
          <div aria-hidden="true" className="mx-2 h-4 w-px" style={{ background: "rgba(196, 169, 106, 0.15)" }} />

          {/* Share */}
          <TransportButton onClick={handleShare} label="Share" disabled={!isReady}>
            <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </TransportButton>

          {/* Download - enabled when recording is ready */}
          <TransportButton
            onClick={handleDownload}
            label={hasRecordingReady ? "Download Recording" : "Download"}
            disabled={!hasRecordingReady}
            success={hasRecordingReady}
          >
            <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </TransportButton>
        </div>
      </div>

      {/* Voice error message */}
      {voiceError && (
        <div
          className="mx-2 mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            color: "#f87171",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="flex-1">{voiceError}</span>
          <button
            type="button"
            onClick={() => setVoiceError(null)}
            className="hover:text-red-300 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Mic requesting indicator */}
      {isRequestingMic && (
        <div
          className="mx-2 mt-2 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs"
          style={{
            background: "rgba(251, 191, 36, 0.1)",
            border: "1px solid rgba(251, 191, 36, 0.25)",
            color: "#fbbf24",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
          <span>Requesting microphone access...</span>
        </div>
      )}

      {/* Subtle brand footer */}
      <p
        className="mt-2 text-center text-[10px]"
        style={{ color: "rgba(196, 169, 106, 0.35)" }}
      >
        Olivia AI Assistant — London Tech Map
      </p>
      </div>{/* end center column */}

      {/* ── Right Side Screen (stacked below main on mobile, right side on md+) ─────────────────────────────────── */}
      <div
        className="relative flex flex-col flex-1 min-w-0 max-w-full overflow-hidden rounded-2xl order-3 md:order-3"
        style={{
          background: "linear-gradient(180deg, #1a1f2e 0%, #0f1219 100%)",
          border: "1px solid rgba(196, 169, 106, 0.25)",
          boxShadow:
            "0 0 0 1px rgba(196, 169, 106, 0.08), " +
            "0 4px 24px rgba(0, 0, 0, 0.5), " +
            "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
        }}
      >
        <div
          className="flex items-center justify-center px-3 py-2"
          style={{
            background: "rgba(15, 18, 25, 0.8)",
            borderBottom: "1px solid rgba(196, 169, 106, 0.1)",
          }}
        >
          <span className="text-[10px] font-semibold tracking-wide uppercase" style={{ color: "rgba(196, 169, 106, 0.7)" }}>
            Agenda
          </span>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 w-full max-w-full" style={{ maxHeight: 450 }}>
          <OliviaPanel compact />
        </div>
      </div>

      </div>{/* end flex row */}
    </div>
  );
}

/* ── Transport Button ─────────────────────────────────────────── */

interface TransportButtonProps {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  primary?: boolean;
  active?: boolean;      // Red active state (for recording)
  success?: boolean;     // Green success state (for download ready)
  disabled?: boolean;
}

function TransportButton({
  onClick,
  label,
  children,
  primary = false,
  active = false,
  success = false,
  disabled = false,
}: TransportButtonProps) {
  // Determine background color
  const getBackground = () => {
    if (success) return "rgba(74, 222, 128, 0.15)";
    if (active) return "rgba(239, 68, 68, 0.15)";
    if (primary) return "rgba(196, 169, 106, 0.12)";
    return "rgba(196, 169, 106, 0.06)";
  };

  // Determine border color
  const getBorderColor = () => {
    if (success) return "rgba(74, 222, 128, 0.3)";
    if (active) return "rgba(239, 68, 68, 0.3)";
    if (primary) return "rgba(196, 169, 106, 0.2)";
    return "rgba(196, 169, 106, 0.1)";
  };

  // Determine text/icon color
  const getColor = () => {
    if (success) return "#4ADE80";
    if (active) return "#ef4444";
    if (disabled) return "rgba(196, 169, 106, 0.25)";
    return "rgba(196, 169, 106, 0.7)";
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className="flex items-center justify-center rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A96A]/50"
      style={{
        width: primary ? 40 : 34,
        height: primary ? 40 : 34,
        background: getBackground(),
        border: `1px solid ${getBorderColor()}`,
        color: getColor(),
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}
