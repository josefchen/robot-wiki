import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { beatSpans, posterTime } from '@/components/motion/timeline';
import { JAM_OVERHEAD_SCENE, jamOverheadFrame } from '@/components/motion/scenes/jam-overhead';
import { computeEconomics, DEFAULT_INPUTS } from '@/lib/deployment-economics';
import { NO_SLOP_EXCEPTIONS } from '@/data/no-slop-exceptions';
import { findStructuralTells, structuralTellReport, STRUCTURAL_TELL_LIMIT } from '@/lib/no-slop';

type Decision = 'keep' | 'restyle' | 'rethink' | 'replace' | 'remove' | 'add';
interface Row {
  article: string;
  element: string;
  occurrence?: number;
  decision: Decision;
  sceneId?: string;
  teachingGoal: string;
  reason: string;
}

const root = process.cwd();
const folder = join(root, 'content/data-hardware');
const articles = readdirSync(folder).filter((file) => file.endsWith('.mdx')).sort();
const inventory = JSON.parse(readFileSync(
  join(root, 'docs/design/motion-data-hardware-inventory.json'), 'utf8',
)) as Row[];
const figures = new Set([
  'DataScaleChart', 'ScalingLawsTable', 'DatasetTable',
  'ReliabilityCompounding', 'HardwareGuide', 'DeploymentEconomics',
  'TeleopRigMatrix', 'Stat', 'PredictThenReveal', 'SelfCheck', 'Image',
  'FarmThroughput', 'EpisodeSurvival', 'JamOverhead',
  'DatasetRunsHours', 'HardwarePriceLadder', 'UmiCollectionRates',
]);
const scenes = [JAM_OVERHEAD_SCENE];
// A removed row stays in the inventory as the record of the decision, and
// no longer stands for a mount.
const active = inventory.filter((row) => row.decision !== 'remove');

describe('data-hardware motion inventory', () => {
  it('accounts for every mount, including repeated labs, images and stats', () => {
    const mounts: string[] = [];
    for (const file of articles) {
      const article = file.slice(0, -4);
      const body = readFileSync(join(folder, file), 'utf8');
      const counts = new Map<string, number>();
      for (const match of body.matchAll(/<([A-Z]\w+)\b/g)) {
        const element = match[1];
        if (!figures.has(element)) continue;
        const occurrence = (counts.get(element) ?? 0) + 1;
        counts.set(element, occurrence);
        mounts.push(`${article}:${element}:${occurrence}`);
      }
    }
    const covered = active.map((row) => `${row.article}:${row.element}:${row.occurrence ?? 1}`);
    expect(mounts.sort()).toEqual(covered.sort());
    expect(new Set(covered).size).toBe(active.length);
    expect(articles).toHaveLength(7);
    expect(inventory).toHaveLength(59);
    for (const row of inventory) {
      expect(articles).toContain(`${row.article}.mdx`);
      expect(row.teachingGoal.length).toBeGreaterThan(25);
      expect(row.reason.length).toBeGreaterThan(25);
      const body = readFileSync(join(folder, `${row.article}.mdx`), 'utf8');
      if (row.decision === 'add') {
        expect(row.sceneId).toBe('jam-overhead');
        expect(body).toContain(`<${row.element}`);
      }
      if (row.decision === 'remove') {
        expect(row.reason).toMatch(/^Removed: /);
        const stillMounted = active.some((other) =>
          other.article === row.article && other.element === row.element);
        if (!stillMounted) expect(body).not.toContain(`<${row.element}`);
      }
    }
  });
});

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
      const report = structuralTellReport(body, NO_SLOP_EXCEPTIONS);
      expect(report.measured, file).toBe(true);
      expect(report.tells, file).toBe(findStructuralTells(body, NO_SLOP_EXCEPTIONS).length);
      expect(report.density, file).toBeLessThanOrEqual(STRUCTURAL_TELL_LIMIT);
    }
  });
});
