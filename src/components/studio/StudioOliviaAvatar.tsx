"use client";

/**
 * StudioOliviaAvatar — Responsive circular HeyGen avatar for the Preparation Studio.
 *
 * Wraps OliviaVideoAvatar in a circular frame with:
 * - Responsive sizing (240px desktop, 120px mobile, or custom via prop)
 * - Idle breathing animation (subtle scale pulse when connected but not speaking)
 * - Listening pulse ring (gold pulse ring when Olivia is speaking)
 * - Connection state indicators with text OUTSIDE the circle (no truncation)
 * - Fallback static avatar when video is not connected
 * - Click-to-connect on the circular area
 *
 * Design spec:
 * - Size: Configurable, defaults to 240px on sm+ screens, 120px on mobile
 * - Border: 2px gold glow when speaking, subtle when idle
 * - Breathing: 4s ease-in-out scale(1) -> scale(1.02) -> scale(1) when idle
 * - Pulse ring: expanding gold ring 1.5s ease-out when speaking
 * - Text: Always OUTSIDE the circle to prevent truncation
 */

import React, { useState, useRef, useCallback } from "react";
import {
  OliviaVideoAvatar,
  type OliviaVideoAvatarRef,
  type AvatarState,
} from "@/components/olivia/OliviaVideoAvatar";

interface StudioOliviaAvatarProps {
  /** Latest Olivia reply text — forwarded to HeyGen avatar for lip sync */
  lastReply?: string;
  /** Whether Olivia is currently speaking (from OliviaProvider) */
  isSpeaking: boolean;
  /** Callback when avatar speaking state changes */
  onSpeakingChange?: (isSpeaking: boolean) => void;
  /**
   * Avatar size in pixels.
   * - "responsive" (default): 120px on mobile, 240px on sm+ screens
   * - number: Fixed size in pixels
   */
  size?: "responsive" | number;
}

