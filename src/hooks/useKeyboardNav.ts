/**
 * useKeyboardNav — Keyboard navigation hook for studio interfaces
 *
 * Provides keyboard shortcuts for navigation and actions:
 * - J/K: Navigate down/up through items
 * - Escape: Close modals, dismiss overlays, exit
 * - Ctrl/Cmd+T: Toggle transcript
 * - Ctrl/Cmd+S: Save (with preventDefault)
 *
 * Automatically ignores shortcuts when focused on input/textarea.
 *
 * Usage:
 * ```ts
 * useKeyboardNav({
 *   onNext: () => setIndex(i => Math.min(items.length - 1, i + 1)),
 *   onPrev: () => setIndex(i => Math.max(0, i - 1)),
 *   onEscape: () => setShowModal(false),
 *   onSave: () => saveWorkspace(),
 * });
 * ```
 */

"use client";

import { useEffect, useCallback, useRef } from "react";

interface UseKeyboardNavOptions {
  /** Called when J is pressed (navigate down/next) */
  onNext?: () => void;
  /** Called when K is pressed (navigate up/prev) */
  onPrev?: () => void;
  /** Called when Escape is pressed */
  onEscape?: () => void;
  /** Called when Ctrl/Cmd+T is pressed (toggle transcript) */
  onToggleTranscript?: () => void;
  /** Called when Ctrl/Cmd+S is pressed (save) */
  onSave?: () => void;
  /** Called when Enter is pressed (confirm/submit) */
  onEnter?: () => void;
  /** Custom key handlers: key → callback */
  customKeys?: Record<string, () => void>;
  /** Disable all keyboard handling */
  disabled?: boolean;
  /** Allow shortcuts even when in input/textarea */
  allowInInputs?: boolean;
}

function isEditableElement(element: Element | null): boolean {
  if (!element) return false;
  const tagName = element.tagName.toUpperCase();
  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    (element as HTMLElement).isContentEditable
  );
}

export function useKeyboardNav({
  onNext,
  onPrev,
  onEscape,
  onToggleTranscript,
  onSave,
  onEnter,
  customKeys = {},
  disabled = false,
  allowInInputs = false,
}: UseKeyboardNavOptions = {}) {
  // Use refs to avoid re-registering handlers when callbacks change
  const handlersRef = useRef({
    onNext,
    onPrev,
    onEscape,
    onToggleTranscript,
    onSave,
    onEnter,
    customKeys,
  });

  // Update refs when props change
  useEffect(() => {
    handlersRef.current = {
      onNext,
      onPrev,
      onEscape,
      onToggleTranscript,
      onSave,
      onEnter,
      customKeys,
    };
  }, [onNext, onPrev, onEscape, onToggleTranscript, onSave, onEnter, customKeys]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (disabled) return;

      const handlers = handlersRef.current;
      const { key, ctrlKey, metaKey } = event;
      const modKey = ctrlKey || metaKey;

      // Skip navigation keys when in editable elements (unless allowed)
      const inEditable = isEditableElement(document.activeElement);
      const skipNavigation = inEditable && !allowInInputs;

      // Escape always works
      if (key === "Escape" && handlers.onEscape) {
        event.preventDefault();
        handlers.onEscape();
        return;
      }

      // Ctrl/Cmd+T: Toggle transcript
      if (key.toLowerCase() === "t" && modKey && handlers.onToggleTranscript) {
        event.preventDefault();
        handlers.onToggleTranscript();
        return;
      }

      // Ctrl/Cmd+S: Save
      if (key.toLowerCase() === "s" && modKey && handlers.onSave) {
        event.preventDefault();
        handlers.onSave();
        return;
      }

      // Skip the rest if in editable element
      if (skipNavigation) return;

      // J: Next
      if (key.toLowerCase() === "j" && handlers.onNext) {
        event.preventDefault();
        handlers.onNext();
        return;
      }

      // K: Previous
      if (key.toLowerCase() === "k" && handlers.onPrev) {
        event.preventDefault();
        handlers.onPrev();
        return;
      }

      // Enter: Confirm
      if (key === "Enter" && handlers.onEnter) {
        event.preventDefault();
        handlers.onEnter();
        return;
      }

      // Custom keys
      const customHandler = handlers.customKeys[key] || handlers.customKeys[key.toLowerCase()];
      if (customHandler) {
        event.preventDefault();
        customHandler();
      }
    },
    [disabled, allowInInputs]
  );

  useEffect(() => {
    if (disabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, disabled]);
}

/**
 * useArrowNav — Simple arrow key navigation
 *
 * Lightweight hook for just arrow key navigation.
 */
export function useArrowNav(
  onUp?: () => void,
  onDown?: () => void,
  onLeft?: () => void,
  onRight?: () => void,
  disabled = false
) {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableElement(document.activeElement)) return;

      switch (event.key) {
        case "ArrowUp":
          if (onUp) {
            event.preventDefault();
            onUp();
          }
          break;
        case "ArrowDown":
          if (onDown) {
            event.preventDefault();
            onDown();
          }
          break;
        case "ArrowLeft":
          if (onLeft) {
            event.preventDefault();
            onLeft();
          }
          break;
        case "ArrowRight":
          if (onRight) {
            event.preventDefault();
            onRight();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onUp, onDown, onLeft, onRight, disabled]);
}

export default useKeyboardNav;
