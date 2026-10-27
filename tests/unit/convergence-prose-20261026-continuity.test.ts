import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  CONVERGENCE_PROSE_CONTINUITY_DIR, convergenceProsePredecessor, convergenceProseSuccessorPaths,
  keepsConvergenceProseObligations, loadConvergenceProseReview, verifyConvergenceProseSource,
} from '../../lib/audit-convergence-prose-continuity';
import { explainerMountPredecessor } from '../../lib/audit-explainer-mount-continuity';
import { createLocalArtifactReader } from '../../lib/audit-local-basis';
import { seoPassPredecessor } from '../../lib/audit-seo-pass-continuity';
import { preConvergenceProse, preExplainerMounts, preOwedFigures } from '../helpers/seo-pass';

const root = resolve(import.meta.dirname, '../..');
const read = (path: string) => readFileSync(join(root, path));
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const drift = /convergence-prose continuity drift/;
const blank = { bytes: 0, sha256: '' };
const ARTICLES = [
  'content/classical/control.mdx', 'content/classical/kinematics.mdx', 'content/classical/perception.mdx', 'content/classical/scene-representation.mdx',
  'content/data-hardware/data-bottleneck.mdx', 'content/data-hardware/datasets.mdx',
  'content/data-hardware/evaluation-crisis.mdx', 'content/data-hardware/hardware-taxonomy.mdx',
  'content/data-hardware/industrial-deployment.mdx', 'content/data-hardware/robot-learning-stack.mdx',
  'content/data-hardware/teleop-rigs.mdx', 'content/frontier/bear-case.mdx', 'content/frontier/competing-theses.mdx',
  'content/frontier/dexterity.mdx', 'content/frontier/generalization.mdx', 'content/frontier/reliability-gap.mdx',
  'content/frontier/safety-and-assurance.mdx', 'content/rl-sim2real/reward-design-mpc.mdx',
  'content/rl-sim2real/rl-for-robotics.mdx', 'content/world-models/jepa.mdx', 'content/world-models/latent-dynamics.mdx',
];

const scratchRoots: string[] = [];
afterEach(() => {
  for (const tmp of scratchRoots.splice(0)) rmSync(tmp, { recursive: true, force: true });
});

