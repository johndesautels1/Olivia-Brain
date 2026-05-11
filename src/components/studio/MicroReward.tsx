"use client";

/**
 * MicroReward — Gold particle burst celebration for the Preparation Studio.
 *
 * Triggers:
 * - Every field completion: 3-5 small gold particles float upward
 * - Every 5th completion: Larger burst + stat message ("5 in a row!", etc.)
 *
 * Design spec:
 * - Particles: brand gold #C4A96A, 4-8px circles
 * - Animation: float upward with slight horizontal drift, fade out
 * - Duration: ~800ms for small burst, ~1200ms for milestone burst
 * - Milestone message: centered, gold text, fades in/out
 * - Absolutely positioned — overlays the question card without layout shift
 */

import React, { useEffect, useState, useRef } from "react";

interface MicroRewardProps {
  /** Number of completed questions — triggers animation on change */
  completedCount: number;
  /** Whether the reward is currently visible */
  visible: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  drift: number;
  duration: number;
}

// ── Particle generator ────────────────────────────────────────────────

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 40 + Math.random() * 20, // cluster around center (40-60%)
    y: 60 + Math.random() * 20, // start from lower-center area
    size: 4 + Math.random() * 4, // 4-8px
    delay: Math.random() * 200, // stagger up to 200ms
    drift: -15 + Math.random() * 30, // horizontal drift -15 to +15px
    duration: 600 + Math.random() * 400, // 600-1000ms
  }));
}

// ── Milestone messages ────────────────────────────────────────────────

function getMilestoneMessage(count: number): string | null {
  if (count % 25 === 0) return `${count} complete — outstanding`;
  if (count % 10 === 0) return `${count} down — strong progress`;
  if (count % 5 === 0) return `${count} in a row`;
  return null;
}

// ── Main Component ────────────────────────────────────────────────────

export function MicroReward({ completedCount, visible }: MicroRewardProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [milestoneMsg, setMilestoneMsg] = useState<string | null>(null);
  const [showMilestone, setShowMilestone] = useState(false);
  const prevCountRef = useRef(completedCount);
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Trigger particles when completedCount increases
  useEffect(() => {
    if (!visible) return;
    if (completedCount <= prevCountRef.current) {
      prevCountRef.current = completedCount;
      return;
    }

    prevCountRef.current = completedCount;

    // Clear any pending timeouts
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];

    // Determine burst size: milestone = 8 particles, normal = 4
    const isMilestone = completedCount % 5 === 0;
    const count = isMilestone ? 8 : 4;
    const newParticles = generateParticles(count);
    setParticles(newParticles);

    // Show milestone message
    const msg = getMilestoneMessage(completedCount);
    if (msg) {
      setMilestoneMsg(msg);
      setShowMilestone(true);

      const t = setTimeout(() => {
        setShowMilestone(false);
      }, 1800);
      timeoutRefs.current.push(t);
    }

    // Clear particles after animation completes
    const clearT = setTimeout(() => {
      setParticles([]);
    }, 1200);
    timeoutRefs.current.push(clearT);

    // Cleanup
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];
    };
  }, [completedCount, visible]);

  if (particles.length === 0 && !showMilestone) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden z-40"
      aria-hidden="true"
    >
      {/* Inline keyframes */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes studio-particle-rise {
              0% {
                opacity: 1;
                transform: translateY(0) translateX(0) scale(1);
              }
              60% {
                opacity: 0.8;
                transform: translateY(-60px) translateX(var(--drift)) scale(1.1);
              }
              100% {
                opacity: 0;
                transform: translateY(-100px) translateX(var(--drift)) scale(0.6);
              }
            }
            @keyframes studio-milestone-fade {
              0% { opacity: 0; transform: translateY(8px) scale(0.95); }
              20% { opacity: 1; transform: translateY(0) scale(1); }
              80% { opacity: 1; transform: translateY(0) scale(1); }
              100% { opacity: 0; transform: translateY(-6px) scale(0.98); }
            }
          `,
        }}
      />

      {/* Gold particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: "50%",
            background: `radial-gradient(circle, #C4A96A, #a08a50)`,
            boxShadow: "0 0 6px rgba(196, 169, 106, 0.6)",
            animation: `studio-particle-rise ${p.duration}ms ease-out ${p.delay}ms forwards`,
            ["--drift" as string]: `${p.drift}px`,
          }}
        />
      ))}

      {/* Milestone message */}
      {showMilestone && milestoneMsg && (
        <div
          className="absolute inset-x-0 flex items-center justify-center"
          style={{ top: "35%" }}
        >
          <span
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#C4A96A",
              letterSpacing: "0.04em",
              textShadow: "0 0 12px rgba(196, 169, 106, 0.4)",
              animation: "studio-milestone-fade 2000ms ease-out forwards",
            }}
          >
            {milestoneMsg}
          </span>
        </div>
      )}
    </div>
  );
}
