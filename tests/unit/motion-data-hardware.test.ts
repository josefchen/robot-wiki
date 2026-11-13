import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { beatSpans, posterTime } from '@/components/motion/timeline';
import { JAM_OVERHEAD_SCENE, jamOverheadFrame } from '@/components/motion/scenes/jam-overhead';
import { computeEconomics, DEFAULT_INPUTS } from '@/lib/deployment-economics';
import { PROSE_LINT_EXCEPTIONS } from '@/data/prose-lint-exceptions';
import { findStructuralTells, structuralTellReport, STRUCTURAL_TELL_LIMIT } from '@/lib/prose-lint';

const root = process.cwd();
const folder = join(root, 'content/data-hardware');
const articles = readdirSync(folder).filter((file) => file.endsWith('.mdx')).sort();
const scenes = [JAM_OVERHEAD_SCENE];

describe('data-hardware scene truth', () => {
  it('compares jam cost from the same authored calculator inputs', () => {
    const spans = beatSpans(JAM_OVERHEAD_SCENE.beats);
    // The quick cell is drawn from the first beat on; the slow cell's
    // clearing time sweeps from 15 to 300 seconds over the second beat.
    const quick = jamOverheadFrame(spans[0].end);
    const slow = jamOverheadFrame(spans[1].end);
    expect(quick.quick).toEqual(computeEconomics({ ...DEFAULT_INPUTS, successRatePercent: 99, jamClearSeconds: 15 }));
    expect(jamOverheadFrame(spans[1].start).outputs).toEqual(quick.quick);
    expect(slow.outputs).toEqual(computeEconomics({ ...DEFAULT_INPUTS, successRatePercent: 99, jamClearSeconds: 300 }));
    expect(slow.outputs.netPicksPerHour).toBeLessThan(quick.quick.netPicksPerHour);
    expect(spans[1].linear).toBe(true);
  });

  it('holds a final poster and has four standalone captions per scene', () => {
    for (const scene of scenes) {
      expect(scene.beats).toHaveLength(4);
      for (const beat of scene.beats) expect(beat.caption).toMatch(/[.!?]$/);
      expect(posterTime(beatSpans(scene.beats))).toBeGreaterThan(0);
    }
  });
});

describe('data-hardware prose truth', () => {

  it('measures all seven articles at no more than two structural tells per thousand words', () => {
    for (const file of articles) {
      const body = readFileSync(join(folder, file), 'utf8');
      const report = structuralTellReport(body, PROSE_LINT_EXCEPTIONS);
      expect(report.measured, file).toBe(true);
      expect(report.tells, file).toBe(findStructuralTells(body, PROSE_LINT_EXCEPTIONS).length);
      expect(report.density, file).toBeLessThanOrEqual(STRUCTURAL_TELL_LIMIT);
    }
  });
});
