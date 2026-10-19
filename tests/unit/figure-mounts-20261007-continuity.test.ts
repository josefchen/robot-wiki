import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { domainPassPredecessor, domainPassSuccessorPaths } from '../../lib/audit-domain-pass-continuity';
import { imageMountPredecessor, imageMountSuccessorPaths } from '../../lib/audit-image-mount-continuity';
import { kolBacklogPredecessor, kolBacklogSuccessorPaths } from '../../lib/audit-kol-backlog-continuity';
import {
  FIGURE_MOUNT_CONTINUITY_DIR, figureMountPredecessor, figureMountSuccessorPaths, figureMountsIn,
  keepsFigureMountObligations, loadFigureMountReview, verifyFigureMountSource, withoutFigureMounts,
  type FigureMountReview, type FigureMountSource,
} from '../../lib/audit-figure-mount-continuity';
import { preWordBudgetTrim } from '../helpers/seo-pass';

const root = resolve(import.meta.dirname, '../..');
/**
 * The mounts that landed after the image mounts, the newest change to their articles: the 2026-10-15 frontier,
 * world-models and manipulation mounts, the 2026-10-19 teleoperation rigs mount, and surgical robotics' second mount of
 * 2026-10-19 (its first, of 2026-10-12, sits under the adjacent cut and the image mounts).
 */
const AFTER_IMAGES = [
  'content/frontier/bear-case.mdx', 'content/frontier/safety-and-assurance.mdx',
  'content/world-models/model-based-robot-learning.mdx', 'content/world-models/world-models-vs-simulators.mdx',
  'content/manipulation/action-spaces.mdx', 'content/manipulation/comparison-matrix.mdx',
  'content/manipulation/hierarchical.mdx', 'content/data-hardware/teleop-rigs.mdx', 'content/adjacent/surgical.mdx',
];
/** An article's late record is its last one; its earlier records stay under the newer layers. */
const isLate = (review: FigureMountReview, source: FigureMountSource) =>
  AFTER_IMAGES.includes(source.after.path) && review.sources.filter(({ after }) => after.path === source.after.path).at(-1) === source;
// The newer word-budget trim layer hands back the figure-mount successor first; for the mounts that came after the
// image mounts the live article is itself the successor.
const read = (review: FigureMountReview, source: FigureMountSource) =>
  (isLate(review, source) ? readFileSync(join(root, source.after.path)) : preWordBudgetTrim(source.after.path));
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const drift = /figure mount continuity drift/;
const blank = { bytes: 0, sha256: '' };

const scratchRoots: string[] = [];
afterEach(() => {
  for (const tmp of scratchRoots.splice(0)) rmSync(tmp, { recursive: true, force: true });
});

