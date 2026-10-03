import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { beatSpans, posterTime } from '@/components/motion/timeline';
import { JAM_OVERHEAD_SCENE, jamOverheadFrame } from '@/components/motion/scenes/jam-overhead';
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
    expect(inventory).toHaveLength(41);
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
      // first interactive with one plain edge from the qualification endpoint,
      // and the figure migration removed its repeated calculator and scene
      // with a second plain edge from that endpoint.
      // The round-6 prose restore of the Vulcan coverage scope re-resolved
      // industrial-deployment from its seal, reconciling the qualification.
      // The 2026-10-02 SEO pass and then the reader-first figure pass each
      // added one edge of the same kind to each.
      const laterIds = slug === 'evaluation-crisis'
        ? ['round5-pinned-leftovers-20260928-prose-evaluation-crisis',
          'opus-figure-migration-20261001-prose-evaluation-crisis',
          'seo-pass-20261002-prose-data-hardware-evaluation-crisis',
          'reader-first-20261002-prose-data-hardware-evaluation-crisis']
        : ['round6-prose-restores-20260929-prose-industrial-deployment',
          'seo-pass-20261002-prose-data-hardware-industrial-deployment',
          'reader-first-20261002-prose-data-hardware-industrial-deployment'];
      const later = edges.filter((entry) => laterIds.includes(entry.id));
      expect(later.map((entry) => entry.id)).toEqual(laterIds);
      expect(edges.slice(edges.indexOf(qualification))).toEqual([qualification, ...later]);
      for (const [index, edge] of later.entries()) {
        const previous = index === 0 ? qualification : later[index - 1];
        if (slug === 'evaluation-crisis') {
          expect(edge.reconciles).toBeUndefined();
          expect(edge.oldHash).toBe(previous.newHash);
        } else {
          expect(edge.oldHash).toBe(sealed);
          expect(edge.reconciles?.at(-1)).toEqual({
            id: previous.id, oldHash: previous.oldHash, newHash: previous.newHash,
          });
        }
      }
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
