// ═══════════════════════════════════════════════════════════════════════
// VALUATION CLOCK — Confidence Decay Tests
// Verifies linear decay formula, sector calibration, reset triggers,
// and edge cases.
// ═══════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  computeValuationClock,
  linearDecay,
  sectorDecayRate,
} from '../valuation-clock';

// ── Helpers ─────────────────────────────────────────────────────────

function daysAgo(days: number): string {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

// ═══════════════════════════════════════════════════════════════════════
// LINEAR DECAY FORMULA
// ═══════════════════════════════════════════════════════════════════════

describe('linearDecay', () => {
  it('should return 1.0 at day 0', () => {
    expect(linearDecay(0)).toBe(1.0);
  });

  it('should return 0.7 at day 90 (baseline sector)', () => {
    expect(linearDecay(90)).toBeCloseTo(0.7, 5);
  });

  it('should return 0.4 at day 180 (baseline sector)', () => {
    expect(linearDecay(180)).toBeCloseTo(0.4, 5);
  });

  it('should return 0 at day 300', () => {
    expect(linearDecay(300)).toBe(0);
  });

  it('should clamp to 0 beyond day 300', () => {
    expect(linearDecay(500)).toBe(0);
  });

  it('should never go negative', () => {
    expect(linearDecay(1000)).toBe(0);
  });

  it('should return ~0.85 at day 45', () => {
    // 1.0 - 45/300 = 0.85
    expect(linearDecay(45)).toBeCloseTo(0.85, 5);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTOR DECAY RATES
// ═══════════════════════════════════════════════════════════════════════

describe('sectorDecayRate', () => {
  it('should return 1.0 for SaaS', () => {
    expect(sectorDecayRate('SaaS')).toBe(1.0);
  });

  it('should return 1.0 for FinTech', () => {
    expect(sectorDecayRate('FinTech')).toBe(1.0);
  });

  it('should return 1.5 for AI sectors', () => {
    expect(sectorDecayRate('AI')).toBe(1.5);
    expect(sectorDecayRate('Artificial Intelligence')).toBe(1.5);
    expect(sectorDecayRate('ai')).toBe(1.5);
  });

  it('should return 1.5 for DeepTech', () => {
    expect(sectorDecayRate('DeepTech')).toBe(1.5);
    expect(sectorDecayRate('deep tech')).toBe(1.5);
  });

  it('should return 1.5 for Crypto/Blockchain/Web3', () => {
    expect(sectorDecayRate('Crypto')).toBe(1.5);
    expect(sectorDecayRate('Blockchain')).toBe(1.5);
    expect(sectorDecayRate('Web3')).toBe(1.5);
  });

  it('should return 1.5 for Quantum Computing', () => {
    expect(sectorDecayRate('Quantum Computing')).toBe(1.5);
  });

  it('should return 1.0 for undefined sector', () => {
    expect(sectorDecayRate(undefined)).toBe(1.0);
  });

  it('should return 1.0 for empty string', () => {
    expect(sectorDecayRate('')).toBe(1.0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTOR-CALIBRATED DECAY
// ═══════════════════════════════════════════════════════════════════════

describe('linearDecay with sector multiplier', () => {
  it('AI sector at 60 days = baseline at 90 days (1.5x)', () => {
    // AI: effectiveDays = 60 * 1.5 = 90 → decay = 0.7
    expect(linearDecay(60, 1.5)).toBeCloseTo(0.7, 5);
  });

  it('AI sector at 120 days = baseline at 180 days (1.5x)', () => {
    // AI: effectiveDays = 120 * 1.5 = 180 → decay = 0.4
    expect(linearDecay(120, 1.5)).toBeCloseTo(0.4, 5);
  });

  it('AI sector hits zero at day 200 instead of 300', () => {
    // AI: effectiveDays = 200 * 1.5 = 300 → decay = 0
    expect(linearDecay(200, 1.5)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// FULL CLOCK COMPUTATION
// ═══════════════════════════════════════════════════════════════════════

describe('computeValuationClock', () => {
  it('should return red/pulsing for no completedAt', () => {
    const result = computeValuationClock({
      baseConfidence: 0.8,
      completedAt: null,
    });
    expect(result.state).toBe('red');
    expect(result.pulsing).toBe(true);
    expect(result.displayPct).toBe(0);
    expect(result.label).toBe('No valuation run');
  });

  it('should show fresh state for recent valuation (0 days)', () => {
    const result = computeValuationClock({
      baseConfidence: 0.85,
      completedAt: new Date().toISOString(),
    });
    expect(result.state).toBe('fresh');
    expect(result.pulsing).toBe(false);
    expect(result.displayPct).toBe(85);
    expect(result.daysSinceAnchor).toBe(0);
  });

  it('should show amber state at 91+ days', () => {
    const result = computeValuationClock({
      baseConfidence: 0.85,
      completedAt: daysAgo(100),
    });
    expect(result.state).toBe('amber');
    expect(result.pulsing).toBe(false);
    // decay at 100 days: 1 - 100/300 = 0.6667
    // displayPct = round(0.85 * 0.6667 * 100) = 57
    expect(result.displayPct).toBe(57);
  });

  it('should show red/pulsing state at 181+ days', () => {
    const result = computeValuationClock({
      baseConfidence: 0.85,
      completedAt: daysAgo(200),
    });
    expect(result.state).toBe('red');
    expect(result.pulsing).toBe(true);
  });

  it('should clamp baseConfidence to 0-1 range', () => {
    const result = computeValuationClock({
      baseConfidence: 1.5,
      completedAt: new Date().toISOString(),
    });
    expect(result.displayPct).toBe(100);
  });

  it('should handle negative baseConfidence', () => {
    const result = computeValuationClock({
      baseConfidence: -0.5,
      completedAt: new Date().toISOString(),
    });
    expect(result.displayPct).toBe(0);
  });

  it('should decay AI sector 1.5x faster', () => {
    // At 60 actual days, AI effective = 90 days → amber
    const ai = computeValuationClock({
      baseConfidence: 0.85,
      completedAt: daysAgo(61),
      sector: 'AI',
    });
    expect(ai.state).toBe('amber');

    // Same days, SaaS sector → still fresh
    const saas = computeValuationClock({
      baseConfidence: 0.85,
      completedAt: daysAgo(61),
      sector: 'SaaS',
    });
    expect(saas.state).toBe('fresh');
  });

  it('should show correct label for 1 day ago', () => {
    const result = computeValuationClock({
      baseConfidence: 0.85,
      completedAt: daysAgo(1),
    });
    expect(result.label).toBe('1 day ago');
  });

  it('should show correct label for plural days', () => {
    const result = computeValuationClock({
      baseConfidence: 0.85,
      completedAt: daysAgo(45),
    });
    expect(result.label).toBe('45 days ago');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// VERIFIED EVENT RESET
// ═══════════════════════════════════════════════════════════════════════

describe('Verified event reset', () => {
  it('should use lastVerifiedEventAt when more recent than completedAt', () => {
    // Valuation run was 100 days ago
    const completedAt = daysAgo(100);
    // But a funding round was verified 10 days ago
    const lastVerifiedEventAt = daysAgo(10);

    const result = computeValuationClock({
      baseConfidence: 0.85,
      completedAt,
      lastVerifiedEventAt,
    });

    // Should anchor from 10 days ago, not 100
    expect(result.daysSinceAnchor).toBe(10);
    expect(result.state).toBe('fresh');
  });

  it('should ignore lastVerifiedEventAt when older than completedAt', () => {
    // Valuation run was 10 days ago
    const completedAt = daysAgo(10);
    // Event was 200 days ago (before the valuation)
    const lastVerifiedEventAt = daysAgo(200);

    const result = computeValuationClock({
      baseConfidence: 0.85,
      completedAt,
      lastVerifiedEventAt,
    });

    expect(result.daysSinceAnchor).toBe(10);
    expect(result.state).toBe('fresh');
  });

  it('should handle null lastVerifiedEventAt', () => {
    const result = computeValuationClock({
      baseConfidence: 0.85,
      completedAt: daysAgo(100),
      lastVerifiedEventAt: null,
    });

    expect(result.daysSinceAnchor).toBe(100);
    expect(result.state).toBe('amber');
  });

  it('a document upload should reset decay from red to fresh', () => {
    // Valuation 200 days ago → would be red
    const completedAt = daysAgo(200);
    // Doc uploaded 5 days ago → fresh
    const lastVerifiedEventAt = daysAgo(5);

    const withoutEvent = computeValuationClock({
      baseConfidence: 0.85,
      completedAt,
    });
    const withEvent = computeValuationClock({
      baseConfidence: 0.85,
      completedAt,
      lastVerifiedEventAt,
    });

    expect(withoutEvent.state).toBe('red');
    expect(withEvent.state).toBe('fresh');
    expect(withEvent.displayPct).toBeGreaterThan(withoutEvent.displayPct);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// BOUNDARY / EDGE CASES
// ═══════════════════════════════════════════════════════════════════════

describe('Clock edge cases', () => {
  it('should handle exactly 90 days (boundary between fresh and amber)', () => {
    const result = computeValuationClock({
      baseConfidence: 1.0,
      completedAt: daysAgo(90),
    });
    // 90 effective days is still fresh (> 90 triggers amber)
    expect(result.state).toBe('fresh');
    expect(result.displayPct).toBe(70);
  });

  it('should handle exactly 180 days (boundary between amber and red)', () => {
    const result = computeValuationClock({
      baseConfidence: 1.0,
      completedAt: daysAgo(180),
    });
    expect(result.state).toBe('amber');
    expect(result.displayPct).toBe(40);
  });

  it('should handle 0 confidence gracefully', () => {
    const result = computeValuationClock({
      baseConfidence: 0,
      completedAt: new Date().toISOString(),
    });
    expect(result.displayPct).toBe(0);
    expect(result.state).toBe('fresh');
  });

  it('should handle very old valuations (>300 days)', () => {
    const result = computeValuationClock({
      baseConfidence: 1.0,
      completedAt: daysAgo(350),
    });
    expect(result.displayPct).toBe(0);
    expect(result.state).toBe('red');
    expect(result.pulsing).toBe(true);
  });
});
