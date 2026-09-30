import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { beatSpans, posterTime } from '@/components/motion/timeline';
import { RELIABILITY_THRESHOLD_SCENE, reliabilityThresholdFrame } from '@/components/motion/scenes/reliability-threshold';
import { TACTILE_SLIP_SCENE, tactileSlipFrame } from '@/components/motion/scenes/tactile-slip';
import { SENSE_AVOID_SCENE, senseAvoidFrame } from '@/components/motion/scenes/sense-avoid';
import { compoundedSuccessRate } from '@/lib/reliability';
import { DEFAULT_AGILITY, SENSORS, latencyOutcome } from '@/lib/aerial-latency';
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
const articles = ['frontier', 'adjacent'].flatMap((domain) =>
  readdirSync(join(root, 'content', domain))
    .filter((name) => name.endsWith('.mdx'))
    .sort()
    .map((name) => `${domain}/${name}`));
const inventory = JSON.parse(readFileSync(
  join(root, 'docs/design/motion-frontier-adjacent-home-inventory.json'), 'utf8',
)) as Row[];
const figures = new Set([
  'Stat', 'SelfCheck', 'PredictThenReveal', 'ReliabilityCompounding',
  'DeploymentDashboard', 'HandComparison', 'EgoScaleScaling', 'ThesisExplorer',
  'MilestonesWatchlist', 'CollaborativeOperationModes', 'AvStackTable',
  'PerceptionLatency', 'SwarmControlTable', 'OrbitalServicingTable',
  'SurgicalSystemsTable', 'ReliabilityThreshold', 'TactileSlip', 'SenseAvoid',
]);
const homeFigures = ['ReliabilityThreshold'];
/** Figures home once mounted; their inventory rows record the removal. */
const homeRemoved = ['ReliabilityCompounding', 'ImageRef', 'So101ChainPreview', 'MarketMapPoster'];
const scenes = [RELIABILITY_THRESHOLD_SCENE, TACTILE_SLIP_SCENE, SENSE_AVOID_SCENE];

describe('frontier, adjacent and home motion inventory', () => {
  it('accounts for every first-party figure and independent assessment mount', () => {
    const mounts: string[] = [];
    for (const file of articles) {
      const body = readFileSync(join(root, 'content', file), 'utf8');
      const counts = new Map<string, number>();
      for (const match of body.matchAll(/<([A-Z]\w+)\b/g)) {
        const element = match[1];
        if (!figures.has(element)) continue;
        const occurrence = (counts.get(element) ?? 0) + 1;
        counts.set(element, occurrence);
        mounts.push(`${file.slice(0, -4)}:${element}:${occurrence}`);
      }
    }
    const home = readFileSync(join(root, 'app/page.tsx'), 'utf8');
    for (const element of homeFigures) {
      expect(home).toContain(`<${element}`);
      mounts.push(`home:${element}:1`);
    }
    for (const element of homeRemoved) {
      expect(home).not.toContain(`<${element}`);
      mounts.push(`home:${element}:1`);
      expect(inventory.find((row) => row.article === 'home' && row.element === element)?.decision).toBe('remove');
    }
    const covered = inventory.map((row) => `${row.article}:${row.element}:${row.occurrence ?? 1}`);
    expect(covered.sort()).toEqual(mounts.sort());
    expect(new Set(covered).size).toBe(inventory.length);
    expect(articles).toHaveLength(10);
    for (const row of inventory) {
      expect(row.teachingGoal.length).toBeGreaterThan(25);
      expect(row.reason.length).toBeGreaterThan(25);
      if (row.decision === 'add') {
        expect(scenes.map((scene) => scene.id)).toContain(row.sceneId);
      }
    }
  });
});

