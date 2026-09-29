import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { beatSpans, posterTime } from '@/components/motion/timeline';
import { FARM_THROUGHPUT_SCENE, farmThroughputFrame } from '@/components/motion/scenes/farm-throughput';
import { EPISODE_SURVIVAL_SCENE, episodeSurvivalFrame } from '@/components/motion/scenes/episode-survival';
import { JAM_OVERHEAD_SCENE, jamOverheadFrame } from '@/components/motion/scenes/jam-overhead';
import { hoursPerYear, yearsToTarget, OXE_SCALE_HOURS } from '@/lib/data-scaling';
import { compoundedSuccessRate } from '@/lib/reliability';
import { computeEconomics, DEFAULT_INPUTS } from '@/lib/deployment-economics';
import { NO_SLOP_EXCEPTIONS } from '@/data/no-slop-exceptions';
import { findStructuralTells, structuralTellReport, STRUCTURAL_TELL_LIMIT } from '@/lib/no-slop';
import { approvedDeltaPath, sha256, type ApprovedDelta, type BaselineBundle } from '@/lib/brand-v2-baseline';
import { collectArticleTruthManifests } from '@/scripts/brand-v2-baseline';

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
]);
const scenes = [FARM_THROUGHPUT_SCENE, EPISODE_SURVIVAL_SCENE, JAM_OVERHEAD_SCENE];

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
    const covered = inventory.map((row) => `${row.article}:${row.element}:${row.occurrence ?? 1}`);
    expect(mounts.sort()).toEqual(covered.sort());
    expect(new Set(covered).size).toBe(inventory.length);
    expect(articles).toHaveLength(7);
    expect(inventory).toHaveLength(41);
    for (const row of inventory) {
      expect(articles).toContain(`${row.article}.mdx`);
      expect(row.teachingGoal.length).toBeGreaterThan(25);
      expect(row.reason.length).toBeGreaterThan(25);
      if (row.decision === 'add') {
        expect(['farm-throughput', 'episode-survival', 'jam-overhead']).toContain(row.sceneId);
        expect(readFileSync(join(folder, `${row.article}.mdx`), 'utf8')).toContain(`<${row.element}`);
      }
    }
  });
});

