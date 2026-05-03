"use client";

// useDraggable — shared hook for making any panel draggable (desktop + mobile)
// Handles mouse/touch, viewport clamping, localStorage persistence, and resize.

import { useRef, useState, useEffect, useCallback } from "react";

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

interface UseDraggableOptions {
  storageKey: string;
  defaultX?: number;
  defaultY?: number;
  width?: number;
  height?: number;
}

export function useDraggable({
  storageKey,
  defaultX,
  defaultY,
  width = 360,
  height = 400,
}: UseDraggableOptions) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const elRef = useRef<HTMLDivElement>(null);

  const dragState = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
    moved: boolean;
    currentX: number;
    currentY: number;
  }>({
    dragging: false,
    startX: 0,
    startY: 0,
    startPosX: 0,
    startPosY: 0,
    moved: false,
    currentX: 0,
    currentY: 0,
  });

  // Initialize position
  useEffect(() => {
    if (typeof window === "undefined") return;
    let saved: { x: number; y: number } | null = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p.x === "number" && typeof p.y === "number") saved = p;
      }
    } catch { /* ignore */ }

    if (saved) {
      setPos({
        x: clamp(saved.x, 0, window.innerWidth - width),
        y: clamp(saved.y, 0, window.innerHeight - Math.min(height, window.innerHeight - 20)),
      });
    } else {
      // Center on mobile, use defaults on desktop
      const isMobile = window.innerWidth < 640;
      const x = defaultX ?? (isMobile ? Math.max(8, (window.innerWidth - width) / 2) : window.innerWidth - width - 24);
      const y = defaultY ?? (isMobile ? 60 : 100);
      setPos({
        x: clamp(x, 0, window.innerWidth - width),
        y: clamp(y, 0, window.innerHeight - 100),
      });
    }
  }, [storageKey, defaultX, defaultY, width, height]);

  // Stay in viewport on resize
  useEffect(() => {
    function handleResize() {
      setPos((prev) => {
        if (!prev) return prev;
        return {
          x: clamp(prev.x, 0, window.innerWidth - Math.min(width, window.innerWidth - 16)),
          y: clamp(prev.y, 0, window.innerHeight - 60),
        };
      });
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [width]);

  // ── Drag handlers (direct DOM for INP) ──
  const handleMove = useCallback((clientX: number, clientY: number) => {
    const d = dragState.current;
    if (!d.dragging) return;
    const dx = clientX - d.startX;
    const dy = clientY - d.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.moved = true;
    const newX = clamp(d.startPosX + dx, 0, window.innerWidth - Math.min(width, window.innerWidth - 16));
    const newY = clamp(d.startPosY + dy, 0, window.innerHeight - 60);
    d.currentX = newX;
    d.currentY = newY;
    if (elRef.current) {
      elRef.current.style.left = `${newX}px`;
      elRef.current.style.top = `${newY}px`;
    }
  }, [width]);

  const handleEnd = useCallback(() => {
    const d = dragState.current;
    if (!d.dragging) return;
    d.dragging = false;
    document.body.style.userSelect = "";
    const finalPos = { x: d.currentX, y: d.currentY };
    setPos(finalPos);
    try {
      localStorage.setItem(storageKey, JSON.stringify(finalPos));
    } catch { /* ignore */ }
  }, [storageKey]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const d = dragState.current;
    d.dragging = true;
    d.moved = false;
    d.startX = e.clientX;
    d.startY = e.clientY;
    d.startPosX = pos?.x ?? 0;
    d.startPosY = pos?.y ?? 0;
    d.currentX = pos?.x ?? 0;
    d.currentY = pos?.y ?? 0;
    document.body.style.userSelect = "none";
    e.preventDefault();
  }, [pos]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const d = dragState.current;
    d.dragging = true;
    d.moved = false;
    d.startX = touch.clientX;
    d.startY = touch.clientY;
    d.startPosX = pos?.x ?? 0;
    d.startPosY = pos?.y ?? 0;
    d.currentX = pos?.x ?? 0;
    d.currentY = pos?.y ?? 0;
  }, [pos]);

  // Global listeners
  useEffect(() => {
    const onMM = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMU = () => handleEnd();
    window.addEventListener("mousemove", onMM);
    window.addEventListener("mouseup", onMU);
    return () => {
      window.removeEventListener("mousemove", onMM);
      window.removeEventListener("mouseup", onMU);
    };
  }, [handleMove, handleEnd]);

  useEffect(() => {
    const onTM = (e: TouchEvent) => {
      if (!dragState.current.dragging) return;
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
      if (dragState.current.moved) e.preventDefault();
    };
    const onTE = () => handleEnd();
    window.addEventListener("touchmove", onTM, { passive: false });
    window.addEventListener("touchend", onTE);
    return () => {
      window.removeEventListener("touchmove", onTM);
      window.removeEventListener("touchend", onTE);
    };
  }, [handleMove, handleEnd]);

  return {
    pos,
    elRef,
    onMouseDown,
    onTouchStart,
    wasDragged: () => dragState.current.moved,
  };
}
