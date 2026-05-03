"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// Web Speech API types (not included in standard TS lib)
/* eslint-disable @typescript-eslint/no-explicit-any */
type SpeechRecognitionType = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

// Error messages for common speech recognition errors
const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Microphone access denied. Please allow microphone permission.",
  "no-speech": "No speech detected. Please speak clearly.",
  "audio-capture": "No microphone found. Please check your device.",
  "network": "Network error. Please check your connection.",
  "aborted": "Voice input was interrupted.",
  "service-not-allowed": "Speech service not available in your browser.",
  default: "Voice input failed. Please try again.",
};

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  autoSend?: boolean;
  disabled?: boolean;
}

export function VoiceInput({ onTranscript, autoSend = false, disabled = false }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionType>(null);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear error after 5 seconds
  const showError = useCallback((message: string) => {
    setError(message);
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    errorTimeoutRef.current = setTimeout(() => {
      setError(null);
    }, 5000);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-GB";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setError(null); // Clear any previous error on success
        setTranscript(finalTranscript);
        if (autoSend) {
          onTranscript(finalTranscript);
          setTranscript("");
        }
      } else {
        setTranscript(interimTranscript);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      setIsListening(false);
      const errorType = event.error as string;
      // Don't show error for aborted (user stopped) unless it's unexpected
      if (errorType !== "aborted") {
        const message = ERROR_MESSAGES[errorType] || ERROR_MESSAGES.default;
        showError(message);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [autoSend, onTranscript, showError]);

  const toggleListening = useCallback(async () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setError(null);
      setTranscript("");

      // Request microphone permission first to avoid silent failures
      try {
        setIsRequesting(true);
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Release the stream immediately - we just needed permission
        stream.getTracks().forEach((t) => t.stop());
        setIsRequesting(false);

        // Now start recognition
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        setIsRequesting(false);
        const error = err as Error;
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          showError(ERROR_MESSAGES["not-allowed"]);
        } else if (error.name === "NotFoundError") {
          showError(ERROR_MESSAGES["audio-capture"]);
        } else {
          showError(ERROR_MESSAGES.default);
        }
      }
    }
  }, [isListening, showError]);

  const handleSend = useCallback(() => {
    if (transcript.trim()) {
      onTranscript(transcript.trim());
      setTranscript("");
    }
  }, [transcript, onTranscript]);

  if (!supported) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleListening}
          disabled={disabled || isRequesting}
          className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 ${
            isListening
              ? "bg-red-600 text-white animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.4)]"
              : isRequesting
              ? "bg-amber-600/20 text-amber-400 border border-amber-500/30"
              : "border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--muted)]"
          } disabled:opacity-50`}
          title={isListening ? "Stop recording" : isRequesting ? "Requesting microphone..." : "Voice input"}
        >
          {isRequesting ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="animate-spin"
            >
              <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          )}
        </button>

        {transcript && !autoSend && (
          <div className="flex items-center gap-2 flex-1">
            <div className="flex-1 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs text-[var(--foreground)] truncate">
              {transcript}
            </div>
            <button
              type="button"
              onClick={handleSend}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 transition-colors"
            >
              Send
            </button>
          </div>
        )}

        {isListening && (
          <span className="text-xs text-red-400 animate-pulse">Listening...</span>
        )}

        {isRequesting && (
          <span className="text-xs text-amber-400">Requesting microphone...</span>
        )}
      </div>

      {/* Error message display */}
      {error && (
        <div
          className="flex items-center gap-2 rounded-md px-3 py-2 text-xs"
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            color: "#f87171",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto hover:text-red-300 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
