'use client';

import { useState, useEffect, useCallback } from 'react';
import { Command } from 'cmdk';
import type { BuyerType } from '@/lib/valuation/types';

// ── Tab definitions (mirrors ValuationWorkbench TABS) ────────────────

type TabId = 'thesis' | 'risk' | 'comps' | 'stochastic' | 'dealroom' | 'deliverables';

const TAB_OPTIONS: { id: TabId; label: string; shortcut: string }[] = [
  { id: 'thesis', label: 'Thesis', shortcut: '1' },
  { id: 'risk', label: 'Risk Lab', shortcut: '2' },
  { id: 'comps', label: 'Comps & Evidence', shortcut: '3' },
  { id: 'stochastic', label: 'Stochastic Lab', shortcut: '4' },
  { id: 'dealroom', label: 'Deal Room', shortcut: '5' },
  { id: 'deliverables', label: 'Deliverables', shortcut: '6' },
];

const BUYER_TYPE_OPTIONS: { value: BuyerType; label: string }[] = [
  { value: 'angel', label: 'Angel' },
  { value: 'vc', label: 'Venture Capital' },
  { value: 'private_equity', label: 'Private Equity' },
  { value: 'strategic_partner', label: 'Strategic Partner' },
  { value: 'acquirer', label: 'Acquirer' },
];

const SHORTCUTS: { keys: string; description: string }[] = [
  { keys: '⌘K / Ctrl+K', description: 'Open command palette' },
  { keys: '/', description: 'Open command palette' },
  { keys: 'R', description: 'Run valuation engine' },
  { keys: 'E', description: 'Go to Exports tab' },
  { keys: '1–9', description: 'Switch to tab by number' },
  { keys: '?', description: 'Show keyboard shortcuts' },
  { keys: 'Esc', description: 'Close' },
];

// ── Shared classNames ────────────────────────────────────────────────

const baseItem =
  'flex items-center justify-between px-3 py-2 text-sm rounded-md cursor-pointer transition-colors aria-selected:bg-white/[0.06] data-[disabled]:opacity-40 data-[disabled]:cursor-default';

const kbd =
  'text-[11px] font-mono px-1.5 py-0.5 rounded border border-white/[0.1] bg-white/[0.04] text-[var(--muted)]';

// ── Component ────────────────────────────────────────────────────────

interface CommandPaletteProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onRunValuation: () => void;
  onBuyerTypeChange: (bt: BuyerType) => void;
  isRunning: boolean;
}

