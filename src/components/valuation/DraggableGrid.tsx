'use client';

import { useState, useCallback, useEffect, type ReactNode } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ── Types ─────────────────────────────────────────────────────────────

export interface GridItem {
  id: string;
  /** Column span: 1 = half width, 2 = full width */
  colSpan: 1 | 2;
  /** When true, the panel is hidden from view but preserved in layout */
  hidden?: boolean;
}

export interface GridLayout {
  name: string;
  items: GridItem[];
}

interface SortableCardProps {
  id: string;
  colSpan: 1 | 2;
  hidden?: boolean;
  children: ReactNode;
  isEditing: boolean;
  onResize?: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
}

// ── localStorage helpers (keyed per tab) ─────────────────────────────

const DEFAULT_STORAGE_KEY = 'ltm-valuation-grid-layouts';

function loadLayouts(key: string): GridLayout[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as GridLayout[]) : [];
  } catch {
    return [];
  }
}

function saveLayouts(key: string, layouts: GridLayout[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(layouts));
  } catch {
    // Storage full — silently fail
  }
}

function loadActiveLayoutName(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key + '-active');
  } catch {
    return null;
  }
}

function saveActiveLayoutName(key: string, name: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (name) {
      localStorage.setItem(key + '-active', name);
    } else {
      localStorage.removeItem(key + '-active');
    }
  } catch {
    // silently fail
  }
}

// ── Sortable Card wrapper ─────────────────────────────────────────────

