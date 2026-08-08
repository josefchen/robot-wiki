import { describe, expect, it } from 'vitest';
import {
  CONTROL_HZ,
  DIFFUSION_POLICY_HORIZON,
  clampHorizon,
  commitDurationS,
  planChunks,
  replanRateHz,
} from '@/lib/receding-horizon';

describe('DIFFUSION_POLICY_HORIZON', () => {
  it('matches the published configuration (arXiv:2303.04137)', () => {
    expect(DIFFUSION_POLICY_HORIZON).toEqual({ tp: 16, ta: 8 });
  });
});

describe('planChunks', () => {
  it('lays out a rolling plan: a new chunk every T_a steps', () => {
    const chunks = planChunks(16, 8, 32);
    expect(chunks.map((c) => c.start)).toEqual([0, 8, 16, 24]);
  });

  it('commits the first T_a actions and predicts out to T_p', () => {
    const [first] = planChunks(16, 8, 32);
    expect(first.commitEnd).toBe(8);
    expect(first.planEnd).toBe(16);
  });

  it('overlaps consecutive chunks so the tail is replanned, not executed', () => {
    const chunks = planChunks(16, 8, 32);
    // Chunk 0 predicts out to step 16, but chunk 1 starts at step 8:
    // the second half of chunk 0 is never executed.
    expect(chunks[0].planEnd).toBeGreaterThan(chunks[1].start);
    expect(chunks[1].commitEnd).toBe(chunks[0].planEnd);
  });

  it('extends the predicted tail past the window when T_p does', () => {
    const chunks = planChunks(16, 8, 20);
    const last = chunks.at(-1);
    expect(last?.planEnd).toBeGreaterThan(20);
  });

  it('T_a equal to T_p means open-loop execution with no overlap', () => {
    const chunks = planChunks(8, 8, 16);
    expect(chunks[0].commitEnd).toBe(chunks[0].planEnd);
    expect(chunks[1].start).toBe(chunks[0].planEnd);
  });
});

describe('replanRateHz', () => {
  it('replans once per committed segment', () => {
    expect(replanRateHz(8)).toBeCloseTo(CONTROL_HZ / 8, 6);
    expect(replanRateHz(8)).toBeCloseTo(1.25, 6);
    expect(replanRateHz(1)).toBeCloseTo(CONTROL_HZ, 6);
  });
});

describe('commitDurationS', () => {
  it('converts the executed horizon to wall-clock commitment', () => {
    expect(commitDurationS(8)).toBeCloseTo(0.8, 6);
    expect(commitDurationS(16)).toBeCloseTo(1.6, 6);
  });
});

describe('clampHorizon', () => {
  it('keeps the published values untouched', () => {
    expect(clampHorizon(16, 8)).toEqual({ tp: 16, ta: 8 });
  });

  it('clamps the executed horizon to the predicted horizon', () => {
    expect(clampHorizon(8, 16)).toEqual({ tp: 8, ta: 8 });
  });

  it('never lets either horizon drop below one step', () => {
    expect(clampHorizon(0, 0)).toEqual({ tp: 1, ta: 1 });
    expect(clampHorizon(Number.NaN, Number.NaN)).toEqual({ tp: 1, ta: 1 });
  });
});
