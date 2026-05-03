"use client";

import { useState, useEffect, useCallback } from "react";

interface ConfirmationChipProps {
  /** Label for the initial trigger button */
  triggerLabel: string;
  /** Label shown on the confirm button (default: "Confirm") */
  confirmLabel?: string;
  /** Label shown on the cancel button (default: "Cancel") */
  cancelLabel?: string;
  /** Called when user confirms the action */
  onConfirm: () => void;
  /** Called when user cancels (optional) */
  onCancel?: () => void;
  /** Auto-dismiss timeout in ms (default: 5000). Set 0 to disable. */
  timeoutMs?: number;
  /** Additional CSS classes for the trigger button */
  triggerClassName?: string;
  /** Whether the action is currently processing */
  processing?: boolean;
  /** Label shown while processing (default: "Processing...") */
  processingLabel?: string;
}

/**
 * ConfirmationChip — A two-step confirmation pattern for destructive or
 * significant actions. Click once to reveal confirm/cancel, click confirm
 * to execute. Auto-dismisses after timeout if no action taken.
 *
 * Used by OliviaPanel for accepting suggestions, and available for reuse
 * across the calendar system.
 */
export function ConfirmationChip({
  triggerLabel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  timeoutMs = 5000,
  triggerClassName,
  processing = false,
  processingLabel = "Processing...",
}: ConfirmationChipProps) {
  const [confirming, setConfirming] = useState(false);

  // Auto-dismiss after timeout
  useEffect(() => {
    if (!confirming || timeoutMs === 0) return;

    const timer = setTimeout(() => {
      setConfirming(false);
      onCancel?.();
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [confirming, timeoutMs, onCancel]);

  const handleTrigger = useCallback(() => {
    setConfirming(true);
  }, []);

  const handleConfirm = useCallback(() => {
    setConfirming(false);
    onConfirm();
  }, [onConfirm]);

  const handleCancel = useCallback(() => {
    setConfirming(false);
    onCancel?.();
  }, [onCancel]);

  if (processing) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-medium bg-brand-600/20 text-brand-400 border border-brand-600/30">
        <span
          className="inline-block h-2.5 w-2.5 animate-spin rounded-full border border-brand-400 border-t-transparent"
          aria-hidden="true"
        />
        {processingLabel}
      </span>
    );
  }

  if (!confirming) {
    return (
      <button
        onClick={handleTrigger}
        className={
          triggerClassName ||
          "rounded px-2 py-1 text-[10px] font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
        }
      >
        {triggerLabel}
      </button>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border px-1 py-0.5"
      style={{
        borderColor: "rgba(196, 169, 106, 0.3)",
        background: "rgba(196, 169, 106, 0.08)",
      }}
    >
      <button
        onClick={handleConfirm}
        className="rounded px-2 py-0.5 text-[10px] font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors"
      >
        {confirmLabel}
      </button>
      <button
        onClick={handleCancel}
        className="rounded px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
      >
        {cancelLabel}
      </button>
    </span>
  );
}
