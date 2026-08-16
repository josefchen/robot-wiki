import { describe, expect, it } from 'vitest';
import { EUREKA_GENERATIONS, diffLines } from '@/lib/eureka';

describe('EUREKA_GENERATIONS script', () => {
  it('contains at least two generations (the contract minimum)', () => {
    expect(EUREKA_GENERATIONS.length).toBeGreaterThanOrEqual(2);
  });

  it('every generation carries code, training statistics, and a reflection', () => {
    for (const gen of EUREKA_GENERATIONS) {
      expect(gen.code.length).toBeGreaterThan(0);
      expect(gen.stats.length).toBeGreaterThan(0);
      expect(gen.reflection.trim().length).toBeGreaterThan(0);
      expect(Number.isFinite(gen.fitness)).toBe(true);
    }
  });

  it('fitness improves across the scripted loop', () => {
    for (let i = 1; i < EUREKA_GENERATIONS.length; i += 1) {
      expect(EUREKA_GENERATIONS[i].fitness).toBeGreaterThan(
        EUREKA_GENERATIONS[i - 1].fitness,
      );
    }
  });

  it('consecutive generations actually differ in code', () => {
    for (let i = 1; i < EUREKA_GENERATIONS.length; i += 1) {
      expect(EUREKA_GENERATIONS[i].code).not.toEqual(
        EUREKA_GENERATIONS[i - 1].code,
      );
    }
  });
});

describe('diffLines', () => {
  it('returns all-same for identical inputs', () => {
    const lines = ['a', 'b', 'c'];
    const diff = diffLines(lines, lines);
    expect(diff).toEqual([
      { type: 'same', text: 'a' },
      { type: 'same', text: 'b' },
      { type: 'same', text: 'c' },
    ]);
  });

  it('marks pure insertions as added lines', () => {
    const diff = diffLines(['a', 'c'], ['a', 'b', 'c']);
    expect(diff).toEqual([
      { type: 'same', text: 'a' },
      { type: 'add', text: 'b' },
      { type: 'same', text: 'c' },
    ]);
  });

  it('marks pure removals as deleted lines', () => {
    const diff = diffLines(['a', 'b', 'c'], ['a', 'c']);
    expect(diff).toEqual([
      { type: 'same', text: 'a' },
      { type: 'del', text: 'b' },
      { type: 'same', text: 'c' },
    ]);
  });

  it('marks a changed line as delete plus add', () => {
    const diff = diffLines(['x = 1'], ['x = 2']);
    const types = diff.map((d) => d.type);
    expect(types).toContain('del');
    expect(types).toContain('add');
    expect(diff.find((d) => d.type === 'del')?.text).toBe('x = 1');
    expect(diff.find((d) => d.type === 'add')?.text).toBe('x = 2');
  });

  it('the generation 0 to 1 diff contains both additions and shared lines', () => {
    const diff = diffLines(
      EUREKA_GENERATIONS[0].code,
      EUREKA_GENERATIONS[1].code,
    );
    const types = new Set(diff.map((d) => d.type));
    expect(types.has('add')).toBe(true);
    expect(types.has('same')).toBe(true);
  });
});
