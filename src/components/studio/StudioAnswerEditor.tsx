"use client";

/**
 * StudioAnswerEditor — Rich text answer editor for the Preparation Studio.
 *
 * Features:
 * - Auto-expanding textarea that grows with content
 * - Ghost text overlay: faint suggestion continuation, Tab to accept
 * - Slash command menu: type / to trigger command palette
 *   Commands: /bold, /italic, /underline, /list, /insert-metric,
 *             /pull-from-dna, /ask-olivia, /pitch-polish
 * - Selection tracking for formatting toolbar + Pitch Polish integration
 * - Supports "text" (single-line) and "textarea" (multi-line) modes
 * - Exports formatting utilities for toolbar integration
 *
 * Design spec:
 * - Input: transparent bg over ghost layer, subtle border, 14px
 * - Ghost text: 25% opacity of primary text color (#e2e8f0)
 * - Slash menu: glassmorphic dropdown, arrow key navigation
 * - Caret: brand gold #C4A96A
 * - Tab accepts ghost text suggestion
 * - Slash menu categories: format (gray), insert (gold), ai (purple)
 */

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";

// ── Exported Types ──────────────────────────────────────────────────

export interface EditorSelection {
  start: number;
  end: number;
  text: string;
}

/** A text range with a confidence score for colored underline rendering */
export interface ConfidenceRange {
  start: number;
  end: number;
  /** Confidence 0-100: green >80%, yellow 50-79%, red <50% */
  confidence: number;
}

export interface SlashCommandContext {
  selectedText: string;
  cursorPosition: number;
  fullText: string;
}

// ── Slash Command Definitions ───────────────────────────────────────

interface SlashCommand {
  command: string;
  label: string;
  description: string;
  category: "format" | "insert" | "ai";
}

const SLASH_COMMANDS: SlashCommand[] = [
  { command: "bold", label: "Bold", description: "Wrap selection in **bold**", category: "format" },
  { command: "italic", label: "Italic", description: "Wrap selection in *italic*", category: "format" },
  { command: "underline", label: "Underline", description: "Underline selected text", category: "format" },
  { command: "list", label: "Bullet List", description: "Convert lines to bullet points", category: "format" },
  { command: "insert-metric", label: "Insert Metric", description: "Insert a {{metric}} token from DNA", category: "insert" },
  { command: "pull-from-dna", label: "Pull from DNA", description: "Pull relevant content from DNA paragraphs", category: "insert" },
  { command: "ask-olivia", label: "Ask Olivia", description: "Ask Olivia for help with this question", category: "ai" },
  { command: "pitch-polish", label: "Pitch Polish", description: "Rewrite in investor-ready tone", category: "ai" },
];

// ── Exported Formatting Utilities (used by toolbar + slash commands) ─

/**
 * Apply inline markdown-style formatting to a text value.
 * If a selection exists, wraps the selected text. Otherwise inserts placeholder.
 */
export function applyInlineFormat(
  value: string,
  selection: EditorSelection | null,
  format: "bold" | "italic" | "underline" | "list",
): { newValue: string; cursorPos: number } {
  const wrapperMap: Record<string, string> = {
    bold: "**",
    italic: "*",
    underline: "__",
  };

  if (format === "list") {
    if (selection && selection.text) {
      const lines = selection.text.split("\n");
      const bulleted = lines.map((line) => (line.trim() ? `- ${line.trim()}` : "")).join("\n");
      const newValue =
        value.substring(0, selection.start) + bulleted + value.substring(selection.end);
      return { newValue, cursorPos: selection.start + bulleted.length };
    }
    const insert = "- ";
    const pos = selection?.start ?? value.length;
    const newValue = value.substring(0, pos) + insert + value.substring(pos);
    return { newValue, cursorPos: pos + insert.length };
  }

  const wrapper = wrapperMap[format] || "**";

  if (selection && selection.text) {
    const wrapped = wrapper + selection.text + wrapper;
    const newValue =
      value.substring(0, selection.start) + wrapped + value.substring(selection.end);
    return { newValue, cursorPos: selection.start + wrapped.length };
  }

  const placeholder = wrapper + "text" + wrapper;
  const pos = selection?.start ?? value.length;
  const newValue = value.substring(0, pos) + placeholder + value.substring(pos);
  return { newValue, cursorPos: pos + placeholder.length };
}

