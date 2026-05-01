/**
 * useAutoSave — Debounced auto-save hook for workspace persistence
 *
 * Provides automatic saving of workspace state to localStorage with:
 * - Debounced saves (configurable delay, default 1500ms)
 * - Automatic restore on mount
 * - Type-safe storage with JSON serialization
 * - SSR-safe (checks for window)
 *
 * Usage:
 * ```ts
 * const { save, restore, clear, isSaving, lastSaved } = useAutoSave<MyState>({
 *   key: "workspace-v1",
 *   debounceMs: 1500,
 *   onRestore: (state) => setWorkspace(state),
 * });
 *
 * // Call save whenever state changes
 * useEffect(() => { save(workspaceState); }, [workspaceState, save]);
 * ```
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseAutoSaveOptions<T> {
  /** Storage key for localStorage */
  key: string;
  /** Debounce delay in milliseconds (default: 1500) */
  debounceMs?: number;
  /** Callback when state is restored from storage */
  onRestore?: (state: T) => void;
  /** Callback when save completes */
  onSave?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Auto-restore on mount (default: true) */
  autoRestore?: boolean;
}

interface UseAutoSaveReturn<T> {
  /** Save state (debounced) */
  save: (state: T) => void;
  /** Force immediate save */
  saveNow: (state: T) => void;
  /** Manually restore from storage */
  restore: () => T | null;
  /** Clear stored state */
  clear: () => void;
  /** Whether a save is pending */
  isSaving: boolean;
  /** Timestamp of last successful save */
  lastSaved: Date | null;
  /** Whether restore has completed */
  isRestored: boolean;
}

export function useAutoSave<T>({
  key,
  debounceMs = 1500,
  onRestore,
  onSave,
  onError,
  autoRestore = true,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn<T> {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isRestored, setIsRestored] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRestoredRef = useRef(false);

  // Check if we're in browser
  const isBrowser = typeof window !== "undefined";

  // Restore from storage
  const restore = useCallback((): T | null => {
    if (!isBrowser) return null;

    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const parsed = JSON.parse(stored) as T;
      return parsed;
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Restore failed"));
      return null;
    }
  }, [key, isBrowser, onError]);

  // Save to storage (immediate)
  const saveNow = useCallback(
    (state: T) => {
      if (!isBrowser) return;

      try {
        setIsSaving(true);
        localStorage.setItem(key, JSON.stringify(state));
        setLastSaved(new Date());
        onSave?.();
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error("Save failed"));
      } finally {
        setIsSaving(false);
      }
    },
    [key, isBrowser, onSave, onError]
  );

  // Save to storage (debounced)
  const save = useCallback(
    (state: T) => {
      if (!isBrowser) return;

      // Clear existing timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      setIsSaving(true);

      // Set new timer
      saveTimerRef.current = setTimeout(() => {
        saveNow(state);
        saveTimerRef.current = null;
      }, debounceMs);
    },
    [isBrowser, debounceMs, saveNow]
  );

  // Clear storage
  const clear = useCallback(() => {
    if (!isBrowser) return;

    try {
      localStorage.removeItem(key);
      setLastSaved(null);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Clear failed"));
    }
  }, [key, isBrowser, onError]);

  // Auto-restore on mount
  useEffect(() => {
    if (!autoRestore || hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const state = restore();
    if (state) {
      onRestore?.(state);
    }
    setIsRestored(true);
  }, [autoRestore, restore, onRestore]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  return {
    save,
    saveNow,
    restore,
    clear,
    isSaving,
    lastSaved,
    isRestored,
  };
}

export default useAutoSave;