describe('convergence prose and sources 2026-10-26 article successors', () => {
  const review = loadConvergenceProseReview(root);

  it('reviews exactly the twenty-one articles the slice edits', () => {
    expect([...convergenceProseSuccessorPaths()].sort()).toEqual(ARTICLES);
    expect(review.sources.map(({ after }) => after.path).sort()).toEqual(ARTICLES);
  });

  it('names one replaced citation, the undated Agility figure moved to its dated Digit 5 release', () => {
    const replaced = review.sources.flatMap(({ after, replacedCitations }) =>
      (replacedCitations ?? []).map(({ from, to }) => [after.path, from, to]));
    expect(replaced).toEqual([['content/frontier/reliability-gap.mdx', 'agility-digit-production', 'agility-digit-5-2026']]);
  });

  it('rebuilds every reviewed successor into the committed bytes the older layers and proofs still decide', () => {
    for (const source of review.sources) {
      const path = source.after.path;
      // The owed-figures layer (2026-10-26) is newer; it hands this layer the convergence successor.
      const live = preOwedFigures(path);
      const prior = convergenceProsePredecessor(root, source.before, live);
      expect([prior.length, sha(prior)]).toEqual([source.before.bytes, source.before.sha256]);
      expect(prior).toEqual(execFileSync('git', ['show', `${source.archivedFrom}:${path}`], { cwd: root }));
      expect(convergenceProsePredecessor(root, source.after, live)).toBe(live);
      expect(keepsConvergenceProseObligations(path, prior.toString(), live.toString(), source.replacedCitations)).toBe(true);
      // The artifact readers see this layer first, and every older layer receives the rebuilt bytes.
      expect(preConvergenceProse(path)).toEqual(prior);
      expect(preExplainerMounts(path)).toEqual(explainerMountPredecessor(root, { path, ...blank }, prior));
      expect(seoPassPredecessor(root, source.before, live)).toEqual(prior);
      expect(createLocalArtifactReader(root)(source.before)).toEqual(prior);
    }
  });

  it('passes other bytes through and rejects a successor whose edits no longer replay', () => {
    const source = review.sources.find(({ after }) => after.path === 'content/frontier/reliability-gap.mdx')!;
    const live = read(source.after.path);
    const drifted = Buffer.concat([live, Buffer.from('\n')]);
    expect(convergenceProsePredecessor(root, source.before, drifted)).toBe(drifted);
    expect(convergenceProsePredecessor(root, { path: 'content/frontier/world-models.mdx', ...blank }, drifted)).toBe(drifted);
    expect(() => verifyConvergenceProseSource(source, drifted)).toThrow(drift);
    const replaced = { ...source, edits: [{ before: 'reliability', after: 'dependability' }] };
    expect(() => verifyConvergenceProseSource(replaced, live)).toThrow(drift);
    const misPinned = { ...source, before: { ...source.before, sha256: '0'.repeat(64) } };
    expect(() => verifyConvergenceProseSource(misPinned, live)).toThrow(drift);
    const unreplaced = { ...source, replacedCitations: [] };
    expect(() => verifyConvergenceProseSource(unreplaced, live)).toThrow(drift);
  });

  it('admits prose and citation edits and rejects figure, import or citation losses', () => {
    const path = 'content/frontier/demo.mdx';
    const prior = [
      '---', 'title: Demo', '---', '', "import { Chart } from '@/components/interactive/chart';", '',
      'A fleet logged 1,000 hours <Cite id="old-2024" />.', '', '<Chart />', '', '<Stat value="4" />', '',
      'It serves as a test bed.', '',
    ].join('\n');
    const edited = prior
      .replace('serves as a test bed.', 'is a test bed <Cite id="new-2026" />.')
      .replace('1,000 hours', 'more than 1,000 hours');
    expect(keepsConvergenceProseObligations(path, prior, edited)).toBe(true);
    expect(keepsConvergenceProseObligations(path, prior, prior)).toBe(false);
    expect(keepsConvergenceProseObligations('components/interactive/chart.tsx', prior, edited)).toBe(false);
    const moved = edited.replace('<Cite id="old-2024" />', '<Cite id="new-2026" />');
    expect(keepsConvergenceProseObligations(path, prior, moved), 'an unreplaced dropped source').toBe(false);
    const reason = 'The dated release states the same hours with a date, so it replaces the undated page.';
    expect(keepsConvergenceProseObligations(path, prior, moved, [{ from: 'old-2024', to: 'new-2026', reason }])).toBe(true);
    for (const replacement of [
      { from: 'old-2024', to: 'new-2026', reason: 'too short' },
      { from: 'old-2024', to: 'other-2026', reason },
      { from: 'gone-2020', to: 'new-2026', reason },
    ]) {
      expect(keepsConvergenceProseObligations(path, prior, moved, [replacement]), JSON.stringify(replacement)).toBe(false);
    }
    expect(keepsConvergenceProseObligations(path, prior, edited, [{ from: 'old-2024', to: 'new-2026', reason }]),
      'a replaced source still cited').toBe(false);
    for (const [from, to] of [
      ["import { Chart } from '@/components/interactive/chart';", "import { Chart } from '@/components/interactive/chart2';"],
      ["import { Chart } from '@/components/interactive/chart';", "import { Chart } from '@/components/interactive/chart';\nimport { Map } from '@/components/interactive/map';"],
      ['<Chart />\n', ''],
      ['<Chart />\n\n<Stat value="4" />', '<Stat value="4" />\n\n<Chart />'],
      ['It is a test bed', '<Note />\n\nIt is a test bed'],
    ] as const) {
      const mutated = edited.replace(from, to);
      expect(mutated, from).not.toBe(edited);
      expect(keepsConvergenceProseObligations(path, prior, mutated), `${from} -> ${to}`).toBe(false);
    }
  });

  it('rejects a missing, corrupt or renamed review', () => {
    const [source] = review.sources;
    for (const mode of ['missing', 'corrupt', 'renamed'] as const) {
      const tmp = mkdtempSync(join(tmpdir(), 'convergence-prose-continuity-test-'));
      scratchRoots.push(tmp);
      cpSync(join(root, CONVERGENCE_PROSE_CONTINUITY_DIR), join(tmp, CONVERGENCE_PROSE_CONTINUITY_DIR), { recursive: true });
      const file = join(tmp, CONVERGENCE_PROSE_CONTINUITY_DIR, 'source-transition.json');
      if (mode === 'missing') rmSync(file);
      else if (mode === 'corrupt') writeFileSync(file, mode);
      else writeFileSync(file, readFileSync(file, 'utf8').replace('"convergence-prose-20261026"', '"convergence-prose-drift"'));
      expect(() => loadConvergenceProseReview(tmp)).toThrow(drift);
      expect(() => convergenceProsePredecessor(tmp, source.before, read(source.after.path))).toThrow(drift);
    }
  });
});