describe('figure mounts 2026-10-07 article successors', () => {
  const review = loadFigureMountReview(root);

  // Successor (rl-sim2real simple figures, 2026-10-10): the rl-sim2real
  // articles that gained simple figures joined the review with their own
  // import lines and one-line mounts; the list stays exact.
  // Successor (isometric figures, 2026-10-12): surgical robotics, the
  // robot-learning stack and competing theses each gained one new isometric
  // figure the same way (its own import line and one-line mount); the list
  // stays exact.
  // Successor (frontier isometric figures, 2026-10-15): the bear case and
  // safety and assurance each gained one new isometric figure the same way,
  // after their image mounts; the list stays exact.
  // Successor (world-models isometric figures, 2026-10-15): model-based robot
  // learning and world models versus simulators each gained one new
  // isometric figure the same way, after their image mounts; the list stays
  // exact.
  // Successor (manipulation isometric figures, 2026-10-15): action spaces,
  // the comparison matrix and hierarchical policies each gained one new
  // isometric figure the same way, after their image mounts; the list
  // stays exact.
  // Successor (data-hardware isometric figure, 2026-10-19): teleoperation
  // rigs gained one new isometric figure the same way, after its image
  // mounts; the list stays exact.
  // Successor (adjacent isometric figure, 2026-10-19): surgical robotics,
  // already in the list, gained a second isometric figure (ScopeFollow) the
  // same way, after its adjacent cut and image mounts; the list of articles
  // stays exact and that article holds two records.
  it('reviews exactly the articles that gained admitted figure mounts', () => {
    expect(figureMountSuccessorPaths()).toEqual([
      'content/adjacent/surgical.mdx',
      'content/classical/calibration.mdx',
      'content/classical/ros2-for-ml-engineers.mdx',
      'content/data-hardware/robot-learning-stack.mdx',
      'content/data-hardware/teleop-rigs.mdx',
      'content/frontier/bear-case.mdx',
      'content/frontier/competing-theses.mdx',
      'content/frontier/safety-and-assurance.mdx',
      'content/manipulation/action-spaces.mdx',
      'content/manipulation/comparison-matrix.mdx',
      'content/manipulation/hierarchical.mdx',
      'content/rl-sim2real/humanoid-wbc.mdx',
      'content/rl-sim2real/legged-locomotion.mdx',
      'content/rl-sim2real/offline-rl.mdx',
      'content/rl-sim2real/parallel-sim-rl.mdx',
      'content/rl-sim2real/rl-for-robotics.mdx',
      'content/rl-sim2real/sim2real-transfer.mdx',
      'content/rl-sim2real/why-rl-locomotion.mdx',
      'content/world-models/model-based-robot-learning.mdx',
      'content/world-models/world-models-vs-simulators.mdx',
    ]);
  });

  it('keeps surgical robotics\' first record and adds its second mount as a record over the head', () => {
    const surgical = review.sources.filter(({ after }) => after.path === 'content/adjacent/surgical.mdx');
    expect(surgical).toHaveLength(2);
    expect(review.sources.filter(({ after }) => after.path !== 'content/adjacent/surgical.mdx').map(({ after }) => after.path))
      .toEqual(figureMountSuccessorPaths().filter((path) => path !== 'content/adjacent/surgical.mdx'));
    const [first, second] = surgical as [FigureMountSource, FigureMountSource];
    expect(first.archivedFrom).toMatch(/^[0-9a-f]{40}$/);
    expect(second.archivedFrom).toMatch(/^[0-9a-f]{40}$/);
    // The second record's edits only add ScopeFollow's import and mount; the article keeps MotionPantograph.
    expect(second.edits.every(({ before, after }) => after.startsWith(before) && after.slice(before.length).includes('ScopeFollow'))).toBe(true);
    const live = readFileSync(join(root, second.after.path));
    const prior = figureMountPredecessor(root, { path: second.after.path, ...blank }, live);
    expect([prior.length, sha(prior)]).toEqual([second.before.bytes, second.before.sha256]);
    expect([...figureMountsIn(prior.toString())]).toEqual(['MotionPantograph']);
    expect([...figureMountsIn(live.toString())]).toEqual(['MotionPantograph', 'ScopeFollow']);
  });

  it('rebuilds every reviewed successor into its recorded predecessor', () => {
    expect([...new Set(review.sources.map(({ after }) => after.path))]).toEqual(figureMountSuccessorPaths());
    expect(review.sources).toHaveLength(figureMountSuccessorPaths().length + 1);
    for (const source of review.sources) {
      const live = read(review, source);
      const prior = figureMountPredecessor(root, source.before, live);
      expect([prior.length, sha(prior)]).toEqual([source.before.bytes, source.before.sha256]);
      // Only the figures the prior bytes did not carry come out: none before an article's first mount.
      const kept = figureMountsIn(prior.toString());
      expect(kept.size).toBe(source === review.sources.filter(({ after }) => after.path === source.after.path).at(1) ? 1 : 0);
      expect(withoutFigureMounts(live.toString(), kept)).toBe(prior.toString());
      expect(figureMountPredecessor(root, source.after, live)).toBe(live);
      // The rebuilt bytes are the successor of the next older layer that reviewed the article, which that layer
      // still decides: the domain pass for every article except surgical robotics, whose last reviewed change
      // before its mount is the 2026-10-05 KOL backlog batch, and the 2026-10-15 frontier, world-models and
      // manipulation mounts and the 2026-10-19 teleoperation rigs and second surgical robotics mounts, whose last
      // reviewed change before them is an image-mount batch (frontier, manipulation, data-hardware and adjacent of
      // 2026-10-15, world-models of 2026-10-13).
      const afterImages = isLate(review, source);
      const kolOnly = source.after.path === 'content/adjacent/surgical.mdx' && !afterImages;
      if (afterImages) expect(source.archivedFrom).toMatch(/^[0-9a-f]{40}$/);
      const [olderPaths, olderPredecessor] = afterImages
        ? [imageMountSuccessorPaths(), imageMountPredecessor]
        : kolOnly
          ? [kolBacklogSuccessorPaths(), kolBacklogPredecessor]
          : [domainPassSuccessorPaths(), domainPassPredecessor];
      expect(olderPaths).toContain(source.after.path);
      if (kolOnly) expect(domainPassSuccessorPaths()).not.toContain(source.after.path);
      expect(olderPredecessor(root, { path: source.after.path, ...blank }, prior)).not.toEqual(prior);
      expect(olderPredecessor(root, { path: source.after.path, ...blank }, live)).toBe(live);
    }
  });

  it('passes other bytes through and rejects a successor whose edits no longer replay', () => {
    const [source] = review.sources;
    const drifted = Buffer.concat([read(review, source), Buffer.from('\n')]);
    expect(figureMountPredecessor(root, source.before, drifted)).toBe(drifted);
    expect(figureMountPredecessor(root, { path: 'content/classical/control.mdx', ...blank }, drifted)).toBe(drifted);
    expect(() => verifyFigureMountSource(source, drifted)).toThrow(drift);
    const replaced = { ...source, edits: [{ before: '---\n\n', after: '---\n\nimport { X } from \'x\';\n\n' }] };
    expect(() => verifyFigureMountSource(replaced, read(review, source))).toThrow(drift);
  });

  it('admits only the allowlisted import line and one-line mount', () => {
    const prior = [
      '---', 'title: "A"', 'citations:', '  - a-2020', '---', '',
      'Opening words.', '', 'A chain of links <Cite id="a-2020" />.', '', '## Next', '',
    ].join('\n');
    const mounted = prior
      .replace('---\n\nOpening', "---\n\nimport { CalibrationChain } from '@/components/interactive/calibration-chain';\n\nOpening")
      .replace('<Cite id="a-2020" />.\n', '<Cite id="a-2020" />.\n\n<CalibrationChain className="my-6" />\n');
    const path = 'content/x/y.mdx';
    expect(keepsFigureMountObligations(path, prior, mounted)).toBe(true);
    expect(keepsFigureMountObligations(path, prior, prior)).toBe(false);
    expect(keepsFigureMountObligations('components/x.tsx', prior, mounted)).toBe(false);
    // Prose, a citation or a frontmatter field changed beside the mount.
    expect(keepsFigureMountObligations(path, prior, mounted.replace('Opening words.', 'Opening.'))).toBe(false);
    expect(keepsFigureMountObligations(path, prior, mounted.replace('<Cite id="a-2020" />', ''))).toBe(false);
    expect(keepsFigureMountObligations(path, prior, mounted.replace('title: "A"', 'title: "B"'))).toBe(false);
    // A component outside the allowlist, or an allowlisted one with other attributes.
    expect(keepsFigureMountObligations(path, prior, mounted.replace('## Next', '<OtherFigure className="my-6" />\n\n## Next')))
      .toBe(false);
    expect(keepsFigureMountObligations(path, prior, mounted.replace('className="my-6"', 'className="my-8"'))).toBe(false);
    // The mount without its import, the import without its mount, or the mount twice.
    expect(keepsFigureMountObligations(path, prior, mounted.replace(/import [^\n]+\n\n/, ''))).toBe(false);
    expect(keepsFigureMountObligations(path, prior, mounted.replace('\n\n<CalibrationChain className="my-6" />', '')))
      .toBe(false);
    expect(keepsFigureMountObligations(path, prior,
      mounted.replace('## Next', '<CalibrationChain className="my-6" />\n\n## Next'))).toBe(false);
    // The mount must sit on its own line.
    expect(keepsFigureMountObligations(path, prior,
      mounted.replace('.\n\n<CalibrationChain className="my-6" />\n', '. <CalibrationChain className="my-6" />\n'))).toBe(false);
  });

  it('admits a second figure on an article that already carries one, and nothing more', () => {
    const prior = [
      '---', 'title: "A"', '---', '', "import { CalibrationChain } from '@/components/interactive/calibration-chain';", '',
      'Opening words.', '', '<CalibrationChain className="my-6" />', '', 'A chain of links.', '', '## Next', '',
    ].join('\n');
    const mounted = prior
      .replace("calibration-chain';\n", "calibration-chain';\n\nimport { Ros2PolicyLayout } from '@/components/interactive/ros2-policy-layout';\n")
      .replace('A chain of links.\n', 'A chain of links.\n\n<Ros2PolicyLayout className="my-6" />\n');
    const path = 'content/x/y.mdx';
    expect([...figureMountsIn(prior)]).toEqual(['CalibrationChain']);
    expect(keepsFigureMountObligations(path, prior, mounted)).toBe(true);
    // The earlier figure taken out, moved or doubled beside the new one.
    expect(keepsFigureMountObligations(path, prior, mounted.replace('\n<CalibrationChain className="my-6" />\n', ''))).toBe(false);
    expect(keepsFigureMountObligations(path, prior, mounted.replace('## Next', '<CalibrationChain className="my-6" />\n\n## Next'))).toBe(false);
    // Prose changed beside the new mount.
    expect(keepsFigureMountObligations(path, prior, mounted.replace('Opening words.', 'Opening.'))).toBe(false);
  });

  it('rejects a missing, corrupt or renamed review', () => {
    const [source] = review.sources;
    for (const mode of ['missing', 'corrupt', 'renamed'] as const) {
      const tmp = mkdtempSync(join(tmpdir(), 'figure-mount-continuity-test-'));
      scratchRoots.push(tmp);
      cpSync(join(root, FIGURE_MOUNT_CONTINUITY_DIR), join(tmp, FIGURE_MOUNT_CONTINUITY_DIR), { recursive: true });
      const path = join(tmp, FIGURE_MOUNT_CONTINUITY_DIR, 'source-transition.json');
      if (mode === 'missing') rmSync(path);
      else if (mode === 'corrupt') writeFileSync(path, mode);
      else writeFileSync(path, readFileSync(path, 'utf8').replace('"figure-mounts-20261007"', '"figure-mounts-drift"'));
      expect(() => loadFigureMountReview(tmp)).toThrow(drift);
      expect(() => figureMountPredecessor(tmp, source.before, read(review, source))).toThrow(drift);
    }
  });
});