describe('data-hardware scene truth', () => {
  it('uses the farm projection without relabelling sourced DROID or OXE duration', () => {
    const spans = beatSpans(FARM_THROUGHPUT_SCENE.beats);
    const slow = farmThroughputFrame(spans[1].end);
    const fast = farmThroughputFrame(spans[2].end);
    expect(slow.hoursPerYear).toBe(hoursPerYear(10, 'droid-measured'));
    expect(slow.years).toBe(yearsToTarget(10, 'droid-measured', OXE_SCALE_HOURS));
    expect(fast.hoursPerYear).toBe(hoursPerYear(10, 'dedicated'));
    expect(fast.years).toBe(yearsToTarget(10, 'dedicated', OXE_SCALE_HOURS));
    expect(spans[1].linear).toBe(true);
  });

  it('derives episode survival from the existing conditional-probability model', () => {
    const spans = beatSpans(EPISODE_SURVIVAL_SCENE.beats);
    for (const index of [0, 1, 2, 3]) {
      const frame = episodeSurvivalFrame(spans[index].end);
      expect(frame.success).toBe(compoundedSuccessRate(0.95, frame.steps));
    }
    expect(episodeSurvivalFrame(spans[2].end).steps).toBe(30);
    expect(spans[2].linear).toBe(true);
  });

  it('compares jam cost from the same authored calculator inputs', () => {
    const spans = beatSpans(JAM_OVERHEAD_SCENE.beats);
    const quick = jamOverheadFrame(spans[1].end);
    const slow = jamOverheadFrame(spans[2].end);
    expect(quick.outputs).toEqual(computeEconomics({ ...DEFAULT_INPUTS, successRatePercent: 99, jamClearSeconds: 15 }));
    expect(slow.outputs).toEqual(computeEconomics({ ...DEFAULT_INPUTS, successRatePercent: 99, jamClearSeconds: 300 }));
    expect(slow.outputs.netPicksPerHour).toBeLessThan(quick.outputs.netPicksPerHour);
    expect(spans[2].linear).toBe(true);
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
  it('retains source qualifications and exact later approval edges', () => {
    const industrial = readFileSync(join(folder, 'industrial-deployment.mdx'), 'utf8');
    const evaluation = readFileSync(join(folder, 'evaluation-crisis.mdx'), 'utf8');
    expect(industrial).toContain('Backlog means unperformed obligations under existing contracts, not revenue already earned');
    expect(industrial).not.toContain('revenue has already been earned');
    expect(evaluation).toContain('methods for reducing the gaps, not guarantees that they are closed');
    expect(evaluation).not.toContain('Both methods reduce gaps');

    const baseline = JSON.parse(readFileSync(join(root, 'evidence/brand-v2/baseline/baseline.json'), 'utf8')) as BaselineBundle;
    const approvals = JSON.parse(readFileSync(join(root, 'contract/brand-v2-approved-deltas.json'), 'utf8'))
      .entries as ApprovedDelta[];
    const truth = collectArticleTruthManifests().prose;
    for (const slug of ['evaluation-crisis', 'industrial-deployment']) {
      const id = `article:data-hardware/${slug}`;
      const sealed = baseline.manifests.prose.members.find((member) => member.id === id)!.hash;
      const current = truth.members.find((member) => member.id === id)!.hash;
      const edges = approvals.filter((entry) => entry.manifest === 'prose' && entry.memberId === id);
      const latest = edges.at(-1)!;
      const qualification = edges.find((entry) =>
        entry.id === `motion-data-hardware-source-qualification-20260927-prose-${slug}`)!;
      // The round-5 pinned-leftover repair later moved evaluation-crisis's
      // first interactive with one plain edge from the qualification endpoint.
      // The round-6 prose restore of the Vulcan coverage scope re-resolved
      // industrial-deployment from its seal, reconciling the qualification.
      const later = edges.filter((entry) => entry.id === (slug === 'evaluation-crisis'
        ? 'round5-pinned-leftovers-20260928-prose-evaluation-crisis'
        : 'round6-prose-restores-20260929-prose-industrial-deployment'));
      expect(edges.slice(edges.indexOf(qualification))).toEqual([qualification, ...later]);
      for (const [index, edge] of later.entries()) {
        if (slug === 'evaluation-crisis') {
          expect(edge.reconciles).toBeUndefined();
          expect(edge.oldHash).toBe((index === 0 ? qualification : later[index - 1]).newHash);
        } else {
          expect(edge.oldHash).toBe(sealed);
          expect(edge.reconciles?.at(-1)).toEqual({
            id: qualification.id, oldHash: qualification.oldHash, newHash: qualification.newHash,
          });
        }
      }
      expect(later).toHaveLength(1);
      expect(latest.newHash).toBe(current);
      expect(approvedDeltaPath(edges, sealed, current).status).toBe('approved');
      expect(approvedDeltaPath(edges.slice(0, -1), sealed, current).status).not.toBe('approved');
      expect(approvedDeltaPath([...edges.slice(0, -1), { ...latest, newHash: sha256('wrong endpoint') }],
        sealed, current).status).not.toBe('approved');
      if (slug === 'industrial-deployment') {
        expect(latest.reconciles).toEqual(edges.slice(0, -1).map(({ id, oldHash, newHash }) =>
          ({ id, oldHash, newHash })));
        expect(approvedDeltaPath([...edges.slice(0, -1), {
          ...latest, reconciles: latest.reconciles!.slice(1),
        }], sealed, current).status).not.toBe('approved');
      }
    }
  });

  it('preserves all numeric and ordered citation tokens from the audited checkpoint', () => {
    for (const file of articles) {
      const current = readFileSync(join(folder, file), 'utf8');
      const before = execFileSync('git', ['show', `69e01316:content/data-hardware/${file}`], {
        cwd: root, encoding: 'utf8',
      });
      const numbers = (text: string) => text
        // Paper-internal locators are technical names, not experimental measurements.
        .replace(/\b(?:Tables?|Tab\.|Figures?|Fig\.|Equation|Eq\.|Algorithm|Sections?)\s*\(?\s*(?:\d+(?:\.\d+)*[a-z]?|[IVXL]+)\b|\bAppendix\s+[A-Z]\d*(?:\.\d+)?\b|\bv\d+\b/g, '')
        .match(/(?<![\w-])\d(?:[\d,]*\d)?(?:\.\d+)?(?:%|x|Hz|ms|s|m|M|k)?/g)
        ?.sort() ?? [];
      const citations = (text: string) => [...text.matchAll(/<Cite id="([^"]+)"/g)].map((match) => match[1]);
      expect(numbers(current), `${file} numeric tokens`).toEqual(numbers(before));
      expect(citations(current), `${file} ordered citations`).toEqual(citations(before));
    }
  });

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
