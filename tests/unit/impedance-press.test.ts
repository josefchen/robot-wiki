import { describe, expect, it } from 'vitest';
import {
  PUSH_MAX,
  SPRINGS,
  STILL_SPRING,
  STILL_TARGET,
  TARGET_MAX,
  TARGET_MIN,
  TARGET_STEP,
  gapFor,
  pushFor,
  readoutFor,
  toolFor,
} from '@/lib/impedance-press';

const targets = Array.from({ length: Math.round((TARGET_MAX - TARGET_MIN) / TARGET_STEP) + 1 }, (_, k) => TARGET_MIN + k * TARGET_STEP);

describe('the impedance press model', () => {
  it('lets the tool ride on the target in free space and stops it on the surface past it', () => {
    for (const target of targets) {
      expect(toolFor(target)).toBe(Math.min(target, 0));
      expect(gapFor(target)).toBe(Math.max(target, 0));
      expect(toolFor(target) + gapFor(target)).toBe(target);
    }
  });

  it('pushes by stiffness times the gap: nothing in free space, in proportion past the surface', () => {
    expect(SPRINGS.map((spring) => spring.rate)).toEqual([1, 2, 4]);
    for (const target of targets) {
      for (const spring of SPRINGS) {
        expect(pushFor(spring.id, target)).toBe(spring.rate * Math.max(target, 0));
      }
      // The same target: the stiff spring pushes four times as hard as the soft one.
      if (target > 0) expect(pushFor('stiff', target)).toBe(4 * pushFor('soft', target));
    }
    expect(PUSH_MAX).toBe(4 * TARGET_MAX);
    // Twice the gap, twice the push, on every spring.
    for (const spring of SPRINGS) expect(pushFor(spring.id, 2)).toBe(2 * pushFor(spring.id, 1));
  });

  it('reads out in words from the same model', () => {
    expect(STILL_SPRING).toBe('medium');
    expect(STILL_TARGET).toBe(2);
    expect(readoutFor('medium', 2)).toBe('Medium · 2 marks past · push 4');
    expect(readoutFor('stiff', 2)).toBe('Stiff · 2 marks past · push 8');
    expect(readoutFor('soft', 1)).toBe('Soft · 1 mark past · push 1');
    expect(readoutFor('soft', 0.5)).toBe('Soft · 0.5 marks past · push 0.5');
    expect(readoutFor('stiff', 0)).toBe('Stiff · on the surface · no push');
    expect(readoutFor('medium', -2)).toBe('Medium · 2 marks short · no push');
    // One line on a phone: no readout runs past 40 characters.
    for (const target of targets) for (const spring of SPRINGS) expect(readoutFor(spring.id, target).length).toBeLessThanOrEqual(40);
    for (const target of targets) for (const spring of SPRINGS) expect(readoutFor(spring.id, target)).not.toMatch(/[=×*/^]|N\b/);
  });
});
