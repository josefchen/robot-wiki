import { describe, expect, it } from 'vitest';
import { steadyPath, steadySolid } from '@/components/iso/steady-path';

describe('steady hull paths', () => {
  it('starts a closed polygon at its least point, whichever corner it started at', () => {
    const a = 'M517.1 187.8L518.8 185.5L521.7 186.9L521.7 223.3L520 225.6L517.1 224.3Z';
    const b = 'M517.1 224.3L517.1 187.8L518.8 185.5L521.7 186.9L521.7 223.3L520 225.6Z';
    expect(steadyPath(a)).toBe(steadyPath(b));
    expect(steadyPath(b)).toBe('M517.1 187.8L518.8 185.5L521.7 186.9L521.7 223.3L520 225.6L517.1 224.3Z');
  });

  it('leaves open paths and paths of several polygons as they are', () => {
    expect(steadyPath('M1 2L3 4')).toBe('M1 2L3 4');
    expect(steadyPath('M5 5L1 1L2 3ZM9 9L8 8L7 9Z')).toBe('M5 5L1 1L2 3ZM9 9L8 8L7 9Z');
    expect(steadyPath('')).toBe('');
  });

  it('steadies a solid’s fill, outline and top and keeps everything else', () => {
    const paths = { fill: 'M2 2L1 1L3 1Z', outline: 'M2 2L1 1L3 1Z', crease: 'M0 0L1 1', top: 'M2 2L1 1L3 1Z', shades: ['M2 2L1 1L3 1Z', '', '', ''] };
    const steady = steadySolid(paths);
    expect(steady.fill).toBe('M1 1L3 1L2 2Z');
    expect(steady.outline).toBe('M1 1L3 1L2 2Z');
    expect(steady.top).toBe('M1 1L3 1L2 2Z');
    expect(steady.crease).toBe(paths.crease);
    expect(steady.shades).toEqual(paths.shades);
  });
});
