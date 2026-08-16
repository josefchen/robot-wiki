import { describe, expect, it } from 'vitest';
import { getCitation } from '@/data/citations';
import {
  EEF_SPACE_DIMS,
  EMBODIMENTS,
  EMBODIMENT_ORDER,
  LATENT_DIMS,
  SHARED_WIDTH,
  STRATEGIES,
  STRATEGY_ORDER,
  embodimentById,
  rowSummary,
  slotRow,
  type EmbodimentId,
  type StrategyId,
} from '@/lib/cross-embodiment';

const ALL_EMBODIMENTS: EmbodimentId[] = [...EMBODIMENT_ORDER];
const ROBOTS: EmbodimentId[] = ['arm', 'bimanual', 'humanoid'];

describe('slotRow', () => {
  it('always returns a full-width row of slots', () => {
    for (const strategy of STRATEGY_ORDER) {
      for (const embodiment of ALL_EMBODIMENTS) {
        const slots = slotRow(strategy, embodiment);
        expect(slots).toHaveLength(SHARED_WIDTH);
        expect(slots[0].index).toBe(0);
        expect(slots.at(-1)?.index).toBe(SHARED_WIDTH - 1);
      }
    }
  });

  it('padded mode zero-pads every robot to the shared width', () => {
    for (const robot of ROBOTS) {
      const slots = slotRow('padded', robot);
      const active = slots.filter((s) => s.state === 'active').length;
      const zeroed = slots.filter((s) => s.state === 'zeroed').length;
      expect(active).toBe(embodimentById(robot).nativeDims);
      expect(zeroed).toBe(SHARED_WIDTH - embodimentById(robot).nativeDims);
      // Active dims lead; the zero padding is the tail.
      expect(slots.slice(0, active).every((s) => s.state === 'active')).toBe(
        true,
      );
      expect(slots.slice(active).every((s) => s.state === 'zeroed')).toBe(true);
    }
  });

  it('padded mode leaves the human hand with no usable slot', () => {
    const slots = slotRow('padded', 'human-hand');
    expect(slots.every((s) => s.state === 'blocked')).toBe(true);
  });

  it('motion-transfer mode routes every robot through the shared latent', () => {
    for (const robot of ROBOTS) {
      const slots = slotRow('motion-transfer', robot);
      const latent = slots.filter((s) => s.state === 'latent').length;
      expect(latent).toBe(LATENT_DIMS);
      const active = slots.filter((s) => s.state === 'active').length;
      expect(active).toBe(embodimentById(robot).nativeDims);
    }
  });

  it('motion-transfer mode discloses no human-video path', () => {
    const slots = slotRow('motion-transfer', 'human-hand');
    expect(slots.filter((s) => s.state === 'latent')).toHaveLength(0);
    expect(slots.filter((s) => s.state === 'active')).toHaveLength(0);
  });

  it('relative-EEF mode puts every embodiment, including the human hand, in the same space', () => {
    for (const embodiment of ALL_EMBODIMENTS) {
      const slots = slotRow('relative-eef', embodiment);
      const active = slots.filter((s) => s.state === 'active').length;
      expect(active).toBe(EEF_SPACE_DIMS);
      expect(slots.filter((s) => s.state === 'zeroed')).toHaveLength(0);
      // The shared dims lead the row, identical across embodiments.
      expect(
        slots.slice(0, EEF_SPACE_DIMS).every((s) => s.state === 'active'),
      ).toBe(true);
    }
  });
});

describe('rowSummary', () => {
  it('reports zero-padding counts in padded mode', () => {
    const arm = rowSummary('padded', 'arm');
    expect(arm.active).toBe(8);
    expect(arm.zeroed).toBe(SHARED_WIDTH - 8);
    const humanoid = rowSummary('padded', 'humanoid');
    expect(humanoid.zeroed).toBeLessThan(arm.zeroed);
  });

  it('marks the human hand unusable except in relative-EEF mode', () => {
    expect(rowSummary('padded', 'human-hand').sharesSpace).toBe(false);
    expect(rowSummary('motion-transfer', 'human-hand').sharesSpace).toBe(false);
    expect(rowSummary('relative-eef', 'human-hand').sharesSpace).toBe(true);
  });

  it('marks every robot as sharing the space only outside padded mode', () => {
    for (const robot of ROBOTS) {
      expect(rowSummary('padded', robot).sharesSpace).toBe(false);
      expect(rowSummary('motion-transfer', robot).sharesSpace).toBe(true);
      expect(rowSummary('relative-eef', robot).sharesSpace).toBe(true);
    }
  });

  it('never pads in relative-EEF mode', () => {
    for (const embodiment of ALL_EMBODIMENTS) {
      expect(rowSummary('relative-eef', embodiment).zeroed).toBe(0);
    }
  });
});

describe('strategy registry', () => {
  it('covers exactly the three published strategies', () => {
    expect(STRATEGY_ORDER).toEqual([
      'padded',
      'motion-transfer',
      'relative-eef',
    ]);
    for (const id of STRATEGY_ORDER) {
      expect(STRATEGIES[id].id).toBe(id);
      expect(STRATEGIES[id].label.length).toBeGreaterThan(0);
      expect(STRATEGIES[id].proponent.length).toBeGreaterThan(0);
    }
  });

  it('flags only motion transfer as publicly under-specified', () => {
    expect(STRATEGIES['padded'].underSpecified).toBe(false);
    expect(STRATEGIES['motion-transfer'].underSpecified).toBe(true);
    expect(STRATEGIES['relative-eef'].underSpecified).toBe(false);
  });

  it('resolves every strategy citation in the registry', () => {
    for (const id of STRATEGY_ORDER) {
      expect(getCitation(STRATEGIES[id].citationId)).toBeDefined();
    }
  });

  it('names the embodiments the interactive compares', () => {
    expect(EMBODIMENT_ORDER).toEqual([
      'arm',
      'bimanual',
      'humanoid',
      'human-hand',
    ]);
    expect(EMBODIMENTS).toHaveLength(4);
  });

  it('rejects unknown ids', () => {
    expect(() => slotRow('padded', 'quadcopter' as EmbodimentId)).toThrowError(
      /unknown embodiment/i,
    );
    expect(() => rowSummary('rl' as StrategyId, 'arm')).toThrowError(
      /unknown strategy/i,
    );
  });
});
