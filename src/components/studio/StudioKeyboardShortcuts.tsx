"use client";

/**
 * StudioKeyboardShortcuts — Centralized keyboard shortcut handler for the
 * Preparation Studio.
 *
 * Registers global keydown listeners for power-user navigation and actions.
 * Shortcuts are suppressed when the user is typing in an input, textarea,
 * or contentEditable element (except for Cmd/Ctrl combos which always fire).
 *
 * Shortcut map:
 * - J / ArrowDown  → Next question
 * - K / ArrowUp    → Previous question
 * - Tab            → Next question (when not in an input)
 * - Shift+Tab      → Previous question (when not in an input)
 * - Cmd/Ctrl+Enter → Submit (if document is 100% complete)
 * - Cmd/Ctrl+D     → Open Deep Research panel
 * - Cmd/Ctrl+K     → Focus Olivia chat input (ask Olivia)
 * - Escape         → Close any open modal/panel
 *
 * Usage:
 *   useStudioKeyboardShortcuts({ onNext, onPrev, onSubmit, ... });
 *
 * This hook renders nothing — it only attaches/detaches event listeners.
 */

import { useEffect } from "react";

interface StudioKeyboardShortcutsConfig {
  onNext: () => void;
  onPrev: () => void;
  onSubmit?: () => void;
  onResearch?: () => void;
  onAskOlivia?: () => void;
  onEscape?: () => void;
  /** Whether the document is 100% complete (enables Cmd+Enter submit) */
  isComplete?: boolean;
  /** Whether shortcuts are globally enabled (disable during modals, etc.) */
  enabled?: boolean;
}

// ── Helper: is the user focused on an editable element? ──────────────

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (target.isContentEditable) return true;
  return false;
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useStudioKeyboardShortcuts({
  onNext,
  onPrev,
  onSubmit,
  onResearch,
  onAskOlivia,
  onEscape,
  isComplete = false,
  enabled = true,
}: StudioKeyboardShortcutsConfig): void {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      const isMeta = e.metaKey || e.ctrlKey;
      const inEditable = isEditableTarget(e.target);

      // ── Cmd/Ctrl combos (always fire, even in inputs) ──────────
      if (isMeta) {
        if (e.key === "Enter" && isComplete && onSubmit) {
          e.preventDefault();
          onSubmit();
          return;
        }

        if (e.key === "d" || e.key === "D") {
          e.preventDefault();
          onResearch?.();
          return;
        }

        if (e.key === "k" || e.key === "K") {
          e.preventDefault();
          onAskOlivia?.();
          return;
        }
      }

      // ── Escape (always fires) ──────────────────────────────────
      if (e.key === "Escape") {
        onEscape?.();
        return;
      }

      // ── Navigation keys (suppressed when typing in inputs) ─────
      if (inEditable) return;

      if (e.key === "Tab") {
        e.preventDefault();
        if (e.shiftKey) {
          onPrev();
        } else {
          onNext();
        }
        return;
      }

      if (e.key === "j" || e.key === "J" || e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        onNext();
        return;
      }

      if (e.key === "k" || e.key === "K" || e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        onPrev();
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, isComplete, onNext, onPrev, onSubmit, onResearch, onAskOlivia, onEscape]);
}
