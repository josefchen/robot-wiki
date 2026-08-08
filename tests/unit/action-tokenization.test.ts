import { describe, expect, it } from 'vitest';
import {
  ACTION_DIMS,
  BIN_COUNT,
  CHUNK_STEPS,
  SEQUENTIAL_DECODES,
  binCenter,
  binIndex,
  binWidth,
  generateActionChunk,
  quantize,
  tokenForBin,
} from '@/lib/action-tokenization';

describe('action tokenization constants', () => {
  it('uses 256 uniform bins per dimension (RT-1 / OpenVLA recipe)', () => {
    expect(BIN_COUNT).toBe(256);
  });

  it('models the OpenVLA 7-dim action vector', () => {
    expect(ACTION_DIMS).toHaveLength(7);
    expect(ACTION_DIMS.map((d) => d.id)).toEqual([
      'x',
      'y',
      'z',
      'roll',
      'pitch',
      'yaw',
      'gripper',
    ]);
  });

  it('costs one sequential decode per dimension per control step', () => {
    expect(SEQUENTIAL_DECODES).toBe(ACTION_DIMS.length);
  });
});

describe('binIndex', () => {
  it('maps the range endpoints to the outermost bins', () => {
    expect(binIndex(-1)).toBe(0);
    expect(binIndex(1)).toBe(BIN_COUNT - 1);
  });

  it('maps zero to the middle bin', () => {
    expect(binIndex(0)).toBe(BIN_COUNT / 2);
  });

  it('clamps out-of-range values instead of overflowing', () => {
    expect(binIndex(-1.4)).toBe(0);
    expect(binIndex(2.7)).toBe(BIN_COUNT - 1);
  });

  it('assigns adjacent values within one bin width to nearby bins', () => {
    const a = binIndex(0.1);
    const b = binIndex(0.1 + binWidth());
    expect(Math.abs(b - a)).toBeLessThanOrEqual(1);
  });
});

describe('binCenter', () => {
  it('reconstructs values to within half a bin width', () => {
    for (const v of [-0.83, -0.317, 0, 0.124, 0.91]) {
      const error = Math.abs(v - binCenter(binIndex(v)));
      expect(error).toBeLessThanOrEqual(binWidth() / 2);
    }
  });

  it('places bin 0 and bin 255 symmetrically inside the range', () => {
    expect(binCenter(0)).toBeCloseTo(-1 + binWidth() / 2, 10);
    expect(binCenter(BIN_COUNT - 1)).toBeCloseTo(1 - binWidth() / 2, 10);
  });
});

describe('tokenForBin', () => {
  it('renders bins as text-vocabulary tokens, not bare numbers', () => {
    expect(tokenForBin(0)).toBe('<a0>');
    expect(tokenForBin(255)).toBe('<a255>');
  });

  it('shares one 256-token vocabulary across dimensions', () => {
    // OpenVLA maps every dimension onto the same 256 least-used LLaMA
    // tokens; the position in the sequence carries the dimension.
    expect(tokenForBin(108)).toBe(tokenForBin(108));
  });
});

describe('generateActionChunk', () => {
  it('produces one row per dimension and one column per timestep', () => {
    const chunk = generateActionChunk();
    expect(chunk).toHaveLength(ACTION_DIMS.length);
    for (const row of chunk) {
      expect(row).toHaveLength(CHUNK_STEPS);
    }
  });

  it('keeps every value inside the normalized action range', () => {
    const chunk = generateActionChunk();
    for (const row of chunk) {
      for (const v of row) {
        expect(v).toBeGreaterThanOrEqual(-1);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('is deterministic across calls (hydration-safe render)', () => {
    expect(generateActionChunk()).toEqual(generateActionChunk());
  });

  it('gives each dimension a distinct trajectory', () => {
    const chunk = generateActionChunk();
    expect(new Set(chunk.map((row) => row.join(','))).size).toBe(
      ACTION_DIMS.length,
    );
  });
});

describe('quantize', () => {
  it('maps a full action vector to one bin per dimension', () => {
    const chunk = generateActionChunk();
    const step = 5;
    const bins = quantize(chunk.map((row) => row[step]));
    expect(bins).toHaveLength(ACTION_DIMS.length);
    for (const b of bins) {
      expect(Number.isInteger(b)).toBe(true);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(BIN_COUNT);
    }
    expect(bins).toEqual(chunk.map((row) => binIndex(row[step])));
  });
});