export default function CommandPalette({
  activeTab,
  onTabChange,
  onRunValuation,
  onBuyerTypeChange,
  isRunning,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Check whether an interactive form element has focus
  const isInputFocused = useCallback(() => {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    if ((el as HTMLElement).isContentEditable) return true;
    return false;
  }, []);

  // ── Global keyboard shortcut handler ───────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+K / Ctrl+K — always toggles the palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }

      // Escape closes whichever modal is open
      if (e.key === 'Escape') {
        if (showShortcuts) {
          e.preventDefault();
          setShowShortcuts(false);
          return;
        }
        if (open) {
          e.preventDefault();
          setOpen(false);
          return;
        }
        return;
      }

      // Remaining shortcuts only fire when not typing and no modal is open
      if (isInputFocused() || open || showShortcuts) return;

      switch (e.key) {
        case '/':
          e.preventDefault();
          setOpen(true);
          break;
        case '?':
          e.preventDefault();
          setShowShortcuts(true);
          break;
        case 'r':
        case 'R':
          if (!e.metaKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            if (!isRunning) onRunValuation();
          }
          break;
        case 'e':
        case 'E':
          if (!e.metaKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            onTabChange('deliverables');
          }
          break;
        default: {
          if (!e.metaKey && !e.ctrlKey && !e.altKey) {
            const n = parseInt(e.key, 10);
            if (n >= 1 && n <= 9 && TAB_OPTIONS[n - 1]) {
              e.preventDefault();
              onTabChange(TAB_OPTIONS[n - 1].id);
            }
          }
          break;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, showShortcuts, isInputFocused, isRunning, onRunValuation, onTabChange]);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <>
      {/* Scoped cmdk group-heading style */}
      <style>{`
        .cmdk-palette [cmdk-group-heading] {
          padding: 6px 12px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--muted);
          user-select: none;
        }
      `}</style>

      {/* ── Command Palette ── */}
      {open && (
        <div className="fixed inset-0 z-[100]">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg px-4 pointer-events-none">
            <div
              className="cmdk-palette rounded-xl overflow-hidden shadow-2xl pointer-events-auto"
              style={{
                background: 'var(--color-graphite, #1B2333)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <Command label="Command palette">
                <Command.Input
                  placeholder="Type a command or search…"
                  className="w-full px-4 py-3 text-sm bg-transparent text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
                />
                <Command.List className="max-h-72 overflow-y-auto p-2">
                  <Command.Empty className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                    No results found.
                  </Command.Empty>

                  {/* Navigate */}
                  <Command.Group heading="Navigate">
                    {TAB_OPTIONS.map((tab) => (
                      <Command.Item
                        key={tab.id}
                        value={`navigate ${tab.label}`}
                        onSelect={() => {
                          onTabChange(tab.id);
                          setOpen(false);
                        }}
                        className={`${baseItem} ${
                          activeTab === tab.id
                            ? 'text-[var(--color-aurum-primary)]'
                            : 'text-[var(--foreground)]'
                        }`}
                      >
                        <span>{tab.label}</span>
                        <kbd className={kbd}>{tab.shortcut}</kbd>
                      </Command.Item>
                    ))}
                  </Command.Group>

                  <Command.Separator className="my-1 h-px bg-white/[0.06]" />

                  {/* Actions */}
                  <Command.Group heading="Actions">
                    <Command.Item
                      value="run valuation engine"
                      onSelect={() => {
                        if (!isRunning) onRunValuation();
                        setOpen(false);
                      }}
                      disabled={isRunning}
                      className={`${baseItem} text-[var(--foreground)]`}
                    >
                      <span className="flex items-center gap-2">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                        </svg>
                        {isRunning ? 'Running…' : 'Run Valuation'}
                      </span>
                      <kbd className={kbd}>R</kbd>
                    </Command.Item>

                    <Command.Item
                      value="export documents reports"
                      onSelect={() => {
                        onTabChange('deliverables');
                        setOpen(false);
                      }}
                      className={`${baseItem} text-[var(--foreground)]`}
                    >
                      <span className="flex items-center gap-2">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12M8 8l4-4 4 4" />
                        </svg>
                        Export
                      </span>
                      <kbd className={kbd}>E</kbd>
                    </Command.Item>

                    <Command.Item
                      value="keyboard shortcuts help"
                      onSelect={() => {
                        setShowShortcuts(true);
                        setOpen(false);
                      }}
                      className={`${baseItem} text-[var(--foreground)]`}
                    >
                      <span className="flex items-center gap-2">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <rect x="2" y="6" width="20" height="12" rx="2" />
                          <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
                        </svg>
                        Keyboard Shortcuts
                      </span>
                      <kbd className={kbd}>?</kbd>
                    </Command.Item>
                  </Command.Group>

                  <Command.Separator className="my-1 h-px bg-white/[0.06]" />

                  {/* Buyer Type */}
                  <Command.Group heading="Buyer Type">
                    {BUYER_TYPE_OPTIONS.map((bt) => (
                      <Command.Item
                        key={bt.value}
                        value={`buyer type ${bt.label}`}
                        onSelect={() => {
                          onBuyerTypeChange(bt.value);
                          setOpen(false);
                        }}
                        className={`${baseItem} text-[var(--foreground)]`}
                      >
                        <span>{bt.label}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                </Command.List>

                {/* Footer hint bar */}
                <div
                  className="flex items-center gap-4 px-4 py-2 text-[11px] text-[var(--muted)] select-none"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <span>↑↓ navigate</span>
                  <span>↵ select</span>
                  <span>esc close</span>
                </div>
              </Command>
            </div>
          </div>
        </div>
      )}

      {/* ── Keyboard Shortcuts Modal ── */}
      {showShortcuts && (
        <div className="fixed inset-0 z-[101]">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowShortcuts(false)}
          />
          <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-sm px-4 pointer-events-none">
            <div
              className="rounded-xl overflow-hidden shadow-2xl p-6 pointer-events-auto"
              style={{
                background: 'var(--color-graphite, #1B2333)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <h2 className="text-sm font-semibold text-[var(--foreground)] mb-4">
                Keyboard Shortcuts
              </h2>
              <div className="space-y-2">
                {SHORTCUTS.map((s) => (
                  <div
                    key={s.keys}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-xs text-[var(--muted)]">
                      {s.description}
                    </span>
                    <kbd className={kbd}>{s.keys}</kbd>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowShortcuts(false)}
                className="mt-4 w-full rounded-lg py-2 text-xs font-medium transition-colors text-[var(--foreground)] hover:bg-white/[0.08]"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
