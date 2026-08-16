import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ANGLES_DEG,
  LINK_LENGTHS,
  planarForwardKinematics,
  totalReach,
} from '@/lib/planar-fk';

const UNIT = [1, 1, 1];

describe('planarForwardKinematics', () => {
  it('lays a fully extended arm along the +x axis at zero angles', () => {
    const { pivots, effector } = planarForwardKinematics(UNIT, [0, 0, 0]);
    expect(pivots).toHaveLength(3);
    expect(pivots[0]).toEqual({ x: 0, y: 0 });
    expect(pivots[1].x).toBeCloseTo(1, 10);
    expect(pivots[1].y).toBeCloseTo(0, 10);
    expect(pivots[2].x).toBeCloseTo(2, 10);
    expect(pivots[2].y).toBeCloseTo(0, 10);
    expect(effector.x).toBeCloseTo(3, 10);
    expect(effector.y).toBeCloseTo(0, 10);
  });

  it('rotates the whole arm about the base when only the base joint moves', () => {
    const { effector } = planarForwardKinematics(UNIT, [90, 0, 0]);
    expect(effector.x).toBeCloseTo(0, 10);
    expect(effector.y).toBeCloseTo(3, 10);
  });

  it('folds links back over the previous one at 180 degree elbows', () => {
    const { effector } = planarForwardKinematics(UNIT, [0, 180, 0]);
    expect(effector.x).toBeCloseTo(-1, 10);
    expect(effector.y).toBeCloseTo(0, 10);
  });

  it('closes a 90-90 fold into the expected corner', () => {
    // Link 1 along +x, link 2 along +y, link 3 along -x.
    const { pivots, effector } = planarForwardKinematics(UNIT, [0, 90, 90]);
    expect(pivots[1]).toMatchObject({ x: 1, y: 0 });
    expect(pivots[2].x).toBeCloseTo(1, 10);
    expect(pivots[2].y).toBeCloseTo(1, 10);
    expect(effector.x).toBeCloseTo(0, 10);
    expect(effector.y).toBeCloseTo(1, 10);
  });

  it('keeps the effector inside the reachable disc', () => {
    const reach = totalReach(LINK_LENGTHS);
    for (const a1 of [-180, -90, -30, 0, 45, 90, 135, 180]) {
      for (const a2 of [-135, -45, 0, 45, 135]) {
        for (const a3 of [-90, 0, 90]) {
          const { effector } = planarForwardKinematics(LINK_LENGTHS, [
            a1,
            a2,
            a3,
          ]);
          const r = Math.hypot(effector.x, effector.y);
          expect(r).toBeLessThanOrEqual(reach + 1e-9);
        }
      }
    }
  });

  it('treats missing angles as zero without throwing', () => {
    const { effector } = planarForwardKinematics(UNIT, [0]);
    expect(effector.x).toBeCloseTo(3, 10);
    expect(effector.y).toBeCloseTo(0, 10);
  });
});

describe('module defaults', () => {
  it('ships three links and one default angle per joint', () => {
    expect(LINK_LENGTHS).toHaveLength(3);
    expect(DEFAULT_ANGLES_DEG).toHaveLength(3);
    for (const l of LINK_LENGTHS) expect(l).toBeGreaterThan(0);
  });

  it('keeps the default pose strictly inside the workspace', () => {
    const { effector } = planarForwardKinematics(LINK_LENGTHS, [
      ...DEFAULT_ANGLES_DEG,
    ]);
    const r = Math.hypot(effector.x, effector.y);
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThan(totalReach(LINK_LENGTHS));
  });
});