describe('frontier and adjacent scene truth', () => {
  it('holds a fixed episode length while conditional reliability changes', () => {
    const spans = beatSpans(RELIABILITY_THRESHOLD_SCENE.beats);
    for (const index of [0, 1, 2, 3]) {
      const frame = reliabilityThresholdFrame(spans[index].end);
      expect(frame.episodeSuccess).toBe(compoundedSuccessRate(frame.perStep, 30));
    }
    expect(reliabilityThresholdFrame(spans[1].end).episodeSuccess)
      .toBeLessThan(reliabilityThresholdFrame(spans[2].end).episodeSuccess);
    expect(spans[1].linear).toBe(true);
    expect(RELIABILITY_THRESHOLD_SCENE.beats[0].caption).toMatch(/95%.*21\.5%/);
  });

  it('shows a toy slip and a distinct tactile correction, without a performance claim', () => {
    const spans = beatSpans(TACTILE_SLIP_SCENE.beats);
    expect(tactileSlipFrame(spans[0].end).slip).toBe(0);
    expect(tactileSlipFrame(spans[1].end).slip).toBeGreaterThan(0);
    expect(tactileSlipFrame(spans[2].end).correction).toBeGreaterThan(0);
    expect(spans[1].linear).toBe(true);
    expect(TACTILE_SLIP_SCENE.beats.map((beat) => beat.caption).join(' ')).toMatch(/toy|schematic/i);
  });

  it('uses the paper-model latency and agility without changing its constants', () => {
    const spans = beatSpans(SENSE_AVOID_SCENE.beats);
    const first = senseAvoidFrame(spans[0].end);
    const delayed = senseAvoidFrame(spans[2].end);
    expect(first.outcome).toEqual(latencyOutcome(SENSORS[0].latencyS, DEFAULT_AGILITY, SENSORS[0].rangeM));
    expect(delayed.outcome.maxSpeedMs).toBeLessThan(first.outcome.maxSpeedMs);
    expect(first.latency).toBeCloseTo(0.07);
    expect(delayed.latency).toBeCloseTo(0.2);
    expect(first.outcome.avoidanceTimeS).toBeCloseTo(delayed.outcome.avoidanceTimeS);
    const middle = senseAvoidFrame((spans[2].start + spans[2].end) / 2);
    expect(middle.latency).toBeCloseTo(0.135);
    expect(middle.outcome.avoidanceTimeS).toBeCloseTo(first.outcome.avoidanceTimeS);
    expect(middle.outcome.maxSpeedMs).toBeLessThan(first.outcome.maxSpeedMs);
    expect(middle.outcome.maxSpeedMs).toBeGreaterThan(delayed.outcome.maxSpeedMs);
    expect(spans[2].linear).toBe(true);
  });

  it('ends every scene on a still recap with a standalone caption per beat', () => {
    for (const scene of scenes) {
      expect(scene.beats).toHaveLength(4);
      for (const beat of scene.beats) expect(beat.caption).toMatch(/[.!?]$/);
      expect(posterTime(beatSpans(scene.beats))).toBeGreaterThan(0);
    }
  });
});

describe('frontier and adjacent prose continuity', () => {
  it('preserves the original ordered citation IDs and numeric tokens', () => {
    for (const file of articles) {
      const current = readFileSync(join(root, 'content', file), 'utf8');
      const before = execFileSync('git', ['show', `e14e2504:content/${file}`], {
        cwd: root, encoding: 'utf8',
      });
      const numbers = (text: string) => text
        .replace(/\b(?:Tables?|Tab\.|Figures?|Fig\.|Equation|Eq\.|Algorithm|Sections?)\s*\(?\s*(?:\d+(?:\.\d+)*[a-z]?|[IVXL]+)\b|\bAppendix\s+[A-Z]\d*(?:\.\d+)?\b|\bv\d+\b/g, '')
        .match(/(?<![\w-])\d(?:[\d,]*\d)?(?:\.\d+)?(?:%|x|Hz|ms|s|m|M|k)?/g)
        ?.sort() ?? [];
      const citations = (text: string) => [...text.matchAll(/<Cite id="([^"]+)"/g)].map((match) => match[1]);
      expect(numbers(current), `${file} numeric tokens`).toEqual(numbers(before));
      expect(citations(current), `${file} ordered citations`).toEqual(citations(before));
    }
  });

  it('keeps every article at or below two structural tells per thousand words', () => {
    for (const file of articles) {
      const body = readFileSync(join(root, 'content', file), 'utf8');
      const report = structuralTellReport(body, NO_SLOP_EXCEPTIONS);
      expect(report.measured, file).toBe(true);
      expect(report.tells, file).toBe(findStructuralTells(body, NO_SLOP_EXCEPTIONS).length);
      expect(report.density, file).toBeLessThanOrEqual(STRUCTURAL_TELL_LIMIT);
    }
  });
});