/**
 * Insert text at a given cursor position.
 */
export function insertTextAtPosition(
  value: string,
  position: number,
  text: string,
): { newValue: string; cursorPos: number } {
  const newValue = value.substring(0, position) + text + value.substring(position);
  return { newValue, cursorPos: position + text.length };
}

// ── Category Icon for slash menu ────────────────────────────────────

function CommandIcon({ category }: { category: string }) {
  switch (category) {
    case "format":
      return (
        <span
          style={{
            color: "#9AA7B2",
            fontSize: "12px",
            fontWeight: 700,
            width: "14px",
            display: "inline-flex",
            justifyContent: "center",
          }}
        >
          B
        </span>
      );
    case "insert":
      return (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#C4A96A"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      );
    case "ai":
      return (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#a78bfa"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    default:
      return null;
  }
}

// ── Slash Command Menu Component ────────────────────────────────────

function SlashCommandMenu({
  commands,
  selectedIndex,
  onSelect,
  position,
}: {
  commands: SlashCommand[];
  selectedIndex: number;
  onSelect: (command: SlashCommand) => void;
  position: { top: number; left: number };
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Scroll active item into view
  useEffect(() => {
    if (!menuRef.current) return;
    const active = menuRef.current.querySelector("[data-active='true']");
    if (active) {
      active.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (commands.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 rounded-xl py-1.5 overflow-hidden"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        background: "rgba(15, 18, 25, 0.95)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
        minWidth: "260px",
        maxHeight: "280px",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-1.5 uppercase tracking-wide"
        style={{
          fontSize: "10px",
          color: "rgba(255, 255, 255, 0.3)",
          letterSpacing: "0.08em",
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        Commands
      </div>

      {commands.map((cmd, index) => {
        const isActive = index === selectedIndex;
        const catColor =
          cmd.category === "ai"
            ? "#a78bfa"
            : cmd.category === "insert"
              ? "#C4A96A"
              : "#9AA7B2";
        const catBg =
          cmd.category === "ai"
            ? "rgba(167, 139, 250, 0.08)"
            : cmd.category === "insert"
              ? "rgba(196, 169, 106, 0.08)"
              : "rgba(255, 255, 255, 0.04)";

        return (
          <button
            key={cmd.command}
            data-active={isActive}
            onMouseDown={(e) => {
              e.preventDefault(); // Keep textarea focus
              onSelect(cmd);
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors cursor-pointer"
            style={{
              background: isActive ? "rgba(196, 169, 106, 0.1)" : "transparent",
              borderLeft: isActive ? "2px solid #C4A96A" : "2px solid transparent",
            }}
          >
            <span
              className="flex items-center justify-center shrink-0 rounded"
              style={{
                width: "24px",
                height: "24px",
                background: "rgba(255, 255, 255, 0.05)",
              }}
            >
              <CommandIcon category={cmd.category} />
            </span>
            <div className="min-w-0 flex-1">
              <div
                className="font-medium"
                style={{
                  fontSize: "13px",
                  color: isActive ? "#e2e8f0" : "#9AA7B2",
                }}
              >
                /{cmd.command}
              </div>
              <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.3)" }}>
                {cmd.description}
              </div>
            </div>
            <span
              className="shrink-0 rounded-full px-1.5 py-0.5 uppercase"
              style={{
                fontSize: "9px",
                letterSpacing: "0.06em",
                color: catColor,
                background: catBg,
              }}
            >
              {cmd.category}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Props ────────────────────────────────────────────────────────────

export interface StudioAnswerEditorProps {
  value: string;
  placeholder?: string;
  /** Faint text shown after current value; Tab to accept */
  ghostText?: string;
  /** "text" = single-line, "textarea" = multi-line */
  mode: "text" | "textarea";
  onValueChange: (value: string) => void;
  /** Fires whenever the user's text selection changes */
  onSelectionChange?: (selection: EditorSelection | null) => void;
  /** Fires for insert/AI slash commands (format commands are handled inline) */
  onSlashCommand?: (command: string, context: SlashCommandContext) => void;
  /** Confidence-colored underline ranges (green >80%, yellow 50-79%, red <50%) */
  confidenceRanges?: ConfidenceRange[];
  autoFocus?: boolean;
}

// ── Shared text style constants (must match between textarea + ghost) ─

const SHARED_TEXT_STYLE: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: "14px",
  lineHeight: "1.6",
  padding: "12px 16px",
  whiteSpace: "pre-wrap",
  overflowWrap: "break-word",
  wordWrap: "break-word",
  boxSizing: "border-box",
  width: "100%",
};

// ── Main Component ──────────────────────────────────────────────────

// ── Confidence underline color helper ─────────────────────────────────

function confidenceUnderlineColor(confidence: number): string {
  if (confidence >= 80) return "#22c55e";
  if (confidence >= 50) return "#eab308";
  return "#ef4444";
}

export function StudioAnswerEditor({
  value,
  placeholder,
  ghostText,
  mode,
  onValueChange,
  onSelectionChange,
  onSlashCommand,
  confidenceRanges,
  autoFocus = true,
}: StudioAnswerEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Slash command state
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");
  const [slashMenuIndex, setSlashMenuIndex] = useState(0);
  const [slashMenuPos, setSlashMenuPos] = useState({ top: 0, left: 0 });
  const [slashStartPos, setSlashStartPos] = useState<number | null>(null);

  // Ghost text acceptance flash
  const [ghostAccepted, setGhostAccepted] = useState(false);

  // Filtered slash commands
  const filteredCommands = useMemo(() => {
    if (!slashFilter) return SLASH_COMMANDS;
    const lower = slashFilter.toLowerCase();
    return SLASH_COMMANDS.filter(
      (cmd) =>
        cmd.command.includes(lower) || cmd.label.toLowerCase().includes(lower),
    );
  }, [slashFilter]);

  // ── Auto-expand textarea height ─────────────────────────────────

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const minH = mode === "text" ? 44 : 120;
    el.style.height = `${Math.max(minH, el.scrollHeight)}px`;
  }, [value, mode]);

  // ── Sync scroll between textarea and ghost overlay ──────────────

  const handleScroll = useCallback(() => {
    if (textareaRef.current && ghostRef.current) {
      ghostRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // ── Detect slash command from cursor position ───────────────────

  const detectSlashCommand = useCallback(
    (text: string, cursorPos: number) => {
      const before = text.substring(0, cursorPos);
      const lastSlash = before.lastIndexOf("/");

      if (lastSlash === -1) {
        setShowSlashMenu(false);
        return;
      }

      // Slash must be at start of input or preceded by whitespace/newline
      if (lastSlash > 0) {
        const charBefore = before[lastSlash - 1];
        if (charBefore !== "\n" && charBefore !== " " && charBefore !== "\t") {
          setShowSlashMenu(false);
          return;
        }
      }

      const cmdText = before.substring(lastSlash + 1);

      // If there's a space or newline in the typed command, menu is dismissed
      if (cmdText.includes(" ") || cmdText.includes("\n")) {
        setShowSlashMenu(false);
        return;
      }

      setSlashFilter(cmdText);
      setSlashStartPos(lastSlash);
      setSlashMenuIndex(0);
      setShowSlashMenu(true);

      // Position menu below current line
      if (textareaRef.current) {
        const ta = textareaRef.current;
        const lineHeight = parseInt(getComputedStyle(ta).lineHeight) || 22;
        const lines = before.split("\n");
        const paddingTop = parseInt(getComputedStyle(ta).paddingTop) || 12;
        const top = paddingTop + lines.length * lineHeight + 4 - ta.scrollTop;

        setSlashMenuPos({ top, left: 16 });
      }
    },
    [],
  );

  // ── Handle input change ─────────────────────────────────────────

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newVal = e.target.value;

      // In single-line mode, strip newlines
      if (mode === "text") {
        onValueChange(newVal.replace(/\n/g, ""));
      } else {
        onValueChange(newVal);
      }

      detectSlashCommand(newVal, e.target.selectionStart);
    },
    [mode, onValueChange, detectSlashCommand],
  );

  // ── Handle selection change ─────────────────────────────────────

  const handleSelect = useCallback(() => {
    if (!textareaRef.current || !onSelectionChange) return;

    const { selectionStart, selectionEnd } = textareaRef.current;
    const text = textareaRef.current.value;

    if (selectionStart !== selectionEnd) {
      onSelectionChange({
        start: selectionStart,
        end: selectionEnd,
        text: text.substring(selectionStart, selectionEnd),
      });
    } else {
      onSelectionChange(null);
    }
  }, [onSelectionChange]);

  // ── Execute a slash command ─────────────────────────────────────

  const executeSlashCommand = useCallback(
    (cmd: SlashCommand) => {
      if (!textareaRef.current || slashStartPos === null) return;

      const cursorPos = textareaRef.current.selectionStart;
      const { selectionStart, selectionEnd } = textareaRef.current;
      const selectedText = value.substring(selectionStart, selectionEnd);

      // Remove the /command text from the value
      const beforeSlash = value.substring(0, slashStartPos);
      const afterCursor = value.substring(cursorPos);
      const cleanedValue = beforeSlash + afterCursor;

      // Handle format commands inline
      if (cmd.category === "format") {
        const format = cmd.command as "bold" | "italic" | "underline" | "list";
        const sel: EditorSelection | null = selectedText
          ? { start: slashStartPos, end: slashStartPos + selectedText.length, text: selectedText }
          : { start: slashStartPos, end: slashStartPos, text: "" };
        const result = applyInlineFormat(cleanedValue, sel, format);
        onValueChange(result.newValue);

        // Restore cursor position
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(result.cursorPos, result.cursorPos);
          }
        });
      } else {
        // Insert and AI commands — delegate to parent
        onValueChange(cleanedValue);
        if (onSlashCommand) {
          onSlashCommand(cmd.command, {
            selectedText,
            cursorPosition: slashStartPos,
            fullText: cleanedValue,
          });
        }

        requestAnimationFrame(() => {
          textareaRef.current?.focus();
        });
      }

      setShowSlashMenu(false);
      setSlashStartPos(null);
    },
    [value, slashStartPos, onValueChange, onSlashCommand],
  );

  // ── Keyboard handler ────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Tab to accept ghost text
      if (e.key === "Tab" && ghostText && !showSlashMenu) {
        e.preventDefault();
        const accepted = value + ghostText;
        onValueChange(accepted);
        setGhostAccepted(true);
        setTimeout(() => setGhostAccepted(false), 300);

        // Move cursor to end
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            const len = accepted.length;
            textareaRef.current.setSelectionRange(len, len);
          }
        });
        return;
      }

      // Slash menu keyboard navigation
      if (showSlashMenu) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSlashMenuIndex((prev) =>
            Math.min(prev + 1, filteredCommands.length - 1),
          );
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSlashMenuIndex((prev) => Math.max(prev - 1, 0));
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          const cmd = filteredCommands[slashMenuIndex];
          if (cmd) executeSlashCommand(cmd);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setShowSlashMenu(false);
          setSlashStartPos(null);
          return;
        }
      }

      // In single-line mode, prevent Enter
      if (mode === "text" && e.key === "Enter") {
        e.preventDefault();
      }
    },
    [
      ghostText,
      showSlashMenu,
      value,
      onValueChange,
      filteredCommands,
      slashMenuIndex,
      executeSlashCommand,
      mode,
    ],
  );

  // ── Dismiss slash menu on outside click ─────────────────────────

  useEffect(() => {
    if (!showSlashMenu) return;

    function handleMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSlashMenu(false);
        setSlashStartPos(null);
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [showSlashMenu]);

  // ── Ghost text visible? ─────────────────────────────────────────

  const showGhost = Boolean(ghostText) && !ghostAccepted && value.length > 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-xl"
      style={{
        background: "rgba(255, 255, 255, 0.03)",
      }}
    >
      {/* Ghost text overlay — mirrors textarea content + faint continuation */}
      {showGhost && (
        <div
          ref={ghostRef}
          className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
          style={{
            ...SHARED_TEXT_STYLE,
            border: "1px solid transparent",
            zIndex: 0,
          }}
          aria-hidden="true"
        >
          {/* User text (invisible, occupies space to align ghost) */}
          <span style={{ visibility: "hidden", whiteSpace: "pre-wrap" }}>
            {value}
          </span>
          {/* Ghost continuation (faint) */}
          <span style={{ color: "rgba(226, 232, 240, 0.25)" }}>
            {ghostText}
          </span>
        </div>
      )}

      {/* Confidence-colored underline overlay */}
      {confidenceRanges && confidenceRanges.length > 0 && value.length > 0 && (
        <div
          className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
          style={{
            ...SHARED_TEXT_STYLE,
            border: "1px solid transparent",
            zIndex: 0,
          }}
          aria-hidden="true"
        >
          {(() => {
            // Build spans: normal text (invisible) + underlined ranges
            const segments: React.ReactNode[] = [];
            let lastEnd = 0;
            // Sort ranges by start position
            const sorted = [...confidenceRanges].sort((a, b) => a.start - b.start);

            for (let i = 0; i < sorted.length; i++) {
              const range = sorted[i];
              const start = Math.max(range.start, lastEnd);
              const end = Math.min(range.end, value.length);
              if (start >= end) continue;

              // Gap before this range (invisible spacer)
              if (start > lastEnd) {
                segments.push(
                  <span key={`gap-${i}`} style={{ visibility: "hidden", whiteSpace: "pre-wrap" }}>
                    {value.substring(lastEnd, start)}
                  </span>
                );
              }

              // Underlined range
              const color = confidenceUnderlineColor(range.confidence);
              segments.push(
                <span
                  key={`ul-${i}`}
                  style={{
                    textDecoration: "underline",
                    textDecorationColor: `${color}80`,
                    textDecorationStyle: "wavy",
                    textDecorationThickness: "2px",
                    textUnderlineOffset: "3px",
                    color: "transparent",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {value.substring(start, end)}
                </span>
              );
              lastEnd = end;
            }

            // Remaining text after last range
            if (lastEnd < value.length) {
              segments.push(
                <span key="tail" style={{ visibility: "hidden", whiteSpace: "pre-wrap" }}>
                  {value.substring(lastEnd)}
                </span>
              );
            }

            return segments;
          })()}
        </div>
      )}

      {/* Actual textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={handleSelect}
        onScroll={handleScroll}
        placeholder={
          placeholder || (mode === "text" ? "Type your answer..." : "Write your response... (type / for commands)")
        }
        className="w-full rounded-xl outline-none transition-all resize-none focus:ring-1"
        style={{
          ...SHARED_TEXT_STYLE,
          background: "transparent",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          color: "#e2e8f0",
          caretColor: "#C4A96A",
          minHeight: mode === "text" ? "44px" : "120px",
          position: "relative",
          zIndex: 1,
        }}
        rows={mode === "text" ? 1 : 4}
        autoFocus={autoFocus}
      />

      {/* Ghost text Tab-to-accept hint */}
      {showGhost && (
        <div
          className="absolute flex items-center gap-1 pointer-events-none"
          style={{
            top: "8px",
            right: "12px",
            zIndex: 2,
          }}
        >
          <kbd
            className="rounded px-1.5 py-0.5"
            style={{
              fontSize: "10px",
              color: "rgba(196, 169, 106, 0.5)",
              background: "rgba(196, 169, 106, 0.06)",
              border: "1px solid rgba(196, 169, 106, 0.12)",
            }}
          >
            Tab
          </kbd>
          <span style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.2)" }}>
            to accept
          </span>
        </div>
      )}

      {/* Ghost accepted flash indicator */}
      {ghostAccepted && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            border: "1px solid rgba(196, 169, 106, 0.3)",
            boxShadow: "0 0 12px rgba(196, 169, 106, 0.1)",
            zIndex: 3,
            transition: "opacity 300ms ease",
          }}
        />
      )}

      {/* Slash command menu */}
      {showSlashMenu && filteredCommands.length > 0 && (
        <SlashCommandMenu
          commands={filteredCommands}
          selectedIndex={slashMenuIndex % filteredCommands.length}
          onSelect={executeSlashCommand}
          position={slashMenuPos}
        />
      )}
    </div>
  );
}
