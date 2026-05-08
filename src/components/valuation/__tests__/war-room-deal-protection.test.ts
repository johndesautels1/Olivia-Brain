/**
 * Track P Session P6 — WarRoomDealProtection module-import smoke.
 *
 * Mirrors the `workbench.test.ts` pattern — verifies the new component
 * imports cleanly. Render-level assertions land manually against the
 * mounted briefing.
 */
import { describe, expect, it } from 'vitest';

describe('WarRoomDealProtection — module import smoke', () => {
  it('imports without error', async () => {
    const mod = await import('@/components/valuation/WarRoomDealProtection');
    expect(mod).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});