function SortableCard({ id, colSpan, hidden, children, isEditing, onResize, onToggleVisibility }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditing });

  // When hidden and not editing, don't render at all
  if (hidden && !isEditing) return null;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : hidden ? 0.35 : 1,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} className={colSpan === 2 ? 'col-span-1 md:col-span-2' : 'col-span-1'} {...attributes} data-panel-id={id}>
      {/* Drag handle + visibility + resize toggle — only in edit mode */}
      {isEditing && (
        <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-0.5 rounded-md p-0.5" style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Visibility toggle */}
          <button
            onClick={() => onToggleVisibility?.(id)}
            className={`p-2 rounded transition-colors ${
              hidden
                ? 'bg-white/[0.04] text-text-secondary hover:text-text-primary'
                : 'bg-white/[0.08] hover:bg-white/[0.14] text-text-secondary hover:text-text-primary'
            }`}
            title={hidden ? 'Show panel' : 'Hide panel'}
            aria-label={hidden ? 'Show panel' : 'Hide panel'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {hidden ? (
                // eye-off icon
                <>
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </>
              ) : (
                // eye icon
                <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </button>
          {/* Resize toggle */}
          <button
            onClick={() => onResize?.(id)}
            className="p-2 rounded bg-white/[0.08] hover:bg-white/[0.14] text-text-secondary hover:text-text-primary transition-colors"
            title={colSpan === 1 ? 'Expand to full width' : 'Shrink to half width'}
            aria-label={colSpan === 1 ? 'Expand to full width' : 'Shrink to half width'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {colSpan === 1 ? (
                <>
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </>
              ) : (
                <>
                  <polyline points="4 14 10 14 10 20" />
                  <polyline points="20 10 14 10 14 4" />
                  <line x1="14" y1="10" x2="21" y2="3" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </>
              )}
            </svg>
          </button>
          {/* Drag handle — WCAG-9: keyboard reorder via arrow keys */}
          <button
            {...listeners}
            className="p-2 rounded bg-white/[0.08] hover:bg-white/[0.14] text-text-secondary hover:text-text-primary transition-colors cursor-grab active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-[#C4A96A] focus-visible:outline-none"
            title="Drag to reorder (or press Space then arrow keys)"
            aria-label={`Reorder panel. Press Space to pick up, arrow keys to move, Space to drop.`}
            aria-roledescription="sortable"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="5" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="9" cy="19" r="1" />
              <circle cx="15" cy="5" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="19" r="1" />
            </svg>
          </button>
        </div>
      )}
      {/* Hidden overlay label in edit mode */}
      {isEditing && hidden && (
        <div className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none">
          <span className="text-[11px] font-medium tracking-wider uppercase text-text-secondary bg-black/40 px-3 py-1 rounded">
            Hidden
          </span>
        </div>
      )}
      {children}
    </div>
  );
}

// ── Main DraggableGrid ────────────────────────────────────────────────

interface DraggableGridProps {
  /** Default item order and sizing. Keys must match children keys. */
  defaultItems: GridItem[];
  /** Keyed children — key MUST match item.id */
  children: Record<string, ReactNode>;
  /** When provided, editing state is controlled externally (button rendered by parent) */
  isEditingExternal?: boolean;
  onToggleEditingExternal?: () => void;
  /** Unique localStorage key for this tab's layouts. Defaults to overview key. */
  storageKey?: string;
  /** Called when the visible (non-hidden) items change — used for scroll spy ribbon */
  onVisibleItemsChange?: (visibleIds: string[]) => void;
}

export default function DraggableGrid({ defaultItems, children, isEditingExternal, onToggleEditingExternal, storageKey, onVisibleItemsChange }: DraggableGridProps) {
  const sKey = storageKey ?? DEFAULT_STORAGE_KEY;
  const [items, setItems] = useState<GridItem[]>(defaultItems);
  const [isEditingInternal, setIsEditingInternal] = useState(false);
  const isEditing = isEditingExternal !== undefined ? isEditingExternal : isEditingInternal;
  const setIsEditing = onToggleEditingExternal
    ? () => onToggleEditingExternal()
    : (v: boolean | ((prev: boolean) => boolean)) => setIsEditingInternal(v);
  const [savedLayouts, setSavedLayouts] = useState<GridLayout[]>([]);
  const [activeLayoutName, setActiveLayoutName] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState('');

  // Load saved layouts on mount
  useEffect(() => {
    const layouts = loadLayouts(sKey);
    setSavedLayouts(layouts);
    const activeName = loadActiveLayoutName(sKey);
    if (activeName) {
      const found = layouts.find((l) => l.name === activeName);
      if (found) {
        // Merge saved layout with defaults: keep saved order/sizes, add any new items
        const merged = mergeWithDefaults(found.items, defaultItems);
        setItems(merged);
        setActiveLayoutName(activeName);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Merge saved items with defaults — preserves saved order/size, appends new items at end
  function mergeWithDefaults(saved: GridItem[], defaults: GridItem[]): GridItem[] {
    const result: GridItem[] = [];
    const seen = new Set<string>();
    for (const s of saved) {
      // Only keep items that still exist in defaults
      if (defaults.some((d) => d.id === s.id)) {
        result.push(s);
        seen.add(s.id);
      }
    }
    // Append any new items from defaults
    for (const d of defaults) {
      if (!seen.has(d.id)) {
        result.push(d);
      }
    }
    return result;
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((i) => i.id === active.id);
        const newIndex = prev.findIndex((i) => i.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, []);

  const handleResize = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, colSpan: item.colSpan === 1 ? 2 : 1 } : item,
      ),
    );
  }, []);

  const handleToggleVisibility = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, hidden: !item.hidden } : item,
      ),
    );
  }, []);

  // Notify parent of visible items for scroll spy ribbon
  useEffect(() => {
    onVisibleItemsChange?.(items.filter((i) => !i.hidden).map((i) => i.id));
  }, [items, onVisibleItemsChange]);

  const handleSaveLayout = useCallback(() => {
    const trimmed = newLayoutName.trim();
    if (!trimmed) return;
    const layout: GridLayout = { name: trimmed, items: [...items] };
    const updated = [...savedLayouts.filter((l) => l.name !== trimmed), layout];
    setSavedLayouts(updated);
    saveLayouts(sKey, updated);
    setActiveLayoutName(trimmed);
    saveActiveLayoutName(sKey, trimmed);
    setSaveDialogOpen(false);
    setNewLayoutName('');
  }, [newLayoutName, items, savedLayouts, sKey]);

  const handleLoadLayout = useCallback((name: string) => {
    const layout = savedLayouts.find((l) => l.name === name);
    if (!layout) return;
    const merged = mergeWithDefaults(layout.items, defaultItems);
    setItems(merged);
    setActiveLayoutName(name);
    saveActiveLayoutName(sKey, name);
  }, [savedLayouts, defaultItems, sKey]);

  const handleDeleteLayout = useCallback((name: string) => {
    const updated = savedLayouts.filter((l) => l.name !== name);
    setSavedLayouts(updated);
    saveLayouts(sKey, updated);
    if (activeLayoutName === name) {
      setActiveLayoutName(null);
      saveActiveLayoutName(sKey, null);
    }
  }, [savedLayouts, activeLayoutName, sKey]);

  const handleResetLayout = useCallback(() => {
    setItems([...defaultItems]);
    setActiveLayoutName(null);
    saveActiveLayoutName(sKey, null);
  }, [defaultItems, sKey]);

  return (
    <div>
      {/* Toolbar — hidden when externally controlled and not editing */}
      {(isEditing || !isEditingExternal) && (
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {/* Only show the toggle button when NOT externally controlled */}
          {isEditingExternal === undefined && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium transition-colors ${
                isEditing
                  ? 'bg-[var(--color-aurum-primary)]/15 text-[var(--color-aurum-primary)] border border-[var(--color-aurum-primary)]/25'
                  : 'bg-white/[0.04] text-text-secondary hover:text-text-primary border border-white/[0.06] hover:bg-white/[0.08]'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
              </svg>
              {isEditing ? 'Done Editing' : 'Edit Layout'}
            </button>
          )}

          {isEditing && (
            <>
              <button
                onClick={() => setSaveDialogOpen(true)}
                className="px-3 py-1.5 rounded text-[11px] font-medium bg-white/[0.04] text-text-secondary hover:text-text-primary border border-white/[0.06] hover:bg-white/[0.08] transition-colors"
              >
                Save Layout
              </button>
              <button
                onClick={handleResetLayout}
                className="px-3 py-1.5 rounded text-[11px] font-medium bg-white/[0.04] text-text-secondary hover:text-text-primary border border-white/[0.06] hover:bg-white/[0.08] transition-colors"
              >
                Reset
              </button>
            </>
          )}
        </div>

        {/* Saved layouts dropdown */}
        {savedLayouts.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-text-secondary uppercase tracking-wider">Layout:</span>
            {savedLayouts.map((layout) => (
              <span key={layout.name} className="inline-flex items-center gap-0.5">
                <button
                  onClick={() => handleLoadLayout(layout.name)}
                  className={`px-2 py-1 rounded text-[11px] transition-colors ${
                    activeLayoutName === layout.name
                      ? 'bg-[var(--color-aurum-primary)]/15 text-[var(--color-aurum-primary)] border border-[var(--color-aurum-primary)]/25'
                      : 'bg-white/[0.04] text-text-secondary hover:text-text-primary border border-white/[0.06]'
                  }`}
                >
                  {layout.name}
                </button>
                {isEditing && (
                  <button
                    onClick={() => handleDeleteLayout(layout.name)}
                    className="p-0.5 rounded text-text-secondary hover:text-[var(--color-coral-downside)] transition-colors"
                    title={`Delete "${layout.name}" layout`}
                    aria-label={`Delete "${layout.name}" layout`}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Save layout dialog */}
      {saveDialogOpen && (
        <div className="mb-3 flex items-center gap-2 p-3 rounded-lg border border-white/[0.08] bg-white/[0.02]">
          <input
            type="text"
            value={newLayoutName}
            onChange={(e) => setNewLayoutName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveLayout(); if (e.key === 'Escape') setSaveDialogOpen(false); }}
            placeholder="Layout name..."
            className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded px-3 py-1.5 text-[11px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-[var(--color-aurum-primary)]"
            autoFocus
          />
          <button
            onClick={handleSaveLayout}
            disabled={!newLayoutName.trim()}
            className="px-3 py-1.5 rounded text-[11px] font-medium bg-[var(--color-aurum-primary)]/15 text-[var(--color-aurum-primary)] border border-[var(--color-aurum-primary)]/25 disabled:opacity-40 transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => { setSaveDialogOpen(false); setNewLayoutName(''); }}
            className="px-3 py-1.5 rounded text-[11px] font-medium bg-white/[0.04] text-text-secondary border border-white/[0.06] transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6"
          >
            {items.map((item) => (
              <SortableCard
                key={item.id}
                id={item.id}
                colSpan={item.colSpan}
                hidden={item.hidden}
                isEditing={isEditing}
                onResize={handleResize}
                onToggleVisibility={handleToggleVisibility}
              >
                {children[item.id] ?? null}
              </SortableCard>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