export function StudioOliviaAvatar({
  lastReply,
  isSpeaking,
  onSpeakingChange,
  size = "responsive",
}: StudioOliviaAvatarProps) {
  const avatarRef = useRef<OliviaVideoAvatarRef>(null);
  const [avatarState, setAvatarState] = useState<AvatarState>("disconnected");

  const isConnected = avatarState === "connected" || avatarState === "speaking";
  const isConnecting = avatarState === "connecting";
  const isError = avatarState === "error";

  const handleStateChange = useCallback((state: AvatarState) => {
    setAvatarState(state);
  }, []);

  const handleSpeakingChange = useCallback(
    (speaking: boolean) => {
      onSpeakingChange?.(speaking);
    },
    [onSpeakingChange]
  );

  const handleCircleClick = useCallback(() => {
    if (!isConnected && !isConnecting) {
      avatarRef.current?.connect();
    }
  }, [isConnected, isConnecting]);

  // Determine size classes and inline styles based on size prop
  const sizeConfig = size === "responsive"
    ? {
        containerClass: "w-[120px] h-[120px] sm:w-[240px] sm:h-[240px]",
        iconSize: { mobile: 32, desktop: 48 },
        iconClass: "w-8 h-8 sm:w-12 sm:h-12",
        dotClass: "w-2 h-2 sm:w-3 sm:h-3 bottom-1 right-1 sm:bottom-2 sm:right-2",
        textClass: "text-[9px] sm:text-[10px]",
        spinnerClass: "w-6 h-6 sm:w-8 sm:h-8",
      }
    : {
        containerClass: "",
        containerStyle: { width: `${size}px`, height: `${size}px` },
        iconSize: { mobile: size * 0.2, desktop: size * 0.2 },
        iconStyle: { width: `${size * 0.2}px`, height: `${size * 0.2}px` },
        dotStyle: {
          width: `${Math.max(8, size * 0.05)}px`,
          height: `${Math.max(8, size * 0.05)}px`,
          bottom: `${size * 0.04}px`,
          right: `${size * 0.04}px`,
        },
        textClass: size < 160 ? "text-[9px]" : "text-[10px]",
        spinnerStyle: { width: `${size * 0.15}px`, height: `${size * 0.15}px` },
      };

  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      {/* Breathing animation keyframes + pulse ring keyframes */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes studio-avatar-breathe {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.02); }
            }
            @keyframes studio-avatar-pulse-ring {
              0% {
                transform: scale(1);
                opacity: 0.6;
              }
              100% {
                transform: scale(1.15);
                opacity: 0;
              }
            }
            .studio-avatar-breathe {
              animation: studio-avatar-breathe 4s ease-in-out infinite;
            }
            .studio-avatar-pulse-ring {
              animation: studio-avatar-pulse-ring 1.5s ease-out infinite;
            }
          `,
        }}
      />

      {/* Outer container with pulse ring */}
      <div className="relative flex items-center justify-center">
        {/* Pulse ring — visible when speaking */}
        {isSpeaking && (
          <div
            className="absolute inset-0 rounded-full studio-avatar-pulse-ring"
            style={{
              width: "100%",
              height: "100%",
              border: "2px solid #C4A96A",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Circular avatar container — responsive or fixed size */}
        <button
          type="button"
          onClick={handleCircleClick}
          disabled={isConnected || isConnecting}
          aria-label={
            isConnected
              ? "Olivia avatar connected"
              : isConnecting
                ? "Connecting to Olivia"
                : isError
                  ? "Connection failed, click to retry"
                  : "Click to connect Olivia avatar"
          }
          className={`
            relative overflow-hidden rounded-full cursor-pointer
            disabled:cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50
            ${isConnected && !isSpeaking ? "studio-avatar-breathe" : ""}
            ${sizeConfig.containerClass}
          `}
          style={{
            ...("containerStyle" in sizeConfig ? sizeConfig.containerStyle : {}),
            background: "rgba(15, 18, 25, 0.8)",
            border: `2px solid ${
              isSpeaking
                ? "rgba(196, 169, 106, 0.6)"
                : isConnected
                  ? "rgba(196, 169, 106, 0.25)"
                  : isError
                    ? "rgba(239, 68, 68, 0.4)"
                    : "rgba(196, 169, 106, 0.1)"
            }`,
            boxShadow: isSpeaking
              ? "0 0 24px rgba(196, 169, 106, 0.15), 0 0 8px rgba(196, 169, 106, 0.08)"
              : "none",
            transition: "border-color 300ms ease, box-shadow 300ms ease",
          }}
        >
          {/* HeyGen video avatar — clipped to circle, overlays hidden */}
          <div
            className="absolute"
            style={{
              top: "-20%",
              left: "-20%",
              width: "140%",
              height: "140%",
            }}
          >
            <OliviaVideoAvatar
              ref={avatarRef}
              lastReply={lastReply}
              onStateChange={handleStateChange}
              onSpeakingChange={handleSpeakingChange}
              hideOverlays
            />
          </div>

          {/* Fallback overlay — shown when not connected */}
          {!isConnected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {isConnecting ? (
                /* Connecting spinner */
                <div
                  className={`animate-spin rounded-full ${sizeConfig.spinnerClass || ""}`}
                  style={{
                    ...("spinnerStyle" in sizeConfig ? sizeConfig.spinnerStyle : {}),
                    border: "2px solid rgba(196, 169, 106, 0.2)",
                    borderTop: "2px solid #C4A96A",
                  }}
                />
              ) : isError ? (
                /* Error icon */
                <svg
                  className={`text-red-400 ${sizeConfig.iconClass || ""}`}
                  style={"iconStyle" in sizeConfig ? sizeConfig.iconStyle : undefined}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : (
                /* Disconnected — Olivia silhouette */
                <svg
                  className={`${sizeConfig.iconClass || ""}`}
                  style={{
                    ...("iconStyle" in sizeConfig ? sizeConfig.iconStyle : {}),
                    opacity: 0.4,
                  }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#C4A96A"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </div>
          )}

          {/* Status indicator dot */}
          <div
            className={`absolute rounded-full ${sizeConfig.dotClass || ""}`}
            style={{
              ...("dotStyle" in sizeConfig ? sizeConfig.dotStyle : {}),
              background: isSpeaking
                ? "#C4A96A"
                : isConnected
                  ? "#4ADE80"
                  : isError
                    ? "#f87171"
                    : "rgba(255, 255, 255, 0.2)",
              border: "2px solid #0a0e1a",
              boxShadow: isSpeaking
                ? "0 0 6px rgba(196, 169, 106, 0.5)"
                : isConnected
                  ? "0 0 6px rgba(74, 222, 128, 0.3)"
                  : "none",
            }}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Status label OUTSIDE the circle — never truncated */}
      <span
        className={`text-center uppercase tracking-wide max-w-[200px] ${sizeConfig.textClass}`}
        style={{
          letterSpacing: "0.08em",
          color: isSpeaking
            ? "#C4A96A"
            : isConnected
              ? "rgba(74, 222, 128, 0.7)"
              : isError
                ? "#f87171"
                : "#9AA7B2",
        }}
      >
        {isSpeaking
          ? "Olivia is speaking..."
          : isConnected
            ? "Live"
            : isConnecting
              ? "Connecting..."
              : isError
                ? "Failed — tap to retry"
                : "Tap to connect"}
      </span>
    </div>
  );
}
