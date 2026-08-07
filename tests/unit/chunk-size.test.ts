import { describe, expect, it } from 'vitest';
import {
  ACT_CHUNK_ANCHORS,
  decisionsPerEpisode,
  successAtChunkSize,
} from '@/lib/chunk-size';

describe('successAtChunkSize', () => {
  it('anchors exactly to the published ACT ablation values', () => {
    // arXiv:2304.13705: 1% success at k=1, 44% at k=100.
    expect(successAtChunkSize(1)).toBeCloseTo(0.01, 4);
    expect(successAtChunkSize(100)).toBeCloseTo(0.44, 4);
  });

  it('rises monotonically between k=1 and k=100', () => {
    let previous = successAtChunkSize(1);
    for (const k of [2, 5, 10, 25, 50, 75, 100]) {
      const value = successAtChunkSize(k);
      expect(value).toBeGreaterThan(previous);
      previous = value;
    }
  });

  it('tapers beyond k=100 (the open-loop decline)', () => {
    const peak = successAtChunkSize(100);
    const at200 = successAtChunkSize(200);
    const at400 = successAtChunkSize(400);
    expect(at200).toBeLessThan(peak);
    expect(at400).toBeLessThan(at200);
    // The published taper is slight: the curve must not collapse.
    expect(at400).toBeGreaterThan(0.15);
  });

  it('stays within (0, 1) across the full slider range', () => {
    for (let k = 1; k <= 400; k += 1) {
      const value = successAtChunkSize(k);
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('clamps out-of-range k to the slider bounds', () => {
    expect(successAtChunkSize(0)).toBeCloseTo(successAtChunkSize(1), 6);
    expect(successAtChunkSize(999)).toBeCloseTo(successAtChunkSize(400), 6);
    expect(successAtChunkSize(Number.NaN)).toBeCloseTo(
      successAtChunkSize(1),
      6,
    );
  });

  it('exposes the two measured anchors for chart annotation', () => {
    expect(ACT_CHUNK_ANCHORS).toEqual([
      { k: 1, success: 0.01 },
      { k: 100, success: 0.44 },
    ]);
  });
});

describe('decisionsPerEpisode', () => {
  it('divides the episode length by the chunk size', () => {
    expect(decisionsPerEpisode(400, 1)).toBe(400);
    expect(decisionsPerEpisode(400, 100)).toBe(4);
    expect(decisionsPerEpisode(400, 400)).toBe(1);
  });

  it('never returns less than one decision', () => {
    expect(decisionsPerEpisode(400, 1000)).toBe(1);
  });
});
